import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, CalendarClock, Lock, CheckCircle2 } from "lucide-react";
import { MAROON, SERIF, SANS } from "@nakshra/shared-config/theme";
import { api } from "@nakshra/shared-api";
import { useAuth } from "@nakshra/shared-auth";
import type { Astrologer } from "@visual/components/consult/AstrologerCard";
import { istDayKey, formatSlotDay, formatSlotTime, formatSlotRange } from "@visual/components/consult/slotTime";

interface Slot { start: string; end: string }

interface BookSlotModalProps {
  astrologer: Astrologer | null;
  onClose: () => void;
  onBooked: () => void;
}

const loadRazorpayScript = (): Promise<boolean> =>
  new Promise((resolve) => {
    if ((window as any).Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export function BookSlotModal({ astrologer, onClose, onBooked }: BookSlotModalProps) {
  const { user } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [fee, setFee] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [day, setDay] = useState<string | null>(null);
  const [picked, setPicked] = useState<Slot | null>(null);
  const [paying, setPaying] = useState(false);
  const [confirmed, setConfirmed] = useState<Slot | null>(null);

  // `quiet` refreshes the list without the loading state, keeping any error on screen.
  const loadSlots = async (astroId: string, quiet = false) => {
    if (!quiet) { setLoading(true); setError(""); }
    try {
      const data = await api(`/consult/astrologers/${astroId}/slots`, { timeoutMs: 45000 });
      setSlots(data.slots || []);
      setFee(Number(data.fee) || null);
    } catch (e: any) {
      if (!quiet) setError(e?.message || "Could not load slots.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSlots([]); setDay(null); setPicked(null); setConfirmed(null); setError(""); setPaying(false);
    if (astrologer) loadSlots(astrologer.id);
  }, [astrologer?.id]);

  const days = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const k = istDayKey(s.start);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    return Array.from(map.entries());
  }, [slots]);

  useEffect(() => {
    if (days.length && (!day || !days.some(([k]) => k === day))) setDay(days[0][0]);
  }, [days]);

  if (!astrologer) return null;

  const daySlots = days.find(([k]) => k === day)?.[1] || [];

  const pay = async () => {
    if (!picked) return;
    setPaying(true);
    setError("");
    if (!(await loadRazorpayScript())) {
      setPaying(false);
      setError("Could not load the payment gateway. Please check your connection and try again.");
      return;
    }

    let booking: any;
    try {
      booking = await api("/consult/bookings", {
        method: "POST",
        body: JSON.stringify({ astrologerId: astrologer.id, slotStart: picked.start }),
      });
    } catch (e: any) {
      setPaying(false);
      setPicked(null);
      setError(e?.message || "Could not book this slot.");
      loadSlots(astrologer.id, true);
      return;
    }

    // Free the slot straight away if they back out, rather than holding it for
    // the full 15 minutes.
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      api(`/consult/bookings/${booking.bookingId}/release`, { method: "POST" }).catch(() => {});
    };

    const phone = String(user?.user_metadata?.phone || "").replace(/\D/g, "").slice(-10);
    const rzp = new (window as any).Razorpay({
      key: booking.keyId,
      order_id: booking.razorpayOrderId,
      amount: booking.amount,
      currency: "INR",
      name: "Nakshra",
      description: `Consultation · ${formatSlotRange(booking.slotStart, booking.slotEnd)}`,
      image: `${window.location.origin}/icon-192.png`,
      // The server holds the slot for 15 minutes; close the checkout well
      // before that so a payment never lands after the hold.
      timeout: 600,
      prefill: {
        name: user?.user_metadata?.full_name || "",
        email: user?.email || "",
        contact: phone.length === 10 ? `+91${phone}` : "",
      },
      theme: { color: MAROON },
      handler: async (response: any) => {
        released = true; // paid: never release now
        try {
          await api(`/consult/bookings/${booking.bookingId}/verify`, {
            method: "POST",
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          setConfirmed({ start: booking.slotStart, end: booking.slotEnd });
          onBooked();
        } catch (e: any) {
          setError(
            `${e?.message || "We could not confirm your booking."} ` +
            `Payment ref: ${response?.razorpay_payment_id || "unknown"}. ` +
            `Please send it to us on WhatsApp (8306160032) and we will sort it out. Do not pay again.`
          );
        } finally {
          setPaying(false);
        }
      },
      modal: {
        ondismiss: () => { setPaying(false); release(); },
      },
    });
    rzp.open();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-[#1C0608]/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ fontFamily: SANS }} onClick={() => !paying && onClose()}>
      <div
        className="w-full sm:max-w-lg bg-[#FCFAF7] rounded-t-3xl sm:rounded-3xl border border-amber-900/15 shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 px-5 flex items-center justify-between text-white" style={{ background: `linear-gradient(135deg, ${MAROON} 0%, #4D1418 100%)` }}>
          <div className="flex items-center gap-3 min-w-0">
            <img src={astrologer.avatar} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-amber-300/60" />
            <div className="min-w-0">
              <p className="font-bold truncate" style={{ fontFamily: SERIF }}>{astrologer.name}</p>
              <p className="text-[11px] text-amber-100/80">
                30-minute consultation{fee ? ` · ₹${fee}` : ""}
              </p>
            </div>
          </div>
          <button onClick={onClose} disabled={paying} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {confirmed ? (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 size={44} className="mx-auto text-emerald-600" />
              <h3 className="text-lg font-bold text-[#5B1F24]" style={{ fontFamily: SERIF }}>Your slot is booked</h3>
              <p className="text-sm text-[#3E3125]">{formatSlotRange(confirmed.start, confirmed.end)} (IST)</p>
              <p className="text-xs text-amber-900/60">The Chat Now button appears on {astrologer.name}'s card when your slot begins.</p>
              <button onClick={onClose} className="mt-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#5B1F24] text-white">Done</button>
            </div>
          ) : loading ? (
            <p className="text-center text-sm text-amber-900/60 py-10 animate-pulse">Loading available slots…</p>
          ) : (
            <>
              {days.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <CalendarClock size={32} className="mx-auto text-amber-900/30" />
                  <p className="text-sm font-semibold text-[#5B1F24]">No open slots in the next two weeks.</p>
                  <p className="text-xs text-amber-900/60">Please check back soon.</p>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-900/50 mb-2">Pick a day</p>
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                      {days.map(([k, list]) => (
                        <button
                          key={k}
                          onClick={() => { setDay(k); setPicked(null); }}
                          className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${day === k ? "bg-[#5B1F24] text-white border-[#5B1F24]" : "bg-white text-[#5B1F24] border-amber-900/15 hover:bg-amber-50"}`}
                        >
                          {formatSlotDay(list[0].start)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-900/50 mb-2">Pick a time (IST)</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {daySlots.map((s) => (
                        <button
                          key={s.start}
                          onClick={() => setPicked(s)}
                          className={`px-2 py-2 rounded-xl text-xs font-bold border transition-colors ${picked?.start === s.start ? "bg-amber-500 text-white border-amber-500" : "bg-white text-[#3E3125] border-amber-900/15 hover:bg-amber-50"}`}
                        >
                          {formatSlotTime(s.start)}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}
            </>
          )}
        </div>

        {!confirmed && !loading && days.length > 0 && (
          <div className="p-4 px-5 border-t border-amber-900/10 bg-white">
            <button
              onClick={pay}
              disabled={!picked || paying}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-[#5B1F24] text-white disabled:opacity-40 hover:bg-[#78282E] transition-colors"
            >
              <Lock size={14} />
              {paying ? "Processing…" : picked ? `Pay ₹${fee} · ${formatSlotDay(picked.start)}, ${formatSlotTime(picked.start)}` : "Select a slot"}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
