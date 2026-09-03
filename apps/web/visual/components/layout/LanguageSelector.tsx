import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LANGUAGES, LanguageCode } from "@visual/i18n/translations";
import { MAROON, GOLD, IVORY } from "@nakshra/shared-config/theme";


interface LanguageSelectorProps {
  solid?: boolean;
  isMobile?: boolean;
  alignRight?: boolean;
}

export function LanguageSelector({ solid, isMobile, alignRight = true }: LanguageSelectorProps) {
  const { i18n } = useTranslation();
  const language = (i18n.language || "en") as LanguageCode;
  const setLanguage = (lang: LanguageCode) => i18n.changeLanguage(lang);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Trigger Button (Image 1 Reference) */}
      <button
        type="button"
        aria-label="Select Language"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 shadow-xs"
        style={{
          background: solid ? "rgba(20, 16, 13, 0.95)" : "rgba(18, 14, 11, 0.85)",
          border: solid ? "1px solid rgba(91, 31, 36, 0.25)" : "1px solid rgba(255, 255, 255, 0.2)",
          color: solid ? IVORY : "#FFFFFF",
          backdropFilter: "blur(8px)",
        }}
      >
        <span className="text-[13px] font-bold tracking-tight select-none flex items-center gap-0.5">
          <span className="font-serif text-[14px]">अ</span>
          <span className="text-[11px] opacity-90 font-sans">A</span>
        </span>
      </button>

      {/* Dropdown Menu (Image 2 Reference) */}
      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-44 rounded-2xl p-2.5 shadow-2xl z-50 transition-all duration-200 animate-in fade-in zoom-in-95`}
          style={{
            background: "#16120E",
            border: "1px solid rgba(200, 160, 68, 0.25)",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.7)",
          }}
        >
          <div className="flex flex-col gap-1">
            {LANGUAGES.map((lang) => {
              const isSelected = lang.code === language;
              return (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code as LanguageCode);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3.5 px-3 py-2 rounded-xl text-left text-sm transition-colors duration-150 group"
                  style={{
                    background: isSelected ? "rgba(200, 160, 68, 0.12)" : "transparent",
                  }}
                >
                  <span
                    className="w-5 text-center text-base font-bold flex-shrink-0"
                    style={{
                      color: isSelected ? "#E5A93C" : "#D1D5DB",
                    }}
                  >
                    {lang.symbol}
                  </span>
                  <span
                    className="text-sm font-medium tracking-wide"
                    style={{
                      color: isSelected ? "#E5A93C" : "#E5E7EB",
                    }}
                  >
                    {lang.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
