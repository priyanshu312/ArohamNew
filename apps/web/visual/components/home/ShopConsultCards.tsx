import { ArrowRight, Flame, CheckCircle, Truck, Shield } from "lucide-react";
import { MAROON, GOLD, IVORY, SANS, SERIF } from "@nakshra/shared-config/theme";
import { NakshraProduct } from "@nakshra/shared-types/product";
import { HexPrismCarousel } from "./HexPrismCarousel";
import { useTranslation } from "react-i18next";


export function ShopConsultCards({ products, onShop, onProductClick }: { products: NakshraProduct[]; onShop: () => void; onProductClick?: (p: NakshraProduct) => void }) {
  const displayProducts = products.length >= 3 ? products.slice(0, 3) : [];
  const { t } = useTranslation();

  return (
    <section className="py-10 lg:py-20 px-4 sm:px-6 lg:px-10" style={{ background: "#FAF7F2" }}>
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-6 min-w-0">
        {/* Shop card (Hidden on mobile) */}
        <div className="hidden md:block rounded-3xl overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl h-full min-w-0"
          style={{ background: `linear-gradient(160deg,${MAROON} 0%,#5C1B23 100%)`, boxShadow: "0 20px 50px rgba(92,27,35,0.35)" }}>
          <div className="p-6 sm:p-8 flex flex-col gap-4 sm:gap-5 relative h-full">
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: `radial-gradient(circle,${GOLD} 1px,transparent 1px)`, backgroundSize: "24px 24px" }} />
            <div className="flex-1 relative z-10" />
            <div className="relative z-10">
              <h2 style={{ fontFamily: SERIF, fontSize: "clamp(2rem,3.5vw,2.6rem)", fontWeight: 700, color: IVORY, lineHeight: 1.1, marginBottom: 8 }}>{t("cards.shop_title", "Sacred Products")}</h2>
              <p className="text-sm leading-relaxed" style={{ color: GOLD, maxWidth: 480 }}>{t("cards.shop_desc", "Explore authentic gemstones, yantras & rudrakshas.")}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3 relative z-10">
              {displayProducts.map(p => (
                <div key={p.id} className="rounded-xl overflow-hidden" style={{ aspectRatio: "1/0.92", width: "100%", background: "rgba(28,18,10,0.6)" }}>
                  <img src={p.img} alt={p.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
              ))}
            </div>
            <div className="relative z-10 grid grid-cols-2 gap-x-2 sm:gap-x-4 gap-y-0" style={{ borderTop: "1px solid rgba(200,160,68,0.12)" }}>
              {[
                { icon: <Flame size={13} />, label: "Temple Energized" },
                { icon: <CheckCircle size={13} />, label: "Certified Authentic" },
                { icon: <Truck size={13} />, label: "Free Shipping" },
                { icon: <Shield size={13} />, label: "Secure Payment" },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 sm:gap-2.5 py-2 sm:py-2.5 min-w-0" style={{ borderBottom: "1px solid rgba(200,160,68,0.08)" }}>
                  <span style={{ color: GOLD, flexShrink: 0 }}>{icon}</span>
                  <span className="truncate flex-1 min-w-0 text-[10px] sm:text-[11px]" style={{ color: "rgba(217,195,171,0.6)", fontFamily: SANS, letterSpacing: "0.02em" }}>{label}</span>
                </div>
              ))}
            </div>
            <div className="relative z-10 flex items-center gap-2 text-xs sm:text-sm min-w-0" style={{ color: "rgba(217,195,171,0.8)" }}>
              <span style={{ color: GOLD, letterSpacing: 2, flexShrink: 0 }}>★★★★★</span>
              <strong style={{ color: IVORY, flexShrink: 0 }}>4.8</strong>
              <span className="w-1 h-1 rounded-full inline-block flex-shrink-0" style={{ background: "rgba(217,195,171,0.5)" }} />
              <span className="truncate flex-1 min-w-0">12,000+ devotees served</span>
            </div>
            <div className="flex-1 relative z-10" />
            <button onClick={onShop}
              className="relative z-10 w-full hidden sm:flex items-center justify-center gap-3 rounded-2xl font-bold transition-all hover:opacity-90 hover:scale-[1.02]"
              style={{ background: GOLD, color: "#5C1B23", fontFamily: SANS, fontSize: "clamp(1rem,2vw,1.2rem)", padding: "18px 24px", letterSpacing: "0.01em" }}>
              {t("cards.explore", "Explore Now")} <ArrowRight size={18} />
            </button>
          </div>
        </div>
        {/* Consult / carousel card */}
        <div className="rounded-3xl min-w-0" onClick={e => e.stopPropagation()} style={{ background: "#FFFFFF", border: "1px solid rgba(91,31,36,0.08)", boxShadow: "0 4px 30px rgba(91,31,36,0.06)", minHeight: 280 }}>
          <div className="rounded-3xl overflow-hidden p-6 pb-10 flex flex-col h-full relative" style={{ background: `linear-gradient(135deg,#0D0508,#1A0D10)` }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs tracking-widest uppercase font-semibold" style={{ color: GOLD, fontFamily: SANS }}>Sacred Collection</span>
            </div>
            <h2 className="mb-1.5" style={{ fontFamily: SERIF, fontSize: "clamp(1.4rem,2.5vw,1.9rem)", fontWeight: 500, color: IVORY, lineHeight: 1.2 }}>
              Explore Our<br /><em style={{ color: GOLD }}>Sacred Store</em>
            </h2>
            <HexPrismCarousel products={products.slice(0, 6)} onProductClick={onProductClick ?? (() => {})} />
          </div>
        </div>
      </div>
    </section>
  );
}

