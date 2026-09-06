import { useState, useEffect, useRef } from "react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { MAROON, GOLD, IVORY, SANS, SERIF } from "@nakshra/shared-config/theme";
import { COMMENTS_DATA } from "@nakshra/shared-config/data";
import { NakshraProduct } from "@nakshra/shared-types/product";
import { FloatingInput } from "@visual/components/auth/FloatingInput";
import { FloatingSelect } from "@visual/components/auth/FloatingSelect";
import { supabase } from "@nakshra/shared-services";
import { useTranslation } from "react-i18next";

export function CommunityComments({ products = [] }: { products?: NakshraProduct[] }) {
  const [liked, setLiked] = useState<Record<string | number, boolean>>({});
  const [showForm, setShowForm] = useState(false);
  const [review, setReview] = useState({ name: "", rating: 5, text: "", product: "" });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();


  // Custom user-submitted reviews list + default comments
  const [customReviews, setCustomReviews] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem("Nakshra_custom_reviews");
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });

  // Fetch reviews from Supabase on mount and merge with localStorage
  useEffect(() => {
    Promise.resolve(
      supabase.from("reviews").select("*").order("created_at", { ascending: false })
    ).then(({ data, error }) => {
      const cachedStr = localStorage.getItem("Nakshra_custom_reviews");
      const cached: any[] = cachedStr ? JSON.parse(cachedStr) : [];
      const combinedMap = new Map();

      // First add local cached reviews
      cached.forEach(r => combinedMap.set(r.id || `${r.name}-${r.text}`, r));

      // Then add Supabase reviews
      if (data && data.length > 0 && !error) {
        data.forEach((r: any) => {
          const item = {
            id: r.id,
            name: r.name,
            city: r.city || "Verified Buyer",
            rating: r.rating || 5,
            text: r.text,
            product: r.product || "Sacred Item",
            likes: r.likes || 0,
            date: "Just now",
            init: r.name ? r.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "VB",
            bg: "#5B1F24"
          };
          combinedMap.set(r.id || `${r.name}-${r.text}`, item);
        });
      }

      const merged = Array.from(combinedMap.values());
      setCustomReviews(merged);
      localStorage.setItem("Nakshra_custom_reviews", JSON.stringify(merged));
    }).catch(() => {});
  }, []);

  const allReviews = [...customReviews, ...COMMENTS_DATA];

  // 2-second smooth auto-slide
  useEffect(() => {
    if (isPaused || showForm) return;
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
  }, [isPaused, showForm, allReviews.length]);

  const scrollByAmount = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -350 : 350,
      behavior: "smooth"
    });
  };

  const handleSubmitReview = async () => {
    if (!review.name.trim() || !review.text.trim()) {
      alert("Please fill in your name and review text.");
      return;
    }
    setIsSubmitting(true);
    
    const newRev = {
      id: Date.now(),
      name: review.name.trim(),
      city: "Verified Buyer",
      rating: review.rating,
      text: review.text.trim(),
      product: review.product || (products[0]?.name || "Sacred Product"),
      likes: 0,
      date: "Just now",
      init: review.name.trim().split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2),
      bg: "#5B1F24"
    };

    try {
      await Promise.resolve(
        supabase.from("reviews").insert({
          name: newRev.name,
          rating: newRev.rating,
          text: newRev.text,
          product: newRev.product,
          city: newRev.city || "Verified Buyer",
          status: "Approved",
          likes: 0
        })
      ).catch((err) => console.warn("Supabase review insert warning:", err));

      // Add to local state and localStorage immediately
      const updatedList = [newRev, ...customReviews];
      setCustomReviews(updatedList);
      localStorage.setItem("Nakshra_custom_reviews", JSON.stringify(updatedList));

      setSubmitted(true);
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
        }
      }, 150);
    } catch (e: any) {
      console.error("Error saving review: ", e);
      const updatedList = [newRev, ...customReviews];
      setCustomReviews(updatedList);
      localStorage.setItem("Nakshra_custom_reviews", JSON.stringify(updatedList));
      setSubmitted(true);
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
        }
      }, 150);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="pt-10 sm:pt-16 pb-4 sm:pb-6 px-4 sm:px-6 lg:px-10" style={{ background: "#FAF7F2" }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <div>
            <span className="text-xs tracking-[0.2em] uppercase font-medium mb-3 block" style={{ color: GOLD, fontFamily: SANS }}>{t("community.badge", "Community")}</span>
            <h2 style={{ fontFamily: SERIF, fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 500, color: MAROON }}>{t("community.title", "What Our Community Says")}</h2>
            <p className="text-sm mt-1" style={{ color: "#7A6A58" }}>{allReviews.length} {t("community.reviews_count", "verified reviews")} · 4.8 {t("community.avg_rating", "average rating")}</p>
          </div>
          <div className="flex items-center gap-3 self-start">
            <button onClick={() => {
                setShowForm(s => !s);
                if (submitted) {
                  setSubmitted(false);
                  setReview({ name: "", rating: 5, text: "", product: "" });
                }
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold transition-all hover:opacity-80"
              style={{ background: MAROON, color: IVORY }}>
              ✍ {t("community.write_review", "Write a Review")}
            </button>
          </div>
        </div>


        {showForm && (
          <div className="mb-10 rounded-3xl p-7" style={{ background: "#FFFFFF", border: "1px solid rgba(91,31,36,0.08)", boxShadow: "0 4px 30px rgba(91,31,36,0.07)" }}>
            {submitted ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-3">🙏</div>
                <h3 className="text-lg font-semibold mb-1" style={{ fontFamily: SERIF, color: MAROON }}>Thank You for Your Review!</h3>
                <p className="text-sm" style={{ color: "#7A6A58" }}>Your experience has been posted and will help others in their spiritual journey.</p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-6" style={{ fontFamily: SERIF, color: MAROON }}>Share Your Experience</h3>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <FloatingInput label="Your Name" value={review.name} onChange={v => setReview(r => ({ ...r, name: v }))} required />
                  <FloatingSelect label="Product Purchased" options={products.length ? products.map(p => p.name) : ["Sacred Product", "Rudraksha", "Yantra", "Crystals"]} value={review.product} onChange={v => setReview(r => ({ ...r, product: v }))} />
                </div>
                <div className="mb-4">
                  <div className="text-xs font-semibold mb-2" style={{ color: MAROON }}>Your Rating</div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} onClick={() => setReview(r => ({ ...r, rating: n }))} className="transition-transform hover:scale-110">
                        <Star size={24} fill={n <= review.rating ? GOLD : "none"} stroke={GOLD} strokeWidth={1.5} />
                      </button>
                    ))}
                  </div>
                </div>
                <textarea value={review.text} onChange={e => setReview(r => ({ ...r, text: e.target.value }))}
                  placeholder="Share how this product has impacted your life…" rows={4}
                  className="w-full px-4 py-3 rounded-2xl text-sm outline-none resize-none mb-4"
                  style={{ border: "1.5px solid rgba(91,31,36,0.12)", background: "#FAF7F2", color: "#222222", fontFamily: SANS }}
                  onFocus={e => { e.target.style.borderColor = GOLD; }} onBlur={e => { e.target.style.borderColor = "rgba(91,31,36,0.12)"; }} />
                <button onClick={handleSubmitReview} disabled={isSubmitting}
                  className="px-8 py-3 rounded-2xl text-sm font-semibold transition-all hover:opacity-80"
                  style={{ background: `linear-gradient(135deg,${MAROON},#7A2A30)`, color: IVORY, opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? "Saving..." : "Submit Review"}
                </button>
              </>
            )}
          </div>
        )}

        <div
          ref={scrollRef}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="flex gap-5 overflow-x-auto pb-3 -mx-6 lg:-mx-10 px-6 lg:px-10 scroll-pl-6 lg:scroll-pl-10"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none", scrollSnapType: "x mandatory" }}
        >
          {allReviews.map((c, i) => (
            <div key={c.id || i} className="p-6 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-xl flex-shrink-0 flex flex-col justify-between"
              style={{ background: "#FFFFFF", border: "1px solid rgba(91,31,36,0.07)", boxShadow: "0 2px 12px rgba(91,31,36,0.04)", width: "clamp(280px,80vw,340px)", scrollSnapAlign: "start" }}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex">{Array.from({ length: c.rating }).map((_, j) => <Star key={j} size={12} fill={GOLD} stroke={GOLD} strokeWidth={1.5} />)}</div>
                  <span className="text-[10px]" style={{ color: "#9A8A78" }}>{c.date}</span>
                </div>
                <p className="text-sm leading-relaxed mb-3 italic" style={{ color: "#4A3A2A", wordBreak: "break-word" }}>"{c.text}"</p>
                <div className="text-[10px] mb-4 px-2 py-1 rounded-lg inline-block self-start" style={{ background: "rgba(200,160,68,0.08)", color: "#8B6914" }}>📦 {c.product}</div>
              </div>
              <div className="flex items-center justify-between pt-3 mt-auto" style={{ borderTop: "1px solid rgba(91,31,36,0.07)" }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: c.bg || "#5B1F24", color: GOLD, fontFamily: SERIF }}>{c.init}</div>
                  <div>
                    <div className="text-xs font-semibold" style={{ fontFamily: SERIF, color: MAROON }}>{c.name}</div>
                    <div className="text-[10px]" style={{ color: "#9A8A78" }}>{c.city || "Verified Buyer"} · ✓ Verified</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
