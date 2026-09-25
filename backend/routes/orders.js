// routes/orders.js — "2/3. ORDER CREATION & PROCESSING" + order history
const router = require("express").Router();
const requireAuth = require("../middleware/auth");
const razorpay = require("../config/razorpay");
const { validateItems } = require("../services/validationService");
const { createPendingOrder, cancelOrder, getUserOrders } = require("../services/orderService");
const { failOrder } = require("../services/paymentService");
const supabase = require("../config/supabase");
const ShiprocketService = require("../services/shiprocket/ShiprocketService");
const { trackLimiter } = require("../middleware/rateLimit");

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

    const { order, amount, subtotal, discount, promoApplied, promoReason, couponCode } =
      await createPendingOrder(req.user.id, check.products, address, promoCode);

    // Razorpay's minimum chargeable amount is 100 paise (₹1).
    if (!Number.isFinite(amount) || amount < 100) {
      return res.status(400).json({ error: "Order amount must be at least ₹1 (100 paise)." });
    }

    // Initiate Payment: create Razorpay order (amount in paise)
    let rzpOrder;
    try {
      rzpOrder = await razorpay.orders.create({
        amount, currency: "INR", receipt: String(order.id),
        notes: { order_id: String(order.id), ...(couponCode ? { coupon: couponCode } : {}) },
      });
    } catch (rzpErr) {
      // Razorpay SDK errors carry .statusCode + .error.{description,reason}, not .message.
      const status = rzpErr && rzpErr.statusCode;
      const detail =
        (rzpErr && rzpErr.error && (rzpErr.error.description || rzpErr.error.reason)) ||
        (rzpErr && rzpErr.message) ||
        "Razorpay order creation failed";
      console.error("[Order Route] Razorpay orders.create failed:", status, detail);
      // Roll back the just-created PENDING order so it doesn't linger + hold stock.
      try {
        await failOrder(order.id, "Razorpay order creation failed: " + detail);
      } catch (rbErr) {
        console.error("[Order Route] rollback (failOrder) also failed:", rbErr.message);
      }
      if (status === 401) {
        return res.status(401).json({ error: "Payment gateway authentication failed. Check RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET." });
      }
      return res.status(502).json({ error: "Payment gateway error", details: detail });
    }

    await supabase.from("payments")
      .update({ razorpay_order_id: rzpOrder.id }).eq("order_id", order.id);

    res.json({
      orderId: order.id,
      razorpayOrderId: rzpOrder.id,
      amount, currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
      // Server is the source of truth for pricing — the client must reconcile
      // its displayed total/discount against these before showing the RZP popup.
      pricing: { subtotal, discount, amount, promoCode: promoCode || null, promoApplied: !!promoApplied, promoReason: promoReason || null },
    });
  } catch (e) {
    const detail = (e && e.error && (e.error.description || e.error.reason)) || (e && e.message) || String(e);
    console.error("[Order Route Error] Order creation failed:", detail);
    res.status(500).json({ error: detail });
  }
});

// The order number customers see: NAK- and the first 8 hex digits of the id.
const orderNumber = (id) => "NAK-" + String(id).replace(/-/g, "").slice(0, 8).toUpperCase();
const digits10 = (v) => String(v || "").replace(/\D/g, "").slice(-10);

// GET /api/orders/track?order=NAK-48EBE070&contact=<email or phone>
// Public (the Track Order page works without logging in), so it only answers
// when the contact matches the order's delivery details or the account's.
router.get("/track", trackLimiter, async (req, res) => {
  const raw = String(req.query.order || "").trim().toLowerCase().replace(/^nak-?/, "").replace(/[^0-9a-f]/g, "");
  const contact = String(req.query.contact || "").trim().toLowerCase();
  if (raw.length < 8 || !contact) {
    return res.status(400).json({ error: "Enter your order number and the email or phone used for the order." });
  }
  const notFound = () => res.status(404).json({ error: "No order matches that order number and email/phone." });
  try {
    // A UUID prefix as a range, so NAK-XXXXXXXX works without a text cast.
    const p = raw.slice(0, 8);
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, user_id, status, created_at, address, shipping_address, user_phone, shipment_id, awb_code, courier_name, order_items(name, qty)")
      .gte("id", `${p}-0000-0000-0000-000000000000`)
      .lte("id", `${p}-ffff-ffff-ffff-ffffffffffff`)
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) throw error;

    const candidates = [];
    for (const o of orders || []) {
      const a = o.address || o.shipping_address || {};
      let account = {};
      if (o.user_id) {
        const { data } = await supabase.from("users").select("email, phone").eq("id", o.user_id).maybeSingle();
        account = data || {};
      }
      const emails = [a.email, account.email].filter(Boolean).map((e) => String(e).toLowerCase());
      const phones = [a.phone, o.user_phone, account.phone].map(digits10).filter((d) => d.length === 10);
      const matches = contact.includes("@") ? emails.includes(contact) : phones.includes(digits10(contact));
      if (matches && String(o.id).replace(/-/g, "").startsWith(raw)) candidates.push(o);
    }
    const order = candidates[0];
    if (!order) return notFound();

    let tracking = null;
    if (order.awb_code || order.shipment_id) {
      try {
        const service = new ShiprocketService(process.env.SHIPROCKET_EMAIL, process.env.SHIPROCKET_PASSWORD);
        const data = order.awb_code ? await service.trackByAwb(order.awb_code) : await service.trackShipment(order.shipment_id);
        const t = data?.tracking_data || data || {};
        const track = t.shipment_track?.[0] || {};
        tracking = {
          status: track.current_status || t.shipment_status_text || null,
          etd: t.etd || track.edd || null,
          activities: (t.shipment_track_activities || []).slice(0, 8).map((a) => ({
            date: a.date || "",
            activity: a.activity || a["sr-status-label"] || "",
            location: a.location || "",
          })),
        };
      } catch (e) {
        console.warn("[orders/track] Shiprocket lookup failed:", e.message);
      }
    }

    res.json({
      orderNumber: orderNumber(order.id),
      status: order.status,
      placedAt: order.created_at,
      items: (order.order_items || []).map((i) => ({ name: i.name, qty: i.qty })),
      courier: order.courier_name || null,
      awb: order.awb_code || null,
      tracking,
    });
  } catch (e) {
    console.error("[orders/track]", e.message);
    res.status(500).json({ error: "Couldn't look up that order right now. Please try again." });
  }
});

// GET /api/orders — order history (orders + items + payment status)
router.get("/", requireAuth, async (req, res) => {
  try {
    res.json(await getUserOrders(req.user.id, req.user.user_metadata && req.user.user_metadata.phone));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/orders/:id/cancel — user cancels their own order (pre-shipping)
router.post("/:id/cancel", requireAuth, async (req, res) => {
  try {
    const result = await cancelOrder(req.params.id, req.user.id);
    res.json({ success: true, status: "CANCELLED", alreadyCancelled: result.alreadyCancelled });
  } catch (e) {
    console.error("[orders/cancel]", e.status, e.message);
    res.status(e.status || 500).json({ error: e.message || "Could not cancel order" });
  }
});

module.exports = router;
