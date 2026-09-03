import { Star, MessageSquare } from "lucide-react";
import { SERIF } from "@nakshra/shared-config/theme";
import { useTranslation } from "react-i18next";

export interface Astrologer {
  id: string;
  name: string;
  title: string;
  experience: string;
  rating: number;
  consultations: number;
  specialties: string[];
  languages: string[];
  avatar: string;
  status: "online" | "busy" | "offline";
  pricePerMin: number;
  bio?: string;
  lastActiveAt?: string | null;
  workingHours?: { enabled: boolean; start: string; end: string } | null;
}

interface AstrologerCardProps {
  astro: Astrologer;
  onStartConsultation: (astro: Astrologer) => void;
}

const translateSpecialty = (spec: string, t: any) => {
  const s = spec.toLowerCase();
  if (s.includes("kundali")) return t("spec.vedic_kundali", "Vedic Kundali");
  if (s.includes("remed")) return t("spec.sacred_remedies", "Sacred Remedies");
  if (s.includes("gemstone")) return t("spec.gemstones", "Gemstones");
  if (s.includes("vastu")) return t("spec.vastu_remedies", "Vastu Remedies");
  if (s.includes("rudraksha")) return t("spec.rudraksha", "Rudraksha");
  if (s.includes("tarot")) return t("spec.tarot", "Tarot");
  if (s.includes("career")) return t("spec.career", "Career");
  if (s.includes("marriage")) return t("spec.marriage", "Marriage");
  return spec;
};

export function AstrologerCard({ astro, onStartConsultation }: AstrologerCardProps) {
  const { t } = useTranslation();

  const isOnline = astro.status === "online";
  const isBusy = astro.status === "busy";

  const statusLabel = isOnline
    ? t("consult.online", "ONLINE")
    : isBusy
    ? t("consult.busy", "BUSY")
    : t("consult.offline", "OFFLINE");

  const statusColor = isOnline
    ? "bg-emerald-500 text-white"
    : isBusy
    ? "bg-amber-500 text-white"
    : "bg-stone-500 text-white";

  const expYears = (astro.experience || "5+").replace(/[^0-9+]/g, '') || "5+";

  return (
    <div
      onClick={() => onStartConsultation(astro)}
      className="bg-white rounded-3xl p-5 border border-amber-900/10 shadow-[0_4px_22px_rgba(91,31,36,0.02)] hover:shadow-xl hover:border-amber-500/20 transition-all duration-300 group hover:-translate-y-1 cursor-pointer flex flex-col justify-between h-full"
    >
      <div>
        <div className="relative mb-4 overflow-hidden rounded-2xl aspect-[4/3] shadow-xs">
          <img
            src={astro.avatar}
            alt={astro.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />



          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/65 text-amber-300 border border-white/10 flex items-center gap-1 backdrop-blur-xs shadow-md">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            <span>{astro.rating}</span>
          </div>
        </div>

        <div>
          <h3
            className="font-bold text-base text-[#5B1F24] leading-tight truncate group-hover:text-amber-700 transition-colors"
            style={{ fontFamily: SERIF }}
          >
            {astro.name}
          </h3>
          <p className="text-xs text-amber-900/60 font-semibold mt-1 truncate">
            {translateSpecialty(astro.title, t)}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 my-3">
          {astro.specialties.slice(0, 3).map((spec) => (
            <span
              key={spec}
              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-900/70 border border-amber-900/10"
            >
              {translateSpecialty(spec, t)}
            </span>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-amber-900/10 flex items-center justify-between mt-2">
        <div>
          <span className="text-xs font-semibold text-amber-900/50 block text-[10px]">
            {expYears} {t("consult.exp", "Years Exp")}
          </span>
          <span className="text-sm font-extrabold text-[#5B1F24]">
            ₹{astro.pricePerMin}
            <span className="text-[10px] text-amber-900/60 font-medium ml-0.5">
              {t("consult.min", "/ min")}
            </span>
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onStartConsultation(astro);
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#5B1F24] text-white hover:bg-[#78282E] transition-all shadow-md active:scale-95"
        >
          <MessageSquare size={13} />
          <span>{t("consult.chat_now", "Chat Now")}</span>
        </button>
      </div>
    </div>
  );
}
