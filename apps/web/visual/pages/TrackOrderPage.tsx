import { MAROON, SERIF, IVORY, GOLD } from "@nakshra/shared-config/theme";
import { FloatingInput } from "@visual/components/auth/FloatingInput";
import { useState } from "react";
import { PackageSearch, Loader2, ChevronLeft, Truck, MapPin, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { api } from "@nakshra/shared-api";

interface TrackingResult {
  orderId: string;
  status: string;
  courier?: string;
  awb?: string;
  etd?: string;
  currentLocation?: string;
  activities?: { date: string; activity: string; location: string }[];
}

export function TrackOrderPage() {
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [trackedOrder, setTrackedOrder] = useState<TrackingResult | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleTrack = async () => {
    if (!orderId || !email) return;
    setLoading(true);
    setError("");
    setTrackedOrder(null);

    try {
      // First try tracking via Shiprocket (using orderId as shipment_id or AWB)
      const res = await api(`/shiprocket/track/${encodeURIComponent(orderId.trim())}`);
      
      if (res.success && res.data) {
        const tracking = res.data?.tracking_data || res.data;
        const activities = (tracking?.shipment_track_activities || tracking?.track_activities || [])
          .slice(0, 8)
          .map((a: any) => ({
            date: a.date || a["sr-status-date"] || "",
            activity: a.activity || a["sr-status"] || a.status || "",
            location: a.location || a["sr-status-location"] || ""
          }));

        setTrackedOrder({
          orderId: orderId.trim(),
          status: tracking?.shipment_status_text || tracking?.current_status || tracking?.status || "In Transit",
          courier: tracking?.courier_name || tracking?.courier_company_id?.toString() || "",
          awb: tracking?.awb_code || tracking?.awb || "",
          etd: tracking?.etd || tracking?.expected_date || "",
          currentLocation: tracking?.current_location || activities[0]?.location || "",
          activities
        });
      } else {
        throw new Error("No tracking data");
      }
    } catch {
      // Fallback: check sessionStorage for local order reference
      const localOrderId = sessionStorage.getItem("Nakshra_last_order_id");
      if (orderId.trim() === localOrderId) {
        setTrackedOrder({
          orderId: orderId.trim(),
          status: "Processing",
          activities: []
        });
      } else {
        setError(t("track.error", "We couldn't find an active shipment matching that ID. Try your Shiprocket Shipment ID or AWB code."));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] font-sans selection:bg-[#C8A044] selection:text-[#0D0508] pb-10 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-32 pb-20 max-w-lg mx-auto w-full">
        <button onClick={() => navigate(-1)} className="self-start flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold mb-6 transition-all hover:bg-black/5" style={{ color: MAROON, border: "1px solid rgba(91,31,36,0.18)", background: "#FFFFFF" }}>
          <ChevronLeft size={14} /> Back
        </button>
        
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: "rgba(91,31,36,0.05)", color: MAROON }}>
          <PackageSearch size={36} strokeWidth={1.5} />
        </div>
        
        <h1 style={{ fontFamily: SERIF, color: MAROON }} className="text-3xl md:text-4xl font-medium mb-3 text-center">
          {t("track.title", "Track Your Order")}
        </h1>
        <p className="text-center mb-8" style={{ color: "#7A6A58" }}>
          {t("track.subtitle", "Enter your Shipment ID or AWB code to view real-time tracking status.")}
        </p>
        
        {trackedOrder ? (
          <TrackingDetails order={trackedOrder} onReset={() => setTrackedOrder(null)} t={t} />
        ) : (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-[rgba(91,31,36,0.05)] w-full space-y-5">
            <FloatingInput label={t("track.placeholder", "Shipment ID or AWB Code")} value={orderId} onChange={setOrderId} required />
            <FloatingInput label="Email Address" type="email" value={email} onChange={setEmail} required />
            
            {error && (
              <div className="p-4 rounded-xl text-sm flex items-start gap-2" style={{ background: "rgba(200,160,68,0.1)", color: "#8B6914", border: "1px solid rgba(200,160,68,0.2)" }}>
                <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
              </div>
            )}

            <button onClick={handleTrack} disabled={loading || !orderId || !email}
              className="w-full py-4 rounded-2xl text-sm font-bold transition-all hover:opacity-90 shadow-md flex items-center justify-center gap-2 mt-2"
              style={{ background: `linear-gradient(135deg,${MAROON},#7A2A30)`, color: IVORY, opacity: (!orderId || !email || loading) ? 0.7 : 1 }}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : t("track.button", "Track Order")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TrackingDetails({ order, onReset, t }: { order: TrackingResult; onReset: () => void; t: (k: string, f: string) => string }) {
  return (
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-[rgba(91,31,36,0.05)] w-full relative overflow-hidden">
      {/* Status Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(91,31,36,0.07)", color: MAROON }}>
          <CheckCircle2 size={22} />
        </div>
        <div>
          <h3 style={{ fontFamily: SERIF, color: MAROON }} className="text-xl font-semibold">{order.status}</h3>
          <p className="text-[11px] text-stone-500">ID: {order.orderId}</p>
        </div>
      </div>

      {/* Shipping Details Grid */}
      {(order.courier || order.awb || order.etd || order.currentLocation) && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          {order.courier && (
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
              <div className="flex items-center gap-1.5 text-[10px] text-stone-500 mb-1"><Truck size={12} /> Courier</div>
              <div className="text-xs font-semibold text-stone-800">{order.courier}</div>
            </div>
          )}
          {order.awb && (
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
              <div className="flex items-center gap-1.5 text-[10px] text-stone-500 mb-1"><PackageSearch size={12} /> AWB</div>
              <div className="text-xs font-semibold text-stone-800">{order.awb}</div>
            </div>
          )}
          {order.etd && (
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
              <div className="flex items-center gap-1.5 text-[10px] text-stone-500 mb-1"><Clock size={12} /> Est. Delivery</div>
              <div className="text-xs font-semibold text-stone-800">{order.etd}</div>
            </div>
          )}
          {order.currentLocation && (
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
              <div className="flex items-center gap-1.5 text-[10px] text-stone-500 mb-1"><MapPin size={12} /> Location</div>
              <div className="text-xs font-semibold text-stone-800">{order.currentLocation}</div>
            </div>
          )}
        </div>
      )}

      {/* Activity Timeline */}
      {order.activities && order.activities.length > 0 && (
        <div className="mb-5">
          <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: GOLD }}>Tracking Timeline</h4>
          <div className="space-y-3">
            {order.activities.map((a, i) => (
              <div key={i} className="flex items-start gap-3 text-xs">
                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: i === 0 ? MAROON : "#D6D3D1" }} />
                <div>
                  <div className="font-semibold text-stone-800">{a.activity}</div>
                  <div className="text-[10px] text-stone-500">{a.location}{a.location && a.date ? " · " : ""}{a.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={onReset} className="w-full py-2.5 rounded-xl text-xs font-bold" style={{ background: MAROON, color: "white" }}>
        {t("track.another", "Track Another Order")}
      </button>
    </div>
  );
}
