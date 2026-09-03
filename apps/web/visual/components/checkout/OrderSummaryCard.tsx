import { useState } from "react";
import { Lock, Gem, Flame, Shield, Package, Truck, CheckCircle, Tag } from "lucide-react";
import { MAROON, GOLD, IVORY, SERIF, PRICE_FONT } from "@nakshra/shared-config/theme";
import { CartItem } from "@nakshra/shared-types/cart";
import { CheckoutProgress } from "./CheckoutProgress";
import { useCart } from "@nakshra/shared-state";

export function OrderSummaryCard({ cartItems, onBack, onNext, nextLabel, step }: {
  cartItems: CartItem[];
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  step: number;
}) {
  const { subtotal, discount, total, appliedCoupon, applyCoupon, removeCoupon } = useCart();
  const [inputCode, setInputCode] = useState("");
  const [msg, setMsg] = useState<{ success: boolean; message: string } | null>(null);

  return (
    <div className="lg:sticky lg:top-24">
      <CheckoutProgress step={step} />
      <div className="rounded-3xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid rgba(91,31,36,0.08)", boxShadow: "0 4px 30px rgba(91,31,36,0.07)" }}>
        <div className="px-6 pt-6 pb-4 lg:pt-4 lg:pb-3" style={{ borderBottom: "1px solid rgba(91,31,36,0.06)" }}>
          <h2 className="text-lg font-semibold" style={{ fontFamily: SERIF, color: MAROON }}>Order Summary</h2>
        </div>
        <div className="px-6 py-4 lg:py-3 space-y-3 lg:space-y-2" style={{ borderBottom: "1px solid rgba(91,31,36,0.06)" }}>
          {cartItems.map(({ product: p, qty }) => (
            <div key={p.id} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-amber-50"><img src={p.img} alt={p.name} className="w-full h-full object-cover" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ fontFamily: SERIF, color: MAROON }}>{p.name}</p>
                <p className="text-[10px]" style={{ color: "#9A8A78" }}>Qty: {qty}</p>
              </div>
              <span className="text-xs font-semibold flex-shrink-0" style={{ fontFamily: PRICE_FONT, color: MAROON }}>₹{(p.price * qty).toLocaleString("en-IN")}</span>
            </div>
          ))}
        </div>

        {/* Coupon Code Section */}
        <div className="px-6 py-3" style={{ borderBottom: "1px solid rgba(91,31,36,0.06)", background: "rgba(200,160,68,0.03)" }}>
          <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold" style={{ color: MAROON }}>
            <Tag size={13} style={{ color: GOLD }} />
            <span>Promo Code / Coupon</span>
          </div>
          {appliedCoupon ? (
            <div className="flex items-center justify-between p-2 rounded-xl" style={{ background: "#FFFFFF", border: "1px solid rgba(74,138,74,0.3)" }}>
              <div>
                <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "rgba(74,138,74,0.1)", color: "#4A8A4A" }}>{appliedCoupon.code}</span>
                <p className="text-[10px] mt-0.5" style={{ color: "#7A6A58" }}>{appliedCoupon.label}</p>
              </div>
              <button onClick={() => { removeCoupon(); setMsg(null); }} className="text-xs font-semibold px-2 py-1 hover:bg-red-50 rounded" style={{ color: "#C04040" }}>✕ Remove</button>
            </div>
          ) : (
            <div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputCode}
                  onChange={e => { setInputCode(e.target.value); setMsg(null); }}
                  placeholder="Enter code (e.g. Nakshra10)"
                  className="flex-1 px-3 py-1.5 rounded-xl text-xs outline-none uppercase font-semibold"
                  style={{ border: "1px solid rgba(91,31,36,0.15)", background: "#FFFFFF", color: MAROON }}
                />
                <button
                  onClick={() => {
                    if (!inputCode.trim()) return;
                    const res = applyCoupon(inputCode);
                    setMsg(res);
                    if (res.success) setInputCode("");
                  }}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold uppercase transition-all active:scale-95"
                  style={{ background: MAROON, color: IVORY }}
                >
                  Apply
                </button>
              </div>
              {msg && (
                <p className={`text-[10px] font-medium mt-1.5 ${msg.success ? "text-emerald-600" : "text-red-500"}`}>
                  {msg.success ? "✓ " : "✕ "}{msg.message}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-5 lg:py-3 space-y-3 lg:space-y-2">
          <div className="flex justify-between text-sm">
            <span style={{ color: "#7A6A58" }}>Subtotal</span>
            <span style={{ color: MAROON, fontFamily: PRICE_FONT, fontWeight: 600 }}>₹{subtotal.toLocaleString("en-IN")}</span>
          </div>

          {appliedCoupon && discount > 0 && (
            <div className="flex justify-between text-sm">
              <span style={{ color: "#4A8A4A" }}>Discount ({appliedCoupon.code})</span>
              <span style={{ color: "#4A8A4A", fontFamily: PRICE_FONT, fontWeight: 600 }}>−₹{discount.toLocaleString("en-IN")}</span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span style={{ color: "#7A6A58" }}>Shipping</span>
            <span style={{ color: "#4A8A4A", fontFamily: PRICE_FONT, fontWeight: 600 }}>FREE</span>
          </div>

          <div className="flex justify-between text-sm">
            <span style={{ color: "#7A6A58" }}>GST (5% Included)</span>
            <span style={{ color: "#4A8A4A", fontFamily: PRICE_FONT, fontWeight: 600 }}>INCLUDED</span>
          </div>

          <div className="h-px w-full" style={{ background: `linear-gradient(90deg,transparent,rgba(200,160,68,0.3),transparent)` }} />
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-semibold" style={{ color: MAROON }}>Grand Total</span>
            <span className="text-2xl font-semibold" style={{ fontFamily: PRICE_FONT, color: MAROON }}>₹{total.toLocaleString("en-IN")}</span>
          </div>
        </div>
        <div className="px-6 pb-6 lg:pb-4 space-y-3 lg:space-y-2">
          <button onClick={onNext}
            className="w-full py-4 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 hover:shadow-lg"
            style={{ background: `linear-gradient(135deg,${MAROON},#7A2A30)`, color: IVORY }}>
            <Lock size={14} /> {nextLabel}
          </button>
          <button onClick={onBack} className="w-full py-3 rounded-2xl text-sm font-medium border transition-all hover:bg-amber-50" style={{ borderColor: "rgba(91,31,36,0.2)", color: MAROON }}>← Back</button>
        </div>
      </div>
      <div className="rounded-2xl px-5 py-4 mt-4" style={{ background: "#FFFFFF", border: "1px solid rgba(91,31,36,0.07)" }}>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: Gem,         label: "100% Authentic"   },
            { icon: Flame,       label: "Temple Energized" },
            { icon: Shield,      label: "Secure Payments"  },
            { icon: Package,     label: "Easy Returns"     },
            { icon: Truck,       label: "Fast Delivery"    },
            { icon: CheckCircle, label: "Trusted Brand"    },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon size={13} style={{ color: GOLD, flexShrink: 0 }} strokeWidth={1.5} />
              <span className="text-[10px] font-medium" style={{ color: "#5A4A3A" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
