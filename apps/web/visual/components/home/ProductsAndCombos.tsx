import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronRight } from "lucide-react";
import { MAROON, SAFFRON, GOLD, IVORY, SANS, SERIF } from "@nakshra/shared-config/theme";

import { NakshraProduct } from "@nakshra/shared-types/product";
import { ProductCard } from "@visual/components/product/ProductCard";
import { useTranslation } from "react-i18next";

export function ProductsAndCombos({ products, onProductClick, onAddCombo: _onAddCombo, onAddToCart }: {
  products: NakshraProduct[];
  onProductClick: (p: NakshraProduct) => void;
  onAddCombo: (name: string) => void;
  onAddToCart: (p: NakshraProduct) => void;
}) {
  const navigate = useNavigate();
  const [wish, setWish] = useState<Record<string, boolean>>({});
  const { t } = useTranslation();

  const toggleWish = (key: string, e: React.MouseEvent) => { e.stopPropagation(); setWish(w => ({ ...w, [key]: !w[key] })); };

  if (!products || products.length === 0) return null;

  const shelves: [string, string, string, NakshraProduct[], string][] = [
    [t("products.bestselling", "Bestselling Products"), t("products.top_picks", "Top Picks"), "🔥 " + t("products.trending", "Trending"), products.slice(0, 6), SAFFRON],
    [t("products.fav_items", "Fav Items"), t("products.fan_favourites", "Fan Favourites"), "❤️ " + t("products.loved", "Loved"), [...products].reverse().slice(0, 6), "#E74C3C"],
    [t("products.combo_deals", "Combo Deals"), t("products.bundle_save", "Bundle & Save"), "🎁 " + t("products.kits", "Kits"), products.slice(0, 6), GOLD],
    [t("products.mega_sale", "Mega Sale"), t("products.limited_time", "Limited Time"), "⚡ " + t("products.hot", "Hot"), [...products].sort((a, b) => (b.original - b.price) - (a.original - a.price)).slice(0, 6), SAFFRON],
    [t("products.discount_zone", "Discount Zone"), t("products.best_savings", "Best Savings"), "🏷️ " + t("products.off", "Off"), [...products].sort((a, b) => (1 - b.price / b.original) - (1 - a.price / a.original)).slice(0, 6), "#4A8A4A"],
  ];


  return (
    <section className="py-10 lg:py-20 px-4 sm:px-6 lg:px-10" style={{ background: "#FAF7F2" }}>
      <div className="max-w-7xl mx-auto space-y-8 lg:space-y-12">
        {shelves.map(([title, eyebrow, badge, products, eyebrowColor], si) => (
          <div key={title}>
            {si > 0 && <div className="h-px mb-6 lg:mb-10" style={{ background: "linear-gradient(90deg,transparent,rgba(91,31,36,0.1),transparent)" }} />}
            <div className="flex items-end justify-between gap-4 mb-4 lg:mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs tracking-[0.18em] uppercase font-medium" style={{ color: eyebrowColor, fontFamily: SANS }}>{eyebrow}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${eyebrowColor}18`, color: eyebrowColor }}>{badge}</span>
                </div>
                <h2 style={{ fontFamily: SERIF, fontSize: "clamp(1.6rem,3.5vw,2.5rem)", fontWeight: 500, color: MAROON, lineHeight: 1.15 }}>{title}</h2>
              </div>
              <button onClick={() => navigate(`/shop?title=${encodeURIComponent(title as string)}`)} className="flex items-center gap-1 text-sm font-medium whitespace-nowrap transition-opacity hover:opacity-60" style={{ color: MAROON }}>
                {t("common.view_all", "View all")} <ChevronRight size={14} />
              </button>
            </div>

            <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-6 gap-4">
              {products.slice(0, 6).map((p, pi) => (
                <ProductCard key={`${si}-${pi}`} product={p} wishKey={`${si}-${p.id}`}
                  wished={!!wish[`${si}-${p.id}`]} onToggleWish={toggleWish}
                  onProductClick={onProductClick} onAddToCart={onAddToCart} />
              ))}
            </div>
            <div className="flex md:hidden gap-3 overflow-x-auto pb-2 -mx-6 px-6 items-stretch" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
              {products.slice(0, 6).map((p, pi) => (
                <div key={`${si}-${pi}-m`} className="flex flex-col h-full" style={{ minWidth: "68vw", maxWidth: "68vw", flexShrink: 0 }}>
                  <ProductCard product={p} wishKey={`${si}-m-${p.id}`}
                    wished={!!wish[`${si}-m-${p.id}`]} onToggleWish={toggleWish}
                    onProductClick={onProductClick} onAddToCart={onAddToCart} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
