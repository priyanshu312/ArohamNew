// services/orderService.js
// "3. ORDER PROCESSING": order (PENDING) → order items → reserve stock → payment record
const supabase = require("../config/supabase");
const { sendFeedback } = require("./gorseFeedback");

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

  // Checkout is the strongest purchase-intent signal we get (many test payments
  // never complete), so feed it to the recommender as a "buy".
  sendFeedback("buy", userId, products.map((p) => p.id));

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

// User-initiated cancellation. Verifies ownership, refuses once the order has
// shipped, marks it CANCELLED, puts reserved/sold stock back, and flags a paid
// payment as REFUND_PENDING (refunds are handled manually / out of band).
const CANCELLABLE = new Set(["PENDING", "CONFIRMED", "PAYMENT_FAILED"]);

async function cancelOrder(orderId, userId) {
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, user_id, status")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!order) throw Object.assign(new Error("Order not found"), { status: 404 });
  if (String(order.user_id) !== String(userId))
    throw Object.assign(new Error("Not your order"), { status: 403 });
  if (order.status === "CANCELLED") return { order, alreadyCancelled: true };
  if (!CANCELLABLE.has(order.status))
    throw Object.assign(new Error(`Order can't be cancelled once it is ${order.status}.`), { status: 409 });

  await supabase.from("orders").update({ status: "CANCELLED" }).eq("id", orderId);

  // PENDING → stock is reserved; CONFIRMED → stock was committed (sold).
  // release_stock adds the units back in both cases. PAYMENT_FAILED already
  // released on failure, so leave its stock alone.
  if (order.status === "PENDING" || order.status === "CONFIRMED") {
    const { data: items } = await supabase
      .from("order_items").select("product_id, qty").eq("order_id", orderId);
    for (const it of items || [])
      await supabase.rpc("release_stock", { p_product_id: it.product_id, p_qty: it.qty });
  }

  const { data: pay } = await supabase
    .from("payments").select("status").eq("order_id", orderId).maybeSingle();
  await supabase.from("payments")
    .update({ status: pay && pay.status === "SUCCESS" ? "REFUND_PENDING" : "CANCELLED" })
    .eq("order_id", orderId);

  return { order: { ...order, status: "CANCELLED" }, alreadyCancelled: false };
}

async function getUserOrders(userId, phone) {
  const last10 = phone ? String(phone).replace(/\D/g, "").slice(-10) : "";

  // Adopt any guest orders placed with this phone before the account existed,
  // so they show up in history. The client used to do this with a direct
  // supabase update, which stops working once orders RLS is locked to
  // auth.uid() = user_id — so it moves here (service role, one shot).
  if (last10) {
    await supabase
      .from("orders")
      .update({ user_id: userId })
      .is("user_id", null)
      .eq("user_phone", last10);
  }

  let query = supabase
    .from("orders")
    .select("*, order_items(*), payments(*)")
    .order("created_at", { ascending: false });
  query = last10
    ? query.or(`user_id.eq.${userId},user_phone.eq.${last10}`)
    : query.eq("user_id", userId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

module.exports = { createPendingOrder, cancelOrder, getUserOrders };
