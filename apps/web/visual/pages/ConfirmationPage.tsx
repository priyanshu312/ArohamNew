import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Lock, CheckCircle, Package, Mail, ArrowRight, Truck } from "lucide-react";
import { MAROON, GOLD, SAFFRON, IVORY, SANS, SERIF, PRICE_FONT } from "@nakshra/shared-config/theme";
import { useCart } from "@nakshra/shared-state";
import { api } from "@nakshra/shared-api";

function CheckoutHeader() {
  const navigate = useNavigate();
  return (
    <div className="w-full" style={{ background: "rgba(250,247,242,0.97)", borderBottom: "1px solid rgba(91,31,36,0.08)", boxShadow: "0 1px 12px rgba(91,31,36,0.05)" }}>
      <div className="max-w-7xl mx-auto px-5 lg:px-10 h-14 lg:h-16 flex items-center justify-between">
        <button onClick={() => navigate("/")} className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: `linear-gradient(135deg,${MAROON},#E78B2F)`, color: IVORY, fontFamily: SERIF }}>ॐ</div>
          <span className="hidden sm:inline text-lg lg:text-xl font-semibold tracking-wide" style={{ fontFamily: SERIF, color: MAROON }}>Nakshra</span>
        </button>
        <span className="text-xs font-medium tracking-widest uppercase" style={{ color: "#9A8A78" }}>Secure Checkout</span>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(200,160,68,0.1)", border: "1px solid rgba(200,160,68,0.22)" }}>
          <Lock size={10} style={{ color: GOLD }} /><span className="text-[10px] font-semibold" style={{ color: "#8B6914" }}>SSL Secured</span>
        </div>
      </div>
    </div>
  );
}

const TIMELINE_STEPS = [
  { icon: "✓",  label: "Order Confirmed",    desc: "Your order has been received.",          done: true  },
  { icon: "🪔", label: "Temple Preparation",  desc: "Products enter Pran Pratishtha ritual.", done: false },
  { icon: "🔍", label: "Quality Inspection",  desc: "Every item checked by our team.",        done: false },
  { icon: "📦", label: "Premium Packaging",   desc: "Wrapped in our signature packaging.",    done: false },
  { icon: "🚚", label: "Dispatched",           desc: "On its way with real-time tracking.",   done: false },
  { icon: "🏠", label: "Delivered",            desc: "Arrives at your doorstep.",             done: false },
];

function Confetti() {
  const PIECES = Array.from({ length: 24 }, (_, i) => ({
    id: i, x: ((i * 17) % 100), delay: ((i * 0.4) % 2.5), dur: 2.5 + ((i * 0.3) % 2),
    color: [GOLD, SAFFRON, MAROON, "#D4B896", "#E8D5A8"][i % 5],
    size: 5 + ((i * 0.7) % 6), rotate: (i * 47) % 360,
  }));
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <style>{`@keyframes confettiFall{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}`}</style>
      {PIECES.map(p => (
        <div key={p.id} style={{ position: "absolute", left: `${p.x}%`, top: "-10px", width: p.size, height: p.size, background: p.color, borderRadius: p.id % 3 === 0 ? "50%" : "2px", opacity: 0.7, animation: `confettiFall ${p.dur}s ${p.delay}s ease-in forwards`, transform: `rotate(${p.rotate}deg)` }} />
      ))}
    </div>
  );
}

export function ConfirmationPage() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(true);
  const [timelineReached, setTimelineReached] = useState(2);
  const [orderItems, setOrderItems] = useState<{ id: number; name: string; img: string; price: number; qty: number }[]>([]);
  const cachedTotal = sessionStorage.getItem("Nakshra_order_total");
  const [totalAmount, setTotalAmount] = useState<number>(cachedTotal ? parseFloat(cachedTotal) : 0);
  const [loading, setLoading] = useState(true);

  const orderId = sessionStorage.getItem("Nakshra_last_order_id") || "—";
  const displayOrderId = orderId !== "—" ? `ARH-${orderId}` : "Confirmed";

  // Calculate dynamic estimated delivery date (4 days from today)
  const deliveryDateObj = new Date();
  deliveryDateObj.setDate(deliveryDateObj.getDate() + 4);
  const formattedDeliveryDate = deliveryDateObj.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 80);
    const t2 = setTimeout(() => setTimelineReached(2), 1200);

    if (orderId && orderId !== "—") {
      // Try to load items from the session storage saved by PaymentPage
      try {
        const savedItems = sessionStorage.getItem("Nakshra_last_order_items");
        if (savedItems) {
          const parsed = JSON.parse(savedItems);
          if (Array.isArray(parsed)) {
            const mappedItems = parsed.map((item: any) => ({
              id: item.product?.id || Date.now(),
              name: item.product?.name || "Sacred Item",
              img: item.product?.img || "📿",
              price: item.product?.price || 0,
              qty: item.qty || 1
            }));
            setOrderItems(mappedItems);
          }
        }
      } catch (e) {
        console.error("Failed to load local order items", e);
      }
      setLoading(false);
    } else {
      setLoading(false);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#FAF7F2" }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-t-transparent mx-auto mb-4 animate-spin" style={{ borderColor: `${GOLD} transparent ${GOLD} ${GOLD}` }} />
          <p className="text-sm" style={{ color: "#9A8A78", fontFamily: SANS }}>Loading order details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-hidden pt-16 lg:pt-20" style={{ background: "#FAF7F2", minHeight: "100vh", fontFamily: SANS, position: "relative" }}>
      <Confetti />
      <div className="relative overflow-hidden pt-8 sm:pt-12 pb-8 sm:pb-12 px-4 sm:px-6 lg:px-10 text-center" style={{ background: `linear-gradient(160deg,#FAF0D8,#FAF7F2,#F0E8D8)` }}>
        <div className="relative max-w-7xl mx-auto">
          <div className="relative mx-auto mb-4 sm:mb-6 flex items-center justify-center transition-all duration-700"
            style={{ width: 80, height: 80, opacity: visible ? 1 : 0, transform: visible ? "scale(1)" : "scale(0.6)" }}>
            <div className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle,rgba(200,160,68,0.25),transparent)`, transform: "scale(1.8)" }} />
            <div className="absolute inset-0 rounded-full" style={{ border: `2px solid rgba(200,160,68,0.3)`, transform: "scale(1.35)" }} />
            <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg,${GOLD},${SAFFRON})`, boxShadow: `0 12px 48px rgba(200,160,68,0.45)` }}>
              <CheckCircle size={36} color="white" strokeWidth={2.5} />
            </div>
          </div>
          <div className="transition-all duration-700 delay-200" style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(16px)" }}>
            <div className="flex items-center justify-center gap-3 mb-2 sm:mb-4">
              <span className="h-px w-12 sm:w-16" style={{ background: `linear-gradient(90deg,transparent,${GOLD})` }} />
              <span className="text-[10px] sm:text-xs tracking-[0.25em] uppercase font-medium" style={{ color: GOLD }}>Order Confirmed</span>
              <span className="h-px w-12 sm:w-16" style={{ background: `linear-gradient(90deg,${GOLD},transparent)` }} />
            </div>
            <h1 className="mb-2 sm:mb-3 mx-auto max-w-2xl" style={{ fontFamily: SERIF, fontSize: "clamp(1.4rem,4vw,3rem)", fontWeight: 500, color: MAROON, lineHeight: 1.15 }}>Your Sacred Order Has Been Confirmed</h1>
            <p className="text-xs sm:text-sm leading-relaxed max-w-md mx-auto" style={{ color: "#7A6A58" }}>Thank you for placing your trust in Nakshra.<br />Your spiritual journey begins today.</p>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10 space-y-6">
        <div className="rounded-3xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid rgba(91,31,36,0.08)", boxShadow: "0 4px 40px rgba(91,31,36,0.07)" }}>
          <div className="px-8 py-5 flex flex-wrap items-center justify-between gap-4" style={{ background: `linear-gradient(90deg,${MAROON},#7A2A30)` }}>
            <div><p className="text-xs tracking-widest uppercase mb-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>Order Number</p><p className="text-lg font-semibold" style={{ fontFamily: SERIF, color: GOLD }}>{displayOrderId}</p></div>
            <div className="flex gap-3">
              <button onClick={() => navigate("/profile?tab=orders")} className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all hover:bg-white/20" style={{ background: "rgba(255,255,255,0.12)", color: IVORY, border: "1px solid rgba(255,255,255,0.2)" }}><Package size={12} /> View My Orders</button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0" style={{ borderColor: "rgba(91,31,36,0.07)" }}>
            {[["Order Date", new Date().toLocaleDateString("en-IN", {day:"2-digit",month:"short",year:"numeric"})], ["Est. Delivery", `Arriving by ${formattedDeliveryDate}`], ["Payment", "Razorpay"], ["Total", `₹${totalAmount.toLocaleString("en-IN")}`]].map(([l, v]) => (
              <div key={l} className="px-6 py-5"><p className="text-[10px] tracking-widest uppercase font-semibold mb-1" style={{ color: "#9A8A78" }}>{l}</p><p className="text-sm font-semibold" style={{ fontFamily: SERIF, color: MAROON }}>{v}</p></div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
          <div>
            <h2 className="mb-5 text-xl font-semibold" style={{ fontFamily: SERIF, color: MAROON }}>Items in Your Order</h2>
            <div className="space-y-4">
              {orderItems.map((p) => (
                <div key={p.id} className="flex gap-5 p-5 rounded-2xl group transition-all hover:shadow-lg" style={{ background: "#FFFFFF", border: "1px solid rgba(91,31,36,0.07)" }}>
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-amber-50"><img src={p.img} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" /></div>
                  <div className="flex-1">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: "rgba(91,31,36,0.07)", color: MAROON }}>Temple Energized</span>
                    <h3 className="text-sm font-semibold mt-1 mb-0.5" style={{ fontFamily: SERIF, color: MAROON }}>{p.name}</h3>
                    <p className="text-xs mb-2" style={{ color: "#7A6A58" }}>Qty: {p.qty}</p>
                    <p className="text-base font-semibold" style={{ fontFamily: PRICE_FONT, color: MAROON }}>₹{(p.price * p.qty).toLocaleString("en-IN")}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:sticky lg:top-24">
            <h2 className="mb-6 text-xl font-semibold" style={{ fontFamily: SERIF, color: MAROON }}>What Happens Next</h2>
            <div className="rounded-3xl p-6" style={{ background: "#FFFFFF", border: "1px solid rgba(91,31,36,0.08)", boxShadow: "0 4px 30px rgba(91,31,36,0.06)" }}>
              {TIMELINE_STEPS.map((step, i) => {
                const reached = i < timelineReached, active = i === timelineReached - 1;
                return (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm flex-shrink-0 transition-all duration-500"
                        style={{ background: reached ? (active ? `linear-gradient(135deg,${GOLD},${SAFFRON})` : "rgba(200,160,68,0.15)") : "rgba(91,31,36,0.06)", border: reached ? `2px solid ${GOLD}` : "2px solid rgba(91,31,36,0.1)", boxShadow: active ? `0 0 16px rgba(200,160,68,0.45)` : "none", transform: active ? "scale(1.1)" : "scale(1)", color: reached ? (active ? "white" : GOLD) : "#9A8A78" }}>
                        {step.icon}
                      </div>
                      {i < TIMELINE_STEPS.length - 1 && <div className="w-0.5 flex-1 mt-1 mb-1 rounded-full" style={{ background: i < timelineReached - 1 ? GOLD : "rgba(91,31,36,0.08)", minHeight: 24 }} />}
                    </div>
                    <div className="pb-5 pt-1.5">
                      <p className="text-sm font-semibold mb-0.5" style={{ fontFamily: SERIF, color: reached ? MAROON : "#9A8A78" }}>
                        {step.label}{active && <span className="ml-2 px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: "rgba(200,160,68,0.15)", color: GOLD }}>Now</span>}
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: reached ? "#7A6A58" : "#B8A898" }}>{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          <button onClick={() => navigate("/profile?tab=orders")} className="flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold transition-all hover:opacity-90 hover:shadow-xl" style={{ background: `linear-gradient(135deg,${MAROON},#7A2A30)`, color: IVORY }}><Package size={15} /> View My Orders</button>
          <button onClick={() => navigate("/")} className="flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold border transition-all hover:bg-amber-50" style={{ borderColor: "rgba(91,31,36,0.2)", color: MAROON }}><ArrowRight size={15} /> Continue Shopping</button>
        </div>
      </div>

    </div>
  );
}
