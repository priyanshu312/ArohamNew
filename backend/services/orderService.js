// services/orderService.js
// "3. ORDER PROCESSING": order (PENDING) → order items → reserve stock → payment record
const supabase = require("../config/supabase");
const { sendFeedback } = require("./gorseFeedback");
// Safe as a top-level require: paymentService does not import this module, so
// there is no cycle.
const { failOrder } = require("./paymentService");

// Coupons live in the `coupons` table, which admins manage from the admin
// portal (infra/db/2026-09-24_admin_coupons.sql). Only "percent" and "flat"
// rows are honoured from there; a fixed_total row is ignored whatever its
// is_active says, so nobody can switch on a ₹1 code from the portal. The table
// holds rupees (flat `value`, `minimum_order`); this file works in paise.
async function findPromo(promoCode) {
  const wanted = String(promoCode).trim().toUpperCase();
  if (testCouponEnabled() && wanted === TEST_PROMO.code.toUpperCase()) return TEST_PROMO;

  const { data, error } = await supabase
    .from("coupons")
    .select("code, type, value, minimum_order, expiry_date")
    .eq("is_active", true);
  if (error) throw new Error("Coupon lookup failed: " + error.message);

  const row = (data || []).find((c) => String(c.code).trim().toUpperCase() === wanted);
  if (!row || (row.type !== "percent" && row.type !== "flat")) return null;
  if (row.expiry_date && new Date(row.expiry_date) < new Date()) return { expired: true, code: row.code };

  return {
    code: row.code,
    type: row.type === "percent" ? "percentage" : "flat",
    value: row.type === "percent" ? Number(row.value) : Math.round(Number(row.value) * 100),
    minPurchase: row.minimum_order ? Math.round(Number(row.minimum_order) * 100) : 0,
  };
}

// Test-only code that charges exactly ₹1 whatever is in the cart, so a real
// Razorpay payment can be run end-to-end on LIVE keys without spending real
// money on a full-price order.
//
// It is deliberately NOT in the coupons table: it only exists while
// TEST_COUPON_ENABLED=true is set on the server. Without that, the code is
// rejected like any unknown string. That matters because the alternative — a
// permanently live code — would let anyone who learned the word "Welcome1" buy
// a ₹7,909 rudraksha for ₹1. The server is authoritative here (the client
// refuses to charge a discounted total the server did not agree to), so the
// flag alone is enough to switch it off.
//
// Turn on:  TEST_COUPON_ENABLED=true   Turn off: remove the var. No redeploy of
// code needed either way, and leave it OFF in normal operation.
const TEST_PROMO = {
  code: "Welcome1",
  type: "fixed_total",
  value: 100, // ₹1 in paise — the final amount charged, not a discount
  description: "TEST ONLY — charges ₹1."
};

function testCouponEnabled() {
  return String(process.env.TEST_COUPON_ENABLED).toLowerCase() === "true";
}

// Abandoned checkouts hold stock forever otherwise.
//
// PaymentPage cancels the order when the Razorpay window is dismissed, but that
// only helps if the browser is still there to do it — close the tab, lose the
// connection, or kill the app and the reservation is never released. Eleven
// such orders were sitting on ten units of stock, the oldest eleven days old.
//
// There is no scheduler on the free plan, so this runs opportunistically on
// order creation: cheap (one indexed query that usually matches nothing) and it
// cannot fall behind, because it only matters when someone is shopping.
const ABANDON_AFTER_MINUTES = 60;

async function sweepAbandonedOrders() {
  const cutoff = new Date(Date.now() - ABANDON_AFTER_MINUTES * 60 * 1000).toISOString();
  const { data: stale, error } = await supabase
    .from("orders").select("id").eq("status", "PENDING").lt("created_at", cutoff).limit(25);
  if (error) { console.error("[orders] abandoned sweep query failed:", error.message); return; }
  if (!stale || !stale.length) return;

  console.log(`[orders] releasing ${stale.length} abandoned checkout(s) older than ${ABANDON_AFTER_MINUTES}m.`);
  for (const o of stale) {
    // failOrder claims the row conditionally, so a concurrent sweep or a late
    // webhook for the same order cannot release the same stock twice.
    try {
      await failOrder(o.id, `Checkout abandoned — no payment within ${ABANDON_AFTER_MINUTES} minutes`);
    } catch (e) {
      console.error(`[orders] could not release abandoned order #${o.id}:`, e.message);
    }
  }
}

async function createPendingOrder(userId, products, address, promoCode) {
  // Best effort — a sweep failure must never stop someone checking out.
  await sweepAbandonedOrders().catch((e) => console.error("[orders] abandoned sweep failed:", e.message));

  const subtotal = products.reduce((s, p) => s + p.subtotal, 0);
  let discount = 0;
  let promoApplied = false;
  let promoReason = null;
  let promo = null;

  if (promoCode) {
    // A failed lookup must not block checkout: charge full price and say so,
    // and PaymentPage stops to show the customer the undiscounted total.
    let lookupFailed = false;
    promo = await findPromo(promoCode).catch((e) => {
      console.error("[orders]", e.message);
      lookupFailed = true;
      return null;
    });
    if (lookupFailed) {
      promoReason = "Couldn't check that code right now. Please try again.";
    } else if (!promo) {
      promoReason = "That code isn't valid.";
    } else if (promo.expired) {
      promoReason = `${promo.code} has expired.`;
    } else if (promo.minPurchase && subtotal < promo.minPurchase) {
      promoReason = `Add ₹${((promo.minPurchase - subtotal) / 100).toFixed(0)} more to use ${promo.code}.`;
    } else if (promo.type === "fixed_total") {
      // Charge exactly `value`, whatever the cart holds.
      discount = Math.max(0, subtotal - promo.value);
      promoApplied = true;
    } else {
      // Percentage discounts are whole rupees, rounded down, exactly as the
      // cart computes them (packages/shared-state CartContext). Paise here
      // would charge a total the customer was never shown: 10% of ₹4,405 is
      // ₹440.50, which the cart displays as ₹440.
      discount = promo.type === "percentage"
        ? Math.floor((subtotal * promo.value) / 100 / 100) * 100
        : Math.min(subtotal, promo.value);
      promoApplied = discount > 0;
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
  //
  // There is no transaction spanning these calls, so a failure partway through
  // used to leave the earlier items reserved forever: the throw propagated to
  // the route, which returned 500 without undoing anything, and the PENDING
  // order sat there holding stock with no payment row to explain it. Two such
  // orders exist in production. Unwind what we reserved before giving up.
  const reserved = [];
  for (const p of products) {
    const { error } = await supabase.rpc("reserve_stock", {
      p_product_id: p.id, p_qty: p.qty,
    });
    if (error) {
      for (const done of reserved) {
        const { error: relErr } = await supabase.rpc("release_stock", { p_product_id: done.id, p_qty: done.qty });
        if (relErr) console.error(`[orders] rollback release_stock failed for product ${done.id}: ${relErr.message}`);
      }
      await supabase.from("orders").update({ status: "PAYMENT_FAILED" }).eq("id", order.id);
      throw new Error(`Stock reserve failed for ${p.name}: ${error.message}`);
    }
    reserved.push(p);
  }

  // 4. Payment record (status: INITIATED) → PAYMENT TABLE
  //
  // The coupon is snapshotted here, as priced, so the admin portal's usage
  // figures survive the coupon later being edited or deleted. It counts as
  // redeemed once confirmOrder sets paid_at.
  const metadata = promoApplied
    ? { coupon: { code: promo.code.toUpperCase(), type: promo.type, value: promo.value, discount, subtotal } }
    : {};
  const { data: payment, error: pErr } = await supabase
    .from("payments")
    .insert({ order_id: order.id, user_id: userId, amount, status: "INITIATED", metadata })
    .select()
    .single();
  if (pErr) throw new Error("Payment record failed: " + pErr.message);

  return {
    order, payment, amount, subtotal, discount, promoApplied, promoReason,
    couponCode: promoApplied ? promo.code.toUpperCase() : null,
  };
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

  // PENDING and CONFIRMED both put units back, but NOT the same way.
  //
  // release_stock does `stock +qty, reserved -qty`, which is right only while
  // the units are still reserved — i.e. PENDING. A CONFIRMED order has already
  // had commit_stock consume its reservation, so running release_stock here
  // decrements `reserved` a second time and takes the reservation off somebody
  // else's pending order. That is not theoretical: product 5 sits one short
  // because of exactly this, and products 9 and 16 lost five more to the
  // related double-confirm bug.
  //
  // PAYMENT_FAILED already released on failure, so leave its stock alone.
  if (order.status === "PENDING" || order.status === "CONFIRMED") {
    const rpc = order.status === "CONFIRMED" ? "restock_sold" : "release_stock";
    const { data: items } = await supabase
      .from("order_items").select("product_id, qty").eq("order_id", orderId);
    for (const it of items || []) {
      const { error } = await supabase.rpc(rpc, { p_product_id: it.product_id, p_qty: it.qty });
      if (error) console.error(`[orders/cancel] ${rpc} failed for product ${it.product_id}: ${error.message}`);
    }
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

module.exports = { createPendingOrder, cancelOrder, getUserOrders, sweepAbandonedOrders };
