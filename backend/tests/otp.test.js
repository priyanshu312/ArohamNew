// Unit tests for services/otp.js (phone normalisation + mock-mode behaviour).
const { test } = require("node:test");
const assert = require("node:assert/strict");

// Force the "111111" mock path, no Twilio call.
process.env.OTP_FORCE_MOCK = "true";
delete process.env.TWILIO_ACCOUNT_SID;
delete process.env.TWILIO_AUTH_TOKEN;
delete process.env.TWILIO_VERIFY_SERVICE_SID;

const { digits10, isEmail, sendOtp, checkOtp } = require("../services/otp");

test("digits10 normalises 10-digit and prefixed inputs", () => {
  assert.equal(digits10("9876543210"), "9876543210");
  assert.equal(digits10("+91 98765 43210"), "9876543210");
  assert.equal(digits10("0919876543210"), "9876543210");
});

test("digits10 returns null on bad input", () => {
  assert.equal(digits10("12345"), null);
  assert.equal(digits10(""), null);
});

test("isEmail", () => {
  assert.equal(isEmail("a@b.com"), true);
  assert.equal(isEmail("x@y"), false);
  assert.equal(isEmail("9876543210"), false);
});

test("sendOtp in mock mode is a no-op that reports dev:true", async () => {
  const r = await sendOtp("user@example.com");
  assert.deepEqual(r, { sent: true, dev: true });
});

test("checkOtp in mock mode accepts 111111 and rejects anything else", async () => {
  assert.deepEqual(await checkOtp("user@example.com", "111111"), { approved: true });
  assert.deepEqual(await checkOtp("user@example.com", "000000"), { approved: false });
  assert.deepEqual(await checkOtp("user@example.com", "abcd"), { approved: false });
  assert.deepEqual(await checkOtp("user@example.com", ""), { approved: false });
});
