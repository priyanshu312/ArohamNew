import { Sparkles, Search } from "lucide-react";
import { useNavigate } from "react-router";
import { SERIF, SANS } from "@nakshra/shared-config/theme";
import { useTranslation } from "react-i18next";

interface ConsultHeroProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedTopic: string;
  setSelectedTopic: (t: string) => void;
  onlineCount: number;
  astrologers: any[];
}

export function ConsultHero({
  searchQuery,
  setSearchQuery,
  selectedTopic,
  setSelectedTopic,
  onlineCount,
  astrologers,
}: ConsultHeroProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const topics = [
    { key: "All", label: t("consult.filter_all", "All") },
    { key: "Online Now", label: t("consult.online", "Online Now") },
    { key: "Kundali", label: "Kundali" },
    { key: "Rudraksha", label: "Rudraksha" },
    { key: "Gemstone", label: "Gemstone" },
    { key: "Vastu", label: "Vastu" },
    { key: "Career", label: "Career" },
    { key: "Marriage", label: "Marriage" },
  ];

  return (
    <div
      className="relative pt-4 sm:pt-16 pb-4 sm:pb-12 px-4 sm:px-6 lg:px-10 border-b border-amber-900/10 overflow-hidden"
      style={{ background: "linear-gradient(180deg, #F8F4ED 0%, #FCFAF7 100%)" }}
    >
      <div className="absolute top-12 right-1/4 w-80 h-80 rounded-full bg-amber-200/20 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-10 left-10 w-60 h-60 rounded-full bg-red-100/30 blur-[80px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex items-center gap-2 mb-2 sm:mb-4 text-xs font-semibold text-amber-900/50">
          <button
            onClick={() => navigate("/")}
            className="hover:underline hover:text-[#5B1F24] transition-colors"
          >
            {t("nav.home", "Home")}
          </button>
          <span>/</span>
          <span className="font-bold text-[#5B1F24]">
            {t("nav.consult", "Vedic Consultations")}
          </span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-8 mb-6 sm:mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-2.5 sm:mb-4 border border-amber-400/30 bg-amber-400/10 text-amber-800">
              <Sparkles size={13} className="text-amber-600 fill-amber-600/30 animate-pulse" />
              <span>Verified Temple Scholars</span>
            </div>
            <h1
              className="tracking-tight text-[#5B1F24]"
              style={{ fontFamily: SERIF, fontSize: "clamp(2.0rem, 5vw, 3.6rem)", fontWeight: 800 }}
            >
              {t("consult.title", "Connect with Certified Vedic Astrologers")}
            </h1>
            <p className="text-xs sm:text-sm mt-2 sm:mt-3 max-w-2xl font-medium text-amber-950/70 leading-relaxed">
              {t("consult.subtitle", "Instant consultation, Kundali reading & personalized gemstone remedies.")}
            </p>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 bg-white/70 backdrop-blur-md p-3 sm:p-4.5 rounded-2xl sm:rounded-3xl border border-amber-900/10 shadow-[0_8px_30px_rgb(91,31,36,0.02)] shrink-0 self-start lg:self-auto">
            <div className="flex -space-x-3">
              {astrologers.slice(0, 4).map((a, i) => (
                <img
                  key={a.id}
                  src={a.avatar}
                  alt={a.name}
                  className="w-8.5 h-8.5 sm:w-10.5 sm:h-10.5 rounded-full object-cover border-2 border-white shadow-md"
                  style={{ zIndex: 40 - i }}
                />
              ))}
            </div>
            <div>
              <p className="font-extrabold text-emerald-600 text-xs sm:text-sm flex items-center gap-1.5">
                <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                {onlineCount} {t("consult.online", "Scholars Active")}
              </p>
              <p className="text-[10px] sm:text-[11px] text-amber-900/60 font-bold">
                Instant live chat available
              </p>
            </div>
          </div>
        </div>

        {/* Search & Topic Filters Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4 bg-white p-3.5 sm:p-4.5 rounded-2xl sm:rounded-3xl border border-amber-900/10 shadow-[0_4px_25px_rgba(91,31,36,0.02)]">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-900/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("consult.search", "Search scholar by name, specialty...")}
              className="w-full h-10 sm:h-11.5 pl-11 pr-4 rounded-xl sm:rounded-2xl text-xs bg-amber-50/20 border border-amber-900/10 outline-none focus:border-[#5B1F24] focus:ring-2 focus:ring-[#5B1F24]/5 focus:bg-white transition-all text-[#3C3024] font-medium"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 min-w-0 flex-1 justify-end">
            {topics.map((tItem) => (
              <button
                key={tItem.key}
                onClick={() => setSelectedTopic(tItem.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                  selectedTopic === tItem.key
                    ? "bg-[#5B1F24] text-white border-[#5B1F24] shadow-md shadow-[#5B1F24]/10"
                    : "bg-[#FAF8F5] text-[#4A3E31] border-amber-900/10 hover:bg-amber-900/5 hover:border-amber-900/20"
                }`}
              >
                {tItem.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
