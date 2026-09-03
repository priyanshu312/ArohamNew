// routes/shiprocket.js — Shiprocket integration endpoints (diagnostic, testing, tracking)
const router = require("express").Router();
const ShiprocketService = require("../services/shiprocket/ShiprocketService");
const supabase = require("../config/supabase");

/** Helper: create a fresh ShiprocketService instance using env credentials */
function getService() {
  return new ShiprocketService(process.env.SHIPROCKET_EMAIL, process.env.SHIPROCKET_PASSWORD);
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

// ─── POST /api/shiprocket/test-auth ─── Test credential authentication ───
router.post("/test-auth", async (req, res) => {
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
router.post("/test-order", async (req, res) => {
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
router.post("/cancel", async (req, res) => {
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
