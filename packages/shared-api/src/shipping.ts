import { api } from "./api";

export interface ShippingEstimate {
  courier: string;
  deliveryDate: string;
  etdDays: number;
  city?: string;
  state?: string;
  codAvailable: boolean;
}

export const FALLBACK_DELIVERY = "3–5 business days";

const fallback = (): ShippingEstimate => ({
  courier: "",
  deliveryDate: FALLBACK_DELIVERY,
  etdDays: 5,
  codAvailable: true,
});

const formatDate = (d: Date) =>
  d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

// One estimate per pincode per day, shared by every page. The product page, the
// shipping step and the confirmation page used to ask separately (and the
// confirmation page not at all: it printed today + 4), so the same customer saw
// three different dates for one parcel.
const cacheKey = (pin: string) => `Nakshra_eta_${pin}_${new Date().toDateString()}`;

function readCache(pin: string): ShippingEstimate | null {
  try {
    const raw = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(cacheKey(pin)) : null;
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(pin: string, est: ShippingEstimate) {
  try { sessionStorage.setItem(cacheKey(pin), JSON.stringify(est)); } catch {}
}

/** The estimate already shown for this pincode today, if any — no network. */
export function cachedDeliveryEstimate(pincode: string): ShippingEstimate | null {
  const pin = String(pincode || "").replace(/\D/g, "").slice(0, 6);
  return pin.length === 6 ? readCache(pin) : null;
}

export async function getShiprocketDeliveryEstimate(pincode: string): Promise<ShippingEstimate> {
  const pin = String(pincode || "").replace(/\D/g, "").slice(0, 6);
  if (pin.length !== 6) return fallback();

  const cached = readCache(pin);
  if (cached) return cached;

  try {
    const res = await api(`/shiprocket/serviceability?delivery_pincode=${pin}`, { timeoutMs: 20000 });
    const srData = res?.data?.data || res?.data || res;
    const companies: any[] = srData?.available_courier_companies || [];
    if (!companies.length) return fallback();

    // The courier Shiprocket will actually assign, not whichever is listed first.
    const recommendedId = srData?.recommended_courier_company_id ?? srData?.shiprocket_recommended_courier_id;
    const best = companies.find(c => c.courier_company_id === recommendedId) || companies[0];

    let days = parseInt(best.estimated_delivery_days, 10);
    let date = best.etd ? new Date(best.etd) : null;
    if (!date || isNaN(date.getTime())) {
      if (!Number.isFinite(days)) return fallback();
      date = new Date();
      date.setDate(date.getDate() + days);
    }
    if (!Number.isFinite(days)) {
      days = Math.max(1, Math.round((date.getTime() - Date.now()) / 86400000));
    }

    const est: ShippingEstimate = {
      courier: best.courier_name || "",
      deliveryDate: formatDate(date),
      etdDays: days,
      city: best.city || "",
      state: best.state || "",
      codAvailable: best.cod === 1,
    };
    writeCache(pin, est);
    return est;
  } catch (e) {
    // Don't invent a courier or a date we can't stand behind (this used to
    // pick "BlueDart"/"DTDC" and 2–5 days from a hash of the pincode).
    return fallback();
  }
}
