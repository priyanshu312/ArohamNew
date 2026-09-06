import { Instagram, Twitter, Facebook, Youtube } from "lucide-react";
import { Link } from "react-router";
import { MAROON, GOLD, SAFFRON, IVORY, SANS, SERIF } from "@nakshra/shared-config/theme";
import { useTranslation } from "react-i18next";


const SOCIAL_LINKS = [
  { Icon: Instagram, label: "Instagram", href: "https://instagram.com/Nakshra.in" },
  { Icon: Twitter,   label: "Twitter",   href: "https://twitter.com/Nakshra_in" },
  { Icon: Facebook,  label: "Facebook",  href: "https://facebook.com/Nakshra.in" },
  { Icon: Youtube,   label: "Youtube",   href: "https://youtube.com/@Nakshra" },
];

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer style={{ background: "#1A0D0E", color: "rgba(250,247,242,0.65)", fontFamily: SANS }}>
      <div className="h-px w-full" style={{ background: `linear-gradient(90deg,transparent,${GOLD}40,transparent)` }} />
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 mb-10 lg:mb-12">
          <div className="col-span-2 md:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg,${MAROON},${SAFFRON})` }}>
                <span className="text-xs font-bold" style={{ color: IVORY, fontFamily: SERIF }}>ॐ</span>
              </div>
              <span className="text-xl font-semibold" style={{ fontFamily: SERIF, color: IVORY }}>Nakshra</span>
            </div>
            <p className="text-sm mb-4 leading-relaxed hidden lg:block" style={{ color: "rgba(250,247,242,0.5)" }}>{t("footer.tagline", "Bringing Sacred Vedic Traditions to Modern Lives.")}</p>
            <p className="text-xs mb-4 leading-relaxed lg:hidden" style={{ color: "rgba(250,247,242,0.4)" }}>{t("footer.tagline", "Bringing Sacred Vedic Traditions to Modern Lives.")}</p>
          </div>
          {[
            { 
              title: t("footer.col_products", "Products"), 
              links: [
                { label: t("footer.yantras", "Yantras"), href: "/shop?category=Yantra" },
                { label: t("footer.pendants", "Pendants"), href: "/shop?category=Pendant" },
                { label: t("footer.crystals", "Crystals"), href: "/shop?category=Crystals" },
                { label: t("footer.rudraksha", "Rudraksha"), href: "/shop?category=Rudraksha" },
                { label: t("footer.combo_kits", "Combo Kits"), href: "/shop?title=Combo%20Deals" }
              ] 
            },
            { 
              title: t("footer.col_support", "Support"),  
              links: [
                { label: t("footer.faq", "FAQ"), href: "/faq" },
                { label: t("footer.shipping_policy", "Shipping Policy"), href: "/shipping" },
                { label: t("footer.return_policy", "Return Policy"), href: "/returns" },
                { label: t("footer.track_order", "Track Order"), href: "/track" },
                { label: t("footer.need_help", "Need Help?"), href: "/contact" }
              ] 
            },
            { 
              title: t("footer.col_company", "Company"),  
              links: [
                { label: t("footer.about_us", "About Us"), href: "#" },
                { label: t("footer.our_story", "Our Story"), href: "#" },
                { label: t("footer.careers", "Careers"), href: "#" },
                { label: t("footer.press", "Press"), href: "#" },
                { label: t("footer.blog", "Blog"), href: "/blog" },
                { label: t("footer.terms", "Terms & Conditions"), href: "/terms" }
              ] 
            },
          ].map(col => (
            <div key={col.title}>
              <h4 className="text-xs tracking-[0.15em] uppercase font-semibold mb-3 lg:mb-5" style={{ color: GOLD }}>{col.title}</h4>
              <ul className="space-y-2 lg:space-y-3">{col.links.map(l => <li key={l.label}><Link to={l.href} className="text-sm hover:text-white transition-colors" style={{ color: "rgba(250,247,242,0.5)" }}>{l.label}</Link></li>)}</ul>
            </div>
          ))}

        </div>
        <div id="site-footer" className="pt-6 lg:pt-8 flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-xs" style={{ color: "rgba(250,247,242,0.3)" }}>© 2025 Nakshra. {t("footer.rights", "All rights reserved.")} Made with reverence in India.</p>
          <div className="flex gap-6 text-xs" style={{ color: "rgba(250,247,242,0.3)" }}>
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white transition-colors">{t("footer.terms", "Terms & Conditions")}</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}

