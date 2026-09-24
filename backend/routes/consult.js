// routes/consult.js — booking paid 30-minute slots with premium astrologers.
// The slot logic and the double-booking guard live in services/slotBookings.js.
const router = require("express").Router();
const requireAuth = require("../middleware/auth");
const supabase = require("../config/supabase");
const razorpay = require("../config/razorpay");
const { verifyPaymentSignature } = require("../services/paymentService");
const {
  SLOT_MINUTES, isOfferedSlot, isBookableTime, listOpenSlots,
  getBookableAstrologer, takenSlotStarts, holdSlot, confirmSlotBooking,
} = require("../services/slotBookings");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatIst(iso) {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });
}

// GET /api/consult/astrologers/:id/slots — open slots for the booking picker. Public.
router.get("/astrologers/:id/slots", async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: "Astrologer not found" });
    const astro = await getBookableAstrologer(req.params.id);
    if (!astro) return res.status(404).json({ error: "This astrologer does not take slot bookings." });
    const slots = listOpenSlots(astro.weekly_slots, await takenSlotStarts(astro.id));
    res.json({ fee: astro.consultation_fee, slotMinutes: SLOT_MINUTES, slots });
  } catch (e) {
    console.error("[Slots] slot list failed:", e.message);
    res.status(500).json({ error: "Could not load slots" });
  }
});

// GET /api/consult/astrologers/:id/bookings — the astrologer portal's list of
// upcoming booked slots. The portal has no server session, so this is public
// and returns only times and the seeker's first name.
router.get("/astrologers/:id/bookings", async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return res.json({ bookings: [] });
    const { data, error } = await supabase.from("slot_bookings")
      .select("id, user_id, slot_start, slot_end")
      .eq("astrologer_id", req.params.id)
      .eq("status", "CONFIRMED")
      .gte("slot_end", new Date().toISOString())
      .order("slot_start", { ascending: true });
    if (error) throw new Error(error.message);

    const userIds = [...new Set((data || []).map((b) => b.user_id))];
    const names = {};
    if (userIds.length) {
      const { data: users } = await supabase.from("users").select("id, full_name").in("id", userIds);
      for (const u of users || []) names[u.id] = String(u.full_name || "").trim().split(/\s+/)[0] || "";
    }
    res.json({
      bookings: (data || []).map((b) => ({
        id: b.id, slotStart: b.slot_start, slotEnd: b.slot_end, seekerName: names[b.user_id] || "Seeker",
      })),
    });
  } catch (e) {
    console.error("[Slots] astrologer bookings failed:", e.message);
    res.status(500).json({ error: "Could not load bookings" });
  }
});

// GET /api/consult/bookings/mine — the user's paid slots that haven't ended yet.
router.get("/bookings/mine", requireAuth, async (req, res) => {
  const { data, error } = await supabase.from("slot_bookings")
    .select("id, astrologer_id, slot_start, slot_end, status, chat_session_id")
    .eq("user_id", String(req.user.id))
    .eq("status", "CONFIRMED")
    .gte("slot_end", new Date().toISOString())
    .order("slot_start", { ascending: true });
  if (error) return res.status(500).json({ error: "Could not load your bookings" });
  res.json({
    serverTime: new Date().toISOString(),
    bookings: (data || []).map((b) => ({
      id: b.id, astrologerId: b.astrologer_id, slotStart: b.slot_start, slotEnd: b.slot_end, chatSessionId: b.chat_session_id,
    })),
  });
});

// POST /api/consult/bookings  body: { astrologerId, slotStart }
// Holds the slot and creates the Razorpay order for the astrologer's fee.
router.post("/bookings", requireAuth, async (req, res) => {
  try {
    const { astrologerId, slotStart } = req.body || {};
    if (!UUID_RE.test(String(astrologerId || ""))) return res.status(400).json({ error: "astrologerId is required" });
    const start = new Date(slotStart);

    const astro = await getBookableAstrologer(astrologerId);
    if (!astro) return res.status(404).json({ error: "This astrologer does not take slot bookings." });
    if (!isOfferedSlot(astro.weekly_slots, start)) return res.status(400).json({ error: "That slot isn't offered by this astrologer." });
    if (!isBookableTime(start)) return res.status(400).json({ error: "That slot can no longer be booked. Please pick another." });

    // One upcoming slot per astrologer at a time, matching what the page shows.
    const { data: existing, error: exErr } = await supabase.from("slot_bookings")
      .select("id, slot_start")
      .eq("user_id", String(req.user.id))
      .eq("astrologer_id", astrologerId)
      .eq("status", "CONFIRMED")
      .gte("slot_end", new Date().toISOString())
      .limit(1);
    if (exErr) throw new Error(exErr.message);
    if (existing && existing.length) {
      return res.status(409).json({ error: `You already have a slot booked with this astrologer (${formatIst(existing[0].slot_start)}).` });
    }

    const amount = Math.round(Number(astro.consultation_fee) * 100);
    if (!Number.isFinite(amount) || amount < 100) return res.status(400).json({ error: "This astrologer's fee isn't set up correctly." });

    const held = await holdSlot({ astrologerId, userId: req.user.id, start, amount });
    if (held.taken) return res.status(409).json({ error: "Someone just booked this slot. Please pick another." });
    const booking = held.booking;

    let rzpOrder;
    try {
      rzpOrder = await razorpay.orders.create({
        amount, currency: "INR", receipt: `slot_${booking.id}`.slice(0, 40),
        notes: { kind: "slot_booking", booking_id: booking.id, astrologer_id: astrologerId, slot_start: booking.slot_start },
      });
    } catch (rzpErr) {
      const detail = (rzpErr && rzpErr.error && (rzpErr.error.description || rzpErr.error.reason)) || (rzpErr && rzpErr.message) || "Razorpay order creation failed";
      console.error("[Slots] Razorpay orders.create failed:", rzpErr && rzpErr.statusCode, detail);
      await supabase.from("slot_bookings").update({ status: "EXPIRED" }).eq("id", booking.id);
      return res.status(502).json({ error: "Payment gateway error", details: detail });
    }

    const { error: upErr } = await supabase.from("slot_bookings")
      .update({ razorpay_order_id: rzpOrder.id }).eq("id", booking.id);
    if (upErr) {
      // Without the order id neither /verify nor the webhook could find this
      // booking, so a payment would be taken with nothing to confirm.
      await supabase.from("slot_bookings").update({ status: "EXPIRED" }).eq("id", booking.id);
      throw new Error("Could not record the payment order: " + upErr.message);
    }

    res.json({
      bookingId: booking.id,
      razorpayOrderId: rzpOrder.id,
      amount, currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
      slotStart: booking.slot_start,
      slotEnd: booking.slot_end,
      holdExpiresAt: booking.hold_expires_at,
      astrologerName: astro.full_name,
    });
  } catch (e) {
    console.error("[Slots] booking failed:", e.message);
    res.status(500).json({ error: "Could not book the slot. Please try again." });
  }
});

// Load a booking that belongs to the signed-in user.
async function ownBooking(req) {
  if (!UUID_RE.test(req.params.id)) return null;
  const { data } = await supabase.from("slot_bookings")
    .select("*").eq("id", req.params.id).eq("user_id", String(req.user.id)).maybeSingle();
  return data || null;
}

// POST /api/consult/bookings/:id/verify — browser path after Razorpay checkout.
// The webhook confirms the same payment independently; either can win.
router.post("/bookings/:id/verify", requireAuth, async (req, res) => {
  try {
    const booking = await ownBooking(req);
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (razorpay_order_id !== booking.razorpay_order_id
      || !verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature })) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }
    const result = await confirmSlotBooking(booking.razorpay_order_id, { razorpay_payment_id });
    if (result === "CONFIRMED") {
      return res.json({ success: true, status: "CONFIRMED", slotStart: booking.slot_start, slotEnd: booking.slot_end });
    }
    if (result === "SLOT_LOST") {
      return res.status(409).json({ success: false, status: result, error: "Your payment arrived after the slot was taken. We will refund it in full." });
    }
    res.status(409).json({ success: false, status: result, error: "This booking could not be confirmed." });
  } catch (e) {
    console.error("[Slots] verify failed:", e.message);
    res.status(500).json({ success: false, error: "Could not confirm the booking" });
  }
});

// POST /api/consult/bookings/:id/release — the user closed the payment window;
// free the slot now instead of waiting out the hold. If the payment completes
// anyway, confirmSlotBooking still takes the slot back while it's free.
router.post("/bookings/:id/release", requireAuth, async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: "Booking not found" });
  await supabase.from("slot_bookings")
    .update({ status: "EXPIRED" })
    .eq("id", req.params.id)
    .eq("user_id", String(req.user.id))
    .eq("status", "PENDING_PAYMENT");
  res.json({ success: true });
});

// POST /api/consult/bookings/:id/chat — open the chat for a booked slot, only
// while the slot is running. Reuses the chat session if one is still open.
router.post("/bookings/:id/chat", requireAuth, async (req, res) => {
  try {
    const booking = await ownBooking(req);
    if (!booking || booking.status !== "CONFIRMED") return res.status(404).json({ error: "Booking not found" });
    const now = Date.now();
    if (now < new Date(booking.slot_start).getTime()) {
      return res.status(403).json({ error: `Your slot starts ${formatIst(booking.slot_start)}. Chat opens then.` });
    }
    if (now >= new Date(booking.slot_end).getTime()) return res.status(403).json({ error: "This slot has ended." });

    if (booking.chat_session_id) {
      const { data: sess } = await supabase.from("chat_sessions")
        .select("*").eq("id", booking.chat_session_id).maybeSingle();
      if (sess && ["pending", "active"].includes(sess.status)) return res.json({ session: sess });
    }

    const { data: session, error } = await supabase.from("chat_sessions")
      .insert({
        user_id: String(req.user.id),
        astrologer_id: booking.astrologer_id,
        status: "pending",
        topic: `Booked slot · ${formatIst(booking.slot_start)}`,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("slot_bookings").update({ chat_session_id: session.id }).eq("id", booking.id);
    res.json({ session });
  } catch (e) {
    console.error("[Slots] chat open failed:", e.message);
    res.status(500).json({ error: "Could not open the chat" });
  }
});

module.exports = router;
