// Slots are published in IST, so they are always shown in IST whatever the
// visitor's own timezone is.
const IST = "Asia/Kolkata";

export interface SlotBooking {
  id: string;
  astrologerId: string;
  slotStart: string;
  slotEnd: string;
  chatSessionId?: string | null;
}

export const istDayKey = (iso: string) =>
  new Date(iso).toLocaleDateString("en-CA", { timeZone: IST }); // 2026-09-25

export const formatSlotDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { timeZone: IST, weekday: "short", day: "numeric", month: "short" });

export const formatSlotTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { timeZone: IST, hour: "numeric", minute: "2-digit" });

export const formatSlotRange = (start: string, end: string) =>
  `${formatSlotDay(start)}, ${formatSlotTime(start)} – ${formatSlotTime(end)}`;
