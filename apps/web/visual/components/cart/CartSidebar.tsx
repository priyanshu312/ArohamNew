import { useNavigate } from "react-router";
import { X, ChevronLeft, ChevronRight, Minus, Plus, Trash2, Lock } from "lucide-react";
import { MAROON, GOLD, IVORY, SANS, SERIF, PRICE_FONT } from "@nakshra/shared-config/theme";
import { useCart } from "@nakshra/shared-state";
import { useAuth } from "@nakshra/shared-auth";
import { useEffect, useState } from "react";

export function CartSidebar() {
  const navigate = useNavigate();
  const { items, closeCart, removeFromCart, updateQty, subtotal } = useCart();
  const { isLoggedIn, openAuth } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  const cartCount = items.reduce((sum, i) => sum + i.qty, 0);
  const totalOriginal = items.reduce((sum, i) => sum + (i.product.original || i.product.price) * i.qty, 0);
  const totalSavings = Math.max(0, totalOriginal - subtotal);

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(closeCart, 300);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Shopping cart" className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300" style={{ opacity: isVisible ? 1 : 0 }} onClick={handleClose} />
      <div className="relative w-[90vw] max-w-[420px] sm:w-[420px] flex flex-col h-full shadow-2xl transition-transform duration-300 ease-out"
        style={{ background: "#FFFFFF", transform: isVisible ? "translateX(0)" : "translateX(100%)" }}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold leading-tight" style={{ fontFamily: SERIF, color: MAROON }}>
              Your Cart
            </h2>
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white bg-red-600">
              {cartCount}
            </span>
          </div>
          <button aria-label="Close cart" onClick={handleClose} className="p-1.5 rounded-full text-gray-500 hover:text-black hover:bg-black/5 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Items Container */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5">
          {items.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🪷</div>
              <p className="text-sm font-semibold mb-1" style={{ fontFamily: SERIF, color: MAROON }}>Your cart is peaceful</p>
              <p className="text-xs" style={{ color: "#7A6A58" }}>Add sacred products to begin your journey</p>
              <button onClick={() => { handleClose(); navigate("/shop"); }} className="mt-4 px-6 py-2.5 rounded-full text-sm font-medium" style={{ background: MAROON, color: IVORY }}>Explore Products</button>
            </div>
          ) : items.map(({ product: p, qty }) => (
            <div key={p.id} className="relative flex gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm min-h-[105px]">
              <img src={p.img} alt={p.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0 bg-amber-50 border border-black/5" />
              
              <div className="flex-1 min-w-0 pr-6">
                <p className="text-xs font-semibold leading-tight text-gray-900 truncate mb-1" style={{ fontFamily: SERIF, color: MAROON }}>
                  {p.name}
                </p>
                {p.subtitle && <p className="text-[10px] text-gray-500 mb-3 truncate">{p.subtitle}</p>}
                
                {/* Quantity Box */}
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden w-max bg-gray-50/60">
                  <button aria-label="Decrease quantity" onClick={() => updateQty(p.id, -1)} className="w-7 h-7 flex items-center justify-center hover:bg-black/5 text-gray-600 font-bold text-xs">-</button>
                  <span className="w-7 text-center text-xs font-bold text-gray-900">{qty}</span>
                  <button aria-label="Increase quantity" onClick={() => updateQty(p.id, 1)} className="w-7 h-7 flex items-center justify-center hover:bg-black/5 text-gray-600 font-bold text-xs">+</button>
                </div>
              </div>

              {/* Trash Icon on Top Right */}
              <button aria-label={`Remove ${p.name}`} onClick={() => removeFromCart(p.id)} className="absolute top-3.5 right-3.5 text-gray-400 hover:text-red-600 transition-colors p-1">
                <Trash2 size={16} />
              </button>

              {/* Price Stack on Bottom Right */}
              <div className="absolute bottom-3.5 right-3.5 text-right">
                <div className="text-sm font-bold" style={{ fontFamily: PRICE_FONT, color: MAROON }}>
                  ₹{(p.price * qty).toLocaleString("en-IN")}
                </div>
                {p.original > p.price && (
                  <div className="text-[11px] line-through text-gray-400" style={{ fontFamily: PRICE_FONT }}>
                    ₹{(p.original * qty).toLocaleString("en-IN")}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-5 border-t border-gray-100 bg-white space-y-3">
            {/* Coupon hint */}
            <div className="mb-2 px-3 py-2 rounded-xl text-center" style={{ background: "rgba(200,160,68,0.06)", border: "1px dashed rgba(200,160,68,0.25)" }}>
              <p className="text-[11px] font-medium" style={{ color: "#8B6914" }}>🏷️ Have a coupon? Apply at checkout ✨</p>
            </div>

            {/* Total Price & You Save Row */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-[11px] block text-gray-500 font-medium">Total Price</span>
                <span className="text-xl font-bold" style={{ fontFamily: PRICE_FONT, color: MAROON }}>
                  ₹{subtotal.toLocaleString("en-IN")}
                </span>
              </div>
              {totalSavings > 0 && (
                <div className="text-right">
                  <span className="text-xs font-bold px-3 py-1 rounded-full text-emerald-700 bg-emerald-50 border border-emerald-200/60 inline-block">
                    You Save ₹{totalSavings.toLocaleString("en-IN")}
                  </span>
                </div>
              )}
            </div>

            {/* Main Proceed to Checkout button */}
            <button onClick={() => {
              handleClose();
              requestAnimationFrame(() => {
                if (!isLoggedIn) {
                  openAuth();
                } else {
                  navigate("/checkout/shipping");
                }
              });
            }}
              className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-between text-white shadow-lg transition-all hover:opacity-95 active:scale-[0.99]"
              style={{ background: `linear-gradient(135deg,${MAROON},#7A2A30)` }}>
              <span>Proceed to Checkout</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20">UPI / Cards</span>
                <ChevronRight size={18} />
              </div>
            </button>

            <button onClick={handleClose} className="w-full py-1 text-xs font-semibold text-center hover:opacity-70 transition-opacity" style={{ color: MAROON }}>
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
