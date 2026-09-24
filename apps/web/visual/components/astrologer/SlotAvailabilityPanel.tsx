import { useEffect, useState } from "react";
import { supabase } from "@nakshra/shared-services";
import { api } from "@nakshra/shared-api";
import { MAROON, SERIF } from "@nakshra/shared-config/theme";
import { CalendarClock, Crown, Copy, Trash2, Users } from "lucide-react";
import { formatSlotRange } from "@visual/components/consult/slotTime";

// Weekly availability for paid 30-minute slots. Stored on astrologers.weekly_slots
// as {"mon": ["10:00", "10:30"], ...} in IST; the backend turns that into
// dated slots for the next two weeks (backend/services/slotBookings.js).

const DAYS: { key: string; label: string }[] = [
  { key: "mon", label: "Mon" }, { key: "tue", label: "Tue" }, { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" }, { key: "fri", label: "Fri" }, { key: "sat", label: "Sat" }, { key: "sun", label: "Sun" },
];

const ALL_TIMES = Array.from({ length: 48 }, (_, i) =>
  `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

const BANDS = [
  { label: "Morning", from: "06:00", to: "12:00" },
  { label: "Afternoon", from: "12:00", to: "17:00" },
  { label: "Evening", from: "17:00", to: "22:00" },
  { label: "Night", from: "22:00", to: "24:00" },
  { label: "Early morning", from: "00:00", to: "06:00" },
];

const label12 = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

const MIN_FEE = 100;
const MAX_FEE = 100000;

export function SlotAvailabilityPanel({ astrologerId }: { astrologerId: string }) {
  const [weekly, setWeekly] = useState<Record<string, string[]>>({});
  const [fee, setFee] = useState("500");
  const [isPremium, setIsPremium] = useState(false);
  const [day, setDay] = useState("mon");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase.from("astrologers")
          .select("is_premium, consultation_fee, weekly_slots").eq("id", astrologerId).maybeSingle();
        if (!cancelled && data) {
          setIsPremium(!!data.is_premium);
          setFee(String(data.consultation_fee ?? 500));
          setWeekly(data.weekly_slots && typeof data.weekly_slots === "object" ? data.weekly_slots : {});
        }
      } catch (e) {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [astrologerId]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api(`/consult/astrologers/${astrologerId}/bookings`, { timeoutMs: 45000 });
        setBookings(data.bookings || []);
      } catch (e) {}
    };
    load();
    const poll = setInterval(load, 60000);
    return () => clearInterval(poll);
  }, [astrologerId]);

  const selected = new Set(weekly[day] || []);
  const setDayTimes = (d: string, times: string[]) =>
    setWeekly(prev => ({ ...prev, [d]: [...new Set(times)].sort() }));
  const toggle = (t: string) =>
    setDayTimes(day, selected.has(t) ? [...selected].filter(x => x !== t) : [...selected, t]);
  const copyToAll = () =>
    setWeekly(prev => Object.fromEntries(DAYS.map(d => [d.key, [...(prev[day] || [])]])));
  const totalPerWeek = DAYS.reduce((n, d) => n + (weekly[d.key]?.length || 0), 0);

  const save = async () => {
    const feeNum = Math.round(Number(fee));
    if (!Number.isFinite(feeNum) || feeNum < MIN_FEE || feeNum > MAX_FEE) {
      setMessage({ ok: false, text: `Fee must be between ₹${MIN_FEE} and ₹${MAX_FEE}.` });
      return;
    }
    setSaving(true);
    setMessage(null);
    const cleaned = Object.fromEntries(DAYS.map(d => [d.key, [...new Set(weekly[d.key] || [])].sort()]).filter(([, v]) => v.length));
    const { error } = await supabase.from("astrologers")
      .update({ weekly_slots: cleaned, consultation_fee: feeNum })
      .eq("id", astrologerId);
    setSaving(false);
    setMessage(error
      ? { ok: false, text: `Could not save: ${error.message}` }
      : { ok: true, text: "Saved. Seekers will see these slots for the next two weeks." });
  };

  if (loading) return <p className="p-8 text-center text-xs text-amber-900/60">Loading your slots…</p>;

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-4xl mx-auto w-full overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#5B1F24]" style={{ fontFamily: SERIF }}>Booking Slots</h2>
          <p className="text-xs text-amber-900/70">Mark the half-hour slots you are available each week (IST). Seekers pay your fee to book one.</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white shadow-lg active:scale-95 transition-all disabled:opacity-50"
          style={{ background: `linear-gradient(135deg, ${MAROON}, #7A2A30)` }}
        >
          {saving ? "Saving…" : "Save Slots & Fee"}
        </button>
      </div>

      {!isPremium && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300/60 text-xs text-amber-900 flex gap-2">
          <Crown size={16} className="shrink-0 text-amber-600" />
          <span>Slot booking is for Premium astrologers. You can set your slots now; seekers will see them once the Nakshra team marks your profile Premium.</span>
        </div>
      )}
      {message && (
        <p className={`p-3 rounded-xl text-xs font-semibold border ${message.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {message.text}
        </p>
      )}

      <div className="p-6 rounded-3xl bg-white border border-amber-900/15 space-y-2 shadow-xs">
        <label className="block text-xs font-bold text-[#5B1F24]">Fee per 30-minute slot (₹)</label>
        <input
          type="number"
          min={MIN_FEE}
          max={MAX_FEE}
          value={fee}
          onChange={e => setFee(e.target.value)}
          className="w-full sm:w-48 h-11 px-3.5 rounded-xl text-xs bg-amber-50/50 border border-amber-900/15 text-emerald-700 font-bold outline-none focus:border-[#5B1F24]"
        />
        <p className="text-[11px] text-amber-900/60">Changing the fee affects new bookings only.</p>
      </div>

      <div className="p-6 rounded-3xl bg-white border border-amber-900/15 space-y-4 shadow-xs">
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map(d => (
            <button
              key={d.key}
              onClick={() => setDay(d.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${day === d.key ? "text-white border-transparent" : "bg-white text-[#5B1F24] border-amber-900/15 hover:bg-amber-50"}`}
              style={day === d.key ? { background: MAROON } : {}}
            >
              {d.label}
              {(weekly[d.key]?.length || 0) > 0 && (
                <span className={`ml-1.5 text-[10px] ${day === d.key ? "text-amber-300" : "text-amber-700"}`}>{weekly[d.key].length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <button onClick={copyToAll} className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold bg-amber-50 text-[#5B1F24] border border-amber-900/15 hover:bg-amber-100">
            <Copy size={12} /> Copy this day to every day
          </button>
          <button onClick={() => setDayTimes(day, [])} className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold bg-white text-red-700 border border-red-200 hover:bg-red-50">
            <Trash2 size={12} /> Clear this day
          </button>
          <span className="text-amber-900/60 ml-auto">{totalPerWeek} slot{totalPerWeek === 1 ? "" : "s"} a week</span>
        </div>

        {BANDS.map(band => (
          <div key={band.label}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900/50 mb-1.5">{band.label}</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {ALL_TIMES.filter(t => t >= band.from && t < band.to).map(t => (
                <button
                  key={t}
                  onClick={() => toggle(t)}
                  className={`py-2 rounded-lg text-[11px] font-bold border transition-colors ${selected.has(t) ? "bg-amber-500 text-white border-amber-500" : "bg-white text-[#4A3E31] border-amber-900/15 hover:bg-amber-50"}`}
                >
                  {label12(t)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 rounded-3xl bg-white border border-amber-900/15 space-y-3 shadow-xs">
        <h3 className="text-sm font-bold text-[#5B1F24] flex items-center gap-2" style={{ fontFamily: SERIF }}>
          <Users size={15} className="text-amber-600" /> Upcoming booked slots
        </h3>
        {bookings.length === 0 ? (
          <p className="text-xs text-amber-900/60">No bookings yet.</p>
        ) : (
          <ul className="divide-y divide-amber-900/10">
            {bookings.map(b => (
              <li key={b.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-2 font-semibold text-[#4A3E31]">
                  <CalendarClock size={14} className="text-amber-600" />
                  {formatSlotRange(b.slotStart, b.slotEnd)}
                </span>
                <span className="font-bold text-[#5B1F24]">{b.seekerName}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-amber-900/60">When a slot starts, the seeker's chat request arrives in your Live Workstation queue.</p>
      </div>
    </div>
  );
}
