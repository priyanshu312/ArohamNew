// routes/payments.js — "4. PAYMENT: DUAL VERIFICATION PATH"
const router = require("express").Router();
const requireAuth = require("../middleware/auth");
const supabase = require("../config/supabase");
const {
  verifyPaymentSignature, verifyWebhookSignature, confirmOrder, failOrder,
} = require("../services/paymentService");

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
