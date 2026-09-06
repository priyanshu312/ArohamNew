import { MAROON, GOLD, SERIF } from "@nakshra/shared-config/theme";
import { useTranslation } from "react-i18next";

export function ReturnPolicyPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#FAF7F2] font-sans selection:bg-[#C8A044] selection:text-[#0D0508] pb-10">
      <div className="max-w-4xl mx-auto px-6 pt-32 pb-20">
        <div className="text-center mb-12">
          <h1 style={{ fontFamily: SERIF, color: MAROON }} className="text-4xl md:text-5xl font-medium mb-4">
            {t("returns.title", "Return & Refund Policy")}
          </h1>
          <div className="h-1 w-24 mx-auto" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
          <p className="mt-4 text-[#7A6A58]">
            {t("returns.subtitle", "7-Day Worry-Free Guarantee for all sacred items.")}
          </p>
        </div>
        
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-[rgba(91,31,36,0.05)] space-y-8" style={{ color: "#4A3A2A" }}>
          <section>
            <h2 style={{ fontFamily: SERIF, color: MAROON }} className="text-2xl font-semibold mb-3">
              1. 7-Day Return Window
            </h2>
            <p className="leading-relaxed">
              {t("returns.desc", "If you don't feel the energy shift or are unsatisfied, return any item within 7 days of delivery for a full refund.")}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
