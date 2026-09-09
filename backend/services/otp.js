// Login OTP — email by default (free), SMS optional.
//
// Channel:
//   - default: email. The 6-digit code is generated here, hashed, stored in
//     public.otp_codes (service-role only), and emailed via services/notify.
//   - OTP_CHANNEL="sms" + Twilio Verify configured: use Twilio (it owns the code).
//
// Dev / staging fallback: when no delivery channel is usable and mock auth is
// allowed (OTP_FORCE_MOCK=true, or ALLOW_MOCK_AUTH=true with nothing configured),
// sendOtp is a no-op and checkOtp accepts "111111". A real signed session token
// is still issued, so the whole auth path stays testable.
const crypto = require("crypto");
const supabase = require("../config/supabase");
const { sendOtpEmail, sendEmail } = require("./notify");

const SID = () => process.env.TWILIO_ACCOUNT_SID;
const TOKEN = () => process.env.TWILIO_AUTH_TOKEN;
const SERVICE = () => process.env.TWILIO_VERIFY_SERVICE_SID;
const CHANNEL = () => (process.env.OTP_CHANNEL || "email").toLowerCase();

const smsConfigured = () => !!(SID() && TOKEN() && SERVICE());
const emailConfigured = () =>
  !!((process.env.BREVO_API_KEY || process.env.RESEND_API_KEY) && process.env.ORDER_EMAIL_FROM);
const mockAllowed = () => process.env.ALLOW_MOCK_AUTH === "true";
const forceMock = () => process.env.OTP_FORCE_MOCK === "true";

// Use the "111111" path when explicitly forced, or when no real channel is
// usable and mock auth is allowed.
function useMock() {
  if (forceMock()) return true;
  const channelUsable = CHANNEL() === "sms" ? smsConfigured() : emailConfigured();
  return !channelUsable && mockAllowed();
}

const norm = (v) => String(v || "").trim();
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm(v));

function digits10(phone) {
  const d = norm(phone).replace(/\D/g, "").slice(-10);
  return d.length === 10 ? d : null;
}

// ---- email channel: our own code store -------------------------------------
const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const SECRET = () => process.env.SUPABASE_JWT_SECRET || "nakshra-otp-fallback";

const hashCode = (identifier, code) =>
  crypto.createHmac("sha256", SECRET()).update(`${identifier}|${code}`).digest("hex");

async function emailSendOtp(identifier, destEmail) {
  if (!destEmail || !isEmail(destEmail)) {
    return { needEmail: true };
  }
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  const { error } = await supabase.from("otp_codes").upsert({
    identifier,
    code_hash: hashCode(identifier, code),
    dest_email: destEmail,
    expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    attempts: 0,
    created_at: new Date().toISOString(),
  });
  if (error) throw Object.assign(new Error("Could not start verification"), { status: 500 });

  const r = await sendOtpEmail(destEmail, code);
  if (r && r.skipped) {
    // provider unset — should not happen (emailConfigured gates useMock), but be loud
    throw Object.assign(new Error("Email service is not configured"), { status: 503 });
  }
  if (r && r.ok === false) {
    throw Object.assign(new Error("Could not send the verification email"), { status: 502 });
  }
  return { sent: true, channel: "email", to: destEmail };
}

async function emailCheckOtp(identifier, code) {
  if (!/^\d{6}$/.test(norm(code))) return { approved: false };
  const { data: row } = await supabase
    .from("otp_codes").select("*").eq("identifier", identifier).maybeSingle();
  if (!row) return { approved: false };
  if (new Date(row.expires_at).getTime() < Date.now() || row.attempts >= MAX_ATTEMPTS) {
    await supabase.from("otp_codes").delete().eq("identifier", identifier);
    return { approved: false };
  }
  const expected = Buffer.from(row.code_hash);
  const got = Buffer.from(hashCode(identifier, norm(code)));
  const ok = expected.length === got.length && crypto.timingSafeEqual(expected, got);
  if (!ok) {
    await supabase.from("otp_codes").update({ attempts: row.attempts + 1 }).eq("identifier", identifier);
    return { approved: false };
  }
  await supabase.from("otp_codes").delete().eq("identifier", identifier);
  return { approved: true };
}

// ---- SMS channel (Twilio Verify) -----------------------------------------
async function twilio(path, params) {
  const url = `https://verify.twilio.com/v2/Services/${SERVICE()}/${path}`;
  const auth = Buffer.from(`${SID()}:${TOKEN()}`).toString("base64");
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.message || `Twilio ${path} failed (${res.status})`);
    err.status = res.status === 429 ? 429 : 502;
    throw err;
  }
  return json;
}

// ---- public API ---------------------------------------------------------
// identifier: phone (any format) or an email. destEmail: where to send an
// email code (falls back to identifier itself when that's an email).
async function sendOtp(identifier, destEmail) {
  const id = isEmail(identifier) ? norm(identifier).toLowerCase() : digits10(identifier);
  if (!id) throw Object.assign(new Error("Enter a valid mobile number or email"), { status: 400 });

  if (useMock()) {
    console.warn(`[otp] mock mode — code "111111" for ${id}`);
    return { sent: true, dev: true };
  }

  if (CHANNEL() === "sms") {
    if (!smsConfigured()) throw Object.assign(new Error("SMS OTP is not configured"), { status: 503 });
    const to = "+91" + digits10(identifier);
    const v = await twilio("Verifications", { To: to, Channel: "sms" });
    return { sent: true, channel: "sms", status: v.status };
  }

  const to = isEmail(identifier) ? id : (destEmail || null);
  return emailSendOtp(id, to);
}

async function checkOtp(identifier, code) {
  const id = isEmail(identifier) ? norm(identifier).toLowerCase() : digits10(identifier);
  if (!id) return { approved: false };

  if (useMock()) return { approved: norm(code) === "111111" };

  if (CHANNEL() === "sms") {
    if (!smsConfigured()) throw Object.assign(new Error("SMS OTP is not configured"), { status: 503 });
    const v = await twilio("VerificationCheck", { To: "+91" + digits10(identifier), Code: norm(code) });
    return { approved: v.status === "approved" };
  }

  return emailCheckOtp(id, code);
}

module.exports = { sendOtp, checkOtp, smsConfigured, emailConfigured, isEmail, digits10 };
