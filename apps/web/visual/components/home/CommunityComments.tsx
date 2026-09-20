import { useState, useEffect, useRef } from "react";
import { Star, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Link } from "react-router";
import { MAROON, GOLD, SANS, SERIF } from "@nakshra/shared-config/theme";
import { supabase } from "@nakshra/shared-services";
import { timeAgo } from "@nakshra/shared-hooks/useReviews";
import { useTranslation } from "react-i18next";

interface CommunityReview {
  id: string;
  name: string;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
  createdAt: string;
  productName: string;
  productSlug: string;
}

/**
 * The newest reviews customers have actually written, pulled from the same
 * table the product pages write to. Nothing is seeded: with no reviews yet the
 * section renders nothing at all rather than showing invented testimonials.
 * Writing happens on the product page, where a rating attaches to a product.
 */
export function CommunityComments() {
  const [reviews, setReviews] = useState<CommunityReview[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    let cancelled = false;
    Promise.resolve(
      supabase
        .from("product_reviews")
        .select("id,display_name,rating,title,body,verified_purchase,created_at,products(name,slug,variant_group)")
        .eq("status", "published")
        .not("body", "is", null)
        .order("created_at", { ascending: false })
        .limit(12),
    )
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        setReviews(
          data.map((r: any) => ({
            id: String(r.id),
            name: r.display_name || "Nakshra Devotee",
            rating: Number(r.rating) || 0,
            title: r.title || "",
            body: r.body || "",
            verified: !!r.verified_purchase,
            createdAt: r.created_at,
            // The listing name, so a review of "Silver, 3 g" reads as the product.
            productName: r.products?.variant_group || r.products?.name || "",
            productSlug: r.products?.slug || "",
          })),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isPaused || reviews.length < 2) return;
    const interval = setInterval(() => {
      if (!scrollRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      if (scrollLeft + clientWidth >= scrollWidth - 30) {
        scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scrollRef.current.scrollBy({ left: 350, behavior: "smooth" });
      }
    }, 4500);
    return () => clearInterval(interval);
  }, [isPaused, reviews.length]);

  const scrollByAmount = (direction: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: direction === "left" ? -350 : 350, behavior: "smooth" });
  };

  if (reviews.length === 0) return null;

  const average =
    Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10;

  return (
    <section className="pt-10 sm:pt-16 pb-4 sm:pb-6 px-4 sm:px-6 lg:px-10" style={{ background: "#FAF7F2" }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 sm:mb-14">
          <div>
            <span className="text-xs tracking-[0.2em] uppercase font-medium mb-3 block" style={{ color: GOLD, fontFamily: SANS }}>
              {t("community.badge", "Community")}
            </span>
            <h2 style={{ fontFamily: SERIF, fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 500, color: MAROON }}>
              {t("community.title", "What Our Community Says")}
            </h2>
            <p className="text-sm mt-1" style={{ color: "#7A6A58" }}>
              {reviews.length} {reviews.length === 1 ? "review" : "reviews"} · {average.toFixed(1)}{" "}
              {t("community.avg_rating", "average rating")}
            </p>
          </div>
          {reviews.length > 1 && (
            <div className="flex items-center gap-2 self-start">
              <button
                aria-label="Previous reviews"
                onClick={() => scrollByAmount("left")}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-black/5"
                style={{ border: "1px solid rgba(91,31,36,0.15)", color: MAROON }}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                aria-label="Next reviews"
                onClick={() => scrollByAmount("right")}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-black/5"
                style={{ border: "1px solid rgba(91,31,36,0.15)", color: MAROON }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        <div
          ref={scrollRef}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="flex gap-5 overflow-x-auto pb-3 -mx-6 lg:-mx-10 px-6 lg:px-10 scroll-pl-6 lg:scroll-pl-10"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none", scrollSnapType: "x mandatory" }}
        >
          {reviews.map(r => (
            <div
              key={r.id}
              className="p-6 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-xl flex-shrink-0 flex flex-col justify-between"
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(91,31,36,0.07)",
                boxShadow: "0 2px 12px rgba(91,31,36,0.04)",
                width: "clamp(280px,80vw,340px)",
                scrollSnapAlign: "start",
              }}
            >
              <div>
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} size={13} fill={j < Math.round(r.rating) ? GOLD : "none"} stroke={GOLD} strokeWidth={1.5} />
                  ))}
                </div>
                {r.title && (
                  <p className="text-sm font-semibold mb-1.5" style={{ fontFamily: SERIF, color: MAROON }}>{r.title}</p>
                )}
                <p className="text-sm leading-relaxed mb-4 line-clamp-6" style={{ color: "#5A4A3A" }}>{r.body}</p>
              </div>
              <div>
                {r.productSlug && (
                  <Link
                    to={`/shop/${r.productSlug}`}
                    className="text-[11px] font-semibold hover:underline block mb-2 truncate"
                    style={{ color: GOLD }}
                  >
                    {r.productName}
                  </Link>
                )}
                <div className="flex items-center justify-between gap-2 pt-3" style={{ borderTop: "1px solid rgba(91,31,36,0.06)" }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                      style={{ background: MAROON, color: GOLD }}
                    >
                      {r.name.trim().charAt(0).toUpperCase() || "N"}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate" style={{ color: MAROON }}>{r.name}</div>
                      {r.verified && (
                        <div className="text-[10px] flex items-center gap-0.5" style={{ color: "#4A8A4A" }}><Check size={10} /> Verified Purchase</div>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] flex-shrink-0" style={{ color: "#9A8A78" }}>{timeAgo(r.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
