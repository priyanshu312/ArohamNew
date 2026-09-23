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

  // A shelf shows its first six. The nine bhojpatra yantras sit together in
  // the shop's order, so they filled half the Yantras row and hid the other
  // yantras. Each keeps its own card; they just follow the rest of the shelf.
  const isBhojpatra = (p: NakshraProduct) => /bhojpatra/i.test(p.variantGroup || p.name);
  const yantras = products.filter(p => p.category === "Yantra");
  const yantraShelf = [...yantras.filter(p => !isBhojpatra(p)), ...yantras.filter(isBhojpatra)];

  // Four shelves of what the shop actually sells, each filtered by its own
  // category so "View all" lands somewhere real. What was here before was five
  // shelves of the same products under invented labels — "Bestselling", "Fav
  // Items", "Mega Sale" — whose View all links opened an empty shop page.
  const shelves: [string, string, string, NakshraProduct[], string][] = [
    ["Yantras", t("products.shelf_yantra", "Sacred geometry"), "Yantra",
      yantraShelf, MAROON],
    ["Rudraksha", t("products.shelf_rudraksha", "One to fourteen mukhi"), "Rudraksha",
      products.filter(p => p.category === "Rudraksha"), SAFFRON],
    ["Pendants", t("products.shelf_pendant", "Set in silver and gold"), "Pendant",
      products.filter(p => p.category === "Pendant"), GOLD],
    ["Vastu", t("products.shelf_vastu", "For the home and the office"), "Vastu",
      products.filter(p => p.category === "Vastu"), "#4A8A4A"],
  ].filter(sh => (sh[3] as NakshraProduct[]).length > 0) as [string, string, string, NakshraProduct[], string][];


  return (
    <section className="py-10 lg:py-20 px-4 sm:px-6 lg:px-10" style={{ background: "#FAF7F2" }}>
      <div className="max-w-7xl mx-auto space-y-8 lg:space-y-12">
        {shelves.map(([title, eyebrow, category, products, eyebrowColor], si) => (
          <div key={title}>
            {si > 0 && <div className="h-px mb-6 lg:mb-10" style={{ background: "linear-gradient(90deg,transparent,rgba(91,31,36,0.1),transparent)" }} />}
            <div className="flex items-end justify-between gap-4 mb-4 lg:mb-8">
              <div>
                <div className="mb-1.5">
                  <span className="text-xs tracking-[0.18em] uppercase font-medium" style={{ color: eyebrowColor, fontFamily: SANS }}>{eyebrow}</span>
                </div>
                <h2 style={{ fontFamily: SERIF, fontSize: "clamp(1.6rem,3.5vw,2.5rem)", fontWeight: 500, color: MAROON, lineHeight: 1.15 }}>{title}</h2>
              </div>
              <button onClick={() => navigate(`/shop?category=${encodeURIComponent(category as string)}`)} className="flex items-center gap-1 text-sm font-medium whitespace-nowrap transition-opacity hover:opacity-60" style={{ color: MAROON }}>
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
