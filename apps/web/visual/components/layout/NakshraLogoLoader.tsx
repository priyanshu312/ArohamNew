import { useEffect, useState } from "react";
import { MAROON, GOLD, SAFFRON, IVORY, SERIF, SANS } from "@nakshra/shared-config/theme";

export function NakshraLogoLoader({ text = "Loading Sacred Experience...", fullScreen = true }: { text?: string; fullScreen?: boolean }) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? "" : prev + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`${
        fullScreen ? "fixed inset-0 z-[9999]" : "w-full py-16"
      } flex flex-col items-center justify-center pointer-events-none select-none`}
      style={{
        background: fullScreen ? "rgba(10, 5, 8, 0.94)" : "transparent",
        backdropFilter: fullScreen ? "blur(12px)" : "none",
        fontFamily: SANS
      }}
    >
      <style>{`
        @keyframes NakshraLogoPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 35px 10px rgba(200, 160, 68, 0.35), 0 0 70px 20px rgba(255, 153, 51, 0.2);
          }
          50% {
            transform: scale(1.1);
            box-shadow: 0 0 65px 22px rgba(200, 160, 68, 0.55), 0 0 110px 40px rgba(255, 153, 51, 0.35);
          }
        }
        @keyframes NakshraGlowRing {
          0% { transform: scale(0.85); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes NakshraTextShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pageFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Outer pulsing ring */}
      <div className="relative flex items-center justify-center">
        <div
          className="absolute w-24 h-24 rounded-full pointer-events-none"
          style={{
            border: `2px solid ${GOLD}`,
            animation: "NakshraGlowRing 2s cubic-bezier(0.1, 0.8, 0.3, 1) infinite"
          }}
        />

        {/* Sacred Om Emblem Logo */}
        <div
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex flex-col items-center justify-center relative z-10 transition-transform"
          style={{
            background: `linear-gradient(135deg, ${MAROON} 0%, #4A121A 50%, ${SAFFRON} 100%)`,
            border: `2.5px solid ${GOLD}`,
            animation: "NakshraLogoPulse 2.2s ease-in-out infinite",
            color: IVORY
          }}
        >
          <span style={{ fontFamily: SERIF, fontSize: "2rem", lineHeight: 1 }}>ॐ</span>
        </div>
      </div>

      {/* Brand Name & Shimmering Text */}
      <div className="mt-6 text-center px-4">
        <h2
          className="text-xl sm:text-2xl font-bold tracking-wider mb-1"
          style={{
            fontFamily: SERIF,
            background: `linear-gradient(90deg, ${IVORY} 0%, ${GOLD} 50%, ${IVORY} 100%)`,
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "NakshraTextShimmer 3s linear infinite"
          }}
        >
          Nakshra
        </h2>

        <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: SAFFRON, letterSpacing: "0.2em" }}>
          Temple Energized Vedic Solutions
        </p>

        <div className="flex items-center justify-center gap-2">
          <span className="text-xs font-medium" style={{ color: "rgba(250, 247, 242, 0.75)" }}>
            {text}
            {dots}
          </span>
        </div>
      </div>

      {/* Bottom Loading Bar */}
      <div className="w-48 h-1 rounded-full mt-5 overflow-hidden" style={{ background: "rgba(200,160,68,0.18)" }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            background: `linear-gradient(90deg, ${SAFFRON}, ${GOLD})`,
            width: "60%",
            animation: "NakshraTextShimmer 1.5s ease-in-out infinite"
          }}
        />
      </div>
    </div>
  );
}
