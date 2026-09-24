// services/slotBookings.js — paid 30-minute slots with premium astrologers.
//
// A premium astrologer publishes a weekly pattern of half-hour slots
// (astrologers.weekly_slots, IST start times per weekday). A user picks one of
// the resulting dated slots, the slot is held for them while they pay, and the
// payment turns the hold into a booking.
//
// Double booking is prevented by the database, not by this file: the
// slot_bookings_one_live_booking_per_slot index lets only one PENDING_PAYMENT
// or CONFIRMED row exist per (astrologer, slot_start). Whatever this code
// checks first is for a friendly message; the insert is the real lock.
// Schema: infra/db/2026-09-24_premium_slot_bookings.sql.
const supabase = require("../config/supabase");

const SLOT_MINUTES = 30;
// A slot can't be booked less than this far ahead, so the astrologer is never
// surprised by a booking that starts in five minutes.
const BOOKING_LEAD_MINUTES = 60;
const BOOKING_WINDOW_DAYS = 14;
// How long a slot is held while the user is in the Razorpay window. The
// checkout itself times out sooner (see ConsultPage), so an honest payment
// always lands inside the hold.
const HOLD_MINUTES = 15;

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const IST_OFFSET_MS = 330 * 60 * 1000;
const TIME_RE = /^([01]\d|2[0-3]):(00|30)$/;

// Keep only well-formed half-hour start times, sorted and de-duplicated. The
// column is written from the browser, so nothing in it can be trusted as-is.
function normalizeWeeklySlots(raw) {
  const out = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const day of DAYS) {
    const times = Array.isArray(raw[day]) ? raw[day] : [];
    const clean = [...new Set(times.filter((t) => typeof t === "string" && TIME_RE.test(t)))].sort();
    if (clean.length) out[day] = clean;
  }
  return out;
}

// The IST calendar date ("2026-09-24"), weekday ("thu") and time ("15:30") of an instant.
function istParts(date) {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  const iso = shifted.toISOString();
  return { ymd: iso.slice(0, 10), day: DAYS[shifted.getUTCDay()], hhmm: iso.slice(11, 16) };
}

function slotStart(ymd, hhmm) {
  return new Date(`${ymd}T${hhmm}:00+05:30`);
}

// Is `start` one of the half-hour slots this weekly pattern offers?
function isOfferedSlot(weeklySlots, start) {
  if (!(start instanceof Date) || Number.isNaN(start.getTime())) return false;
  if (start.getTime() % (SLOT_MINUTES * 60 * 1000) !== 0) return false;
  const { day, hhmm } = istParts(start);
  return (normalizeWeeklySlots(weeklySlots)[day] || []).includes(hhmm);
}

// Is `start` inside the bookable window: at least the lead time away, and no
// further out than the booking window?
function isBookableTime(start, now = new Date()) {
  const t = start.getTime();
  return t >= now.getTime() + BOOKING_LEAD_MINUTES * 60 * 1000
    && t <= now.getTime() + BOOKING_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

// Every open slot in the booking window. `taken` holds the start times (ms) of
// slots that already have a live booking.
function listOpenSlots(weeklySlots, taken, now = new Date()) {
  const weekly = normalizeWeeklySlots(weeklySlots);
  const slots = [];
  for (let i = 0; i <= BOOKING_WINDOW_DAYS; i++) {
    const { ymd, day } = istParts(new Date(now.getTime() + i * 24 * 60 * 60 * 1000));
    for (const hhmm of weekly[day] || []) {
      const start = slotStart(ymd, hhmm);
      if (!isBookableTime(start, now) || taken.has(start.getTime())) continue;
      slots.push({ start: start.toISOString(), end: new Date(start.getTime() + SLOT_MINUTES * 60 * 1000).toISOString() });
    }
  }
  return slots;
}

// A premium astrologer who can take bookings, or null.
async function getBookableAstrologer(astrologerId) {
  const { data, error } = await supabase.from("astrologers")
    .select("id, full_name, is_premium, consultation_fee, weekly_slots, status")
    .eq("id", astrologerId)
    .maybeSingle();
  if (error) throw new Error("Astrologer lookup failed: " + error.message);
  if (!data || !data.is_premium || String(data.status).toUpperCase() === "BLOCKED") return null;
  return data;
}

// Start times (ms) of this astrologer's slots that are booked, or held by a
// payment still in progress.
async function takenSlotStarts(astrologerId, now = new Date()) {
  const { data, error } = await supabase.from("slot_bookings")
    .select("slot_start, status, hold_expires_at")
    .eq("astrologer_id", astrologerId)
    .in("status", ["PENDING_PAYMENT", "CONFIRMED"])
    .gte("slot_end", now.toISOString());
  if (error) throw new Error("Booking lookup failed: " + error.message);
  return new Set((data || [])
    .filter((b) => b.status === "CONFIRMED" || new Date(b.hold_expires_at) > now)
    .map((b) => new Date(b.slot_start).getTime()));
}

// Hold a slot for a user. Returns { booking } or { taken: true }.
async function holdSlot({ astrologerId, userId, start, amount, now = new Date() }) {
  const startIso = start.toISOString();

  // Clear holds that no longer count: ones whose time ran out, and this user's
  // own earlier holds with this astrologer (they came back and picked again).
  // Without this, an expired hold would keep the slot locked by the index.
  const { error: staleErr } = await supabase.from("slot_bookings")
    .update({ status: "EXPIRED" })
    .eq("astrologer_id", astrologerId)
    .eq("slot_start", startIso)
    .eq("status", "PENDING_PAYMENT")
    .lt("hold_expires_at", now.toISOString());
  if (staleErr) throw new Error("Could not clear expired holds: " + staleErr.message);
  const { error: ownErr } = await supabase.from("slot_bookings")
    .update({ status: "EXPIRED" })
    .eq("astrologer_id", astrologerId)
    .eq("user_id", String(userId))
    .eq("status", "PENDING_PAYMENT");
  if (ownErr) throw new Error("Could not clear earlier holds: " + ownErr.message);

  const { data, error } = await supabase.from("slot_bookings")
    .insert({
      astrologer_id: astrologerId,
      user_id: String(userId),
      slot_start: startIso,
      slot_end: new Date(start.getTime() + SLOT_MINUTES * 60 * 1000).toISOString(),
      amount,
      status: "PENDING_PAYMENT",
      hold_expires_at: new Date(now.getTime() + HOLD_MINUTES * 60 * 1000).toISOString(),
    })
    .select()
    .single();
  // 23505 = unique_violation: someone else holds or owns this slot.
  if (error && error.code === "23505") return { taken: true };
  if (error) throw new Error("Could not hold the slot: " + error.message);
  return { booking: data };
}

// Payment captured for a booking's Razorpay order. Called by both the browser
// (/verify) and the webhook, so it must be safe to run twice.
//
// Returns "CONFIRMED", "SLOT_LOST" (paid, but after the hold expired someone
// else took the slot — the money has to go back), or the row's status /
// "NOT_FOUND" when there was nothing to confirm.
async function confirmSlotBooking(razorpayOrderId, { razorpay_payment_id } = {}) {
  const paid = { razorpay_payment_id: razorpay_payment_id || null, paid_at: new Date().toISOString() };
  // EXPIRED is included: a payment can complete after the hold ran out (or
  // after the browser released it). If the slot is still free it becomes
  // theirs; if not, the index rejects the update and we land in SLOT_LOST.
  const { data, error } = await supabase.from("slot_bookings")
    .update({ status: "CONFIRMED", ...paid })
    .eq("razorpay_order_id", razorpayOrderId)
    .in("status", ["PENDING_PAYMENT", "EXPIRED"])
    .select("id");

  if (error && error.code === "23505") {
    await supabase.from("slot_bookings")
      .update({ status: "PAID_SLOT_LOST", ...paid })
      .eq("razorpay_order_id", razorpayOrderId)
      .in("status", ["PENDING_PAYMENT", "EXPIRED"]);
    console.error(`[Slots] PAID_SLOT_LOST for Razorpay order ${razorpayOrderId} (payment ${paid.razorpay_payment_id}): paid after the hold expired and the slot was taken. REFUND IT.`);
    return "SLOT_LOST";
  }
  if (error) throw new Error("Could not confirm the booking: " + error.message);
  if (data && data.length) return "CONFIRMED";

  const { data: row } = await supabase.from("slot_bookings")
    .select("status").eq("razorpay_order_id", razorpayOrderId).maybeSingle();
  return row ? row.status : "NOT_FOUND";
}

module.exports = {
  SLOT_MINUTES, BOOKING_LEAD_MINUTES, BOOKING_WINDOW_DAYS, HOLD_MINUTES,
  normalizeWeeklySlots, istParts, isOfferedSlot, isBookableTime, listOpenSlots,
  getBookableAstrologer, takenSlotStarts, holdSlot, confirmSlotBooking,
};
