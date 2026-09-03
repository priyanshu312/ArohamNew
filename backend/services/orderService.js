// services/orderService.js
// "3. ORDER PROCESSING": order (PENDING) → order items → reserve stock → payment record
const supabase = require("../config/supabase");

const PROMO_CODES = [
  {
    code: "Nakshra10",
    type: "percentage",
    value: 10,
    description: "Get 10% off on all sacred items."
  },
  {
    code: "DEVOTION20",
    type: "percentage",
    value: 20,
    minPurchase: 300000, // ₹3,000 in paise
    description: "Get 20% off on orders above ₹3,000."
  },
  {
    code: "FESTIVE500",
    type: "flat",
    value: 50000, // ₹500 in paise
    minPurchase: 250000, // ₹2,500 in paise
    description: "Flat ₹500 off on orders above ₹2,500."
  },
  {
    code: "FREEENERGIZATION",
    type: "flat",
    value: 9900, // ₹99 in paise (saves temple consecration fee)
    description: "Free Temple Consecration (Save ₹99)."
  },
  {
    code: "FIRST300",
    type: "flat",
    value: 30000, // ₹300 in paise
    description: "Flat ₹300 off on your first order."
  }
];

async function createPendingOrder(userId, products, address, promoCode) {
  const subtotal = products.reduce((s, p) => s + p.subtotal, 0);
  let discount = 0;

  if (promoCode) {
    const promo = PROMO_CODES.find(p => p.code.toUpperCase() === promoCode.toUpperCase());
    if (promo) {
      let valid = true;
      if (promo.minPurchase && subtotal < promo.minPurchase) {
        valid = false;
      }
      if (valid) {
        if (promo.type === "percentage") {
          discount = Math.floor(subtotal * (promo.value / 100));
        } else if (promo.type === "flat") {
          discount = Math.min(subtotal, promo.value);
        }
      }
    }
  }

  const amount = Math.max(0, subtotal - discount);

  // 1. Order record (status: PENDING) → ORDERS TABLE
  const { data: order, error: oErr } = await supabase
    .from("orders")
    .insert({ user_id: userId, amount, status: "PENDING", address })
    .select()
    .single();
  if (oErr) throw new Error("Order creation failed: " + oErr.message);

  // 2. Order items → ORDER ITEMS TABLE
  const rows = products.map((p) => ({
    order_id: order.id, product_id: p.id, name: p.name,
    price: p.price, qty: p.qty, emoji: p.emoji,
  }));
  const { error: iErr } = await supabase.from("order_items").insert(rows);
  if (iErr) throw new Error("Order items failed: " + iErr.message);

  // 3. Reserve stock → INVENTORY (products.stock / reserved)
  for (const p of products) {
    const { error } = await supabase.rpc("reserve_stock", {
      p_product_id: p.id, p_qty: p.qty,
    });
    if (error) throw new Error(`Stock reserve failed for ${p.name}: ${error.message}`);
  }

  // 4. Payment record (status: INITIATED) → PAYMENT TABLE
  const { data: payment, error: pErr } = await supabase
    .from("payments")
    .insert({ order_id: order.id, user_id: userId, amount, status: "INITIATED" })
    .select()
    .single();
  if (pErr) throw new Error("Payment record failed: " + pErr.message);

  return { order, payment, amount };
}

async function getUserOrders(userId) {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*), payments(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

module.exports = { createPendingOrder, getUserOrders };
