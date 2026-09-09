// Unit tests for services/otp.js (phone normalisation + mock-mode behaviour).
const { test } = require("node:test");
const assert = require("node:assert/strict");

// Force the "111111" mock path, no Twilio call.
process.env.OTP_FORCE_MOCK = "true";
delete process.env.TWILIO_ACCOUNT_SID;
delete process.env.TWILIO_AUTH_TOKEN;
delete process.env.TWILIO_VERIFY_SERVICE_SID;

const { toE164, sendOtp, checkOtp } = require("../services/otp");

test("toE164 normalises 10-digit and prefixed inputs", () => {
  assert.equal(toE164("9876543210"), "+919876543210");
  assert.equal(toE164("+91 98765 43210"), "+919876543210");
  assert.equal(toE164("0919876543210"), "+919876543210");
});

test("toE164 throws on bad input", () => {
  assert.throws(() => toE164("12345"));
  assert.throws(() => toE164(""));
});

test("sendOtp in mock mode is a no-op that reports dev:true", async () => {
  const r = await sendOtp("9876543210");
  assert.deepEqual(r, { sent: true, dev: true });
});

test("checkOtp in mock mode accepts 111111 and rejects anything else", async () => {
  assert.deepEqual(await checkOtp("9876543210", "111111"), { approved: true });
  assert.deepEqual(await checkOtp("9876543210", "000000"), { approved: false });
  assert.deepEqual(await checkOtp("9876543210", "abcd"), { approved: false });
  assert.deepEqual(await checkOtp("9876543210", ""), { approved: false });
});
