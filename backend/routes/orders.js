// routes/orders.js — "2/3. ORDER CREATION & PROCESSING" + order history
const router = require("express").Router();
const requireAuth = require("../middleware/auth");
const razorpay = require("../config/razorpay");
const { validateItems } = require("../services/validationService");
const { createPendingOrder, getUserOrders } = require("../services/orderService");
const supabase = require("../config/supabase");

// Debug endpoints — disabled unless ENABLE_DEBUG_ROUTES=true (they leak DB errors
// and server logs, so they must never be reachable in a normal deployment).
const debugRoutesEnabled = process.env.ENABLE_DEBUG_ROUTES === "true";

// GET /api/orders/debug-last - Debug latest order details
router.get("/debug-last", async (req, res) => {
  if (!debugRoutesEnabled) return res.status(404).json({ error: "Not found" });
  try {
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*, order_items(*), payments(*)")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      success: true,
      order: orders[0] || null
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/orders/debug-logs - Fetch the in-memory debug logs
router.get("/debug-logs", (req, res) => {
  if (!debugRoutesEnabled) return res.status(404).json({ error: "Not found" });
  res.json({
    success: true,
    logs: global.debugLogs || []
  });
});

// POST /api/orders  body: { items: [{id, qty}], address: {...}, checkoutType, promoCode }
// Validates → creates PENDING order + items + reserves stock + payment record
// → creates Razorpay order → returns checkout details to frontend
router.post("/", requireAuth, async (req, res) => {
  try {
    const { items, address, checkoutType, promoCode } = req.body;
    const check = await validateItems(items);
    if (!check.valid) return res.status(400).json({ errors: check.errors });

    const { order, amount } = await createPendingOrder(req.user.id, check.products, address, promoCode);


    // Initiate Payment: create Razorpay order (amount in paise)
    const rzpOrder = await razorpay.orders.create({
      amount, currency: "INR", receipt: String(order.id),
      notes: { order_id: String(order.id) },
    });
    await supabase.from("payments")
      .update({ razorpay_order_id: rzpOrder.id }).eq("order_id", order.id);

    res.json({
      orderId: order.id,
      razorpayOrderId: rzpOrder.id,
      amount, currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (e) {
    console.error("[Order Route Error] Order creation failed:", e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/orders — order history (orders + items + payment status)
router.get("/", requireAuth, async (req, res) => {
  try {
    res.json(await getUserOrders(req.user.id));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
