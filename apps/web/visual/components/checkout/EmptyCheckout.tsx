import { useNavigate } from "react-router";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { MAROON, IVORY, SANS, SERIF } from "@nakshra/shared-config/theme";

// Shown on the checkout pages when the cart is empty. Checkout used to render
// its full form with "0 items · Subtotal ₹0" and a live "Proceed to Payment"
// button. Nothing could actually be charged — payment is disabled at 0 items —
// but it looked broken and let people fill in an address for nothing.
export function EmptyCheckout() {
  const navigate = useNavigate();
  return (
    <div className="max-w-md mx-auto px-6 py-20 sm:py-28 text-center">
      <div
        className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
        style={{ background: "rgba(200,160,68,0.12)", border: "1px solid rgba(200,160,68,0.3)" }}
      >
        <ShoppingBag size={32} strokeWidth={1.5} style={{ color: MAROON }} />
      </div>
      <h1 className="text-2xl sm:text-3xl mb-3" style={{ fontFamily: SERIF, color: MAROON, fontWeight: 600 }}>
        Your cart is empty
      </h1>
      <p className="text-sm mb-8 leading-relaxed" style={{ color: "#7A6A58", fontFamily: SANS }}>
        Add a sacred product to your cart, then come back here to check out.
      </p>
      <button
        onClick={() => navigate("/shop")}
        className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold transition-all hover:opacity-90 hover:shadow-lg active:scale-95"
        style={{ background: `linear-gradient(135deg,${MAROON},#7A2A30)`, color: IVORY, fontFamily: SANS }}
      >
        Continue Shopping <ArrowRight size={16} />
      </button>
    </div>
  );
}
