import { MAROON, GOLD, SERIF } from "@nakshra/shared-config/theme";
import { useTranslation } from "react-i18next";

export function ShippingPolicyPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#FAF7F2] font-sans selection:bg-[#C8A044] selection:text-[#0D0508] pb-10">
      <div className="max-w-4xl mx-auto px-6 pt-32 pb-20">
        <div className="text-center mb-12">
          <h1 style={{ fontFamily: SERIF, color: MAROON }} className="text-4xl md:text-5xl font-medium mb-4">
            {t("shipping.title", "Shipping Policy")}
          </h1>
          <div className="h-1 w-24 mx-auto" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
          <p className="mt-4 text-[#7A6A58]">
            {t("shipping.subtitle", "Fast, secure, and sacred dispatch to your doorstep across India.")}
          </p>
        </div>
        
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-[rgba(91,31,36,0.05)] space-y-8" style={{ color: "#4A3A2A" }}>
          
          <section>
            <h2 style={{ fontFamily: SERIF, color: MAROON }} className="text-2xl font-semibold mb-3">
              {t("shipping.sec1_title", "1. Processing & Temple Consecration")}
            </h2>
            <p className="leading-relaxed">
              {t("shipping.sec1_desc", "Every order is consecrated individually by Vedic scholars. Consecration takes 24-48 hours before dispatch.")}
            </p>
          </section>

          <section>
            <h2 style={{ fontFamily: SERIF, color: MAROON }} className="text-2xl font-semibold mb-3">
              {t("shipping.sec2_title", "2. Delivery Timelines")}
            </h2>
            <p className="leading-relaxed">
              {t("shipping.sec2_desc", "Major cities: 2-4 business days. Other regions: 4-6 business days.")}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
