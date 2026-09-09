// Phone OTP via Twilio Verify — zero-dependency (raw HTTP).
// Env:
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID
// Dev fallback: if Twilio is NOT configured and ALLOW_MOCK_AUTH === "true",
//   sendOtp() is a no-op and checkOtp() accepts "111111". If not configured and
//   not allowed, both throw so the misconfiguration is loud.
const SID = () => process.env.TWILIO_ACCOUNT_SID;
const TOKEN = () => process.env.TWILIO_AUTH_TOKEN;
const SERVICE = () => process.env.TWILIO_VERIFY_SERVICE_SID;

const isConfigured = () => !!(SID() && TOKEN() && SERVICE());
const mockAllowed = () => process.env.ALLOW_MOCK_AUTH === "true";

function toE164(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  const last10 = digits.slice(-10);
  if (last10.length !== 10) throw Object.assign(new Error("Invalid 10-digit phone number"), { status: 400 });
  return "+91" + last10;
}

async function twilio(path, params) {
  const url = `https://verify.twilio.com/v2/Services/${SERVICE()}/${path}`;
  const body = new URLSearchParams(params).toString();
  const auth = Buffer.from(`${SID()}:${TOKEN()}`).toString("base64");
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.message || `Twilio ${path} failed (${res.status})`);
    err.status = res.status === 429 ? 429 : 502;
    err.twilioCode = json.code;
    throw err;
  }
  return json;
}

async function sendOtp(phone) {
  const to = toE164(phone);
  if (!isConfigured()) {
    if (mockAllowed()) {
      console.warn(`[otp] Twilio not configured — DEV mode, code "111111" for ${to}`);
      return { sent: true, dev: true };
    }
    throw Object.assign(new Error("OTP service is not configured"), { status: 503 });
  }
  const v = await twilio("Verifications", { To: to, Channel: "sms" });
  return { sent: true, status: v.status };
}

async function checkOtp(phone, code) {
  const to = toE164(phone);
  if (!/^\d{4,8}$/.test(String(code || ""))) return { approved: false };
  if (!isConfigured()) {
    if (mockAllowed()) return { approved: String(code) === "111111" };
    throw Object.assign(new Error("OTP service is not configured"), { status: 503 });
  }
  const v = await twilio("VerificationCheck", { To: to, Code: String(code) });
  return { approved: v.status === "approved" };
}

module.exports = { sendOtp, checkOtp, isConfigured, toE164 };
