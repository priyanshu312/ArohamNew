// Unit tests for premium astrologer slot bookings (services/slotBookings.js).
// Run: pnpm test   (node --test)
//
// The database is faked, including the partial unique index on
// (astrologer_id, slot_start) for PENDING_PAYMENT/CONFIRMED rows — that index
// is the real double-booking guard, so the fake enforces it the same way.
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

let bookings = [];
let nextId = 1;
const LIVE = ["PENDING_PAYMENT", "CONFIRMED"];

function violatesSlotIndex(candidate, ignoreId) {
  return LIVE.includes(candidate.status) && bookings.some((b) =>
    b.id !== ignoreId && LIVE.includes(b.status)
    && b.astrologer_id === candidate.astrologer_id && b.slot_start === candidate.slot_start);
}

class Query {
  constructor(table) { this.table = table; this.op = "select"; this.filters = []; this.payload = null; }
  select() { return this; }
  insert(p) { this.op = "insert"; this.payload = p; return this; }
  update(p) { this.op = "update"; this.payload = p; return this; }
  eq(c, v) { this.filters.push((r) => r[c] === v); return this; }
  in(c, vs) { this.filters.push((r) => vs.includes(r[c])); return this; }
  lt(c, v) { this.filters.push((r) => r[c] < v); return this; }
  gte(c, v) { this.filters.push((r) => r[c] >= v); return this; }
  single() { this.one = true; return this; }
  maybeSingle() { this.one = true; return this; }
  then(resolve, reject) { return Promise.resolve(this.result()).then(resolve, reject); }
  result() {
    const unique = { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } };
    const match = (r) => this.filters.every((f) => f(r));
    if (this.op === "insert") {
      const row = { id: `b${nextId++}`, ...this.payload };
      if (violatesSlotIndex(row)) return unique;
      bookings.push(row);
      return { data: row, error: null };
    }
    if (this.op === "update") {
      const hits = bookings.filter(match);
      // Postgres checks every row before committing any of them.
      for (const r of hits) if (violatesSlotIndex({ ...r, ...this.payload }, r.id)) return unique;
      hits.forEach((r) => Object.assign(r, this.payload));
      return { data: hits.map((r) => ({ id: r.id })), error: null };
    }
    const rows = bookings.filter(match);
    return { data: this.one ? rows[0] || null : rows, error: null };
  }
}

const file = require.resolve(path.join(__dirname, "..", "config/supabase"));
require.cache[file] = { id: file, filename: file, loaded: true, exports: { from: (t) => new Query(t) } };

const {
  normalizeWeeklySlots, isOfferedSlot, isBookableTime, listOpenSlots, holdSlot, confirmSlotBooking, takenSlotStarts,
} = require("../services/slotBookings");

// Wed 24 Sep 2026, 10:00 IST.
const NOW = new Date("2026-09-24T10:00:00+05:30");
const ASTRO = "11111111-1111-1111-1111-111111111111";
const at = (s) => new Date(s);

beforeEach(() => { bookings = []; nextId = 1; });

test("weekly slots keep only valid half-hour times, sorted and de-duplicated", () => {
  assert.deepEqual(
    normalizeWeeklySlots({ mon: ["10:30", "10:00", "10:30", "10:15", "24:00", 7], xyz: ["10:00"], tue: "10:00" }),
    { mon: ["10:00", "10:30"] },
  );
  assert.deepEqual(normalizeWeeklySlots(null), {});
  assert.deepEqual(normalizeWeeklySlots(["mon"]), {});
});

test("a slot is offered only on its IST weekday and time", () => {
  const weekly = { thu: ["15:00"] };
  assert.equal(isOfferedSlot(weekly, at("2026-09-24T15:00:00+05:30")), true);  // Thursday
  assert.equal(isOfferedSlot(weekly, at("2026-09-25T15:00:00+05:30")), false); // Friday
  assert.equal(isOfferedSlot(weekly, at("2026-09-24T15:30:00+05:30")), false);
  assert.equal(isOfferedSlot(weekly, at("2026-09-24T15:00:30+05:30")), false); // not on the half hour
  assert.equal(isOfferedSlot(weekly, at("not a date")), false);
});

test("late-night IST slots map to the right weekday", () => {
  // 00:30 IST Thursday is still Wednesday in UTC.
  assert.equal(isOfferedSlot({ thu: ["00:30"] }, at("2026-09-24T00:30:00+05:30")), true);
  assert.equal(isOfferedSlot({ wed: ["00:30"] }, at("2026-09-24T00:30:00+05:30")), false);
});

test("bookable window: at least an hour ahead, at most 14 days", () => {
  assert.equal(isBookableTime(at("2026-09-24T10:30:00+05:30"), NOW), false);
  assert.equal(isBookableTime(at("2026-09-24T11:00:00+05:30"), NOW), true);
  assert.equal(isBookableTime(at("2026-10-08T10:00:00+05:30"), NOW), true);
  assert.equal(isBookableTime(at("2026-10-08T10:30:00+05:30"), NOW), false);
});

test("open slots skip past, too-soon and taken slots", () => {
  const weekly = { thu: ["09:00", "10:30", "11:00", "11:30"], fri: ["18:00"] };
  const taken = new Set([at("2026-09-24T11:30:00+05:30").getTime()]);
  const slots = listOpenSlots(weekly, taken, NOW).map((s) => s.start);
  assert.deepEqual(slots.slice(0, 3), [
    at("2026-09-24T11:00:00+05:30").toISOString(),
    at("2026-09-25T18:00:00+05:30").toISOString(),
    at("2026-10-01T09:00:00+05:30").toISOString(),
  ]);
  const first = listOpenSlots(weekly, taken, NOW)[0];
  assert.equal(new Date(first.end) - new Date(first.start), 30 * 60 * 1000);
});

test("two users cannot hold the same slot", async () => {
  const start = at("2026-09-25T18:00:00+05:30");
  const a = await holdSlot({ astrologerId: ASTRO, userId: "u1", start, amount: 50000, now: NOW });
  const b = await holdSlot({ astrologerId: ASTRO, userId: "u2", start, amount: 50000, now: NOW });
  assert.ok(a.booking);
  assert.deepEqual(b, { taken: true });
});

test("an expired hold frees the slot for the next user", async () => {
  const start = at("2026-09-25T18:00:00+05:30");
  await holdSlot({ astrologerId: ASTRO, userId: "u1", start, amount: 50000, now: NOW });
  const later = new Date(NOW.getTime() + 16 * 60 * 1000);
  const b = await holdSlot({ astrologerId: ASTRO, userId: "u2", start, amount: 50000, now: later });
  assert.ok(b.booking);
  assert.equal(bookings[0].status, "EXPIRED");
});

test("a user picking again replaces their own earlier hold", async () => {
  await holdSlot({ astrologerId: ASTRO, userId: "u1", start: at("2026-09-25T18:00:00+05:30"), amount: 50000, now: NOW });
  const again = await holdSlot({ astrologerId: ASTRO, userId: "u1", start: at("2026-09-25T18:00:00+05:30"), amount: 50000, now: NOW });
  assert.ok(again.booking);
  assert.deepEqual(bookings.map((b) => b.status), ["EXPIRED", "PENDING_PAYMENT"]);
});

test("a confirmed booking can't be taken, even after its hold time", async () => {
  const start = at("2026-09-25T18:00:00+05:30");
  const { booking } = await holdSlot({ astrologerId: ASTRO, userId: "u1", start, amount: 50000, now: NOW });
  booking.razorpay_order_id = "order_1";
  assert.equal(await confirmSlotBooking("order_1", { razorpay_payment_id: "pay_1" }), "CONFIRMED");
  const later = new Date(NOW.getTime() + 60 * 60 * 1000);
  assert.deepEqual(await holdSlot({ astrologerId: ASTRO, userId: "u2", start, amount: 50000, now: later }), { taken: true });
});

test("confirming twice (verify + webhook) is harmless", async () => {
  const { booking } = await holdSlot({ astrologerId: ASTRO, userId: "u1", start: at("2026-09-25T18:00:00+05:30"), amount: 50000, now: NOW });
  booking.razorpay_order_id = "order_1";
  assert.equal(await confirmSlotBooking("order_1", { razorpay_payment_id: "pay_1" }), "CONFIRMED");
  assert.equal(await confirmSlotBooking("order_1", { razorpay_payment_id: "pay_1" }), "CONFIRMED");
  assert.equal(await confirmSlotBooking("order_unknown", {}), "NOT_FOUND");
});

test("a late payment still gets the slot if nobody else took it", async () => {
  const { booking } = await holdSlot({ astrologerId: ASTRO, userId: "u1", start: at("2026-09-25T18:00:00+05:30"), amount: 50000, now: NOW });
  booking.razorpay_order_id = "order_1";
  booking.status = "EXPIRED";
  assert.equal(await confirmSlotBooking("order_1", { razorpay_payment_id: "pay_1" }), "CONFIRMED");
});

test("a late payment for a slot someone else took is flagged for refund", async () => {
  const start = at("2026-09-25T18:00:00+05:30");
  const { booking: first } = await holdSlot({ astrologerId: ASTRO, userId: "u1", start, amount: 50000, now: NOW });
  first.razorpay_order_id = "order_1";
  const later = new Date(NOW.getTime() + 16 * 60 * 1000);
  const { booking: second } = await holdSlot({ astrologerId: ASTRO, userId: "u2", start, amount: 50000, now: later });
  second.razorpay_order_id = "order_2";
  assert.equal(await confirmSlotBooking("order_2", { razorpay_payment_id: "pay_2" }), "CONFIRMED");

  assert.equal(await confirmSlotBooking("order_1", { razorpay_payment_id: "pay_1" }), "SLOT_LOST");
  assert.equal(first.status, "PAID_SLOT_LOST");
  assert.equal(first.razorpay_payment_id, "pay_1");
});

test("taken slots include live holds and confirmed bookings, not expired holds", async () => {
  await holdSlot({ astrologerId: ASTRO, userId: "u1", start: at("2026-09-25T18:00:00+05:30"), amount: 50000, now: NOW });
  const { booking } = await holdSlot({ astrologerId: ASTRO, userId: "u2", start: at("2026-09-25T18:30:00+05:30"), amount: 50000, now: NOW });
  booking.razorpay_order_id = "order_2";
  await confirmSlotBooking("order_2", {});

  const soon = await takenSlotStarts(ASTRO, NOW);
  assert.equal(soon.size, 2);
  const later = await takenSlotStarts(ASTRO, new Date(NOW.getTime() + 16 * 60 * 1000));
  assert.deepEqual([...later], [at("2026-09-25T18:30:00+05:30").getTime()]);
});
