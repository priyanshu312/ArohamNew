import { useState } from "react";
import { useNavigate } from "react-router";
import { Star, Heart, ShoppingCart } from "lucide-react";
import { MAROON, GOLD, IVORY, SANS, SERIF, PRICE_FONT } from "@nakshra/shared-config/theme";
import { NakshraProduct } from "@nakshra/shared-types/product";
import { useWishlist } from "@nakshra/shared-state";
import { useCart } from "@nakshra/shared-state";
import { useAuth } from "@nakshra/shared-auth";

export interface ProductCardProps {
  product: NakshraProduct;
  onProductClick: (p: NakshraProduct) => void;
  onAddToCart?: (p: NakshraProduct) => void;
  wishKey?: string;
  wished?: boolean;
  onToggleWish?: (key: string, e: React.MouseEvent) => void;
}

export function ProductCard({ product: p, onProductClick, onAddToCart, wishKey = "", wished: propWished, onToggleWish }: ProductCardProps) {
  const navigate = useNavigate();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { items, addToCart, updateQty, removeFromCart } = useCart();
  const { user } = useAuth();

  const isItemWished = propWished !== undefined ? propWished : isInWishlist(p.id);
  const cartItem = items.find(item => item.product.id === p.id);
  const qty = cartItem ? cartItem.qty : 0;

  const handleWishClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleWish && wishKey) {
      onToggleWish(wishKey, e);
    }
    toggleWishlist(p);
  };

  const handleCardClick = () => {
    const userId = user?.id || "anonymous_user";
    const apiBase = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:5000";
    fetch(`${apiBase}/api/telemetry/click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, productId: p.id })
    }).catch(err => console.error("Telemetry error:", err));

    onProductClick(p);
  };

  return (
    <div onClick={handleCardClick}
      className="group rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1.5 cursor-pointer h-full flex flex-col justify-between"
      style={{ background: "#FFFFFF", boxShadow: "0 2px 18px rgba(91,31,36,0.06)", border: "1px solid rgba(91,31,36,0.07)" }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "0 14px 36px rgba(91,31,36,0.12)"}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 18px rgba(91,31,36,0.06)"}>
      <div>
        <div className="relative overflow-hidden aspect-square bg-amber-50 flex-shrink-0">
          <img src={p.img} alt={`${p.name} - ${p.subtitle}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          {p.badges && p.badges.length > 0 && p.price > 1000 && (
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide" style={{ background: "rgba(91,31,36,0.88)", color: GOLD }}>{p.badges[0]}</div>
          )}
          <button aria-label="Add to wishlist" onClick={handleWishClick}
            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110"
            style={{ background: "rgba(255,255,255,0.92)", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <Heart size={12} style={{ color: isItemWished ? "#E74C3C" : "#9A8A78", fill: isItemWished ? "#E74C3C" : "none" }} />
          </button>
          {p.original > p.price && (
            <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ background: "#E74C3C", color: "#fff" }}>
              -{Math.round((1 - p.price / p.original) * 100)}%
            </div>
          )}
        </div>
        <div className="p-3.5 pb-2">
          <h3 className="text-xs font-semibold leading-snug mb-1 line-clamp-2 min-h-[2rem]" style={{ fontFamily: SERIF, color: MAROON }}>{p.name}</h3>
          <p className="text-[10px] mb-2 truncate" style={{ color: "#7A6A58" }}>{p.subtitle}</p>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, j) => <Star key={j} size={10} fill={j < Math.round(p.rating) ? GOLD : "none"} stroke={GOLD} strokeWidth={1.5} />)}
            <span className="text-[9px] ml-1 font-medium" style={{ color: "#9A8A78" }}>({p.reviews})</span>
          </div>
        </div>
      </div>
      <div className="p-3 pt-1 flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-1 flex-wrap">
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-sm font-bold" style={{ fontFamily: PRICE_FONT, color: MAROON }}>₹{Math.round(p.price).toLocaleString("en-IN")}</span>
            {p.original > p.price && (
              <span className="text-[10px] line-through opacity-70" style={{ fontFamily: PRICE_FONT, color: "#9A8A78" }}>₹{Math.round(p.original).toLocaleString("en-IN")}</span>
            )}
          </div>
          {p.original > p.price && (
            <span className="text-[10px] font-bold" style={{ color: "#2E7D32" }}>
              {Math.round((1 - p.price / p.original) * 100)}% OFF
            </span>
          )}
        </div>
        {qty > 0 ? (
          <div onClick={e => e.stopPropagation()} className="w-full py-1 px-3 rounded-xl flex items-center justify-between font-bold text-xs shadow-sm mt-0.5" style={{ background: `linear-gradient(135deg,${MAROON},#7A2A30)`, color: IVORY }}>
            <button
              aria-label="Decrease quantity"
              onClick={(e) => {
                e.stopPropagation();
                if (qty <= 1) {
                  removeFromCart(p.id);
                } else {
                  updateQty(p.id, -1);
                }
              }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-base font-bold transition-all hover:bg-white/20 active:scale-95"
              style={{ color: GOLD }}
            >
              -
            </button>
            <span className="text-sm font-bold tracking-wider px-2" style={{ color: IVORY, fontFamily: SANS }}>{qty}</span>
            <button aria-label="Increase quantity" onClick={() => updateQty(p.id, 1)} className="w-7 h-7 rounded-lg flex items-center justify-center text-base font-bold transition-all hover:bg-white/20 active:scale-95" style={{ color: GOLD }}>+</button>
          </div>
        ) : (
          <button aria-label={`Add ${p.name} to cart`}
            onClick={e => { e.stopPropagation(); if (onAddToCart) onAddToCart(p); else addToCart(p, 1, false); }}
            className="w-full py-2 rounded-xl flex items-center justify-center text-[11px] font-bold tracking-wide transition-all hover:opacity-90 active:scale-95 shadow-sm uppercase mt-0.5"
            style={{ background: `linear-gradient(135deg,${MAROON},#7A2A30)`, color: IVORY, border: "none", cursor: "pointer", fontFamily: SANS }}>
            <span>Add to Cart</span>
          </button>
        )}
      </div>
    </div>
  );
}
