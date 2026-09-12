import { createContext, useContext, useState, ReactNode, useEffect, useRef } from "react";
import { NakshraProduct } from "@nakshra/shared-types/product";
import { CartItem } from "@nakshra/shared-types/cart";
import { useAuth } from "@nakshra/shared-auth";
import { api } from "@nakshra/shared-api";
import { supabase } from "@nakshra/shared-services";
import { safeLocalStorage, safeSessionStorage } from "@nakshra/shared-utils/storage";

export interface AppliedCoupon {
  code: string;
  type: "percent" | "flat" | "fixed_total";
  value: number;
  label: string;
}

// Must mirror backend PROMO_CODES (services/orderService.js). `value` for flat
// coupons and `minPurchase` are in RUPEES here (subtotal is in rupees on the
// client); the backend works in paise. The backend re-validates on order
// creation and PaymentPage reconciles, so a mismatch can't overcharge — but
// keep these in sync so the UI shows the truth.
type CouponDef = { type: "percent" | "flat" | "fixed_total"; value: number; label: string; minPurchase?: number };
export const VALID_COUPONS: Record<string, CouponDef> = {
  NAKSHRA10: { type: "percent", value: 10, label: "10% OFF sacred items" },
  DEVOTION20: { type: "percent", value: 20, label: "20% OFF on orders above ₹3,000", minPurchase: 3000 },
  FESTIVE500: { type: "flat", value: 500, label: "₹500 OFF on orders above ₹2,500", minPurchase: 2500 },
  FREEENERGIZATION: { type: "flat", value: 99, label: "Free Temple Consecration (₹99 off)" },
  FIRST300: { type: "flat", value: 300, label: "₹300 OFF your first order" },
};

// Test-only code that makes the cart total ₹1, so a real Razorpay payment can
// be exercised on live keys without paying full price. Hidden unless
// VITE_TEST_COUPON=true is set for the build.
//
// The client flag is only about not advertising it: the SERVER decides whether
// it applies (TEST_COUPON_ENABLED there), and PaymentPage refuses to charge a
// discounted total the server did not agree to. So even if this shipped
// enabled by accident, nobody gets a ₹1 order unless the backend also allows it.
// Must be the literal `import.meta.env.VITE_...` form — Vite does not substitute
// a dynamic or optional-chained lookup.
if (String(import.meta.env.VITE_TEST_COUPON).toLowerCase() === "true") {
  VALID_COUPONS.WELCOME1 = { type: "fixed_total", value: 1, label: "TEST — pay ₹1" };
}

interface CartContextValue {
  items: CartItem[];
  cartCount: number;
  subtotal: number;
  discount: number;
  total: number;
  appliedCoupon: AppliedCoupon | null;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  showCart: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (product: NakshraProduct, qty?: number, openSidebar?: boolean) => void;
  removeFromCart: (id: number) => void;
  updateQty: (id: number, delta: number) => void;
  clearCart: () => void;
  toast: string | null;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (productName: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(productName);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };
  const [showCart, setShowCart] = useState(false);
  const { isLoggedIn, user } = useAuth();

  // Track previous login state to detect logout
  const prevIsLoggedIn = useRef<boolean | null>(null);
  const isLoggingOut = useRef(false);

  // Load from LocalStorage or User Cart
  useEffect(() => {
    const justLoggedOut = prevIsLoggedIn.current === true && !isLoggedIn;
    if (justLoggedOut) isLoggingOut.current = true;
    prevIsLoggedIn.current = isLoggedIn;

    if (justLoggedOut) {
      // User just logged out — clear current view
      setItems([]);
      safeLocalStorage.removeItem("Nakshra_cart");
      safeLocalStorage.removeItem("Nakshra_buy_now_intent");
      setTimeout(() => { isLoggingOut.current = false; }, 100);
    } else if (user?.id) {
      // User logged in — restore saved account cart!
      const userCart = safeLocalStorage.getItem(`Nakshra_user_cart_${user.id}`);
      if (userCart) {
        try { setItems(JSON.parse(userCart)); } catch (e) {}
      } else {
        const local = safeLocalStorage.getItem("Nakshra_cart");
        if (local) {
          try { setItems(JSON.parse(local)); } catch (e) {}
        }
      }
    } else {
      const local = safeLocalStorage.getItem("Nakshra_cart");
      if (local) {
        try { setItems(JSON.parse(local)); } catch (e) {}
      }
    }
  }, [isLoggedIn, user?.id]);

  useEffect(() => {
    if (!isLoggingOut.current) {
      safeLocalStorage.setItem("Nakshra_cart", JSON.stringify(items));
      if (user?.id) {
        safeLocalStorage.setItem(`Nakshra_user_cart_${user.id}`, JSON.stringify(items));
        // Non-blocking sync to Supabase user_carts DB
        Promise.resolve(
          supabase.from("user_carts").upsert({
            user_id: user.id,
            items: items,
            updated_at: new Date().toISOString()
          })
        ).catch(() => {});
      }
    }
  }, [items, user?.id]);

  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(() => {
    try {
      const saved = safeSessionStorage.getItem("Nakshra_applied_coupon");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const cartCount = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.product.price * i.qty, 0);

  const [couponsMap, setCouponsMap] = useState<Record<string, CouponDef>>(VALID_COUPONS);

  // Fetch dynamic coupons from Supabase DB on mount
  useEffect(() => {
    Promise.resolve(
      supabase.from("coupons").select("*")
    ).then(({ data, error }) => {
      if (data && data.length > 0 && !error) {
        const merged: Record<string, CouponDef> = { ...VALID_COUPONS };
        data.forEach((c: any) => {
          if (c.code) {
            // Respect the row's own type. This used to collapse anything that
            // was not "flat" into "percent", so a fixed_total row would have
            // been applied as a percentage discount — e.g. a ₹1 target read as
            // 1% off.
            const rowType: CouponDef["type"] =
              c.type === "flat" ? "flat" : c.type === "fixed_total" ? "fixed_total" : "percent";
            const rowValue = Number(c.value) || 10;
            merged[c.code.trim().toUpperCase()] = {
              type: rowType,
              value: rowValue,
              label: c.label || (
                rowType === "flat" ? `₹${rowValue} OFF`
                : rowType === "fixed_total" ? `Pay just ₹${rowValue}`
                : `${rowValue}% OFF sacred items`
              ),
              ...(c.minimum_order ? { minPurchase: Number(c.minimum_order) } : {})
            };
          }
        });
        setCouponsMap(merged);
      }
    }).catch(() => {});
  }, []);

  let discount = 0;
  if (appliedCoupon && subtotal > 0) {
    if (appliedCoupon.type === "percent") {
      discount = Math.round((subtotal * appliedCoupon.value) / 100);
    } else if (appliedCoupon.type === "fixed_total") {
      // `value` is the final price to charge, not an amount off.
      discount = Math.max(0, subtotal - appliedCoupon.value);
    } else {
      discount = Math.min(subtotal, appliedCoupon.value);
    }
  }

  const total = Math.max(0, subtotal - discount);

  const applyCoupon = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    const found = couponsMap[cleanCode] || VALID_COUPONS[cleanCode];
    if (!found) {
      return { success: false, message: "That code isn't valid. Try NAKSHRA10." };
    }
    if (found.minPurchase && subtotal < found.minPurchase) {
      return { success: false, message: `Add ₹${(found.minPurchase - subtotal).toLocaleString("en-IN")} more to use ${cleanCode}.` };
    }
    const coupon: AppliedCoupon = {
      code: cleanCode,
      type: found.type,
      value: found.value,
      label: found.label
    };
    setAppliedCoupon(coupon);
    safeSessionStorage.setItem("Nakshra_applied_coupon", JSON.stringify(coupon));
    return { success: true, message: `Coupon ${cleanCode} applied!` };
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    safeSessionStorage.removeItem("Nakshra_applied_coupon");
  };

  const addToCart = async (product: NakshraProduct, qty: number = 1, openSidebar: boolean = false) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + qty } : i);
      return [...prev, { product, qty }];
    });
    if (openSidebar) {
      setShowCart(true);
    } else {
      showToast(product.name);
    }

    if (isLoggedIn) {
      await api("/cart", {
        method: "POST",
        body: JSON.stringify({ productId: product.id, qty })
      }).catch(e => console.error("Error adding to cart", e));
    }
  };

  const removeFromCart = async (id: number) => {
    setItems(prev => prev.filter(i => i.product.id !== id));
    if (isLoggedIn) {
      await api(`/cart/${id}`, { method: "DELETE" }).catch(e => console.error("Error removing from cart", e));
    }
  };

  const updateQty = async (id: number, delta: number) => {
    let newQty = 1;
    setItems(prev => prev.map(i => {
      if (i.product.id === id) {
        newQty = Math.max(1, i.qty + delta);
        return { ...i, qty: newQty };
      }
      return i;
    }));
    
    if (isLoggedIn) {
      await api(`/cart/${id}`, {
        method: "PUT",
        body: JSON.stringify({ qty: newQty })
      }).catch(e => console.error("Error updating cart", e));
    }
  };

  const clearCart = async () => {
    setItems([]);
    if (isLoggedIn) {
      await api("/cart", { method: "DELETE" }).catch(e => console.error("Error clearing cart", e));
    } else {
      safeLocalStorage.removeItem("Nakshra_cart");
    }
  };

  return (
    <CartContext.Provider value={{
      items, cartCount, subtotal, discount, total,
      appliedCoupon, applyCoupon, removeCoupon,
      showCart, openCart: () => setShowCart(true), closeCart: () => setShowCart(false),
      addToCart, removeFromCart, updateQty, clearCart, toast,
    }}>
      {children}
      {/* Add-to-cart toast for Web DOM */}
      {typeof document !== "undefined" && (
        <div
          style={{
            position: "fixed",
            top: 24,
            left: "50%",
            transform: `translateX(-50%) translateY(${toast ? "0" : "-120%"})`,
            opacity: toast ? 1 : 0,
            transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)",
            zIndex: 9999,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 20px",
              borderRadius: 16,
              background: "rgba(91,31,36,0.95)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 8px 32px rgba(91,31,36,0.3), 0 2px 8px rgba(0,0,0,0.1)",
              color: "#FAF7F2",
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap",
              maxWidth: "90vw",
            }}
          >
            <span style={{ fontSize: 18 }}>✓</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              {toast} added to cart
            </span>
          </div>
        </div>
      )}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
