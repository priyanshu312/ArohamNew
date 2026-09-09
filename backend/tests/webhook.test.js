// Unit tests for Razorpay signature verification (services/paymentService.js).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_test_000";
process.env.RAZORPAY_KEY_SECRET = "keysec_test_000";
const { verifyWebhookSignature, verifyPaymentSignature } = require("../services/paymentService");

const sign = (secret, body) => crypto.createHmac("sha256", secret).update(body).digest("hex");

test("verifyWebhookSignature accepts a correctly signed body", () => {
  const body = JSON.stringify({ event: "payment.captured", payload: {} });
  assert.equal(verifyWebhookSignature(body, sign("whsec_test_000", body)), true);
});

test("verifyWebhookSignature rejects a wrong signature", () => {
  const body = JSON.stringify({ event: "payment.captured" });
  assert.equal(verifyWebhookSignature(body, sign("some-other-secret", body)), false);
  assert.equal(verifyWebhookSignature(body, "deadbeef"), false);
});

test("verifyWebhookSignature rejects missing inputs (no throw)", () => {
  const body = JSON.stringify({ event: "x" });
  assert.equal(verifyWebhookSignature(body, undefined), false);
  assert.equal(verifyWebhookSignature(null, "abc"), false);
  assert.equal(verifyWebhookSignature(undefined, undefined), false);
});

test("verifyPaymentSignature matches Razorpay's order_id|payment_id scheme", () => {
  const razorpay_order_id = "order_ABC";
  const razorpay_payment_id = "pay_XYZ";
  const good = sign("keysec_test_000", `${razorpay_order_id}|${razorpay_payment_id}`);
  assert.equal(verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature: good }), true);
  assert.equal(
    verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature: "nope" }),
    false
  );
  assert.equal(verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id }), false);
});
