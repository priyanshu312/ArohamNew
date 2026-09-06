import { useState, useRef, useEffect } from "react";
import { ChevronRight, Pickaxe, Hammer, PenTool, Flame, BadgeCheck } from "lucide-react";
import { GOLD, IVORY, MAROON, SANS, SERIF } from "@nakshra/shared-config/theme";
import { CRAFT_STEPS, CRAFT_IMAGES } from "@nakshra/shared-config/data";
import { useTranslation } from "react-i18next";

export function HowItsMade() {
  const [step, setStep] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { t } = useTranslation();

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setStep(s => (s + 1) % CRAFT_STEPS.length), 5000);
  };

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const goToStep = (i: number) => { setStep(i); resetTimer(); };
  const s = CRAFT_STEPS[step];
  const ICONS = [Pickaxe, Hammer, PenTool, Flame, BadgeCheck];
  const ActiveIcon = ICONS[step];

  const getStepTitle = (idx: number) => {
    const keys = ["crafts.step1", "crafts.step2", "crafts.step3", "crafts.step4", "crafts.step5"];
    return t(keys[idx], CRAFT_STEPS[idx].title);
  };

  return (
    <section className="py-20 relative overflow-hidden" style={{ background: "#0D0508" }}>
      <style>{`
        @keyframes imageReveal { 0% { opacity: 0; filter: blur(12px); transform: scale(1.05); } 100% { opacity: 1; filter: blur(0px); transform: scale(1); } }
        @keyframes textReveal { 0% { opacity: 0; transform: translateY(16px); filter: blur(4px); } 100% { opacity: 1; transform: translateY(0); filter: blur(0px); } }
      `}</style>
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `radial-gradient(circle,${GOLD} 1px,transparent 1px)`, backgroundSize: "32px 32px" }} />
      <div className="max-w-6xl mx-auto px-6 lg:px-10 relative z-10">
        <div className="text-center mb-14">
          <span className="text-xs tracking-[0.25em] uppercase font-medium mb-3 block" style={{ color: GOLD, fontFamily: SANS }}>{t("crafts.badge", "CRAFTSMANSHIP")}</span>
          <h2 style={{ fontFamily: SERIF, fontSize: "clamp(1.75rem,4vw,2.75rem)", fontWeight: 500, color: IVORY, lineHeight: 1.15 }}>
            {t("crafts.title", "From Earth to Sacred Artifact")}
          </h2>
          <p className="text-sm mt-2" style={{ color: "rgba(250,247,242,0.45)" }}>{t("crafts.subtitle", "Every Nakshra product follows a sacred 5-step ritual process")}</p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {CRAFT_STEPS.map((cs, i) => (
            <button key={i} onClick={() => goToStep(i)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold transition-all duration-200 whitespace-nowrap"
              style={{ fontSize: "10px", background: i === step ? GOLD : "rgba(255,255,255,0.06)", border: `1px solid ${i === step ? GOLD : "rgba(255,255,255,0.1)"}`, color: i === step ? "#1A0D0E" : "rgba(255,255,255,0.5)", transform: i === step ? "scale(1.05)" : "scale(1)" }}>
              <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center font-black flex-shrink-0" style={{ fontSize: "8px", background: i === step ? "rgba(0,0,0,0.2)" : "rgba(200,160,68,0.15)", color: i === step ? "#1A0D0E" : GOLD }}>{i + 1}</span>
              <span>{cs.title.split(" ").slice(0, 2).join(" ")}</span>
            </button>
          ))}
        </div>
        <div key={step} className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="relative rounded-3xl overflow-hidden" style={{ aspectRatio: "4/3", animation: "imageReveal 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards" }}>
            <img src={CRAFT_IMAGES[step]} alt={s.title} className="w-full h-full object-cover" style={{ filter: "brightness(0.7)" }} />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top right, rgba(10,5,8,0.85) 0%, transparent 60%)" }} />
            <div className="absolute top-5 left-5">
              <div className="px-3 py-1.5 rounded-full flex items-center gap-1.5" style={{ background: "rgba(200,160,68,0.15)", border: "1px solid rgba(200,160,68,0.35)", backdropFilter: "blur(8px)" }}>
                <ActiveIcon size={14} strokeWidth={2.5} style={{ color: MAROON }} />
                <span className="text-[10px] font-bold tracking-widest" style={{ color: MAROON }}>STEP {step + 1} / {CRAFT_STEPS.length}</span>
              </div>
            </div>
            <div className="absolute bottom-5 left-5 right-5">
              <div className="text-xs font-semibold mb-1" style={{ color: "rgba(200,160,68,0.7)" }}>Nakshra Craftsmanship</div>
              <div className="text-xl font-semibold" style={{ fontFamily: SERIF, color: IVORY, lineHeight: 1.2 }}>{s.title}</div>
            </div>
          </div>
          <div style={{ opacity: 0, animation: "textReveal 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards 0.15s" }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(200,160,68,0.1)", border: "1px solid rgba(200,160,68,0.2)" }}>
                <ActiveIcon size={24} strokeWidth={2} style={{ color: GOLD }} />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: GOLD }}>Step {step + 1} of {CRAFT_STEPS.length}</div>
                <h3 style={{ fontFamily: SERIF, fontSize: "1.5rem", fontWeight: 500, color: IVORY, lineHeight: 1.2 }}>{s.title}</h3>
              </div>
            </div>
            <p className="text-sm leading-relaxed mb-8" style={{ color: "rgba(250,247,242,0.65)" }}>{s.desc}</p>
            <div className="space-y-3">
              {CRAFT_STEPS.map((cs, i) => (
                <button key={i} onClick={() => goToStep(i)}
                  className="hidden md:flex w-full items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 hover:bg-white/5"
                  style={{ background: i === step ? "rgba(200,160,68,0.1)" : "transparent", border: `1px solid ${i === step ? "rgba(200,160,68,0.25)" : "rgba(255,255,255,0.05)"}` }}>
                  <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ background: i === step ? GOLD : "rgba(255,255,255,0.08)", color: i === step ? "#1A0D0E" : "rgba(255,255,255,0.4)" }}>{i + 1}</div>
                  <span className="text-sm font-medium" style={{ color: i === step ? IVORY : "rgba(255,255,255,0.45)" }}>{cs.title}</span>
                  {i === step && <ChevronRight size={14} className="ml-auto" style={{ color: GOLD }} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
