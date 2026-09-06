import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Lock, ChevronLeft, ChevronRight, ShieldCheck, Tag, ChevronDown } from "lucide-react";
import { MAROON, GOLD, IVORY, SANS, SERIF, PRICE_FONT } from "@nakshra/shared-config/theme";
import { generateUUID } from "@nakshra/shared-utils/uuid";
import { useCart } from "@nakshra/shared-state";
import { useAuth } from "@nakshra/shared-auth";
import { api } from "@nakshra/shared-api";
import { supabase } from "@nakshra/shared-services";

declare global {
  interface Window {
    Razorpay: any;
  }
}

// Razorpay public key — safe to expose in frontend
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_TIXODQAA4JFwih";

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

export function PaymentPage() {
  const navigate = useNavigate();
  const { items, clearCart, subtotal, discount, total, appliedCoupon, applyCoupon, removeCoupon } = useCart();
  const { user } = useAuth();
  const [placing, setPlacing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cod">("online");
  const [couponInput, setCouponInput] = useState("");
  const [couponMsg, setCouponMsg] = useState<{ success: boolean; message: string } | null>(null);
  const [showCouponCelebration, setShowCouponCelebration] = useState(false);
  const [showMobileItems, setShowMobileItems] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    const shippingAddr = (() => {
      try { return JSON.parse(sessionStorage.getItem("Nakshra_shipping_addr") || "null"); } catch { return null; }
    })();

    if (!shippingAddr || (!shippingAddr.address_line1 && !shippingAddr.line1 && !shippingAddr.address && !shippingAddr.city)) {
      alert("No delivery address selected. Please provide a delivery address first.");
      navigate("/checkout/shipping", { replace: true });
    }
  }, [navigate]);

  // Cache total in session so confirmation page doesn't flash ₹0
  useEffect(() => {
    if (total > 0) {
      sessionStorage.setItem("Nakshra_order_total", String(total));
    }
  }, [total]);

  const handleApplyCoupon = () => {
    if (!couponInput.trim()) return;
    const res = applyCoupon(couponInput);
    setCouponMsg(res);
    if (res.success) {
      setCouponInput("");
      setShowCouponCelebration(true);
      setTimeout(() => setShowCouponCelebration(false), 4000);
    }
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) { resolve(true); return; }
      let attempts = 0;
      const tryLoad = () => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => {
          attempts++;
          if (attempts < 3) {
            setTimeout(tryLoad, 1000);
          } else {
            resolve(false);
          }
        };
        document.body.appendChild(script);
      };
      tryLoad();
    });
  };

  const handlePay = async () => {
    if (items.length === 0) { alert("Your cart is empty."); return; }

    setPlacing(true);
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        alert("Failed to load payment gateway. Please check your internet connection and try again.");
        setPlacing(false);
        return;
      }

      // Read shipping address saved by ShippingPage
      const shippingAddr = (() => {
        try { return JSON.parse(sessionStorage.getItem("Nakshra_shipping_addr") || "null"); } catch { return null; }
      })();

      if (!shippingAddr || (!shippingAddr.address_line1 && !shippingAddr.line1 && !shippingAddr.address)) {
        alert("No delivery address selected. Please provide a delivery address first.");
        setPlacing(false);
        navigate("/checkout/shipping");
        return;
      }

      let rzpKey = RAZORPAY_KEY_ID;
      let rzpOrderId: string | undefined = undefined;
      const orderUuid = generateUUID();
      let internalOrderId = orderUuid;
      let amountPaisa = Math.round(total * 100);

      // Attempt backend order creation with graceful fallback
      try {
        const orderData = await api("/orders", {
          method: "POST",
          body: JSON.stringify({
            items: items.map(i => ({ id: i.product.id, qty: i.qty })),
            address: shippingAddr,
            checkoutType: "cart"
          })
        });

        if (orderData?.keyId) rzpKey = orderData.keyId;
        if (orderData?.razorpayOrderId) rzpOrderId = orderData.razorpayOrderId;
        if (orderData?.orderId) internalOrderId = orderData.orderId;
        if (orderData?.amount) amountPaisa = orderData.amount;
      } catch (backendErr) {
        console.warn("Backend order creation offline, proceeding with Razorpay direct checkout:", backendErr);
      }

      // Format phone properly for Razorpay — ensure full 10-digit with +91
      const rawPhone = String(user?.user_metadata?.phone || shippingAddr?.phone || "").replace(/\D/g, "");
      const cleanPhone = rawPhone.length > 10 ? rawPhone.slice(-10) : rawPhone;
      const fullContact = cleanPhone.length === 10 ? `+91${cleanPhone}` : cleanPhone;

      const options: any = {
        key: rzpKey,
        amount: amountPaisa,
        currency: "INR",
        name: "Nakshra",
        description: "Sacred Products – Temple Energized",
        image: "/favicon.ico",
        handler: async function (response: any) {
          try {
            await api("/payments/verify", {
              method: "POST",
              body: JSON.stringify({
                orderId: internalOrderId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            }).catch(() => {});

            const saveOrderData = async (orderId: string | number) => {
              const orderObj = {
                id: orderId,
                user_id: user?.id || null,
                created_at: new Date().toISOString(),
                status: "Processing",
                total_amount: Math.round(total * 100),
                items: items.map((i: any) => ({
                  product_name: i.product?.name || "Sacred Item",
                  quantity: i.qty || 1,
                  unit_price: Math.round((i.product?.price || 0) * 100)
                })),
                shipping_address: shippingAddr || null
              };

              // 1. Insert to Supabase orders DB — always store user_id and user_phone
              try {
                const userPhone = shippingAddr?.phone || user?.user_metadata?.phone || "";

                const sbPayload: any = {
                  id: orderId,
                  user_id: user?.id || null,
                  user_phone: String(userPhone).replace(/\D/g, "").slice(-10),
                  amount: Math.round(total * 100),
                  total_amount: Math.round(total * 100),
                  status: "CONFIRMED",
                  payment_method: "Razorpay",
                  payment_status: "PAID",
                  address: `${shippingAddr?.line1 || shippingAddr?.address || ""}, ${shippingAddr?.city || ""}, ${shippingAddr?.state || ""} - ${shippingAddr?.pin || shippingAddr?.pincode || ""}`,
                  shipping_address: shippingAddr || {}
                };
                const { error: sbError } = await supabase.from("orders").insert(sbPayload);
                if (sbError) console.error("Supabase order insert error:", sbError);
              } catch (e) {
                console.error("Supabase order insert exception:", e);
              }

              // 2. Save to user localStorage
              if (user?.id) {
                try {
                  const uKey = `Nakshra_user_orders_${user.id}`;
                  const uStr = localStorage.getItem(uKey);
                  const uArr = uStr ? JSON.parse(uStr) : [];
                  const uUpdated = [orderObj, ...uArr.filter((o: any) => String(o.id) !== String(orderId))];
                  localStorage.setItem(uKey, JSON.stringify(uUpdated));
                } catch (e) {}
              }

              // 3. Save to phone-keyed localStorage for cross-session persistence
              try {
                const phoneKey = String(shippingAddr?.phone || user?.user_metadata?.phone || "").replace(/\D/g, "").slice(-10);
                if (phoneKey) {
                  const pKey = `Nakshra_phone_orders_${phoneKey}`;
                  const pStr = localStorage.getItem(pKey);
                  const pArr = pStr ? JSON.parse(pStr) : [];
                  const pUpdated = [orderObj, ...pArr.filter((o: any) => String(o.id) !== String(orderId))];
                  localStorage.setItem(pKey, JSON.stringify(pUpdated));
                }
              } catch (e) {}

              // 4. Always save to guest orders fallback as backup
              try {
                const gKey = "Nakshra_guest_orders";
                const gStr = localStorage.getItem(gKey);
                const gArr = gStr ? JSON.parse(gStr) : [];
                const gUpdated = [orderObj, ...gArr.filter((o: any) => String(o.id) !== String(orderId))];
                localStorage.setItem(gKey, JSON.stringify(gUpdated));
              } catch (e) {}
            };

            await saveOrderData(internalOrderId);

            sessionStorage.setItem("Nakshra_last_order_items", JSON.stringify(items));
            sessionStorage.removeItem("Nakshra_shipping_addr");
            sessionStorage.setItem("Nakshra_last_order_id", String(internalOrderId));
            sessionStorage.setItem("Nakshra_order_total", String(total));
            
            setTimeout(() => {
              clearCart();
            }, 500);

            navigate("/checkout/confirm");
          } catch (e: any) {
            console.error("Verification error:", e);
            sessionStorage.setItem("Nakshra_last_order_items", JSON.stringify(items));
            setTimeout(() => clearCart(), 500);
            navigate("/checkout/confirm");
          }
        },
        prefill: {
          name: user?.user_metadata?.full_name || shippingAddr?.full_name || shippingAddr?.name || "Devotee",
          email: user?.email || shippingAddr?.email || "",
          contact: fullContact
        },
        notes: { items_count: items.length },
        theme: { color: MAROON },
        modal: {
          ondismiss: () => setPlacing(false)
        }
      };

      if (rzpOrderId) {
        options.order_id = rzpOrderId;
      }

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        alert("Payment failed: " + (response.error?.description || "Please try again."));
        setPlacing(false);
      });
      rzp.open();

    } catch (e: any) {
      console.error("Payment init error:", e);
      alert("Error initiating payment. Please try again.");
      setPlacing(false);
    }
  };

  const handlePlaceCodOrder = async () => {
    if (items.length === 0) { alert("Your cart is empty."); return; }

    setPlacing(true);
    try {
      const shippingAddr = (() => {
        try { return JSON.parse(sessionStorage.getItem("Nakshra_shipping_addr") || "null"); } catch { return null; }
      })();

      if (!shippingAddr) {
        alert("No delivery address selected. Please provide a delivery address first.");
        setPlacing(false);
        navigate("/checkout/shipping");
        return;
      }

      let internalOrderId = `ORD-COD-${Date.now()}`;

      try {
        const orderData = await api("/orders", {
          method: "POST",
          body: JSON.stringify({
            items: items.map(i => ({ id: i.product.id, qty: i.qty })),
            address: shippingAddr,
            paymentMode: "COD",
            checkoutType: "cart"
          })
        });

        if (orderData?.orderId) internalOrderId = orderData.orderId;
      } catch (backendErr) {
        console.warn("Backend order creation offline, proceeding with COD order fallback:", backendErr);
      }

      sessionStorage.setItem("Nakshra_last_order_items", JSON.stringify(items));
      sessionStorage.removeItem("Nakshra_shipping_addr");
      sessionStorage.setItem("Nakshra_last_order_id", String(internalOrderId));
      sessionStorage.setItem("Nakshra_order_total", String(total));
      sessionStorage.setItem("Nakshra_payment_mode", "COD");

      setTimeout(() => {
        clearCart();
      }, 500);

      navigate("/checkout/confirm");
    } catch (e: any) {
      console.error("COD Order Placement error:", e);
      sessionStorage.setItem("Nakshra_last_order_items", JSON.stringify(items));
      setTimeout(() => clearCart(), 500);
      navigate("/checkout/confirm");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="w-full overflow-x-hidden" style={{ background: "#FAF7F2", minHeight: "100vh", fontFamily: SANS }}>
      <CheckoutHeader />
      {/* Coupon celebration overlay */}
      {showCouponCelebration && (
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-20 pointer-events-none">
          <div className="px-6 py-4 rounded-2xl shadow-2xl pointer-events-auto" style={{ background: "linear-gradient(135deg,#2E8B57,#4ACA6A)", color: "#FFFFFF", animation: "slideDown 0.4s ease" }}>
            <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}`}</style>
            <p className="text-lg font-bold text-center">🎉 Yay! Coupon Applied!</p>
            <p className="text-sm text-center mt-1">You saved ₹{discount.toLocaleString("en-IN")} on this order!</p>
          </div>
        </div>
      )}
      {/* Page header */}
      <div className="pt-4 pb-4 sm:pt-6 sm:pb-6 lg:pt-8 lg:pb-6 relative overflow-hidden" style={{ background: "linear-gradient(135deg,#F5EDE0,#FAF7F2,#F0E8D8)" }}>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `repeating-linear-gradient(0deg,${MAROON} 0,${MAROON} 1px,transparent 1px,transparent 48px),repeating-linear-gradient(90deg,${MAROON} 0,${MAROON} 1px,transparent 1px,transparent 48px)` }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <button onClick={() => navigate("/checkout/shipping", { replace: true })} className="inline-flex items-center gap-2 mb-3 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all hover:shadow-md active:scale-95" style={{ background: "#FFFFFF", color: MAROON, border: `1px solid rgba(91,31,36,0.15)`, boxShadow: "0 2px 8px rgba(91,31,36,0.08)" }}>
            <ChevronLeft size={16} /> Back to Delivery
          </button>
          <div className="flex items-center gap-2 mb-2 text-xs" style={{ color: "#9A8A78" }}>
            <span>Cart</span><ChevronRight size={12} /><span style={{ color: MAROON }}>Delivery Details</span><ChevronRight size={12} /><span className="font-medium" style={{ color: MAROON }}>Payment</span>
          </div>
          <div className="flex items-center gap-3 mb-1">
            <h1 style={{ fontFamily: SERIF, fontSize: "clamp(1.5rem,4vw,2.5rem)", fontWeight: 500, color: MAROON, lineHeight: 1.1 }}>Secure Payment</h1>
          </div>
          <p className="text-xs sm:text-sm" style={{ color: "#7A6A58" }}>Complete your sacred purchase securely via Razorpay.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 pb-24 lg:pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 sm:gap-10 items-start">
          {/* Left — Pay via Razorpay card */}
          <div className="space-y-4">
            {/* Ultra-compact Coupon Bar */}
            <div className="rounded-2xl p-3 sm:p-4" style={{ background: "#FFFFFF", border: "1px solid rgba(91,31,36,0.08)", boxShadow: "0 2px 12px rgba(91,31,36,0.04)" }}>
              {appliedCoupon ? (
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl" style={{ background: "rgba(74,138,74,0.08)", border: "1px solid rgba(74,138,74,0.2)" }}>
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="text-xs font-bold px-2.5 py-1.5 rounded-lg flex-shrink-0" style={{ background: "rgba(74,138,74,0.18)", color: "#1B5E20" }}>{appliedCoupon.code}</span>
                    <div className="flex flex-col min-w-0 justify-center">
                      <span className="text-xs font-bold text-emerald-800 whitespace-nowrap">🎉 You're saving ₹{discount.toLocaleString("en-IN")}!</span>
                      <span className="text-[11px] font-medium text-emerald-700 truncate">{appliedCoupon.label}</span>
                    </div>
                  </div>
                  <button onClick={() => { removeCoupon(); setCouponMsg(null); setShowCouponCelebration(false); }} className="text-xs font-semibold px-2.5 py-1 text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0">Remove</button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 flex-shrink-0 text-xs font-semibold" style={{ color: MAROON }}>
                      <Tag size={13} style={{ color: GOLD }} />
                      <span className="hidden sm:inline">Coupon:</span>
                    </div>
                    <input
                      type="text"
                      value={couponInput}
                      onChange={e => { setCouponInput(e.target.value); setCouponMsg(null); }}
                      placeholder="Coupon code (e.g. Nakshra10)"
                      className="flex-1 min-w-0 px-3 py-2 rounded-xl text-xs outline-none uppercase font-semibold truncate"
                      style={{ border: "1px solid rgba(91,31,36,0.15)", background: "#FAF7F2", color: MAROON }}
                      onKeyDown={e => { if (e.key === "Enter") handleApplyCoupon(); }}
                    />
                    <button
                      onClick={handleApplyCoupon}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold uppercase transition-all active:scale-95 flex-shrink-0"
                      style={{ background: MAROON, color: IVORY }}
                    >
                      Apply
                    </button>
                  </div>
                  {couponMsg && (
                    <p className={`text-[11px] font-medium mt-1.5 ${couponMsg.success ? "text-emerald-600" : "text-red-500"}`}>
                      {couponMsg.success ? "✓ " : "✕ "}{couponMsg.message}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Online Payment Card (Razorpay) */}
            <div className="rounded-3xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid rgba(91,31,36,0.08)", boxShadow: "0 2px 20px rgba(91,31,36,0.04)" }}>
              <div className="px-4 sm:px-6 pt-3.5 sm:pt-4 pb-2.5" style={{ borderBottom: "1px solid rgba(91,31,36,0.06)" }}>
                <h2 className="text-base font-semibold" style={{ fontFamily: SERIF, color: MAROON }}>Payment Details</h2>
              </div>
              <div className="p-4 sm:p-6 flex flex-col items-center text-center gap-3.5 sm:gap-5">
                {/* Razorpay brand */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-md" style={{ background: "linear-gradient(135deg,#072654,#3395FF)" }}>
                    <span className="text-white font-black text-lg sm:text-xl" style={{ fontFamily: "sans-serif" }}>R</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ fontFamily: SERIF, color: MAROON }}>Pay Securely with Razorpay</p>
                    <p className="text-[10px] sm:text-xs mt-0.5" style={{ color: "#9A8A78" }}>UPI · Cards · Net Banking · Wallets · EMI</p>
                  </div>
                </div>

                {/* Total amount */}
                <div className="w-full rounded-2xl py-3 px-4 sm:px-6" style={{ background: "linear-gradient(135deg,#FAF0D8,#FAF7F2)", border: "1px solid rgba(200,160,68,0.22)" }}>
                  <p className="text-[11px] mb-0.5" style={{ color: "#9A8A78" }}>Total Amount</p>
                  <p className="text-2xl sm:text-3xl font-semibold" style={{ fontFamily: PRICE_FONT, color: MAROON }}>₹{total.toLocaleString("en-IN")}</p>
                  <p className="text-[10px] sm:text-xs mt-0.5" style={{ color: "#4A8A4A" }}>Includes free shipping + GST</p>
                </div>

                {/* Pay button */}
                <button
                  onClick={handlePay}
                  disabled={placing || items.length === 0}
                  className="w-full py-3.5 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2.5 transition-all hover:opacity-90 hover:shadow-xl disabled:opacity-60"
                  style={{ background: `linear-gradient(135deg,#072654,#3395FF)`, color: "#FFFFFF" }}
                >
                  {placing
                    ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Processing…</>
                    : <><Lock size={15} />Pay ₹{total.toLocaleString("en-IN")} with Razorpay</>
                  }
                </button>

                <p className="text-[10px]" style={{ color: "#B0A090" }}>
                  By proceeding, you agree to our Terms & Conditions. Your payment is processed securely by Razorpay.
                </p>
              </div>
            </div>

          </div>

          {/* Right sidebar – order summary / payment breakdown */}
          <div className="lg:sticky lg:top-24">
            <div className="rounded-3xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid rgba(91,31,36,0.08)", boxShadow: "0 4px 30px rgba(91,31,36,0.07)" }}>
              <div className="px-6 pt-6 pb-4 lg:pt-4 lg:pb-3" style={{ borderBottom: "1px solid rgba(91,31,36,0.06)" }}><h2 className="text-lg font-semibold" style={{ fontFamily: SERIF, color: MAROON }}>Order Summary</h2></div>
              
              {/* Mobile: collapsible items */}
              <div className="lg:hidden px-6 py-3" style={{ borderBottom: "1px solid rgba(91,31,36,0.06)" }}>
                <button onClick={() => setShowMobileItems(!showMobileItems)} className="w-full flex items-center justify-between text-sm" style={{ color: MAROON }}>
                  <span className="font-medium">{items.length} item{items.length !== 1 ? "s" : ""}</span>
                  <ChevronDown size={16} style={{ transform: showMobileItems ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
                </button>
                {showMobileItems && (
                  <div className="mt-3 space-y-2">
                    {items.map(({ product: p, qty }) => (
                      <div key={p.id} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-amber-50"><img src={p.img} alt={p.name} className="w-full h-full object-cover" /></div>
                        <div className="flex-1 min-w-0"><p className="text-xs font-semibold truncate" style={{ fontFamily: SERIF, color: MAROON }}>{p.name}</p><p className="text-[10px]" style={{ color: "#9A8A78" }}>Qty: {qty}</p></div>
                        <span className="text-xs font-semibold" style={{ fontFamily: PRICE_FONT, color: MAROON }}>₹{(p.price * qty).toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Desktop: always show items */}
              <div className="hidden lg:block px-6 py-3 space-y-2" style={{ borderBottom: "1px solid rgba(91,31,36,0.06)" }}>
                {items.map(({ product: p, qty }) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-amber-50"><img src={p.img} alt={p.name} className="w-full h-full object-cover" /></div>
                    <div className="flex-1 min-w-0"><p className="text-xs font-semibold truncate" style={{ fontFamily: SERIF, color: MAROON }}>{p.name}</p><p className="text-[10px]" style={{ color: "#9A8A78" }}>Qty: {qty}</p></div>
                    <span className="text-xs font-semibold" style={{ fontFamily: PRICE_FONT, color: MAROON }}>₹{(p.price * qty).toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>

              {/* Payment breakdown — always visible */}
              <div className="px-6 py-5 lg:py-3 space-y-3 lg:space-y-2">
                <div className="flex justify-between text-sm"><span style={{ color: "#7A6A58" }}>Subtotal</span><span style={{ color: MAROON, fontFamily: PRICE_FONT, fontWeight: 600 }}>₹{subtotal.toLocaleString("en-IN")}</span></div>
                {appliedCoupon && discount > 0 && (
                  <div className="flex justify-between text-sm"><span style={{ color: "#2E8B57" }}>Discount ({appliedCoupon.code})</span><span style={{ color: "#2E8B57", fontFamily: PRICE_FONT, fontWeight: 600 }}>−₹{discount.toLocaleString("en-IN")}</span></div>
                )}
                <div className="flex justify-between text-sm"><span style={{ color: "#7A6A58" }}>Shipping</span><span style={{ color: "#4A8A4A", fontFamily: PRICE_FONT, fontWeight: 600 }}>FREE</span></div>
                <div className="flex justify-between text-sm"><span style={{ color: "#7A6A58" }}>GST (5% Included)</span><span style={{ color: "#4A8A4A", fontFamily: PRICE_FONT, fontWeight: 600 }}>INCLUDED</span></div>
                <div className="h-px" style={{ background: `linear-gradient(90deg,transparent,rgba(200,160,68,0.3),transparent)` }} />
                <div className="flex justify-between items-baseline"><span className="text-sm font-semibold" style={{ color: MAROON }}>Grand Total</span><span className="text-2xl font-semibold" style={{ fontFamily: PRICE_FONT, color: MAROON }}>₹{total.toLocaleString("en-IN")}</span></div>
              </div>
              <div className="px-6 pb-6 lg:pb-4">
                <button onClick={() => navigate("/checkout/shipping", { replace: true })} className="w-full py-3 rounded-2xl text-sm font-medium border transition-all hover:bg-amber-50" style={{ borderColor: "rgba(91,31,36,0.2)", color: MAROON }}>← Back to Address</button>
              </div>
            </div>

            {/* Trust badges (Moved to bottom of sidebar) */}
            <div className="mt-6 rounded-3xl p-6" style={{ background: "linear-gradient(135deg,#FAF0D8,#FAF7F2)", border: "1px solid rgba(200,160,68,0.22)" }}>
              <div className="flex items-center gap-2 mb-4"><ShieldCheck size={14} style={{ color: GOLD }} /><span className="text-sm font-semibold" style={{ fontFamily: SERIF, color: MAROON }}>100% Secure Checkout</span></div>
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5 sm:gap-3">
                {[{ i: "🔒", l: "SSL Encrypted", s: "256-bit" }, { i: "🛡", l: "PCI DSS", s: "Compliant" }, { i: "💳", l: "Razorpay", s: "Secured" }, { i: "🚫", l: "No Data", s: "Stored" }].map(({ i, l, s }) => (
                  <div key={l} className="flex flex-col items-center text-center gap-1 p-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.7)" }}>
                    <span className="text-xl">{i}</span>
                    <span className="text-[10px] font-semibold" style={{ color: MAROON }}>{l}</span>
                    <span className="text-[9px]" style={{ color: "#9A8A78" }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
