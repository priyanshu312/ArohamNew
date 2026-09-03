import { Astrologer } from "@nakshra/shared-types";
import { MOCK_ASTROLOGERS } from "@nakshra/shared-config";
import { supabase } from "@nakshra/shared-services";
import { API_BASE } from "./api";

export function isAstrologerActive(isOnline: boolean, workingHours: any) {
  if (!isOnline) return false;
  if (workingHours && workingHours.enabled) {
    const { start, end } = workingHours;
    if (start && end) {
      const nowTime = new Date();
      const hrs = String(nowTime.getHours()).padStart(2, "0");
      const mins = String(nowTime.getMinutes()).padStart(2, "0");
      const currentTimeStr = `${hrs}:${mins}`;
      if (start <= end) {
        if (currentTimeStr < start || currentTimeStr > end) return false;
      } else {
        if (currentTimeStr < start && currentTimeStr > end) return false;
      }
    }
  }
  return true;
}

export async function fetchAstrologers(): Promise<Astrologer[]> {
  try {
    const { data, error } = await supabase
      .from('astrologers')
      .select('*');

    if (error || !data || data.length === 0) throw new Error(error?.message || 'Empty data');

    const completedData = data.filter((liveData: any) => liveData.bio && liveData.bio !== "PENDING_WIZARD_COMPLETION" && liveData.bio.trim() !== "");
    return completedData.map((liveData: any) => ({
      id: liveData.id,
      name: liveData.full_name || liveData.name || "Acharya Astrologer",
      title: liveData.title || "Senior Vedic Jyotish Master",
      experience: `${liveData.experience_years || 5}+ Years Exp`,
      rating: Number(liveData.rating) || 4.95,
      consultations: liveData.consultations_count || 120,
      specialties: liveData.specialties || ["Vedic Kundali", "Gemstones"],
      languages: liveData.languages || ["Hindi", "English"],
      avatar: liveData.avatar_url || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
      status: (isAstrologerActive(liveData.is_online, liveData.working_hours) ? "online" : "offline") as "online" | "offline" | "busy",
      pricePerMin: Number(liveData.price_per_min) || 20,
      bio: liveData.bio,
      workingHours: liveData.working_hours,
      lastActiveAt: liveData.last_active_at,
    }));
  } catch (err) {
    console.warn("Supabase astrologers fetch failed, falling back to mock...", err);
    return MOCK_ASTROLOGERS;
  }
}

export async function trackOrder(orderId: string): Promise<any> {
  try {
    // Note: the backend has no /shiprocket/track route today (only /serviceability),
    // so this always falls through to the estimate below — kept as a real fetch so it
    // starts working automatically once that endpoint exists, without another mobile change.
    const res = await fetch(`${API_BASE}/shiprocket/track?orderId=${orderId}`);
    if (!res.ok) throw new Error('Tracking Error');
    return { ...(await res.json()), isEstimate: false };
  } catch {
    return {
      status: 'In Transit',
      courier: 'Delhivery',
      location: 'Delhi Hub',
      eta: 'In 2 days',
      updates: [
        { time: '10:00 AM', status: 'Dispatched from Hub' },
        { time: 'Yesterday', status: 'Packed & Handed Over' }
      ],
      isEstimate: true
    };
  }
}
