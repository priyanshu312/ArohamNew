import { useState, useEffect, useRef, useCallback } from "react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { MAROON, GOLD, SAFFRON, IVORY, SANS, SERIF } from "@nakshra/shared-config/theme";
import { VIDEO_REVIEWS, yantraPlateImg, gemstonImg, pendantSilImg } from "@nakshra/shared-config/data";
import { useTranslation } from "react-i18next";

const BASE_REELS = [
  ...VIDEO_REVIEWS,
  { name: "Kiran Pillai", city: "Thiruvananthapuram", product: "Pyrite Sun Ring",   rating: 5, thumb: yantraPlateImg, init: "KP", bg: "#2D5A2D", duration: "1:47", review: "The ring transformed the energy of my home completely. Even my neighbours noticed a change in the atmosphere!" },
  { name: "Pooja Desai",  city: "Surat",              product: "Love & Money Metal Bracelet",   rating: 5, thumb: gemstonImg,    init: "PD", bg: "#5B1F24", duration: "2:33", review: "I wear the bracelet every day. My clarity and focus have improved dramatically since I started using it." },
  { name: "Aryan Kapoor", city: "Delhi",              product: "Dhan Yog Necklace",          rating: 5, thumb: pendantSilImg, init: "AK", bg: "#2D4A8B", duration: "1:12", review: "The craftsmanship is extraordinary. I wear it every day and feel genuinely protected. A true sacred artifact." },
];

export function VideoTestimonials() {
  const [active, setActive] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const n = BASE_REELS.length;
  const { t } = useTranslation();

  const goTo = useCallback((i: number) => {
    setActive(((i % n) + n) % n);
  }, [n]);

  const next = useCallback(() => goTo(active + 1), [active, goTo]);
  const prev = useCallback(() => goTo(active - 1), [active, goTo]);

  // Auto-slide every 4.5s
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(next, 4500);
    return () => clearInterval(timer);
  }, [isPaused, next]);

  // Touch handlers for swipe
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
    setIsSwiping(true);
    setIsPaused(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    setTouchDelta(e.touches[0].clientX - touchStart);
  };

  const onTouchEnd = () => {
    if (Math.abs(touchDelta) > 50) {
      if (touchDelta < 0) next();
      else prev();
    }
    setTouchStart(null);
    setTouchDelta(0);
    setIsSwiping(false);
    setTimeout(() => setIsPaused(false), 2000);
  };

  return (
    <section
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="py-14 sm:py-20 px-0 overflow-hidden"
      style={{ background: "#0D0508" }}
    >
      <div className="text-center mb-8 sm:mb-10 px-6">
        <span className="text-xs tracking-[0.25em] uppercase font-medium mb-3 block" style={{ color: SAFFRON, fontFamily: SANS }}>{t("stories.badge", "Real Transformations")}</span>
        <h2 style={{ fontFamily: SERIF, fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 500, color: IVORY }}>{t("stories.title", "Customer Stories")}</h2>
        <p className="text-sm mt-2" style={{ color: "rgba(250,247,242,0.5)", fontFamily: SANS }}>{t("stories.subtitle", "Swipe through real stories from our community")}</p>
      </div>


      <div className="relative" ref={containerRef}>
        {/* Navigation arrows — desktop only */}
        <button aria-label="Previous testimonial" onClick={prev}
          className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{ background: "rgba(200,160,68,0.15)", border: "1px solid rgba(200,160,68,0.3)", color: GOLD, backdropFilter: "blur(8px)" }}>
          <ChevronLeft size={18} />
        </button>
        <button aria-label="Next testimonial" onClick={next}
          className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{ background: "rgba(200,160,68,0.15)", border: "1px solid rgba(200,160,68,0.3)", color: GOLD, backdropFilter: "blur(8px)" }}>
          <ChevronRight size={18} />
        </button>

        {/* Cards container */}
        <div
          className="flex items-center justify-center relative"
          style={{ minHeight: 440, perspective: "1000px" }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {BASE_REELS.map((v, i) => {
            // Calculate circular offset distance (-n/2 to +n/2)
            let offset = i - active;
            if (offset > n / 2) offset -= n;
            if (offset < -n / 2) offset += n;

            const isCenter = offset === 0;
            const cardWidth = typeof window !== "undefined" && window.innerWidth < 640 ? 260 : 280;
            const gap = typeof window !== "undefined" && window.innerWidth < 640 ? 16 : 24;
            
            let translateX = offset * (cardWidth + gap);
            if (isSwiping) {
              translateX += touchDelta;
            }

            const scale = isCenter ? 1.03 : Math.abs(offset) === 1 ? 0.92 : 0.82;
            const opacity = isCenter ? 1 : Math.abs(offset) === 1 ? 0.6 : 0.2;
            const zIndex = isCenter ? 10 : Math.abs(offset) === 1 ? 5 : 1;

            // Hide cards that are too far away to prevent overlapping transitions
            const isVisible = Math.abs(offset) <= 2;

            return (
              <div
                key={v.name} // Stable key prevents DOM recreation
                onClick={() => { if (!isCenter) goTo(i); }}
                className="absolute rounded-3xl overflow-hidden"
                style={{
                  width: cardWidth,
                  height: typeof window !== "undefined" && window.innerWidth < 640 ? 400 : 440,
                  transform: `translateX(${translateX}px) scale(${scale})`,
                  opacity: isVisible ? opacity : 0,
                  zIndex,
                  pointerEvents: isVisible ? "auto" : "none",
                  transition: isSwiping ? "none" : "all 0.5s cubic-bezier(0.25, 1, 0.5, 1)",
                  cursor: isCenter ? "default" : "pointer",
                  border: isCenter ? `2px solid ${GOLD}` : "1px solid rgba(200,160,68,0.18)",
                  boxShadow: isCenter
                    ? `0 0 30px rgba(200,160,68,0.35), 0 20px 50px rgba(0,0,0,0.85)`
                    : "0 8px 24px rgba(0,0,0,0.5)",
                  willChange: "transform, opacity",
                }}
              >
                <img
                  src={v.thumb}
                  alt={v.name}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom,rgba(0,0,0,0.12) 0%,transparent 30%,transparent 40%,rgba(0,0,0,0.88) 100%)" }} />

                {/* Top badges */}
                <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold" style={{ background: "rgba(200,160,68,0.95)", color: "#1A0D0E" }}>✓ Verified</span>
                  <div className="flex gap-0.5">{Array.from({ length: v.rating }).map((_, j) => <Star key={j} size={10} fill={GOLD} stroke="none" />)}</div>
                </div>

                {/* Bottom content */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-[11px] leading-relaxed mb-3 italic" style={{ color: "rgba(250,247,242,0.9)", fontFamily: SANS }}>
                    "{v.review.slice(0, 90)}{v.review.length > 90 ? "…" : ""}"
                  </p>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: v.bg, color: GOLD, fontFamily: SERIF }}>{v.init}</div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ fontFamily: SERIF, color: IVORY }}>{v.name}</div>
                      <div className="text-[10px]" style={{ color: "rgba(250,247,242,0.55)" }}>{v.city}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-[9px] px-2.5 py-1 rounded-full inline-block" style={{ background: "rgba(200,160,68,0.15)", border: "1px solid rgba(200,160,68,0.25)", color: GOLD }}>📦 {v.product}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-6">
          {BASE_REELS.map((_, i) => (
            <button key={i} onClick={() => goTo(i)} aria-label={`Go to slide ${i + 1}`}
              className="rounded-full transition-all duration-300"
              style={{ width: active === i ? 24 : 6, height: 6, background: active === i ? GOLD : "rgba(200,160,68,0.25)" }} />
          ))}
        </div>
      </div>
    </section>
  );
}
