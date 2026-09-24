// routes/payments.js — "4. PAYMENT: DUAL VERIFICATION PATH"
const router = require("express").Router();
const requireAuth = require("../middleware/auth");
const supabase = require("../config/supabase");
const {
  verifyPaymentSignature, verifyWebhookSignature, confirmOrder, failOrder,
} = require("../services/paymentService");
const { confirmSlotBooking } = require("../services/slotBookings");

// GET /api/payments/config-check — is this deployment able to take a payment?
//
// Mirrors /api/shiprocket/status: booleans and a key-id prefix only, never the
// secret. It exists because the failure it detects is invisible from outside —
// a bad key pair surfaces as a generic 502 at checkout, and the one clue
// (`orders.create failed: 401`) is buried in the server log. Read-only: lists
// one order, creates nothing.
router.get("/config-check", async (req, res) => {
  const keyId = process.env.RAZORPAY_KEY_ID || "";
  const out = {
    keyIdConfigured: !!keyId,
    // rzp_test_… / rzp_live_… is enough to spot a test/live mixup. The rest of
    // the id stays masked, and the secret is never reported in any form.
    keyIdPrefix: keyId ? `${keyId.slice(0, 12)}…` : null,
    keySecretConfigured: !!process.env.RAZORPAY_KEY_SECRET,
    webhookSecretConfigured: !!process.env.RAZORPAY_WEBHOOK_SECRET,
    testCouponEnabled: String(process.env.TEST_COUPON_ENABLED).toLowerCase() === "true",
  };

  if (!out.keyIdConfigured || !out.keySecretConfigured) {
    return res.json({
      ...out, authenticates: false,
      message: "RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not both set. Checkout will fail.",
    });
  }

  try {
    const razorpay = require("../config/razorpay");
    await razorpay.orders.all({ count: 1 });
    res.json({ ...out, authenticates: true, message: "Razorpay credentials are valid. Checkout can create orders." });
  } catch (e) {
    const detail = (e && e.error && (e.error.description || e.error.reason)) || (e && e.message) || String(e);
    res.json({
      ...out, authenticates: false, error: detail,
      message: "Razorpay REJECTED these credentials. The key id and secret must be from the same account AND the same mode (both test, or both live).",
    });
  }
});

// A. REDIRECT PATH — frontend calls this right after Razorpay checkout closes
// POST /api/payments/verify
router.post("/verify", requireAuth, async (req, res) => {
  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  try {
    if (!verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature })) {
      await failOrder(orderId, "Signature verification failed");
      return res.status(400).json({ success: false, error: "Invalid payment signature" });
    }
    await confirmOrder(orderId, { razorpay_payment_id });
    // Clear the cart securely ONLY after payment success
    await supabase.from("cart_items").delete().eq("user_id", req.user.id);
    res.json({ success: true, status: "CONFIRMED" });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/payments/failed — frontend reports a failed/cancelled checkout
router.post("/failed", requireAuth, async (req, res) => {
  try {
    await failOrder(req.body.orderId, req.body.reason || "User cancelled / payment failed");
    res.json({ success: true, status: "PAYMENT_FAILED" });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// B. WEBHOOK PATH (Source of Truth) — Razorpay calls this server-to-server
// POST /api/payments/webhook  (raw body needed for signature check)
router.post("/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    if (!verifyWebhookSignature(req.rawBody, signature))
      return res.status(400).json({ error: "Invalid webhook signature" });

    const event = req.body || {};
    const payment = event.payload?.payment?.entity;
    const rzpOrderId = payment?.order_id;
    if (!rzpOrderId) return res.json({ received: true });

    const { data: pay } = await supabase.from("payments")
      .select("order_id, status").eq("razorpay_order_id", rzpOrderId).single();

    // Not a shop order: it may be a paid astrologer slot (routes/consult.js).
    if (!pay) {
      const { data: booking } = await supabase.from("slot_bookings")
        .select("id, status").eq("razorpay_order_id", rzpOrderId).maybeSingle();
      if (booking) {
        if (event.event === "payment.captured") {
          const result = await confirmSlotBooking(rzpOrderId, { razorpay_payment_id: payment.id });
          console.log(`[Payments] Slot booking ${booking.id}: ${result}.`);
        } else if (event.event === "refund.processed") {
          // A refunded slot frees up for someone else. Partial refunds are left for a human.
          const refund = event.payload?.refund?.entity;
          if (!refund || Number(refund.amount) >= Number(payment.amount)) {
            await supabase.from("slot_bookings").update({ status: "REFUNDED" }).eq("id", booking.id);
          }
          console.log(`[Payments] Refund processed for slot booking ${booking.id}.`);
        }
        // payment.failed is ignored: the user can retry inside the same
        // checkout, and the hold expires by itself if they give up.
        return res.json({ received: true });
      }
    }

    // A refund arrives on an already-SUCCESS payment, so it has to be handled
    // before the "skip if already done" guard below. Without this, refunding in
    // the Razorpay dashboard changed nothing here: the payment sat at SUCCESS
    // (or REFUND_PENDING) for good, and the order still read as a live sale.
    if (pay && event.event === "refund.processed") {
      const refund = event.payload?.refund?.entity;
      // A partial refund is not a cancelled order — flag it for a human rather
      // than guessing. `amount` is in paise, as everywhere else here.
      const fullyRefunded = !refund || Number(refund.amount) >= Number(payment.amount);
      await supabase.from("payments")
        .update({ status: fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED" })
        .eq("order_id", pay.order_id);
      console.log(`[Payments] Refund processed for order #${pay.order_id} (${fullyRefunded ? "full" : "partial"}).`);
      return res.json({ received: true });
    }

    if (pay && pay.status !== "SUCCESS") {           // idempotent: skip if already done
      if (event.event === "payment.captured")
        await confirmOrder(pay.order_id, { razorpay_payment_id: payment.id, method: payment.method });
      else if (event.event === "payment.failed")
        await failOrder(pay.order_id, payment.error_description);
    }
    res.json({ received: true });
  } catch (e) {
    // Never let a webhook error crash the process — Razorpay retries on non-2xx.
    console.error("[Payments] Webhook handler error:", e.message);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

module.exports = router;
