import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { 
  Star, Heart, Eye, Filter, X, ChevronRight, ChevronDown, 
  ShoppingCart, LayoutGrid, List, Sparkles, Check, Plus, Minus, RotateCcw
} from "lucide-react";
import { MAROON, GOLD, IVORY, SANS, SERIF, PRICE_FONT } from "@nakshra/shared-config/theme";
import * as Select from "@radix-ui/react-select";
import { CATEGORIES, PURPOSES } from "@nakshra/shared-config/data";
import { useProducts } from "@nakshra/shared-hooks/useProducts";
import { useCart } from "@nakshra/shared-state";
import { useWishlist } from "@nakshra/shared-state";

function isSameCategory(prodCategory?: string, filterCat?: string): boolean {
  if (!prodCategory || !filterCat) return false;
  const pCatNorm = prodCategory.toLowerCase().trim().replace(/s$/, "");
  const cNorm = filterCat.toLowerCase().trim().replace(/s$/, "");
  return pCatNorm === cNorm || prodCategory.toLowerCase().trim() === filterCat.toLowerCase().trim();
}

export function ShopPage() {
  const navigate = useNavigate();
  const { items, addToCart, updateQty, removeFromCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [searchParams] = useSearchParams();
  const titleParam = searchParams.get("title") || searchParams.get("collection") || "";
  const catParam = searchParams.get("category") || "";

  const [selectedTopic, setSelectedTopic] = useState<string>("All");
  const [cats, setCats] = useState<string[]>(catParam ? [catParam] : []);
  const [prps, setPrps] = useState<string[]>([]);
  const [cols, setCols] = useState<string[]>(titleParam ? [titleParam] : []);
  const [maxPrice, setMaxPrice] = useState<number>(30000);
  const [sort, setSort] = useState<string>("recommended");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [quickViewProduct, setQuickViewProduct] = useState<any>(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  const fetchRecommendations = () => {
    const apiBase = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:5000";
    const guestId = localStorage.getItem("Nakshra_guest_user_id") || "guest_user";
    fetch(`${apiBase}/api/recommendations/${guestId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.recommendations) {
          setRecommendations(data.recommendations);
        } else if (data.recommendations) {
          setRecommendations(data.recommendations);
        }
      })
      .catch(err => console.error("Recs fetch error:", err));
  };

  useEffect(() => {
    fetchRecommendations();
  }, [cats, prps, cols]);

  useEffect(() => {
    if (catParam) setCats([catParam]);
  }, [catParam]);

  useEffect(() => {
    if (titleParam) setCols([titleParam]);
  }, [titleParam]);

  let displayTitle = titleParam || (cats.length === 1 ? cats[0] : "Sacred Products");
  if (cats.length === 1) displayTitle = cats[0];
  else if (cats.length > 1 || prps.length > 1 || cols.length > 1) displayTitle = "Filtered Products";
  const isCustom = displayTitle !== "Sacred Products";

  const { products } = useProducts();

  const filtered = products.filter(p => {
    if (cats.length) {
      const matchesCat = cats.some(c => isSameCategory(p.category, c));
      if (!matchesCat) return false;
    }
    if (prps.length && p.purpose && !prps.includes(p.purpose)) return false;
    if (cols.length) {
      let matchesCol = false;
      const lowerCols = cols.map(c => c.toLowerCase());

      if (lowerCols.some(c => c.includes("discount") || c.includes("sale") || c.includes("off"))) {
        if (p.original && p.original > p.price) matchesCol = true;
      }
      if (lowerCols.some(c => c.includes("trending") || c.includes("bestsell") || c.includes("top pick"))) {
        if ((p.rating || 0) >= 4.7 || (p.badges && p.badges.some(b => b.toLowerCase().includes("bestseller") || b.toLowerCase().includes("trending")))) {
          matchesCol = true;
        }
      }
      if (lowerCols.some(c => c.includes("combo") || c.includes("kit") || c.includes("bundle"))) {
        if (
          p.name.toLowerCase().includes("kit") ||
          p.name.toLowerCase().includes("combo") ||
          p.name.toLowerCase().includes("bundle") ||
          (p.category && (p.category.toLowerCase().includes("kit") || p.category.toLowerCase().includes("combo")))
        ) {
          matchesCol = true;
        }
      }
      if (lowerCols.some(c => c.includes("fav"))) {
        if ((p.reviews || 0) >= 200 || (p.rating || 0) >= 4.8) matchesCol = true;
      }

      if (!matchesCol) {
        const isKnownFilter = lowerCols.some(c => 
          c.includes("discount") || c.includes("sale") || c.includes("trending") || 
          c.includes("bestsell") || c.includes("combo") || c.includes("kit") || c.includes("fav")
        );
        if (!isKnownFilter) matchesCol = true;
      }

      if (!matchesCol && lowerCols.some(c => c.includes("combo") || c.includes("kit"))) {
        matchesCol = true;
      }

      if (!matchesCol) return false;
    }
    if (maxPrice < 30000 && p.price > maxPrice) return false;
    return true;
  }).sort((a, b) => {
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    if (sort === "rating") return (b.rating || 0) - (a.rating || 0);
    return (b.reviews || 0) - (a.reviews || 0);
  });

  const toggleCat = (c: string) => setCats(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  const togglePrp = (p: string) => setPrps(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  const toggleCol = (c: string) => setCols(prev => prev[0] === c ? [] : [c]);
  const clearAll = () => { setCats([]); setPrps([]); setCols([]); setMaxPrice(30000); };
  const hasActiveFilters = cats.length > 0 || prps.length > 0 || (cols.length > 0 && cols[0] !== titleParam) || maxPrice < 30000;

  const FilterPanel = () => (
    <div className="space-y-6">
      {/* Category Section */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center justify-between" style={{ color: MAROON }}>
          <span>Category</span>
          {cats.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold">{cats.length} selected</span>
          )}
        </h3>
        <div className="space-y-2">
          {CATEGORIES.map(c => {
            const count = products.filter(p => isSameCategory(p.category, c)).length;
            const isSelected = cats.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggleCat(c)}
                className={`flex items-center gap-3 w-full text-left px-2.5 py-2 rounded-xl transition-all ${
                  isSelected ? "bg-amber-900/5 font-semibold" : "hover:bg-amber-900/5"
                }`}
              >
                <div
                  className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center transition-all"
                  style={{
                    border: `2px solid ${isSelected ? MAROON : "rgba(91,31,36,0.25)"}`,
                    background: isSelected ? MAROON : "transparent"
                  }}
                >
                  {isSelected && <Check size={11} color="white" strokeWidth={3.5} />}
                </div>
                <span className="text-xs sm:text-sm flex-1" style={{ color: isSelected ? MAROON : "#4A3E31" }}>{c}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-black/5" style={{ color: "#8A7A68" }}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-amber-900/10" />

      {/* Purpose Section */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center justify-between" style={{ color: MAROON }}>
          <span>Purpose & Benefit</span>
          {prps.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold">{prps.length} selected</span>
          )}
        </h3>
        <div className="space-y-2">
          {PURPOSES.map(p => {
            const isSelected = prps.includes(p);
            return (
              <button
                key={p}
                onClick={() => togglePrp(p)}
                className={`flex items-center gap-3 w-full text-left px-2.5 py-2 rounded-xl transition-all ${
                  isSelected ? "bg-amber-900/5 font-semibold" : "hover:bg-amber-900/5"
                }`}
              >
                <div
                  className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center transition-all"
                  style={{
                    border: `2px solid ${isSelected ? MAROON : "rgba(91,31,36,0.25)"}`,
                    background: isSelected ? MAROON : "transparent"
                  }}
                >
                  {isSelected && <Check size={11} color="white" strokeWidth={3.5} />}
                </div>
                <span className="text-xs sm:text-sm flex-1" style={{ color: isSelected ? MAROON : "#4A3E31" }}>{p}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-amber-900/10" />

      {/* Price Range Slider */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: MAROON }}>Price Budget</h3>
          <span className="text-xs font-extrabold px-2 py-0.5 rounded-lg bg-amber-900/5" style={{ color: MAROON, fontFamily: PRICE_FONT }}>
            {maxPrice >= 30000 ? "All Prices" : `Up to ₹${maxPrice.toLocaleString("en-IN")}`}
          </span>
        </div>
        <div className="space-y-2 pt-1 px-1">
          <input
            type="range"
            min="500"
            max="30000"
            step="500"
            value={maxPrice}
            onChange={e => setMaxPrice(Number(e.target.value))}
            className="w-full cursor-pointer h-2 bg-amber-100 rounded-lg appearance-none accent-[#5B1F24]"
          />
          <div className="flex items-center justify-between text-[11px] font-semibold" style={{ color: "#8A7A68" }}>
            <span>₹500</span>
            <span>₹30,000+</span>
          </div>
        </div>
      </div>

      <div className="h-px bg-amber-900/10" />

      {/* Collections Section */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: MAROON }}>Curated Collections</h3>
        <div className="space-y-2">
          {["Trending Products", "Discount Zone", "Combos & Kits", "Combo Deals"].map(c => {
            const isSelected = cols.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggleCol(c)}
                className={`flex items-center gap-3 w-full text-left px-2.5 py-2 rounded-xl transition-all ${
                  isSelected ? "bg-amber-900/5 font-semibold" : "hover:bg-amber-900/5"
                }`}
              >
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center transition-all"
                  style={{
                    border: `2px solid ${isSelected ? GOLD : "rgba(91,31,36,0.25)"}`,
                    background: isSelected ? GOLD : "transparent"
                  }}
                >
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span className="text-xs sm:text-sm flex-1" style={{ color: isSelected ? MAROON : "#4A3E31" }}>{c}</span>
              </button>
            );
          })}
        </div>
      </div>

      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="w-full py-2.5 rounded-2xl text-xs font-bold border transition-all duration-200 flex items-center justify-center gap-2 hover:bg-red-50 hover:border-red-200"
          style={{ borderColor: "rgba(192,64,64,0.3)", color: "#C04040" }}
        >
          <RotateCcw size={13} /> Reset All Filters
        </button>
      )}
    </div>
  );

  return (
    <div style={{ background: "#FAF7F2", minHeight: "100vh", fontFamily: SANS }}>
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden pt-16 sm:pt-20 pb-6 sm:pb-10 px-4 sm:px-6 lg:px-10 border-b border-amber-900/10" style={{ background: "linear-gradient(135deg, #F9F3EA 0%, #F5EDE0 100%)" }}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex items-center gap-2 mb-3 text-xs font-medium" style={{ color: "#8A7A68" }}>
            <button onClick={() => navigate("/")} className="hover:underline transition-all" style={{ color: MAROON }}>Home</button>
            <ChevronRight size={12} />
            <span className="font-semibold" style={{ color: MAROON }}>Shop</span>
            {isCustom && (
              <>
                <ChevronRight size={12} />
                <span className="font-bold px-2.5 py-0.5 rounded-full bg-amber-900/10" style={{ color: MAROON }}>{displayTitle}</span>
              </>
            )}
          </div>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="tracking-tight" style={{ fontFamily: SERIF, fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", fontWeight: 600, color: MAROON }}>
                {displayTitle}
              </h1>
              <p className="text-xs sm:text-sm mt-1 sm:mt-1.5 max-w-xl font-medium" style={{ color: "#7A6A58" }}>
                {isCustom 
                  ? `Explore our authentic, temple-energized selection of ${displayTitle.toLowerCase().replace(/products?$/i, "").trim()} products.`
                  : "Handcrafted, temple-energized & astrologer-recommended sacred essentials for spiritual harmony."}
              </p>
            </div>
            
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900/80 bg-white/80 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-amber-900/10 shadow-xs w-fit">
              <Sparkles size={14} style={{ color: GOLD }} />
              <span>100% Authentic & Vedic Energized</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8">

        {/* Machine Learning Recommendations Banner */}
        {recommendations.length > 0 && !hasActiveFilters && (
          <div className="mb-10 p-6 rounded-3xl bg-gradient-to-r from-[#4D1418] via-[#5B1F24] to-[#3C1014] text-white border border-amber-500/20 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-400/30">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-amber-100" style={{ fontFamily: SERIF }}>
                    ✨ Specially Curated For You
                  </h3>
                  <p className="text-sm text-amber-200/80 font-medium mt-1">
                    Sacred remedies and temple-energized tools selected for your spiritual journey.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => navigate(`/shop/${rec.slug || rec.id}`)}
                  className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 hover:border-amber-400/50 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    {rec.reasonBadge && (
                      <span className="inline-block mb-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold text-amber-200 bg-amber-500/20 border border-amber-400/30">
                        {rec.reasonBadge}
                      </span>
                    )}
                    {rec.img && (
                      <img
                        src={rec.img}
                        alt={rec.name}
                        className="w-full h-28 object-cover rounded-xl mb-2 bg-amber-950/20 group-hover:scale-105 transition-transform"
                      />
                    )}
                    <h4 className="font-bold text-xs text-white truncate group-hover:text-amber-200">
                      {rec.name}
                    </h4>
                    <p className="text-[10px] text-amber-200/70 line-clamp-1 mt-0.5 font-medium">
                      {rec.short_desc || rec.subtitle || "Sacred remedy"}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-extrabold text-xs text-amber-300">
                      ₹{typeof rec.price === "number" ? (rec.price / 100).toFixed(0) : rec.price}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-200/80 bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
                      View
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Active Filters Bar (Hidden on mobile, only shown on tablet/desktop if user manually filtered) */}
        {hasActiveFilters && (
          <div className="hidden sm:flex flex-wrap items-center gap-2 mb-6 p-2.5 sm:p-3 rounded-2xl bg-white border border-amber-900/10 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900/70 mr-1 flex items-center gap-1.5">
              <Filter size={12} /> Active Filters:
            </span>
            {cats.map(c => (
              <span key={c} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-xs" style={{ background: "rgba(91,31,36,0.08)", color: MAROON }}>
                {c}
                <button onClick={() => toggleCat(c)} className="hover:bg-amber-900/10 rounded-full p-0.5 transition-all"><X size={11} /></button>
              </span>
            ))}
            {prps.map(p => (
              <span key={p} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-xs" style={{ background: "rgba(91,31,36,0.08)", color: MAROON }}>
                {p}
                <button onClick={() => togglePrp(p)} className="hover:bg-amber-900/10 rounded-full p-0.5 transition-all"><X size={11} /></button>
              </span>
            ))}
            {cols.filter(c => c !== titleParam).map(c => (
              <span key={c} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-xs" style={{ background: "rgba(91,31,36,0.08)", color: MAROON }}>
                {c}
                <button onClick={() => toggleCol(c)} className="hover:bg-amber-900/10 rounded-full p-0.5 transition-all"><X size={11} /></button>
              </span>
            ))}
            {maxPrice < 30000 && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-xs" style={{ background: "rgba(91,31,36,0.08)", color: MAROON }}>
                Under ₹{maxPrice.toLocaleString("en-IN")}
                <button onClick={() => setMaxPrice(30000)} className="hover:bg-amber-900/10 rounded-full p-0.5 transition-all"><X size={11} /></button>
              </span>
            )}
            <button
              onClick={clearAll}
              className="ml-auto text-xs font-bold hover:underline px-2 py-1 text-red-700"
            >
              Clear All
            </button>
          </div>
        )}

        <div className="flex gap-8 items-start">
          
          {/* Desktop Filter Sidebar */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 p-6 rounded-3xl bg-white border border-amber-900/10 shadow-[0_4px_24px_rgba(91,31,36,0.04)]">
              <FilterPanel />
            </div>
          </div>

          {/* Product Listing Main Section */}
          <div className="flex-1 min-w-0">
            
            {/* Redesigned Filter Toolbar: Ultra clean on Mobile */}
            <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-amber-900/10">
              
              {/* Left Controls: Filter Drawer Button & Product Count */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-bold transition-all border shadow-2xs hover:bg-amber-900/5 active:scale-95 bg-white"
                  style={{ borderColor: "rgba(91,31,36,0.18)", color: MAROON }}
                >
                  <Filter size={13} />
                  <span>Filters</span>
                  {hasActiveFilters && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5B1F24]" />
                  )}
                </button>

                <div className="text-xs font-medium" style={{ color: "#7A6A58" }}>
                  <span className="hidden sm:inline">Showing </span><strong className="font-bold text-xs sm:text-sm" style={{ color: MAROON }}>{filtered.length}</strong> products
                </div>
              </div>

              {/* Right Controls: View Switcher (Desktop only) & Sort Dropdown */}
              <div className="flex items-center gap-2">
                {/* View Switcher (Hidden on mobile for ultra clean UI) */}
                <div className="hidden sm:flex items-center p-0.5 rounded-xl bg-black/[0.04] border border-black/5">
                  <button
                    aria-label="Grid View"
                    onClick={() => setViewMode("grid")}
                    className={`h-8 w-8 sm:w-9 rounded-lg flex items-center justify-center transition-all ${
                      viewMode === "grid"
                        ? "bg-white shadow-2xs text-[#5B1F24]"
                        : "text-amber-900/50 hover:text-amber-900"
                    }`}
                  >
                    <LayoutGrid size={15} />
                  </button>
                  <button
                    aria-label="List View"
                    onClick={() => setViewMode("list")}
                    className={`h-8 w-8 sm:w-9 rounded-lg flex items-center justify-center transition-all ${
                      viewMode === "list"
                        ? "bg-white shadow-2xs text-[#5B1F24]"
                        : "text-amber-900/50 hover:text-amber-900"
                    }`}
                  >
                    <List size={15} />
                  </button>
                </div>

                {/* Sort Dropdown */}
                <Select.Root value={sort} onValueChange={setSort}>
                  <Select.Trigger asChild>
                    <button
                      className="h-9 px-2.5 sm:px-4 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs outline-none bg-white border hover:border-amber-900/30"
                      style={{ borderColor: "rgba(91,31,36,0.18)", color: MAROON, fontFamily: SANS }}
                    >
                      <Select.Value />
                      <ChevronDown size={13} style={{ color: MAROON }} />
                    </button>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content
                      position="popper"
                      align="end"
                      sideOffset={6}
                      className="z-[200] rounded-2xl shadow-2xl border overflow-hidden p-1.5 min-w-[185px] bg-white border-amber-900/15"
                    >
                      <Select.Viewport className="space-y-1">
                        {[
                          { v: "popular", l: "Most Popular" },
                          { v: "price-asc", l: "Price: Low to High" },
                          { v: "price-desc", l: "Price: High to Low" },
                          { v: "rating", l: "Highest Rated" }
                        ].map(opt => (
                          <Select.Item
                            key={opt.v}
                            value={opt.v}
                            className="px-3.5 py-2 text-xs font-semibold rounded-xl cursor-pointer outline-none transition-colors data-[highlighted]:bg-amber-900/10 data-[state=checked]:bg-amber-900/15 data-[state=checked]:text-[#5B1F24]"
                            style={{ color: MAROON, fontFamily: SANS }}
                          >
                            <Select.ItemText>{opt.l}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>
            </div>

            {/* Empty State */}
            {filtered.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-amber-900/10 shadow-xs my-6">
                <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4 text-3xl">
                  🔍
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ fontFamily: SERIF, color: MAROON }}>
                  No sacred products match your criteria
                </h3>
                <p className="text-sm max-w-md mx-auto mb-6 text-amber-900/70 font-medium">
                  Try adjusting your price range, clearing specific category filters, or resetting your filter choices.
                </p>
                <button
                  onClick={clearAll}
                  className="px-6 py-3 rounded-2xl text-xs font-bold tracking-wider uppercase transition-all shadow-md hover:shadow-lg active:scale-95"
                  style={{ background: MAROON, color: IVORY }}
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              /* Products Grid or List View */
              viewMode === "grid" ? (
                /* GRID VIEW CARDS */
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 lg:gap-6 items-stretch">
                  {filtered.map(p => {
                    const discountPct = p.original > p.price ? Math.round((1 - p.price / p.original) * 100) : 0;
                    const itemInCart = items.find(i => i.product.id === p.id);
                    const cartQty = itemInCart ? itemInCart.qty : 0;
                    const isWish = isInWishlist(p.id);

                    return (
                      <div
                        key={p.id}
                        onClick={() => navigate(`/shop/${p.slug}`)}
                        className="group rounded-none sm:rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 sm:hover:-translate-y-1.5 bg-white flex flex-col justify-between border-b sm:border border-gray-200 sm:border-amber-900/10 sm:shadow-[0_2px_12px_rgba(0,0,0,0.03)] sm:hover:shadow-[0_16px_36px_rgba(91,31,36,0.12)]"
                      >
                        {/* Image — Myntra-style: tall aspect, no padding on mobile */}
                        <div className="relative aspect-[3/4] sm:aspect-[4/3] bg-[#F5F5F6] sm:bg-[#FAF7F2] overflow-hidden flex items-center justify-center sm:p-4">
                          <img
                            src={p.img}
                            alt={`${p.name} - ${p.subtitle}`}
                            className="w-full h-full object-cover sm:object-contain transition-transform duration-700 group-hover:scale-108"
                          />

                          {/* Badge — compact on mobile */}
                          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col gap-1 z-10 pointer-events-none">
                            {p.badges && p.badges.length > 0 && (
                              <span
                                className="px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-sm sm:rounded-full text-[8px] sm:text-[10px] font-extrabold tracking-wider uppercase backdrop-blur-md shadow-xs"
                                style={{ background: "rgba(91,31,36,0.88)", color: GOLD }}
                              >
                                {p.badges[0]}
                              </span>
                            )}
                          </div>

                          {/* Wishlist — smaller on mobile */}
                          <button
                            aria-label="Add to wishlist"
                            onClick={e => {
                              e.stopPropagation();
                              toggleWishlist(p);
                            }}
                            className="absolute top-2 right-2 sm:top-3 sm:right-3 w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center backdrop-blur-md bg-white/80 border border-white/60 shadow-sm transition-transform duration-200 hover:scale-110 active:scale-90 z-10"
                          >
                            <Heart
                              size={13}
                              className="sm:w-[15px] sm:h-[15px]"
                              style={{
                                color: isWish ? "#E74C3C" : "#7A6A58",
                                fill: isWish ? "#E74C3C" : "none"
                              }}
                            />
                          </button>

                          {/* Quick View — desktop only */}
                          <div className="hidden sm:flex absolute inset-x-0 bottom-0 py-2.5 items-center justify-center gap-2 text-xs font-bold translate-y-full group-hover:translate-y-0 transition-transform duration-300 shadow-md"
                            style={{ background: "rgba(91,31,36,0.92)", color: GOLD }}>
                            <Eye size={14} /> Quick View
                          </div>
                        </div>

                        {/* Details — compact Myntra-style on mobile */}
                        <div className="p-2.5 sm:p-5 flex-1 flex flex-col justify-between gap-1.5 sm:gap-3">
                          <div className="space-y-0.5 sm:space-y-1.5">
                            {/* Category + Rating row */}
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] sm:text-[10px] uppercase font-extrabold tracking-wider" style={{ color: "#8A7A68" }}>
                                {p.category || "Sacred Item"}
                              </span>
                              {p.rating && (
                                <div className="flex items-center gap-0.5 sm:gap-1 sm:bg-amber-50 sm:px-2 sm:py-0.5 sm:rounded-full sm:border sm:border-amber-900/10">
                                  <Star size={10} className="sm:w-[11px] sm:h-[11px]" fill={GOLD} stroke={GOLD} />
                                  <span className="text-[10px] sm:text-[11px] font-bold" style={{ color: MAROON }}>{p.rating}</span>
                                  {p.reviews && <span className="text-[8px] sm:text-[9px]" style={{ color: "#8A7A68" }}>({p.reviews})</span>}
                                </div>
                              )}
                            </div>

                            {/* Product name — 1 line on mobile, 2 on desktop */}
                            <h3
                              className="text-xs sm:text-base font-bold leading-tight sm:leading-snug line-clamp-1 sm:line-clamp-2 transition-colors group-hover:text-[#7A2A30]"
                              style={{ fontFamily: SERIF, color: MAROON }}
                            >
                              {p.name}
                            </h3>

                            {/* Subtitle */}
                            <p className="text-[10px] sm:text-xs line-clamp-1 font-medium" style={{ color: "#7A6A58" }}>
                              {p.subtitle}
                            </p>
                          </div>

                          {/* Price + Cart */}
                          <div className="pt-1 space-y-1.5 sm:space-y-2">
                            {/* Pricing row */}
                            <div className="flex items-baseline gap-1 sm:gap-2 flex-wrap justify-between">
                              <div className="flex items-baseline gap-1 sm:gap-2 flex-wrap">
                                <span className="text-sm sm:text-xl font-extrabold" style={{ fontFamily: PRICE_FONT, color: MAROON }}>
                                  ₹{Math.round(p.price).toLocaleString("en-IN")}
                                </span>
                                {p.original > p.price && (
                                  <span className="text-[10px] sm:text-xs line-through opacity-60 font-semibold" style={{ fontFamily: PRICE_FONT, color: "#8A7A68" }}>
                                    ₹{Math.round(p.original).toLocaleString("en-IN")}
                                  </span>
                                )}
                              </div>

                              {discountPct > 0 && (
                                <span className="text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {discountPct}% OFF
                                </span>
                              )}
                            </div>

                            {/* Add to Cart */}
                            {cartQty > 0 ? (
                              <div
                                onClick={e => e.stopPropagation()}
                                className="w-full py-1 sm:py-1.5 px-2 sm:px-3 rounded-lg sm:rounded-2xl flex items-center justify-between font-bold text-[10px] sm:text-xs shadow-sm"
                                style={{ background: `linear-gradient(135deg, ${MAROON}, #7A2A30)`, color: IVORY }}
                              >
                                <button
                                  aria-label="Decrease quantity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (cartQty <= 1) removeFromCart(p.id);
                                    else updateQty(p.id, -1);
                                  }}
                                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl flex items-center justify-center transition-all hover:bg-white/20 active:scale-90"
                                  style={{ color: GOLD }}
                                >
                                  <Minus size={11} strokeWidth={3} />
                                </button>
                                
                                <span className="text-[10px] sm:text-xs font-extrabold tracking-wider" style={{ color: IVORY }}>
                                  {cartQty} IN CART
                                </span>

                                <button
                                  aria-label="Increase quantity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateQty(p.id, 1);
                                  }}
                                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl flex items-center justify-center transition-all hover:bg-white/20 active:scale-90"
                                  style={{ color: GOLD }}
                                >
                                  <Plus size={11} strokeWidth={3} />
                                </button>
                              </div>
                            ) : (
                              <button
                                aria-label={`Add ${p.name} to cart`}
                                onClick={e => {
                                  e.stopPropagation();
                                  addToCart(p, 1, false);
                                }}
                                className="w-full py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg sm:rounded-2xl text-[10px] sm:text-xs font-bold tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 shadow-xs hover:shadow-md hover:opacity-95 active:scale-98 uppercase border border-[#5B1F24] sm:border-0 bg-transparent sm:bg-[linear-gradient(135deg,#5B1F24,#7A2A30)] text-[#5B1F24] sm:text-[#FAF7F2]"
                              >
                                <ShoppingCart size={12} className="sm:w-[14px] sm:h-[14px]" />
                                <span>ADD TO CART</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* LIST VIEW CARDS */
                <div className="space-y-4">
                  {filtered.map(p => {
                    const discountPct = p.original > p.price ? Math.round((1 - p.price / p.original) * 100) : 0;
                    const itemInCart = items.find(i => i.product.id === p.id);
                    const cartQty = itemInCart ? itemInCart.qty : 0;
                    const isWish = isInWishlist(p.id);

                    return (
                      <div
                        key={p.id}
                        onClick={() => navigate(`/shop/${p.slug}`)}
                        className="group rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl bg-white border border-amber-900/10 p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6"
                      >
                        {/* List View Image */}
                        <div className="w-full sm:w-44 md:w-52 h-44 sm:h-40 flex-shrink-0 relative rounded-2xl overflow-hidden bg-[#FAF7F2] p-3 flex items-center justify-center">
                          <img
                            src={p.img}
                            alt={`${p.name} - ${p.subtitle}`}
                            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                          />
                          
                          {p.badges && p.badges.length > 0 && (
                            <span
                              className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase backdrop-blur-md"
                              style={{ background: "rgba(91,31,36,0.88)", color: GOLD }}
                            >
                              {p.badges[0]}
                            </span>
                          )}

                          <button
                            aria-label="Add to wishlist"
                            onClick={e => {
                              e.stopPropagation();
                              toggleWishlist(p);
                            }}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md bg-white/80 border border-white/60 shadow-xs"
                          >
                            <Heart size={13} style={{ color: isWish ? "#E74C3C" : "#7A6A58", fill: isWish ? "#E74C3C" : "none" }} />
                          </button>
                        </div>

                        {/* List View Details Column */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-extrabold tracking-wider" style={{ color: "#8A7A68" }}>
                              {p.category || "Sacred Item"}
                            </span>
                            {p.purpose && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900/80 border border-amber-900/10">
                                {p.purpose}
                              </span>
                            )}
                          </div>

                          <h3 className="text-base sm:text-lg font-bold leading-snug group-hover:text-[#7A2A30]" style={{ fontFamily: SERIF, color: MAROON }}>
                            {p.name}
                          </h3>

                          <p className="text-xs text-amber-900/70 font-medium line-clamp-2">
                            {p.subtitle}
                          </p>

                          {p.rating && (
                            <div className="flex items-center gap-1.5 pt-1">
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }).map((_, j) => (
                                  <Star key={j} size={11} fill={j < Math.round(p.rating!) ? GOLD : "none"} stroke={GOLD} strokeWidth={1.5} />
                                ))}
                              </div>
                              <span className="text-xs font-bold" style={{ color: MAROON }}>{p.rating}</span>
                              {p.reviews && <span className="text-xs text-amber-900/60 font-medium">({p.reviews} verified reviews)</span>}
                            </div>
                          )}
                        </div>

                        {/* List View Price & Action Column */}
                        <div className="w-full sm:w-48 flex-shrink-0 flex flex-col sm:items-end justify-center gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-amber-900/10">
                          <div className="flex flex-col sm:items-end">
                            <div className="flex items-baseline gap-2">
                              <span className="text-xl font-extrabold" style={{ fontFamily: PRICE_FONT, color: MAROON }}>
                                ₹{Math.round(p.price).toLocaleString("en-IN")}
                              </span>
                              {p.original > p.price && (
                                <span className="text-xs line-through opacity-60 font-semibold" style={{ fontFamily: PRICE_FONT, color: "#8A7A68" }}>
                                  ₹{Math.round(p.original).toLocaleString("en-IN")}
                                </span>
                              )}
                            </div>
                            {discountPct > 0 && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-1 border border-emerald-200">
                                Save {discountPct}%
                              </span>
                            )}
                          </div>

                          {cartQty > 0 ? (
                            <div
                              onClick={e => e.stopPropagation()}
                              className="w-full sm:w-40 py-2 px-3 rounded-2xl flex items-center justify-between font-bold text-xs shadow-sm"
                              style={{ background: `linear-gradient(135deg, ${MAROON}, #7A2A30)`, color: IVORY }}
                            >
                              <button
                                aria-label="Decrease quantity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (cartQty <= 1) removeFromCart(p.id);
                                  else updateQty(p.id, -1);
                                }}
                                className="w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:bg-white/20"
                                style={{ color: GOLD }}
                              >
                                <Minus size={12} strokeWidth={3} />
                              </button>
                              
                              <span className="text-xs font-bold" style={{ color: IVORY }}>
                                {cartQty} in cart
                              </span>

                              <button
                                aria-label="Increase quantity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateQty(p.id, 1);
                                }}
                                className="w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:bg-white/20"
                                style={{ color: GOLD }}
                              >
                                <Plus size={12} strokeWidth={3} />
                              </button>
                            </div>
                          ) : (
                            <button
                              aria-label={`Add ${p.name} to cart`}
                              onClick={e => {
                                e.stopPropagation();
                                addToCart(p, 1, false);
                              }}
                              className="w-full sm:w-40 py-2.5 px-4 rounded-2xl text-xs font-bold tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-xs hover:shadow-md active:scale-98 uppercase"
                              style={{ background: `linear-gradient(135deg, ${MAROON}, #7A2A30)`, color: IVORY }}
                            >
                              <ShoppingCart size={14} />
                              <span>ADD TO CART</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-80 max-w-[85vw] bg-white h-full overflow-y-auto p-6 shadow-2xl ml-auto flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-amber-900/10 mb-6">
                <div className="flex items-center gap-2">
                  <Filter size={18} style={{ color: MAROON }} />
                  <h3 className="font-bold text-base" style={{ fontFamily: SERIF, color: MAROON }}>Filter Products</h3>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-full hover:bg-black/5">
                  <X size={20} style={{ color: MAROON }} />
                </button>
              </div>
              <FilterPanel />
            </div>

            <div className="pt-6 border-t border-amber-900/10 mt-6 sticky bottom-0 bg-white">
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-full py-3 rounded-2xl text-xs font-bold tracking-wider uppercase shadow-md active:scale-95"
                style={{ background: MAROON, color: IVORY }}
              >
                Apply Filters ({filtered.length} Results)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

