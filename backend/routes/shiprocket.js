// routes/shiprocket.js — Shiprocket integration endpoints (diagnostic, testing, tracking)
const router = require("express").Router();
const ShiprocketService = require("../services/shiprocket/ShiprocketService");
const supabase = require("../config/supabase");
const requireAuth = require("../middleware/auth");

/** Helper: create a fresh ShiprocketService instance using env credentials */
function getService() {
  return new ShiprocketService(process.env.SHIPROCKET_EMAIL, process.env.SHIPROCKET_PASSWORD);
}

// These routes hit the live Shiprocket API and can create/cancel real shipments,
// so they must never be anonymous. Require a valid session AND an explicit
// opt-in flag (same pattern as the orders debug routes) — flip
// ENABLE_DEBUG_ROUTES=true only when you actually need them.
function diagnosticGuard(req, res, next) {
  if (process.env.ENABLE_DEBUG_ROUTES !== "true") {
    return res.status(404).json({ error: "Not found" });
  }
  return requireAuth(req, res, next);
}

// ─── GET /api/shiprocket/status ─── Diagnostic: shows config state ───
router.get("/status", (req, res) => {
  const isEnabled = process.env.SHIPROCKET_ENABLED === "true";
  res.json({
    success: true,
    enabled: isEnabled,
    emailConfigured: !!process.env.SHIPROCKET_EMAIL,
    passwordConfigured: !!process.env.SHIPROCKET_PASSWORD,
    pickupPincode: process.env.SHIPROCKET_PICKUP_PINCODE || "110001",
    message: isEnabled
      ? "Shiprocket integration is ENABLED and will auto-dispatch on payment confirmation."
      : "Shiprocket integration is DISABLED. Set SHIPROCKET_ENABLED=true in backend/.env to activate."
  });
});

// ─── POST /api/shiprocket/webhook ─── Shiprocket pushes tracking updates here ───
//
// Shiprocket fires this on every scan event, which is the only way a change made
// in THEIR dashboard (a cancellation, a delivery) reaches our database. Without
// it an order cancelled at Shiprocket stays CONFIRMED here forever, and no order
// ever reaches SHIPPED or DELIVERED — the customer's timeline never moves past
// "Processing".
//
// Configure it in Shiprocket: Settings → API → Webhooks. Set the URL to
//   https://nakshra.onrender.com/api/shiprocket/webhook
// and the token to whatever you put in SHIPROCKET_WEBHOOK_TOKEN.
//
// Shiprocket's payload shape is not publicly documented, so the field readers
// below accept the spellings seen in the wild and the raw body is logged on
// every call. Read one real delivery in the logs, then tighten this.

// Order matters: "RTO DELIVERED" contains "delivered", and a cancelled RTO is
// still a cancellation. Most specific first.
function mapShiprocketStatus(raw) {
  const s = String(raw || "").toLowerCase().trim();
  if (!s) return null;
  // Negations first. "UNDELIVERED" and "NOT DELIVERED" both contain
  // "delivered", and a substring check alone marks a failed delivery as
  // delivered — the single worst thing this function could get wrong.
  if (s.includes("undeliver") || s.includes("not delivered")) return null;
  if (s.includes("cancel")) return "CANCELLED";
  if (s.includes("rto") || s.includes("return")) {
    // Only a completed return puts the goods back in our hands. "RTO INITIATED"
    // is still in transit, so it is recorded but does not change the order.
    return s.includes("delivered") ? "CANCELLED" : null;
  }
  if (s.includes("delivered")) return "DELIVERED";
  if (["picked up", "in transit", "out for delivery", "shipped", "dispatched"].some((h) => s.includes(h)))
    return "SHIPPED";
  return null; // NEW / AWB ASSIGNED / PICKUP SCHEDULED etc. — nothing to change
}

// Never walk an order backwards. A late "in transit" scan must not undo a
// delivery, and nothing un-cancels an order.
const TERMINAL = new Set(["DELIVERED", "CANCELLED"]);

router.post("/webhook", async (req, res) => {
  const body = req.body || {};
  console.log("[Shiprocket webhook] raw payload:", JSON.stringify(body).slice(0, 1500));

  // Shared-secret check. Fail closed: this endpoint moves money-adjacent state
  // (it releases stock), so an unset token means nobody gets in rather than
  // everybody. Shiprocket sends the token you configure as x-api-key.
  const expected = process.env.SHIPROCKET_WEBHOOK_TOKEN;
  const got = req.headers["x-api-key"] || req.headers["x-webhook-token"];
  if (!expected) {
    console.error("[Shiprocket webhook] SHIPROCKET_WEBHOOK_TOKEN is not set — rejecting.");
    return res.status(503).json({ error: "Webhook not configured" });
  }
  if (got !== expected) {
    console.warn("[Shiprocket webhook] rejected: bad or missing x-api-key.");
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const awb = body.awb || body.awb_code || body.shipment_awb || null;
    const shipmentId = body.shipment_id || body.shipmentId || null;
    // We create Shiprocket orders with order_id = our own UUID, so this echoes
    // straight back. channel_order_id is the spelling on some payload versions.
    const ourOrderId = body.order_id || body.channel_order_id || body.client_order_id || null;
    const rawStatus = body.current_status || body.status || body.shipment_status || body.current_status_body || null;

    const next = mapShiprocketStatus(rawStatus);
    console.log(`[Shiprocket webhook] order=${ourOrderId} awb=${awb} shipment=${shipmentId} status="${rawStatus}" → ${next || "(no change)"}`);

    // Always 200 once authenticated, even when we do nothing — a non-2xx makes
    // Shiprocket retry a payload we have already understood and rejected.
    if (!next) return res.json({ received: true, applied: false, reason: "status not actionable" });

    // Find the order. Prefer our own id; fall back to the shipping identifiers
    // for payload versions that omit it.
    let query = supabase.from("orders").select("id, status");
    if (ourOrderId && /^[0-9a-f-]{36}$/i.test(String(ourOrderId))) query = query.eq("id", ourOrderId);
    else if (awb) query = query.eq("awb_code", String(awb));
    else if (shipmentId) query = query.eq("shipment_id", shipmentId);
    else return res.json({ received: true, applied: false, reason: "no usable identifier" });

    const { data: order, error: findErr } = await query.maybeSingle();
    if (findErr) {
      console.error("[Shiprocket webhook] lookup failed:", findErr.message);
      return res.json({ received: true, applied: false, reason: "lookup failed" });
    }
    if (!order) {
      console.warn(`[Shiprocket webhook] no order matched (order_id=${ourOrderId} awb=${awb} shipment=${shipmentId}).`);
      return res.json({ received: true, applied: false, reason: "order not found" });
    }
    if (order.status === next) return res.json({ received: true, applied: false, reason: "already in that state" });
    if (TERMINAL.has(order.status)) {
      console.log(`[Shiprocket webhook] #${order.id} is already ${order.status} — refusing to move it to ${next}.`);
      return res.json({ received: true, applied: false, reason: `already ${order.status}` });
    }

    const patch = { status: next };
    if (awb) patch.awb_code = String(awb);
    const { error: upErr } = await supabase.from("orders").update(patch).eq("id", order.id);
    if (upErr) {
      console.error(`[Shiprocket webhook] update failed for #${order.id}:`, upErr.message);
      return res.json({ received: true, applied: false, reason: "update failed" });
    }

    // A cancellation means the goods never left us, so put the units back. The
    // guard above makes this run at most once per order.
    if (next === "CANCELLED") {
      const { data: items } = await supabase
        .from("order_items").select("product_id, qty").eq("order_id", order.id);
      for (const it of items || [])
        await supabase.rpc("release_stock", { p_product_id: it.product_id, p_qty: it.qty });

      // Money is not refunded automatically — flag it for a human.
      const { data: pay } = await supabase
        .from("payments").select("status").eq("order_id", order.id).maybeSingle();
      if (pay && pay.status === "SUCCESS") {
        await supabase.from("payments").update({ status: "REFUND_PENDING" }).eq("order_id", order.id);
        console.warn(`[Shiprocket webhook] #${order.id} cancelled at Shiprocket but was PAID — marked REFUND_PENDING.`);
      }
    }

    console.log(`[Shiprocket webhook] #${order.id}: ${order.status} → ${next}.`);
    res.json({ received: true, applied: true, orderId: order.id, status: next });
  } catch (e) {
    console.error("[Shiprocket webhook] handler error:", e.message);
    // 500 so Shiprocket retries — this one really was our fault.
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// ─── POST /api/shiprocket/test-auth ─── Test credential authentication ───
router.post("/test-auth", diagnosticGuard, async (req, res) => {
  try {
    const service = getService();
    const token = await service.initialize();
    res.json({
      success: true,
      message: "Authentication successful! Shiprocket API credentials are valid.",
      tokenPreview: token ? `${token.substring(0, 20)}...` : "received",
    });
  } catch (e) {
    console.error("[Shiprocket /test-auth] Failed:", e.message);
    res.status(500).json({
      success: false,
      error: e.message,
      help: "Verify SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD in backend/.env"
    });
  }
});

// ─── GET /api/shiprocket/serviceability ─── Check delivery pincode availability ───
router.get("/serviceability", async (req, res) => {
  try {
    const { delivery_pincode } = req.query;
    if (!delivery_pincode || delivery_pincode.length !== 6) {
      return res.status(400).json({ error: "Invalid delivery pincode (must be 6 digits)" });
    }
    const pickup = process.env.SHIPROCKET_PICKUP_PINCODE || "110001";
    const service = getService();
    const data = await service.checkServiceability(pickup, delivery_pincode);
    res.json({ success: true, data });
  } catch (e) {
    console.error("[Shiprocket /serviceability] Failed:", e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── POST /api/shiprocket/test-order ─── Test fulfillment with real or dummy data ───
router.post("/test-order", diagnosticGuard, async (req, res) => {
  try {
    const { orderId, orderData: customData } = req.body;
    let orderData;

    if (orderId) {
      // Use a real order from the database
      const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
      const { data: items } = await supabase.from("order_items").select("*").eq("order_id", orderId);
      if (!order) return res.status(404).json({ error: `Order #${orderId} not found in database.` });

      const addr = order.address || {};
      orderData = {
        order_id: order.id,
        customer_name: addr.name || "Test Customer",
        address: addr.address || "123 Test Street",
        city: addr.city || "Delhi",
        pincode: addr.pincode || "110001",
        state: addr.state || "Delhi",
        phone: addr.phone || "9999999999",
        email: addr.email || "test@Nakshra.in",
        sub_total: order.amount ? (order.amount / 100) : 100,
        items: (items || []).map(i => ({
          name: i.name || "Sacred Item",
          sku: `SKU-${i.product_id}`,
          units: i.qty || 1,
          selling_price: i.price ? (i.price / 100) : 100
        }))
      };
    } else if (customData) {
      orderData = customData;
    } else {
      // Dummy test order
      orderData = {
        order_id: `TEST-${Date.now()}`,
        customer_name: "Nakshra Test Customer",
        address: "123 Sacred Ghats Road",
        city: "Varanasi",
        pincode: "221001",
        state: "Uttar Pradesh",
        phone: "9999999999",
        email: "test@Nakshra.in",
        sub_total: 599,
        items: [{ name: "5 Mukhi Nepal Rudraksha", sku: "SKU-TEST-1", units: 1, selling_price: 599 }]
      };
    }

    const service = getService();
    const result = await service.processFulfillment(orderData);

    // If real order, save shipping details back to DB
    if (orderId && result.success) {
      await supabase.from("orders").update({
        shipment_id: result.shipmentId,
        awb_code: result.awbData?.response?.data?.awb_code || null,
        label_url: result.labelUrl || null
      }).eq("id", orderId);
    }

    res.json({ success: true, result });
  } catch (e) {
    console.error("[Shiprocket /test-order] Failed:", e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── GET /api/shiprocket/track/:id ─── Track by shipment ID or AWB code ───
router.get("/track/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const service = getService();

    // Numeric = shipment ID, otherwise treat as AWB code
    const isShipmentId = /^\d+$/.test(id);
    const data = isShipmentId
      ? await service.trackShipment(id)
      : await service.trackByAwb(id);

    res.json({ success: true, type: isShipmentId ? "shipment_id" : "awb", data });
  } catch (e) {
    console.error("[Shiprocket /track] Failed:", e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── POST /api/shiprocket/cancel ─── Cancel Shiprocket order(s) ───
router.post("/cancel", diagnosticGuard, async (req, res) => {
  try {
    const { orderIds } = req.body;
    if (!orderIds || !Array.isArray(orderIds) || !orderIds.length) {
      return res.status(400).json({ error: "orderIds array is required" });
    }
    const service = getService();
    const data = await service.cancelOrder(orderIds);
    res.json({ success: true, data });
  } catch (e) {
    console.error("[Shiprocket /cancel] Failed:", e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
