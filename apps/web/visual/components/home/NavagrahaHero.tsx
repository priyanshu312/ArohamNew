import { useState } from "react";
import { MAROON, GOLD, SAFFRON, IVORY, SANS, SERIF } from "@nakshra/shared-config/theme";
import { GRAHAS } from "@nakshra/shared-config/data";
import { useTranslation } from "react-i18next";


const S = 1.05;
const STARS = Array.from({ length: 90 }, (_, i) => ({
  x: ((i * 137.508) % 100),
  y: ((i * 97.351) % 100),
  r: i % 7 === 0 ? 1.5 : i % 3 === 0 ? 1 : 0.6,
  o: 0.3 + ((i * 53) % 100) / 200,
  d: 1.5 + ((i * 31) % 30) / 10,
}));

export function NavagrahaHero({ onShop, onConsult }: { onShop: () => void; onConsult: () => void }) {
  const [hoveredGraha, setHoveredGraha] = useState<number | null>(null);
  const { t } = useTranslation();

  return (
    <section className="relative min-h-screen" style={{ background: "#0A0608", overflow: "hidden" }}>
      <style>{`
        @keyframes orbitPlanet { from{transform:rotate(0deg) translateX(var(--r)) rotate(0deg)} to{transform:rotate(360deg) translateX(var(--r)) rotate(-360deg)} }
        @keyframes pulseSun { 0%,100%{box-shadow:0 0 60px 20px rgba(255,200,50,0.35),0 0 120px 40px rgba(255,150,0,0.15)} 50%{box-shadow:0 0 80px 30px rgba(255,200,50,0.5),0 0 160px 60px rgba(255,150,0,0.25)} }
        @keyframes glowRing { 0%,100%{opacity:0.12} 50%{opacity:0.3} }
        @keyframes tooltipIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes twinkle { 0%,100%{opacity:var(--so)} 50%{opacity:calc(var(--so)*0.35)} }
      `}</style>

      {/* Star field */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {STARS.map((s, i) => (
          <div key={i} className="absolute rounded-full bg-white"
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.r * 2, height: s.r * 2,
              opacity: s.o, ["--so" as string]: s.o,
              animation: `twinkle ${s.d}s ease-in-out infinite`, animationDelay: `-${(i * 0.4) % s.d}s` }} />
        ))}
      </div>

      <div className="absolute pointer-events-none" style={{ left: "-5%", top: "5%", width: "70%", height: "85%", background: "radial-gradient(ellipse at 30% 45%, rgba(231,139,47,0.38) 0%, rgba(200,100,20,0.22) 30%, rgba(150,60,10,0.10) 55%, transparent 75%)", filter: "blur(48px)" }} />
      <div className="absolute pointer-events-none" style={{ left: "5%", top: "20%", width: "45%", height: "55%", background: "radial-gradient(ellipse at 40% 40%, rgba(255,170,50,0.18) 0%, transparent 65%)", filter: "blur(60px)" }} />
      <div className="absolute pointer-events-none" style={{ left: "-10%", bottom: "-5%", width: "55%", height: "50%", background: "radial-gradient(ellipse at 25% 90%, rgba(91,31,24,0.4) 0%, transparent 65%)", filter: "blur(55px)" }} />
      <div className="absolute pointer-events-none" style={{ right: "-5%", top: "0%", width: "50%", height: "100%", background: "radial-gradient(ellipse at 80% 50%, rgba(80,30,10,0.12) 0%, transparent 70%)", filter: "blur(30px)" }} />

      <div className="relative z-20 flex flex-col lg:flex-row w-full min-h-[100dvh]">
        <div className="w-full lg:w-[55%] flex-shrink-0 flex flex-col justify-center text-center lg:text-left px-6 lg:pl-16 xl:pl-24 lg:pr-14 pt-20 pb-14 lg:pt-0 lg:pb-0 flex-1">
          <div className="flex items-center justify-center lg:justify-start gap-2.5 mb-5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: SAFFRON }} />
            <span className="text-[11px] tracking-[0.28em] uppercase font-semibold" style={{ color: SAFFRON, fontFamily: "'Space Grotesk',sans-serif" }}>{t("hero.badge", "AUTHENTIC VEDIC PRODUCTS & TEMPLE ENERGIZED YANTRAS")}</span>
          </div>
          <h1 className="mb-5" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(2.4rem,5vw,4.2rem)", fontWeight: 700, color: IVORY, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
            <span style={{ color: "#FFFFFF" }}>{t("hero.title1", "Invoke Divine Energy With")}</span><br />
            <span style={{ color: SAFFRON }}>{t("hero.title2", "Sacred Vedic Products")}</span>
          </h1>
          <p className="text-sm mb-7 max-w-sm mx-auto lg:mx-0" style={{ color: "rgba(250,247,242,0.55)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 400, lineHeight: 1.7 }}>
            {t("hero.subtitle", "Authentic Vedic products & expert consultations to align your life with cosmic energy. Temple energized. Astrologer recommended.")}
          </p>
          <div className="flex flex-wrap gap-3 justify-center lg:justify-start mb-8">
            <button onClick={onShop} className="flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold tracking-wide transition-all hover:scale-105 hover:shadow-2xl whitespace-nowrap"
              style={{ background: `linear-gradient(135deg,${SAFFRON},${GOLD})`, color: "#1A0D0E", fontFamily: "'Space Grotesk',sans-serif", boxShadow: `0 4px 20px rgba(231,139,47,0.35)` }}>
              🛍 {t("hero.cta_shop", "Explore Sacred Shop")}
            </button>
            <button onClick={onConsult} className="flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold tracking-wide border transition-all hover:bg-white/8 whitespace-nowrap"
              style={{ borderColor: "rgba(250,247,242,0.2)", color: IVORY, fontFamily: "'Space Grotesk',sans-serif", background: "rgba(255,255,255,0.05)" }}>
              🔮 {t("hero.cta_consult", "Book Consultation")}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              ["12,000+", t("hero.stat_happy_customers", "Happy Customers"), "🙏"], 
              ["500+", t("hero.stat_products_count", "Products"), "🛍"], 
              ["98%", t("hero.stat_satisfaction", "Satisfaction"), "⭐"], 
              [t("why.temple_energized", "Temple"), t("hero.stat_temple_energized", "Energized"), "🪔"]
            ].map(([n, l, icon]) => (
              <div key={l} className="py-2.5 rounded-xl flex items-center gap-3 px-[12px] py-[15px]"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}>
                <span className="text-lg">{icon}</span>
                <div className="text-left">
                  <div className="text-sm font-bold leading-tight" style={{ fontFamily: "'Space Grotesk',sans-serif", color: GOLD }}>{n}</div>
                  <div className="text-[10px] leading-tight" style={{ color: "rgba(250,247,242,0.5)", fontFamily: "'Space Grotesk',sans-serif" }}>{l}</div>
                </div>
              </div>
            ))}
          </div>

        </div>
        <div className="hidden lg:flex flex-1" aria-hidden />
      </div>

      {/* Solar system (Desktop only) */}
      <div className="hidden lg:block absolute z-[2]" style={{ top: "50%", right: 0, transform: "translateY(-50%)", width: "52%" }}>
        <div className="flex items-center justify-center" style={{ transform: "translateX(12%)" }}>
          <div className="relative flex items-center justify-center" style={{ width: Math.round(460 * S), height: Math.round(460 * S) }}>
            {/* Sun */}
            <div className="absolute z-10 rounded-full flex flex-col items-center justify-center cursor-default group"
              style={{ width: Math.round(GRAHAS[0].size * S * 1.4), height: Math.round(GRAHAS[0].size * S * 1.4),
                background: "radial-gradient(circle,#FFF8E1,#FFD700,#FF8C00)", animation: "pulseSun 3s ease-in-out infinite",
                top: "50%", left: "30%", transform: "translate(-50%,-50%)" }}>
              <span style={{ fontSize: 14 }}>☀️</span>
              <span className="text-[7px] font-bold" style={{ color: "#5B3000" }}>Surya</span>
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-40 p-3 rounded-2xl opacity-0 group-hover:opacity-100 pointer-events-none z-50"
                style={{ background: "rgba(10,5,8,0.95)", border: `1px solid rgba(200,160,68,0.3)`, backdropFilter: "blur(12px)", transition: "opacity 0.2s ease" }}>
                <div className="text-sm font-semibold mb-0.5" style={{ color: GOLD, fontFamily: SERIF }}>Surya — Sun</div>
                <div className="text-[10px] mb-1" style={{ color: "rgba(250,247,242,0.6)" }}>Soul, authority, vitality</div>
                <div className="text-[9px]" style={{ color: "rgba(200,160,68,0.7)" }}>💎 Ruby</div>
              </div>
            </div>
            {/* Orbiting planets */}
            {GRAHAS.slice(1).map((g, i) => {
              const orbitSize = Math.round(g.orbit * 2 * S);
              const pSize = Math.round(g.size * S * 0.9);
              const orbitR = Math.round(g.orbit * S);
              const gi = i + 1;
              return (
                <div key={g.name} className="absolute"
                  style={{ width: orbitSize, height: orbitSize, top: "50%", left: "30%", transform: "translate(-50%,-50%)", pointerEvents: "none" }}>
                  <div className="absolute group pointer-events-auto"
                    style={{ top: "50%", left: "50%", ["--r" as string]: `${orbitR}px`,
                      animation: `orbitPlanet ${g.speed}s linear infinite`, animationDelay: `-${i * 1.5}s`,
                      marginTop: `-${pSize / 2}px`, marginLeft: `-${pSize / 2}px`, cursor: "default",
                      zIndex: hoveredGraha === gi ? 40 : 10 }}>
                    <div className="rounded-full transition-transform duration-200 group-hover:scale-150"
                      style={{ width: pSize, height: pSize, background: g.color, boxShadow: `0 0 ${pSize}px ${g.color}88` }}
                      onMouseEnter={() => setHoveredGraha(gi)}
                      onMouseLeave={() => setHoveredGraha(null)} />
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 whitespace-nowrap pointer-events-none"
                      style={{ fontSize: "7px", color: "rgba(200,160,68,0.75)", fontFamily: SANS, fontWeight: 700 }}>
                      {g.name}
                    </div>
                    {hoveredGraha === gi && (
                      <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-44 p-3 rounded-2xl pointer-events-none"
                        style={{ background: "rgba(10,5,8,0.96)", border: `1px solid rgba(200,160,68,0.35)`,
                          backdropFilter: "blur(12px)", boxShadow: `0 8px 32px rgba(0,0,0,0.5)`,
                          animation: "tooltipIn 0.15s ease", zIndex: 50 }}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: g.color, boxShadow: `0 0 6px ${g.color}` }} />
                          <span className="text-sm font-semibold" style={{ color: GOLD, fontFamily: SERIF }}>{g.name}</span>
                        </div>
                        {g.en && <div className="text-[10px] mb-1" style={{ color: "rgba(250,247,242,0.5)" }}>{g.en}</div>}
                        <div className="text-[11px] leading-relaxed mb-1.5" style={{ color: "rgba(250,247,242,0.75)" }}>{g.desc}</div>
                        <div className="text-[10px]" style={{ color: "rgba(200,160,68,0.8)" }}>💎 {g.gem}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
