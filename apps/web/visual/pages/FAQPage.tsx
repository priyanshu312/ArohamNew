import { MAROON, GOLD, SERIF } from "@nakshra/shared-config/theme";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function FAQPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const { t } = useTranslation();

  const faqs = [
    {
      q: t("faq.q1", "Are all products authentic and temple energized?"),
      a: t("faq.a1", "Yes, every single product goes through 108 mantra chanting rounds by Vedic Pandits before being dispatched.")
    },
    {
      q: t("faq.q4", "Are your bracelets and pendants real powerful?"),
      a: t("faq.a4", "Yes! All our jewellery is made with 100% original stones, lab-tested and energized with mantras by expert pandits.")
    },
    {
      q: t("faq.q5", "Are rudraksha beads energized?"),
      a: t("faq.a5", "Yes, every Rudraksha bead is lab-tested and mantra-energized to give you full spiritual benefits.")
    },
    {
      q: t("faq.q2", "How long does shipping take?"),
      a: t("faq.a2", "Standard shipping takes 3-5 business days across India. Express shipping is available at checkout.")
    },
    {
      q: t("faq.q3", "What is the return policy?"),
      a: t("faq.a3", "We offer a 7-day hassle-free return policy if you are not completely satisfied with your item.")
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2] font-sans selection:bg-[#C8A044] selection:text-[#0D0508] pb-10">
      <div className="max-w-3xl mx-auto px-6 pt-32 pb-20">
        <div className="text-center mb-12">
          <h1 style={{ fontFamily: SERIF, color: MAROON }} className="text-4xl md:text-5xl font-medium mb-4">
            {t("faq.title", "Frequently Asked Questions")}
          </h1>
          <div className="h-1 w-24 mx-auto" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
          <p className="mt-6 text-[#7A6A58]">
            {t("faq.subtitle", "Everything you need to know about Nakshra products & energization.")}
          </p>
        </div>
        
        <div className="space-y-4">
          {faqs.map((faq, i) => {
            const isOpen = openIdx === i;
            return (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-[rgba(91,31,36,0.05)] shadow-sm transition-all duration-300">
                <button 
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                >
                  <span style={{ fontFamily: SERIF, color: MAROON }} className="text-lg font-medium pr-4">{faq.q}</span>
                  <ChevronDown size={20} className={`transform transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} style={{ color: GOLD }} />
                </button>
                <div 
                  className={`px-6 transition-all duration-300 ease-in-out overflow-hidden`}
                  style={{ maxHeight: isOpen ? "200px" : "0px", opacity: isOpen ? 1 : 0 }}
                >
                  <p className="pb-6 leading-relaxed text-[#4A3A2A] text-sm md:text-base">{faq.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
