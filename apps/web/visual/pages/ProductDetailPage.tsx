import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { Star, ShoppingCart, Share2, Heart, ChevronLeft, ChevronRight, Sparkles, Flame, Gem, Award, Shield, Package, Truck, CheckCircle, Mail, Phone, ChevronDown } from "lucide-react";
import { MAROON, GOLD, IVORY, SANS, SERIF, PRICE_FONT } from "@nakshra/shared-config/theme";
import { CONTACT_INFO } from "@nakshra/shared-config/contact";
import { useCart } from "@nakshra/shared-state";
import { useAuth } from "@nakshra/shared-auth";
import { useWishlist } from "@nakshra/shared-state";
import { useProducts } from "@nakshra/shared-hooks/useProducts";
import { NakshraProduct } from "@nakshra/shared-types/product";
import { DEFAULT_PRODUCTS } from "@nakshra/shared-config/products";
import { getShiprocketDeliveryEstimate } from "@nakshra/shared-api/shipping";

const PROD_TABS = ["Description", "Benefits", "How to Use", "Temple Ritual", "Reviews"];
const REVIEWS_DATA = [
  { name: "Sunita R.",  city: "Delhi",  rating: 5, text: "The quality is outstanding. I can feel the positive energy radiating from the yantra. Temple energization makes a real difference.", verified: true, date: "2 weeks ago" },
  { name: "Rahul K.",   city: "Chennai",rating: 5, text: "Received beautifully packaged with the authenticity certificate. The craftsmanship is exceptional — worth every rupee.",             verified: true, date: "1 month ago" },
  { name: "Meera P.",   city: "Pune",   rating: 4, text: "Very happy with my purchase. Delivery was prompt and the product matches the description perfectly. Highly recommend Nakshra.",    verified: true, date: "3 weeks ago" },
];

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { isLoggedIn, openAuth } = useAuth();
  const { products, loading: productsLoading } = useProducts();
  const [product, setProduct] = useState<NakshraProduct | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    if (product?.id) {
      const fetchNeighbors = async () => {
        try {
          const apiBase = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:5000";
          const res = await fetch(`${apiBase}/api/recommendations/item/${product.id}`);
          if (res.ok) {
            const data = await res.json();
            setRecommendations(data.recommendations || []);
          }
        } catch (err) {
          console.error("Failed to fetch item neighbors", err);
        }
      };
      fetchNeighbors();
    }
  }, [product?.id]);

  useEffect(() => {
    if (slug) {
      const found = products.find(p => p.slug === slug);
      if (found) {
        setProduct(found);
        setLoading(false);
      } else if (!productsLoading) {
        setProduct(null);
        setLoading(false);
      }
    }
  }, [slug, products, productsLoading]);

  const [tab, setTab] = useState(0);
  const [qty, setQty] = useState(1);
  const [selectedImg, setSelectedImg] = useState(0);
  const [showSticky, setShowSticky] = useState(false);
  const [copied, setCopied] = useState(false);
  const mainButtonsRef = useRef<HTMLDivElement>(null);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const imgViews = ["Front View", "Detail View", "In Use", "Packaging", "Certificate"];

  const nextImg = () => setSelectedImg(prev => (prev + 1) % imgViews.length);
  const prevImg = () => setSelectedImg(prev => (prev - 1 + imgViews.length) % imgViews.length);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const handleTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 40) nextImg();
    if (distance < -40) prevImg();
    setTouchStart(null);
    setTouchEnd(null);
  };

  const handleShare = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
      } else {
        const dummy = document.createElement("input");
        document.body.appendChild(dummy);
        dummy.value = window.location.href;
        dummy.select();
        document.execCommand("copy");
        document.body.removeChild(dummy);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  useEffect(() => {
    const el = mainButtonsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      setShowSticky(!entry.isIntersecting);
    }, { threshold: 0.1 });

    observer.observe(el);
    return () => observer.disconnect();
  }, [product, loading]);

  const [pin, setPin] = useState("");
  const [checking, setChecking] = useState(false);
  const [deliveryResult, setDeliveryResult] = useState<{ city?: string; state?: string; date?: string; cod?: boolean; error?: string; fallback?: boolean; carrier?: string } | null>(null);

  const checkDelivery = async () => {
    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      setDeliveryResult({ error: "Please enter a valid 6-digit pincode." });
      return;
    }
    setChecking(true);
    setDeliveryResult(null);
    try {
      let city = "";
      let state = "";
      try {
        const locRes = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const locData = await locRes.json();
        if (locData && locData[0] && locData[0].Status === "Success") {
          const postOffice = locData[0].PostOffice[0];
          city = postOffice.District;
          state = postOffice.State;
        }
      } catch (e) {
        console.error("Postal API error", e);
      }

      const est = await getShiprocketDeliveryEstimate(pin);
      setDeliveryResult({
        city: city || est.city || "",
        state: state || est.state || "",
        date: est.deliveryDate,
        cod: est.codAvailable,
        carrier: est.courier,
      });
    } catch (e) {
      console.error("Pincode check error", e);
      setDeliveryResult({
        date: "3–5 business days",
        cod: true,
        carrier: "Shiprocket Express",
        fallback: true
      });
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#FAF7F2" }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-t-transparent mx-auto mb-4 animate-spin" style={{ borderColor: `${GOLD} transparent ${GOLD} ${GOLD}` }} />
          <p className="text-sm" style={{ color: "#9A8A78", fontFamily: SANS }}>Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#FAF7F2" }}>
        <div className="text-center">
          <p className="text-lg font-semibold mb-4" style={{ fontFamily: SERIF, color: MAROON }}>Product not found</p>
          <button onClick={() => navigate("/shop")} className="px-6 py-3 rounded-full text-sm font-medium" style={{ background: MAROON, color: IVORY }}>Back to Shop</button>
        </div>
      </div>
    );
  }

  const tabContent = [
    <div className="space-y-5">
      <p className="text-sm leading-relaxed" style={{ color: "#5A4A3A" }}>
        <strong style={{ color: MAROON }}>{product.name}</strong> is not merely a product — it is a sacred instrument of Vedic science,
        crafted according to ancient Shilpa Shastra principles and energized through traditional temple rituals.
        Each piece carries the accumulated wisdom of centuries of Jyotish practice.
      </p>
      <p className="text-sm leading-relaxed md:text-base md:leading-relaxed" style={{ color: "#5A4A3A" }}>
        {product.shortDesc} The geometric precision in its construction aligns with cosmic frequencies that Vedic tradition identifies as channels for specific divine energies.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
        {[["Material", product.material], ["Size", product.size], ["Category", product.category], ["Purpose", product.purpose]].map(([k, v]) => (
          <div key={k} className="p-3 rounded-xl" style={{ background: "rgba(200,160,68,0.06)", border: "1px solid rgba(200,160,68,0.15)" }}>
            <div className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: GOLD }}>{k}</div>
            <div className="text-sm font-medium" style={{ color: MAROON }}>{v}</div>
          </div>
        ))}
      </div>
    </div>,
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {product?.benefits?.map(b => (
        <div key={b} className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: "#FFFFFF", border: "1px solid rgba(91,31,36,0.07)" }}>
          <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(200,160,68,0.1)" }}><Sparkles size={14} style={{ color: GOLD }} /></div>
          <div>
            <p className="text-sm font-semibold" style={{ fontFamily: SERIF, color: MAROON }}>{b}</p>
            <p className="text-xs mt-0.5" style={{ color: "#7A6A58" }}>Vedic tradition attests to this benefit</p>
          </div>
        </div>
      ))}
    </div>,
    <div className="space-y-4 max-w-4xl">
      {["Unbox carefully and keep in a clean place", "Cleanse with Gangajal or incense smoke", "Place in the recommended direction (usually East/Northeast)", "Offer a flower, light a diya, and chant the associated mantra", "Experience the positive energy over 40 days of regular worship"].map((step, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ background: `linear-gradient(135deg,${GOLD},#E8B84B)`, color: "#1A0D0E" }}>{i + 1}</div>
            {i < 4 && <div className="w-px flex-1 mt-1 mb-1" style={{ background: "rgba(200,160,68,0.2)", minHeight: 20 }} />}
          </div>
          <div className="pb-4"><p className="text-sm leading-relaxed" style={{ color: "#5A4A3A" }}>{step}</p></div>
        </div>
      ))}
    </div>,
    <div className="space-y-5 max-w-4xl">
      <div className="p-5 rounded-2xl" style={{ background: `linear-gradient(135deg,#FAF0D8,#FAF7F2)`, border: "1px solid rgba(200,160,68,0.2)" }}>
        <h4 className="font-semibold mb-2" style={{ fontFamily: SERIF, color: MAROON }}>Pran Pratishtha Ceremony</h4>
        <p className="text-sm leading-relaxed" style={{ color: "#5A4A3A" }}>Before reaching you, every {product.name} undergoes a complete Pran Pratishtha — a sacred consecration ritual performed by certified Vedic pandits. The ceremony includes 108 rounds of mantra chanting, ritual bathing with Panchamrit, and invocation of the presiding deity.</p>
      </div>
      {["Shuddhikaran (Purification)", "Sthapan (Installation)", "Pranpratishtha (Life-Infusion)", "Naivedya (Offering)", "Visarjan (Conclusion)"].map((r, i) => (
        <div key={r} className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold" style={{ background: "rgba(200,160,68,0.12)", color: GOLD, border: `1px solid rgba(200,160,68,0.3)` }}>{i + 1}</div>
          <span className="text-sm" style={{ color: "#5A4A3A" }}>{r}</span>
        </div>
      ))}
    </div>,
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-6 p-5 rounded-2xl" style={{ background: "rgba(200,160,68,0.06)", border: "1px solid rgba(200,160,68,0.15)" }}>
        <div className="text-center">
          <div className="text-4xl font-semibold" style={{ fontFamily: SERIF, color: MAROON }}>{product.rating}</div>
          <div className="flex gap-0.5 mt-1">{Array.from({ length: 5 }).map((_, j) => <Star key={j} size={14} fill={j < Math.round(product.rating) ? GOLD : "none"} stroke={GOLD} />)}</div>
          <div className="text-xs mt-1" style={{ color: "#7A6A58" }}>{product.reviews} reviews</div>
        </div>
        <div className="flex-1">
          {[5, 4, 3, 2, 1].map(n => (
            <div key={n} className="flex items-center gap-2 mb-1">
              <span className="text-xs w-4" style={{ color: "#9A8A78" }}>{n}</span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(91,31,36,0.08)" }}>
                <div className="h-full rounded-full" style={{ width: `${n === 5 ? 75 : n === 4 ? 18 : n === 3 ? 5 : 1}%`, background: GOLD }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      {REVIEWS_DATA.map((r, i) => (
        <div key={i} className="p-5 rounded-2xl" style={{ background: "#FFFFFF", border: "1px solid rgba(91,31,36,0.07)" }}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: MAROON, color: GOLD }}>{r.name[0]}</div>
              <div>
                <div className="text-xs font-semibold" style={{ color: MAROON }}>{r.name} · {r.city}</div>
                {r.verified && <div className="text-[10px]" style={{ color: "#4A8A4A" }}>✓ Verified Purchase</div>}
              </div>
            </div>
            <span className="text-[10px]" style={{ color: "#9A8A78" }}>{r.date}</span>
          </div>
          <div className="flex mb-2">{Array.from({ length: r.rating }).map((_, j) => <Star key={j} size={11} fill={GOLD} stroke={GOLD} />)}</div>
          <p className="text-sm leading-relaxed" style={{ color: "#5A4A3A" }}>{r.text}</p>
        </div>
      ))}
    </div>,
  ];

  return (
    <div className="w-full overflow-x-hidden" style={{ background: "#FAF7F2", minHeight: "100vh", fontFamily: SANS }}>
      <div className="pt-16 sm:pt-24 pb-0 px-4 sm:px-6 lg:px-10">
        <div className="max-w-7xl mx-auto mb-3 sm:mb-4">
          <button
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate("/shop");
              }
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all hover:bg-black/5 active:scale-95"
            style={{ color: MAROON, border: "1px solid rgba(91,31,36,0.18)", background: "#FFFFFF" }}
          >
            <ChevronLeft size={14} /> Back
          </button>
        </div>
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-2 text-xs mb-3 sm:mb-6" style={{ color: "#9A8A78" }}>
          <button onClick={() => navigate("/")} className="hover:underline whitespace-nowrap" style={{ color: MAROON }}>Home</button>
          <ChevronRight size={12} className="flex-shrink-0" />
          <button onClick={() => navigate("/shop")} className="hover:underline whitespace-nowrap" style={{ color: MAROON }}>Shop</button>
          <ChevronRight size={12} className="flex-shrink-0" />
          <span>{product.name}</span>
        </div>
      </div>
      <div className="px-4 sm:px-6 lg:px-10 pb-28 lg:pb-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[48%_32%_20%] gap-6 lg:gap-8">
          {/* Gallery with Touch Swipe Slider (Clean & No Arrow Buttons) */}
          <div>
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="max-w-md mx-auto sm:max-w-none rounded-3xl overflow-hidden aspect-[4/3] sm:aspect-square max-h-[380px] sm:max-h-[440px] bg-[#FAF7F2] mb-3 relative group flex items-center justify-center p-3 border border-amber-900/10 shadow-[0_4px_24px_rgba(91,31,36,0.06)] select-none cursor-grab active:cursor-grabbing"
            >
              <img
                src={product.img}
                alt={`${product.name} - ${imgViews[selectedImg]}`}
                className="max-h-full max-w-full w-auto h-auto object-contain transition-all duration-300 pointer-events-none"
              />

              {/* Wishlist & Share Buttons */}
              <div className="absolute top-3 right-3 flex gap-2 z-10">
                <button
                  aria-label="Add to wishlist"
                  onClick={() => { if (product) toggleWishlist(product); }}
                  className="p-2 rounded-full backdrop-blur-md bg-white/85 border border-white/60 shadow-xs hover:scale-105 active:scale-90 transition-all"
                >
                  <Heart size={16} style={{ color: product && isInWishlist(product.id) ? "#E74C3C" : "#7A6A58", fill: product && isInWishlist(product.id) ? "#E74C3C" : "none" }} />
                </button>
                <button
                  aria-label="Share product"
                  onClick={handleShare}
                  className="p-2 rounded-full backdrop-blur-md bg-white/85 border border-white/60 shadow-xs hover:scale-105 active:scale-90 transition-all"
                >
                  <Share2 size={16} style={{ color: copied ? MAROON : "#7A6A58" }} />
                </button>
              </div>

              {/* View Label Badge */}
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-xs" style={{ background: "rgba(91,31,36,0.85)", color: GOLD }}>
                {imgViews[selectedImg]}
              </div>

              {/* Touch Slider Dots Indicator */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 bg-black/25 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                {imgViews.map((_, i) => (
                  <button
                    key={i}
                    aria-label={`Go to slide ${i + 1}`}
                    onClick={() => setSelectedImg(i)}
                    className={`transition-all rounded-full ${
                      selectedImg === i ? "w-4 h-1.5 bg-[#C8A044]" : "w-1.5 h-1.5 bg-white/70 hover:bg-white"
                    }`}
                  />
                ))}
              </div>
            </div>

            {copied && (
              <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-semibold text-white animate-bounce" style={{ background: MAROON }}>
                <span>✨ Link copied to clipboard!</span>
              </div>
            )}
            
            {/* Thumbnails Row */}
            <div className="flex gap-2 overflow-x-auto pb-1 justify-center sm:justify-start">
              {imgViews.map((v, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImg(i)}
                  className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden transition-all bg-[#FAF7F2] p-1 border"
                  style={{
                    borderColor: selectedImg === i ? GOLD : "rgba(91,31,36,0.1)",
                    boxShadow: selectedImg === i ? `0 0 0 2px rgba(200,160,68,0.3)` : "none"
                  }}
                >
                  <img src={product.img} alt={v} className="w-full h-full object-contain opacity-80 hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
          {/* Product story */}
          <div>

            <h1 className="mb-1" style={{ fontFamily: SERIF, fontSize: "clamp(1.5rem,3vw,2.25rem)", fontWeight: 500, color: MAROON, lineHeight: 1.15 }}>{product.name}</h1>
            <p className="text-sm mb-3" style={{ color: GOLD, fontFamily: SANS, fontWeight: 600 }}>{product.subtitle}</p>
            <p className="text-sm leading-relaxed mb-4" style={{ color: "#5A4A3A" }}>{product.shortDesc}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-5">
              <div className="flex items-center gap-3">
                <div className="flex">{Array.from({ length: 5 }).map((_, j) => <Star key={j} size={14} fill={j < Math.round(product.rating) ? GOLD : "none"} stroke={GOLD} strokeWidth={1.5} />)}</div>
                <span className="text-sm font-medium" style={{ color: MAROON }}>{product.rating}</span>
                <span className="text-xs whitespace-nowrap" style={{ color: "#9A8A78" }}>({product.reviews} reviews)</span>
              </div>
              <span className="text-xs whitespace-nowrap" style={{ color: "#4A8A4A" }}>· 120+ bought this month</span>
            </div>
            {/* Price & Quantity Row */}
            <div className="flex items-center justify-between gap-3 mb-2 flex-wrap sm:flex-nowrap">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-2xl sm:text-3xl font-extrabold" style={{ fontFamily: PRICE_FONT, color: MAROON }}>
                  ₹{(product.price * qty).toLocaleString("en-IN")}
                </span>
                {product.original > product.price && (
                  <span className="text-sm sm:text-base line-through opacity-60 font-semibold" style={{ fontFamily: PRICE_FONT, color: "#8A7A68" }}>
                    ₹{Math.round(product.original * qty).toLocaleString("en-IN")}
                  </span>
                )}
                {product.original > product.price && (
                  <span className="text-xs sm:text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {Math.round((1 - product.price / product.original) * 100)}% OFF
                  </span>
                )}
              </div>

              {/* Quantity Counter Box */}
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-2xl overflow-hidden bg-white border border-amber-900/20 shadow-2xs">
                  <button aria-label="Decrease quantity" onClick={() => setQty(q => Math.max(1, q - 1))} className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-black/5 font-bold transition-all text-amber-900">−</button>
                  <span className="w-8 sm:w-10 text-center font-bold text-sm text-[#5B1F24]" style={{ fontFamily: SANS }}>{qty}</span>
                  <button aria-label="Increase quantity" onClick={() => setQty(q => q + 1)} className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-black/5 font-bold transition-all text-amber-900">+</button>
                </div>
                <span className="text-xs font-semibold text-emerald-600 hidden sm:inline">✓ In Stock</span>
              </div>
            </div>

            <p className="text-[11px] mb-4 font-medium text-amber-900/70">INCL. OF ALL TAXES · FREE SHIPPING · TEMPLE ENERGIZED</p>

            {/* Sticky Action Button Container (Glides in page flow and sticks to screen bottom when scrolling on mobile) */}
            <div className="sticky bottom-0 z-50 -mx-4 px-4 py-3 bg-[#FAF7F2]/95 backdrop-blur-md border-t border-amber-900/15 shadow-[0_-4px_24px_rgba(91,31,36,0.12)] sm:static sm:mx-0 sm:px-0 sm:py-0 sm:bg-transparent sm:border-0 sm:shadow-none space-y-2 mb-6">
              <button
                onClick={() => addToCart(product, qty)}
                className="w-full py-3.5 sm:py-4 rounded-2xl text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-98"
                style={{ background: `linear-gradient(135deg, ${MAROON}, #7A2A30)`, color: IVORY }}
              >
                <ShoppingCart size={16} />
                <span>ADD TO CART - ₹{(product.price * qty).toLocaleString("en-IN")}</span>
              </button>
              
              <button
                onClick={() => {
                  addToCart({
                    id: String(product.id),
                    title: product.name,
                    price: Number(product.price) || 0,
                    image: product.image || product.img || "",
                    quantity: qty,
                  } as any);

                  // Dispatch add_to_cart Telemetry
                  const activeUserId = user?.id || localStorage.getItem("Nakshra_guest_user_id") || "anonymous_user";
                  const apiBase = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:5000";
                  fetch(`${apiBase}/api/telemetry/event`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: activeUserId, productId: String(product.id), eventType: "add_to_cart" })
                  }).catch(console.error);

                  navigate("/checkout/shipping");
                  window.scrollTo({ top: 0, behavior: "instant" });
                }}
                className="w-full py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm font-bold tracking-wide border transition-all hover:bg-amber-50/80 active:scale-98 flex items-center justify-center gap-2 bg-white"
                style={{ borderColor: GOLD, color: MAROON }}
              >
                <span>⚡ BUY NOW</span>
              </button>
            </div>

            {/* Myntra-style Delivery & Pincode Checker */}
            <div className="rounded-2xl p-4 mb-6" style={{ background: "#FFFFFF", border: "1px solid rgba(91,31,36,0.08)", boxShadow: "0 2px 12px rgba(91,31,36,0.03)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Truck size={16} style={{ color: GOLD }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: MAROON }}>Delivery Options</span>
              </div>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  maxLength={6}
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter 6-digit Pincode"
                  className="flex-1 min-w-0 px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
                  style={{ border: "1.5px solid rgba(91,31,36,0.12)", background: "#FAF7F2", color: "#222222", fontFamily: SANS }}
                />
                <button
                  onClick={checkDelivery}
                  disabled={checking}
                  className="flex-shrink-0 px-3 py-2.5 rounded-xl text-xs font-bold uppercase whitespace-nowrap transition-all active:scale-95"
                  style={{ background: MAROON, color: IVORY }}
                >
                  {checking ? "Checking..." : "Check"}
                </button>
              </div>
              {deliveryResult && (
                <div className="mt-3 space-y-2 text-xs transition-opacity duration-300">
                  {deliveryResult.error ? (
                    <p className="text-red-500 font-semibold">✕ {deliveryResult.error}</p>
                  ) : (
                    <>
                      <p className="font-semibold text-emerald-600 flex items-center gap-1.5">
                        <span>✓</span> Estimated delivery: {deliveryResult.date}
                      </p>
                      {deliveryResult.city && (
                        <p style={{ color: "#7A6A58" }}>
                          Delivered to: <strong style={{ color: MAROON }}>{deliveryResult.city}, {deliveryResult.state}</strong>
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[{ icon: Flame, l: "Temple Energized" }, { icon: Gem, l: "100% Authentic" }, { icon: Award, l: "Handcrafted" }, { icon: Shield, l: "Secure Pay" }, { icon: Package, l: "Easy Returns" }].map(({ icon: Icon, l }) => (
                <div key={l} className="flex flex-col items-center gap-1 text-center">
                  <Icon size={16} style={{ color: GOLD }} strokeWidth={1.5} />
                  <span className="text-[9px] leading-tight" style={{ color: "#7A6A58" }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Trust panel */}
          <div className="lg:sticky lg:top-24 self-start space-y-4">
            <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid rgba(91,31,36,0.08)", boxShadow: "0 4px 24px rgba(91,31,36,0.07)" }}>
              <div className="px-5 py-4" style={{ background: `linear-gradient(135deg,${MAROON},#7A2A30)` }}>
                <p className="text-xs font-semibold" style={{ color: GOLD }}>Why Buy from Nakshra?</p>
              </div>
              <div className="p-4 space-y-3">
                {[{ icon: "🪔", t: "Temple Energized", d: "Pran Pratishtha by certified pandits" }, { icon: "📜", t: "Authenticity Certificate", d: "Included with every product" }, { icon: "✋", t: "Handcrafted Quality", d: "By master artisans" }, { icon: "⭐", t: "Expert Recommended", d: "By Jyotish scholars" }, { icon: "📦", t: "Premium Packaging", d: "Luxury gift box" }, { icon: "↩️", t: "Easy Returns", d: "7-day hassle-free returns" }].map(({ icon, t, d }) => (
                  <div key={t} className="flex items-start gap-2.5">
                    <span className="text-base flex-shrink-0">{icon}</span>
                    <div>
                      <div className="text-xs font-semibold" style={{ color: MAROON }}>{t}</div>
                      <div className="text-[10px]" style={{ color: "#9A8A78" }}>{d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl p-4" style={{ background: "rgba(200,160,68,0.06)", border: "1px solid rgba(200,160,68,0.2)" }}>
              <p className="text-xs font-semibold mb-1" style={{ fontFamily: SERIF, color: MAROON }}>Need Guidance?</p>
              <p className="text-[10px] mb-3" style={{ color: "#7A6A58" }}>Talk to our Vastu Expert to confirm this is the right remedy for you.</p>
              <div className="flex gap-2">
                <a href={CONTACT_INFO.whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex-1 py-2 rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1 transition-opacity hover:opacity-90" style={{ background: "#25D366", color: "white" }}>💬 WhatsApp</a>
                <a href={CONTACT_INFO.phoneTel} className="flex-1 py-2 rounded-xl text-[10px] font-semibold border flex items-center justify-center gap-1 transition-colors hover:bg-amber-50" style={{ borderColor: "rgba(91,31,36,0.2)", color: MAROON }}>📞 Call</a>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Trust strip */}
      <div className="border-y px-6 py-4" style={{ borderColor: "rgba(91,31,36,0.08)", background: "#FFFFFF" }}>
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-6 lg:gap-10">
          {[{ icon: Truck, l: "Free Shipping" }, { icon: Flame, l: "Temple Energized" }, { icon: Shield, l: "Secure Payments" }, { icon: Package, l: "Easy Returns" }, { icon: Award, l: "Premium Packaging" }, { icon: CheckCircle, l: "Trusted India-Wide" }].map(({ icon: Icon, l }) => (
            <div key={l} className="flex items-center gap-2"><Icon size={14} style={{ color: GOLD }} strokeWidth={1.5} /><span className="text-xs font-medium" style={{ color: "#5A4A3A" }}>{l}</span></div>
          ))}
        </div>
      </div>
      {/* Info tabs */}
      <div className="sticky top-16 z-30 border-b overflow-x-auto" style={{ background: "rgba(250,247,242,0.97)", backdropFilter: "blur(12px)", borderColor: "rgba(91,31,36,0.08)" }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex gap-0">
          {PROD_TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className={`px-5 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${tab === i ? "border-b-[#5B1F24] text-[#5B1F24]" : "border-b-transparent text-[#7A6A58]"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-6 pb-2">
        <div className="w-full">{tabContent[tab]}</div>
      </div>

      {/* Frequently Bought Together / Item-to-Item Recommendations */}
      {recommendations.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-900/10">
              <Sparkles className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-[#3C3024]" style={{ fontFamily: SERIF }}>
                Frequently Bought Together
              </h3>
              <p className="text-xs text-[#7A6A58] font-medium mt-0.5">
                Devotees who brought home this sacred item also resonated with these.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                onClick={() => navigate(`/shop/${rec.slug || rec.id}`)}
                className="bg-white rounded-2xl p-3 border border-amber-900/10 hover:border-amber-900/30 transition-all cursor-pointer group shadow-sm hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  {rec.reasonBadge && (
                    <span className="inline-block mb-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold text-amber-800 bg-amber-100 border border-amber-900/10">
                      {rec.reasonBadge}
                    </span>
                  )}
                  {rec.img && (
                    <img
                      src={rec.img}
                      alt={rec.name}
                      className="w-full h-32 object-cover rounded-xl mb-3 bg-amber-50 group-hover:scale-[1.02] transition-transform"
                    />
                  )}
                  <h4 className="font-bold text-sm text-[#3C3024] line-clamp-2 group-hover:text-amber-800">
                    {rec.name}
                  </h4>
                  <p className="text-xs text-[#7A6A58] line-clamp-1 mt-1 font-medium">
                    {rec.short_desc || rec.subtitle || "Sacred remedy"}
                  </p>
                </div>
                <div className="mt-3">
                  <span className="font-bold text-sm text-amber-700">₹{(rec.price / 100).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact section */}
      <div className="px-6 lg:px-10 mt-2 mb-8">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-3xl overflow-hidden" style={{ background: `linear-gradient(135deg,${MAROON},#7A2A30)`, position: "relative" }}>
            <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: `radial-gradient(circle,${GOLD} 1px,transparent 1px)`, backgroundSize: "24px 24px" }} />
            <div className="relative px-8 py-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs tracking-widest uppercase font-medium block mb-3" style={{ color: "rgba(200,160,68,0.8)" }}>Expert Guidance</span>
                  <h3 className="mb-2 text-2xl font-semibold" style={{ fontFamily: SERIF, color: IVORY, lineHeight: 1.2 }}>Confused? Let Us Help You Choose.</h3>
                  <p className="text-sm" style={{ color: "rgba(250,247,242,0.65)" }}>Our Vedic experts will personally guide you to the right remedy for your specific situation.</p>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <a href={CONTACT_INFO.emailMailto} className="flex items-center gap-3 p-4 rounded-2xl transition-all hover:scale-105" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
                  <Mail size={20} style={{ color: GOLD }} /><div><div className="text-sm font-semibold" style={{ color: IVORY }}>Email Us</div><div className="text-[11px]" style={{ color: "rgba(250,247,242,0.6)" }}>{CONTACT_INFO.email}</div></div>
                </a>
                <a href={CONTACT_INFO.phoneTel} className="flex items-center gap-3 p-4 rounded-2xl transition-all hover:scale-105" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
                  <Phone size={20} style={{ color: GOLD }} /><div><div className="text-sm font-semibold" style={{ color: IVORY }}>Call Us</div><div className="text-[11px]" style={{ color: "rgba(250,247,242,0.6)" }}>{CONTACT_INFO.phoneDisplay}</div></div>
                </a>
                <a href={CONTACT_INFO.whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-2xl transition-all hover:scale-105" style={{ background: "#25D366", border: "1px solid rgba(255,255,255,0.15)" }}>
                  <span className="text-xl">💬</span><div><div className="text-sm font-semibold" style={{ color: "white" }}>WhatsApp</div><div className="text-[11px]" style={{ color: "rgba(255,255,255,0.8)" }}>Chat instantly</div></div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
