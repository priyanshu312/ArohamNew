import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MAROON, GOLD, IVORY, SANS, SERIF, PRICE_FONT } from "@nakshra/shared-config/theme";
import { NakshraProduct } from "@nakshra/shared-types/product";

export function HexPrismCarousel({ products, onProductClick }: { products: NakshraProduct[]; onProductClick: (p: NakshraProduct) => void }) {
  const [current, setCurrent] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 640 : false);
  const n = products?.length || 0;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const baseW = isMobile ? 160 : 230;
  const baseH = isMobile ? 220 : 310;
  const baseTz = isMobile ? 160 : 250;
  const activeScale = 1.35;
  const SMOOTH_EASE = "0.7s cubic-bezier(0.25, 1, 0.5, 1)";

  const pauseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const pauseAuto = () => {
    if (autoRef.current) { clearInterval(autoRef.current); autoRef.current = null; }
    if (pauseRef.current) clearTimeout(pauseRef.current);
    pauseRef.current = setTimeout(() => {
      autoRef.current = setInterval(() => { setCurrent(c => c + 1); setExpanded(false); }, 5000);
    }, 10000);
  };

  const prev = () => { setCurrent(c => c - 1); setExpanded(false); pauseAuto(); };
  const next = () => { setCurrent(c => c + 1); setExpanded(false); pauseAuto(); };

  useEffect(() => {
    if (n === 0) return;
    autoRef.current = setInterval(() => { setCurrent(c => c + 1); setExpanded(false); }, 5000);
    return () => {
      if (autoRef.current) clearInterval(autoRef.current);
      if (pauseRef.current) clearTimeout(pauseRef.current);
    };
  }, [n]);

  const dragRef = useRef<{ startX: number; dragging: boolean }>({ startX: 0, dragging: false });
  const wheelCooldown = useRef(false);
  const onDragStart = (clientX: number) => { dragRef.current = { startX: clientX, dragging: true }; };
  const onDragEnd   = (clientX: number) => {
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;
    const delta = dragRef.current.startX - clientX;
    if (Math.abs(delta) > 30) { delta > 0 ? next() : prev(); }
  };

  const onDotClick = (i: number) => {
    pauseAuto();
    const normalizedCurrent = ((current % n) + n) % n;
    let diff = i - normalizedCurrent;
    if (diff > n / 2) diff -= n;
    if (diff < -n / 2) diff += n;
    setCurrent(current + diff);
    setExpanded(false);
  };

  if (n === 0) return null;
  const normalizedCurrent = ((current % n) + n) % n;
  const p = products[normalizedCurrent];

  return (
    <div className="relative flex flex-col items-center w-full flex-1" style={{ transition: `all ${SMOOTH_EASE}` }}>
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "80%", height: 120, background: "radial-gradient(ellipse at 50% 0%, rgba(91,31,36,0.28) 0%, transparent 72%)", pointerEvents: "none", zIndex: 0 }} />
      <style>{`
        @keyframes faceGlow {
          0%,100% { box-shadow: 0 0 28px 8px rgba(200,160,68,0.25); }
          50%      { box-shadow: 0 0 54px 18px rgba(200,160,68,0.42); }
        }
      `}</style>
      <div className="relative flex items-center justify-center w-full"
        style={{ height: baseH + 30, marginTop: isMobile ? 25 : 35, marginBottom: 15, transform: expanded ? "translateY(-20px) scale(0.92)" : "translateY(0px) scale(1)", transition: `all ${SMOOTH_EASE}` }}>
        <button aria-label="Previous product" onClick={prev}
          className="absolute left-1 sm:left-2 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{ background: "rgba(200,160,68,0.18)", border: `1px solid rgba(200,160,68,0.35)`, color: GOLD, top: "50%", transform: "translateY(-50%)" }}>
          <ChevronLeft size={20} />
        </button>
        <div
          onMouseDown={e => onDragStart(e.clientX)} onMouseUp={e => onDragEnd(e.clientX)}
          onMouseLeave={e => onDragEnd(e.clientX)}
          onTouchStart={e => onDragStart(e.touches[0].clientX)} onTouchEnd={e => onDragEnd(e.changedTouches[0].clientX)}
          onWheel={e => { e.preventDefault(); if (wheelCooldown.current) return; const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; if (Math.abs(d) < 25) return; d > 0 ? next() : prev(); wheelCooldown.current = true; setTimeout(() => { wheelCooldown.current = false; }, 500); pauseAuto(); }}
          style={{ perspective: 1200, width: "100%", height: baseH, display: "flex", alignItems: "center", justifyContent: "center", cursor: "grab", userSelect: "none" }}>
          <div style={{ width: baseW, height: baseH, position: "relative", transformStyle: "preserve-3d", transform: `rotateY(${-current * (360 / n)}deg)`, transition: `transform ${SMOOTH_EASE}` }}>
            {products.map((prod, i) => {
              const angle = i * (360 / n);
              const isActive = i === normalizedCurrent;
              return (
                <div key={prod.id}
                  onClick={() => { pauseAuto(); if (isActive) { setExpanded(e => !e); } else { onDotClick(i); } }}
                  style={{ position: "absolute", width: baseW, height: baseH, transform: `rotateY(${angle}deg) translateZ(${baseTz}px)`, backfaceVisibility: "hidden", borderRadius: 24, overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column",
                    background: isActive ? `linear-gradient(170deg,${MAROON} 0%,#2A0A0E 100%)` : `linear-gradient(170deg,#1A0808 0%,#0D0404 100%)`,
                    border: `2px solid ${isActive ? GOLD : "rgba(200,160,68,0.15)"}`,
                    boxShadow: isActive ? "0 0 0 1px rgba(200,160,68,0.2)" : "none",
                    animation: isActive ? "faceGlow 2.8s ease-in-out infinite" : "none",
                    transition: `transform ${SMOOTH_EASE}, border ${SMOOTH_EASE}`,
                    zIndex: isActive ? 20 : 1 }}>
                  <div style={{ flex: "1 1 0", overflow: "hidden", position: "relative", minHeight: 0 }}>
                    <img src={prod.img} alt={`${prod.name} - ${prod.subtitle}`}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                      style={{ filter: isActive ? "brightness(1.1) contrast(1.1)" : "brightness(0.5) contrast(1.2)" }} />
                    <div className="absolute inset-0" style={{ background: isActive ? "linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(13,4,4,0.95) 100%)" : "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(13,4,4,0.95) 100%)" }} />
                    <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
                      {prod.badges?.[0] && <span className="px-2.5 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase shadow-lg" style={{ background: "rgba(107,35,43,0.95)", color: IVORY, border: "1px solid rgba(250,247,242,0.25)", backdropFilter: "blur(4px)" }}>{prod.badges[0]}</span>}
                    </div>
                  </div>
                  <div className="p-3.5 pt-1.5 flex flex-col items-center text-center relative z-10" style={{ background: isActive ? `linear-gradient(to top, rgba(26,8,8,1) 0%, rgba(26,8,8,0.85) 100%)` : "transparent" }}>
                    <h3 className="font-semibold leading-tight line-clamp-1 w-full" style={{ fontFamily: SERIF, fontSize: isMobile ? 14 : 16, color: IVORY, textShadow: isActive ? "0 2px 4px rgba(0,0,0,0.5)" : "none" }}>{prod.name}</h3>
                    <p className="text-[10px] sm:text-[11px] mt-1 line-clamp-1 w-full" style={{ color: "rgba(250,247,242,0.65)", fontFamily: SANS }}>{prod.subtitle}</p>
                  </div>
                  {isActive && (
                    <div style={{ padding: "8px 12px", textAlign: "center", background: `linear-gradient(90deg,${GOLD} 0%,#E8B84B 100%)`, color: "#1A0D0E", fontSize: 8, fontWeight: 800, letterSpacing: "0.1em", flexShrink: 0 }}>
                      {expanded ? "TAP TO CLOSE ✕" : "TAP TO EXPAND ↓"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <button aria-label="Next product" onClick={next}
          className="absolute right-1 sm:right-2 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{ background: "rgba(200,160,68,0.18)", border: `1px solid rgba(200,160,68,0.35)`, color: GOLD, top: "50%", transform: "translateY(-50%)" }}>
          <ChevronRight size={20} />
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16, marginBottom: 8, transition: "all 0.4s", position: "relative", zIndex: 30, opacity: expanded ? 0 : 1, pointerEvents: expanded ? "none" : "auto", transform: expanded ? "translateY(-20px)" : "translateY(0)" }}>
        {products.map((_, i) => (
          <div key={i} onClick={() => onDotClick(i)}
            style={{ width: i === normalizedCurrent ? 20 : 6, height: 6, borderRadius: 99, background: i === normalizedCurrent ? GOLD : "rgba(200,160,68,0.25)", transition: "all 0.35s", cursor: "pointer" }} />
        ))}
      </div>

      <div style={{ position: "relative", width: "94%", zIndex: 50, overflow: "hidden", maxHeight: expanded ? 220 : 0, opacity: expanded ? 1 : 0, marginTop: expanded ? 12 : 0, transition: `all ${SMOOTH_EASE}`, pointerEvents: expanded ? "auto" : "none" }}>
        <div className="rounded-2xl p-4 shadow-2xl mb-2" style={{ background: "rgba(30,10,12,0.95)", border: "1px solid rgba(200,160,68,0.3)" }}>
          <div className="flex gap-4 items-start">
            <div className="flex-1 min-w-0">
              <div className="font-semibold leading-snug mb-0.5" style={{ fontFamily: SERIF, fontSize: 13, color: IVORY }}>{p.name}</div>
              <div className="text-[11px] leading-relaxed mb-3" style={{ color: "rgba(250,247,242,0.55)" }}>{p.shortDesc}</div>
              <div className="flex gap-2 items-center">
                <button onClick={() => onProductClick(p)} className="flex-1 py-2 rounded-xl text-xs font-semibold text-center transition-all hover:opacity-90 active:scale-95 shadow-lg" style={{ background: MAROON, color: IVORY }}>View Details</button>
                <div className="px-3 py-2 rounded-xl text-xs font-bold flex items-center border" style={{ background: "rgba(200,160,68,0.18)", borderColor: "rgba(200,160,68,0.3)", color: GOLD, fontFamily: PRICE_FONT, whiteSpace: "nowrap" }}>₹{p.price}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
