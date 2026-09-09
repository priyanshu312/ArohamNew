// Login OTP — Twilio Verify, EMAIL channel.
//
// One vendor (Twilio Verify), one flow (email). Twilio generates, stores,
// expires, rate-limits and fraud-scores the code; we just call Verifications /
// VerificationCheck. `OTP_CHANNEL=sms` switches the same Verify service to SMS.
//
// Twilio console setup required for the email channel:
//   Verify → Services → <your service> → Email → connect a SendGrid account
//   (API key) and select/create a dynamic template with the {{twilio_code}}
//   variable. Then either:
//     - leave it as the service's default email integration (no env needed), OR
//     - pass it per-request via the 3 TWILIO_VERIFY_EMAIL_* vars below.
//
// Env:
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID
//   OTP_CHANNEL=email (default) | sms
//   TWILIO_VERIFY_EMAIL_TEMPLATE_ID   (d-…, optional — SendGrid dynamic template)
//   TWILIO_VERIFY_EMAIL_FROM          (verified SendGrid sender, optional)
//   TWILIO_VERIFY_EMAIL_FROM_NAME     (optional, default "Nakshra")
//
// Dev/staging: OTP_FORCE_MOCK=true (or Verify unconfigured + ALLOW_MOCK_AUTH=true)
//   → sendOtp is a no-op and checkOtp accepts "111111". A real signed session
//   token is still issued, so the whole flow stays testable.

const SID = () => process.env.TWILIO_ACCOUNT_SID;
const TOKEN = () => process.env.TWILIO_AUTH_TOKEN;
const SERVICE = () => process.env.TWILIO_VERIFY_SERVICE_SID;
const CHANNEL = () => (process.env.OTP_CHANNEL || "email").toLowerCase();

const verifyConfigured = () => !!(SID() && TOKEN() && SERVICE());
const mockAllowed = () => process.env.ALLOW_MOCK_AUTH === "true";
const forceMock = () => process.env.OTP_FORCE_MOCK === "true";
const useMock = () => forceMock() || (!verifyConfigured() && mockAllowed());

const norm = (v) => String(v || "").trim();
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm(v));
function digits10(phone) {
  const d = norm(phone).replace(/\D/g, "").slice(-10);
  return d.length === 10 ? d : null;
}

// Per-request SendGrid template config for the email channel. Returns null when
// unset — Twilio then uses the service's default email integration.
function emailChannelConfig() {
  const template_id = process.env.TWILIO_VERIFY_EMAIL_TEMPLATE_ID;
  const from = process.env.TWILIO_VERIFY_EMAIL_FROM;
  if (!template_id || !from) return null;
  return JSON.stringify({
    template_id,
    from,
    from_name: process.env.TWILIO_VERIFY_EMAIL_FROM_NAME || "Nakshra",
    substitutions: {},
  });
}

async function twilio(path, params, { tolerate404 = false } = {}) {
  const url = `https://verify.twilio.com/v2/Services/${SERVICE()}/${path}`;
  const auth = Buffer.from(`${SID()}:${TOKEN()}`).toString("base64");
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    // VerificationCheck 404 = no pending / already used / expired / too many tries.
    if (tolerate404 && res.status === 404) return { status: "not_found" };
    const err = new Error(json.message || `Twilio ${path} failed (${res.status})`);
    err.status = res.status === 429 ? 429 : res.status === 400 ? 400 : 502;
    throw err;
  }
  return json;
}

// identifier: the email (email channel) or phone (sms channel). destEmail: an
// email fallback so callers can pass the phone as identifier and still deliver
// by email.
async function sendOtp(identifier, destEmail) {
  if (useMock()) {
    console.warn(`[otp] mock mode — code "111111"`);
    return { sent: true, dev: true };
  }
  if (!verifyConfigured()) {
    throw Object.assign(new Error("OTP service is not configured"), { status: 503 });
  }

  if (CHANNEL() === "sms") {
    const phone = digits10(identifier) || digits10(destEmail);
    if (!phone) throw Object.assign(new Error("Enter a valid 10-digit mobile number."), { status: 400 });
    const v = await twilio("Verifications", { To: "+91" + phone, Channel: "sms" });
    return { sent: true, channel: "sms", status: v.status };
  }

  const to = isEmail(identifier) ? norm(identifier).toLowerCase()
    : isEmail(destEmail) ? norm(destEmail).toLowerCase()
    : null;
  if (!to) return { needEmail: true };

  const params = { To: to, Channel: "email" };
  const cc = emailChannelConfig();
  if (cc) params.ChannelConfiguration = cc;
  const v = await twilio("Verifications", params);
  return { sent: true, channel: "email", to, status: v.status };
}

async function checkOtp(identifier, code) {
  if (useMock()) return { approved: norm(code) === "111111" };
  if (!verifyConfigured()) {
    throw Object.assign(new Error("OTP service is not configured"), { status: 503 });
  }
  if (!/^\d{4,10}$/.test(norm(code))) return { approved: false };

  const to = CHANNEL() === "sms"
    ? (digits10(identifier) ? "+91" + digits10(identifier) : null)
    : (isEmail(identifier) ? norm(identifier).toLowerCase() : null);
  if (!to) return { approved: false };

  const v = await twilio("VerificationCheck", { To: to, Code: norm(code) }, { tolerate404: true });
  return { approved: v.status === "approved" };
}

module.exports = { sendOtp, checkOtp, verifyConfigured, isEmail, digits10 };
