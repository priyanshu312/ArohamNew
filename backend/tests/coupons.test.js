// Unit tests for coupon pricing in createPendingOrder (services/orderService.js).
// Run: pnpm test   (node --test)
//
// The database is faked: coupons come from the `rows` handed to each test, and
// the payments insert is captured so the metadata snapshot can be checked.
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

let rows = [];
let orders = [];
let couponLookupError = null;
let paymentInsert = null;

class Query {
  constructor(table) { this.table = table; this.op = "select"; this.filters = []; this.payload = null; }
  select() { return this; }
  insert(payload) { this.op = "insert"; this.payload = payload; return this; }
  update(payload) { this.op = "update"; this.payload = payload; return this; }
  eq(col, val) { this.filters.push((r) => r[col] === val); return this; }
  lt() { return this; }
  in(col, vals) { this.filters.push((r) => vals.includes(r[col])); return this; }
  limit() { return this; }
  single() { return this; }
  then(resolve, reject) { return Promise.resolve(this.result()).then(resolve, reject); }
  result() {
    if (this.table === "coupons") {
      if (couponLookupError) return { data: null, error: { message: couponLookupError } };
      return { data: rows.filter((r) => this.filters.every((f) => f(r))), error: null };
    }
    // The abandoned-checkout sweep (PENDING) and the first-order check both read here.
    if (this.table === "orders" && this.op === "select") return { data: orders.filter((r) => this.filters.every((f) => f(r))), error: null };
    if (this.table === "orders" && this.op === "insert") return { data: { id: "order-1", ...this.payload }, error: null };
    if (this.table === "payments" && this.op === "insert") { paymentInsert = this.payload; return { data: { id: 1, ...this.payload }, error: null }; }
    return { data: null, error: null };
  }
}

const fakeSupabase = { from: (t) => new Query(t), rpc: async () => ({ error: null }) };

function stub(relPath, exports) {
  const file = require.resolve(path.join(__dirname, "..", relPath));
  require.cache[file] = { id: file, filename: file, loaded: true, exports };
}
stub("config/supabase", fakeSupabase);
stub("services/gorseFeedback", { sendFeedback: () => {} });
stub("services/paymentService", { failOrder: async () => {} });

const { createPendingOrder } = require("../services/orderService");

// One line of ₹`rupees`, in paise as the order route passes it.
const cart = (rupees) => [{ id: 7, name: "Shree Yantra", price: rupees * 100, qty: 1, subtotal: rupees * 100, emoji: "" }];
const coupon = (over) => ({ code: "NAKSHRA10", type: "percent", value: 10, minimum_order: null, expiry_date: null, is_active: true, ...over });

beforeEach(() => {
  rows = [];
  orders = [];
  couponLookupError = null;
  paymentInsert = null;
  delete process.env.TEST_COUPON_ENABLED;
});

test("percent coupon applies in any case and is snapshotted on the payment", async () => {
  rows = [coupon()];
  const r = await createPendingOrder("u1", cart(500), {}, "nakshra10");
  assert.equal(r.promoApplied, true);
  assert.equal(r.discount, 5000);
  assert.equal(r.amount, 45000);
  assert.equal(r.couponCode, "NAKSHRA10");
  assert.deepEqual(paymentInsert.metadata, {
    coupon: { code: "NAKSHRA10", type: "percentage", value: 10, discount: 5000, subtotal: 50000 },
  });
  assert.equal(paymentInsert.amount, 45000);
});

test("percentage discount is whole rupees rounded down, as the cart shows it", async () => {
  rows = [coupon({ code: "ODD125", value: 12.5 })];
  const r = await createPendingOrder("u1", cart(4405), {}, "odd125");
  // 12.5% of ₹4,405 is ₹550.625 → ₹550 off, charged ₹3,855.
  assert.equal(r.discount, 55000);
  assert.equal(r.amount, 385500);

  rows = [coupon()];
  const ten = await createPendingOrder("u1", cart(4405), {}, "NAKSHRA10");
  assert.equal(ten.discount, 44000); // ₹440.50 → ₹440
});

test("flat coupon: table rupees become paise, and the minimum order is enforced", async () => {
  rows = [coupon({ code: "FESTIVE500", type: "flat", value: 500, minimum_order: 2500 })];

  const short = await createPendingOrder("u1", cart(2000), {}, "FESTIVE500");
  assert.equal(short.promoApplied, false);
  assert.equal(short.amount, 200000);
  assert.match(short.promoReason, /Add ₹500 more/);
  assert.deepEqual(paymentInsert.metadata, {});

  const enough = await createPendingOrder("u1", cart(3000), {}, "FESTIVE500");
  assert.equal(enough.discount, 50000);
  assert.equal(enough.amount, 250000);
});

test("first-order-only coupon: new customer gets it, returning customer doesn't", async () => {
  rows = [coupon({ code: "FIRST300", type: "flat", value: 300, first_order_only: true })];

  // Only cancelled/failed orders, or someone else's kept order: still a first order.
  orders = [
    { id: "a", user_id: "u1", status: "CANCELLED" },
    { id: "b", user_id: "u1", status: "PAYMENT_FAILED" },
    { id: "c", user_id: "someone-else", status: "CONFIRMED" },
  ];
  const first = await createPendingOrder("u1", cart(500), {}, "first300");
  assert.equal(first.promoApplied, true);
  assert.equal(first.discount, 30000);

  for (const status of ["CONFIRMED", "Processing", "SHIPPED", "DELIVERED"]) {
    orders = [{ id: "d", user_id: "u1", status }];
    const again = await createPendingOrder("u1", cart(500), {}, "FIRST300");
    assert.equal(again.promoApplied, false, `a ${status} order means it isn't the first`);
    assert.equal(again.amount, 50000);
    assert.equal(again.promoReason, "FIRST300 is for your first order only.");
  }
});

test("coupons without first_order_only ignore order history", async () => {
  rows = [coupon()];
  orders = [{ id: "d", user_id: "u1", status: "DELIVERED" }];
  const r = await createPendingOrder("u1", cart(500), {}, "NAKSHRA10");
  assert.equal(r.promoApplied, true);
});

test("switched-off coupon is refused", async () => {
  rows = [coupon({ is_active: false })];
  const r = await createPendingOrder("u1", cart(500), {}, "NAKSHRA10");
  assert.equal(r.promoApplied, false);
  assert.equal(r.amount, 50000);
  assert.equal(r.promoReason, "That code isn't valid.");
  assert.equal(r.couponCode, null);
});

test("expired coupon is refused with its own message", async () => {
  rows = [coupon({ expiry_date: "2020-01-01T23:59:59+05:30" })];
  const r = await createPendingOrder("u1", cart(500), {}, "NAKSHRA10");
  assert.equal(r.promoApplied, false);
  assert.equal(r.promoReason, "NAKSHRA10 has expired.");
});

test("a coupon expiring in the future still applies", async () => {
  rows = [coupon({ expiry_date: new Date(Date.now() + 86400000).toISOString() })];
  const r = await createPendingOrder("u1", cart(500), {}, "NAKSHRA10");
  assert.equal(r.promoApplied, true);
});

test("an active fixed_total row in the table is never honoured", async () => {
  rows = [coupon({ code: "WELCOME1", type: "fixed_total", value: 1 })];
  const r = await createPendingOrder("u1", cart(500), {}, "welcome1");
  assert.equal(r.promoApplied, false);
  assert.equal(r.amount, 50000);
});

test("the ₹1 test code works only while TEST_COUPON_ENABLED is set", async () => {
  process.env.TEST_COUPON_ENABLED = "true";
  const on = await createPendingOrder("u1", cart(500), {}, "welcome1");
  assert.equal(on.promoApplied, true);
  assert.equal(on.amount, 100);
  assert.equal(paymentInsert.metadata.coupon.code, "WELCOME1");

  delete process.env.TEST_COUPON_ENABLED;
  const off = await createPendingOrder("u1", cart(500), {}, "welcome1");
  assert.equal(off.promoApplied, false);
  assert.equal(off.amount, 50000);
});

test("a failed coupon lookup charges full price instead of blocking checkout", async () => {
  couponLookupError = "connection reset";
  const r = await createPendingOrder("u1", cart(500), {}, "NAKSHRA10");
  assert.equal(r.promoApplied, false);
  assert.equal(r.amount, 50000);
  assert.match(r.promoReason, /Couldn't check that code/);
});

test("no code: full price and empty metadata", async () => {
  const r = await createPendingOrder("u1", cart(500), {}, undefined);
  assert.equal(r.amount, 50000);
  assert.equal(r.promoReason, null);
  assert.deepEqual(paymentInsert.metadata, {});
});
