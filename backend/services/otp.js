// Login OTP — email codes via Supabase Auth (default) or Twilio Verify.
//
// OTP_PROVIDER=supabase (default)
//   Supabase generates, stores, expires and rate-limits the code, and emails it
//   through the project's custom SMTP (SendGrid) using the "Magic Link" email
//   template, which renders {{ .Token }} as the code — see infra/email/. We only
//   call its Auth REST API:
//     POST /auth/v1/otp     { email, create_user: false }   → send
//     POST /auth/v1/verify  { type: "email", email, token }  → check
//   Needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (SUPABASE_ANON_KEY optional).
//   Supabase enforces a 60s minimum between codes for the same address, which
//   is why the login screen's resend countdown is 60s, not 30.
//
// OTP_PROVIDER=twilio
//   The previous Twilio Verify flow, kept intact as a rollback: change the env
//   var and redeploy, no code change. Needs TWILIO_ACCOUNT_SID,
//   TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID. OTP_CHANNEL=email|sms and the
//   optional TWILIO_VERIFY_EMAIL_* per-request template vars still apply.
//
// Dev/staging: OTP_FORCE_MOCK=true (or the selected provider unconfigured +
//   ALLOW_MOCK_AUTH=true) → sendOtp is a no-op and checkOtp accepts "111111".
//   A real signed session token is still issued, so the flow stays testable.

const PROVIDER = () => ((process.env.OTP_PROVIDER || "supabase").trim().toLowerCase() === "twilio" ? "twilio" : "supabase");

const mockAllowed = () => process.env.ALLOW_MOCK_AUTH === "true";
const forceMock = () => process.env.OTP_FORCE_MOCK === "true";

const norm = (v) => String(v || "").trim();
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm(v));
function digits10(phone) {
  const d = norm(phone).replace(/\D/g, "").slice(-10);
  return d.length === 10 ? d : null;
}

// ── Supabase ────────────────────────────────────────────────────────────────

const SB_URL = () => (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SB_SERVICE = () => process.env.SUPABASE_SERVICE_ROLE_KEY;
const SB_PUBLIC = () => process.env.SUPABASE_ANON_KEY || SB_SERVICE();
const supabaseConfigured = () => !!(SB_URL() && SB_SERVICE());

// Plain HTTP rather than supabase-js on purpose. The shared client in
// config/supabase.js is the service-role DATABASE client; calling its
// auth.verifyOtp() would store the verified user's session on it, and every
// query after that would silently run as that user under row-level security.
async function gotrue(path, body, key) {
  let res;
  try {
    res = await fetch(`${SB_URL()}/auth/v1/${path}`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw Object.assign(new Error("Sign-in service is unreachable. Please try again."), { status: 502 });
  }
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}
const gotrueMessage = (j) => (j && (j.msg || j.message || j.error_description || j.error)) || "";

// Supabase chooses the email template by account state: an existing, confirmed
// account gets "Magic Link" (our code template), but an account that /otp
// creates on the fly gets "Confirm signup", which carries a sign-in LINK — a new
// customer would receive something they cannot type into the code boxes.
// Creating the account confirmed first means every send uses the code template.
async function ensureConfirmedUser(email) {
  const r = await gotrue("admin/users", { email, email_confirm: true }, SB_SERVICE());
  if (r.ok) return;
  const detail = `${(r.json && r.json.error_code) || ""} ${gotrueMessage(r.json)}`;
  if (r.status === 422 || /email_exists|already (been )?registered|already exists/i.test(detail)) return;
  console.error("[otp] could not prepare auth user", r.status, detail.trim());
  throw Object.assign(new Error("Could not send the code. Please try again."), { status: 502 });
}

async function sendViaSupabase(email) {
  await ensureConfirmedUser(email);
  const r = await gotrue("otp", { email, create_user: false }, SB_PUBLIC());
  if (r.ok) return { sent: true, channel: "email", to: email };

  const msg = gotrueMessage(r.json);
  console.error("[otp] supabase send failed", r.status, (r.json && r.json.error_code) || "", msg);
  if (r.status === 429) {
    // Either the 60s per-address interval or the project's hourly email cap.
    // Supabase's own wording ("…only request this after 47 seconds") is clear
    // enough to show as-is.
    throw Object.assign(new Error(msg || "Please wait a minute before requesting another code."), { status: 429 });
  }
  throw Object.assign(new Error("Could not send the code. Please try again."), { status: 502 });
}

async function checkViaSupabase(email, code) {
  const r = await gotrue("verify", { type: "email", email, token: code }, SB_PUBLIC());
  if (r.ok && (r.json.access_token || r.json.user)) {
    return { approved: true, authUserId: (r.json.user && r.json.user.id) || null };
  }
  if (r.status === 429) {
    throw Object.assign(new Error("Too many attempts. Please wait a minute and try again."), { status: 429 });
  }
  // Wrong, expired or already-used code: GoTrue answers 403 (otp_expired) or
  // another 4xx. That is a normal "no", not an outage.
  if (r.status >= 400 && r.status < 500) return { approved: false };
  console.error("[otp] supabase verify failed", r.status, gotrueMessage(r.json));
  throw Object.assign(new Error("Could not verify the code right now. Please try again."), { status: 502 });
}

// ── Twilio (rollback) ───────────────────────────────────────────────────────

const SID = () => process.env.TWILIO_ACCOUNT_SID;
const TOKEN = () => process.env.TWILIO_AUTH_TOKEN;
const SERVICE = () => process.env.TWILIO_VERIFY_SERVICE_SID;
const CHANNEL = () => (process.env.OTP_CHANNEL || "email").toLowerCase();
const twilioConfigured = () => !!(SID() && TOKEN() && SERVICE());

// Per-request SendGrid template config for Twilio's email channel. Returns null
// when unset — Twilio then uses the service's default email integration.
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

async function sendViaTwilio(identifier, destEmail) {
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

async function checkViaTwilio(identifier, code) {
  const to = CHANNEL() === "sms"
    ? (digits10(identifier) ? "+91" + digits10(identifier) : null)
    : (isEmail(identifier) ? norm(identifier).toLowerCase() : null);
  if (!to) return { approved: false };
  const v = await twilio("VerificationCheck", { To: to, Code: norm(code) }, { tolerate404: true });
  return { approved: v.status === "approved" };
}

// ── Public API ──────────────────────────────────────────────────────────────

const verifyConfigured = () => (PROVIDER() === "twilio" ? twilioConfigured() : supabaseConfigured());
const useMock = () => forceMock() || (!verifyConfigured() && mockAllowed());

// identifier: the email (or phone for Twilio SMS). destEmail: an email fallback
// so callers can pass the phone as identifier and still deliver by email.
async function sendOtp(identifier, destEmail) {
  if (useMock()) {
    console.warn(`[otp] mock mode — code "111111"`);
    return { sent: true, dev: true };
  }
  if (!verifyConfigured()) {
    throw Object.assign(new Error("OTP service is not configured"), { status: 503 });
  }
  if (PROVIDER() === "twilio") return sendViaTwilio(identifier, destEmail);

  const to = isEmail(identifier) ? norm(identifier).toLowerCase()
    : isEmail(destEmail) ? norm(destEmail).toLowerCase()
    : null;
  if (!to) return { needEmail: true };
  return sendViaSupabase(to);
}

// Resolves { approved, authUserId? }. authUserId is only present for Supabase,
// where verifying the code also tells us which auth account it belongs to.
async function checkOtp(identifier, code) {
  if (useMock()) return { approved: norm(code) === "111111" };
  if (!verifyConfigured()) {
    throw Object.assign(new Error("OTP service is not configured"), { status: 503 });
  }
  if (!/^\d{4,10}$/.test(norm(code))) return { approved: false };
  if (PROVIDER() === "twilio") return checkViaTwilio(identifier, code);
  if (!isEmail(identifier)) return { approved: false };
  return checkViaSupabase(norm(identifier).toLowerCase(), norm(code));
}

module.exports = { sendOtp, checkOtp, verifyConfigured, isEmail, digits10, provider: PROVIDER };
