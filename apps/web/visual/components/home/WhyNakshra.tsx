import { Flame, Gem, Star, Shield, Package, Award, Mail, Phone, MessageCircle } from "lucide-react";
import { MAROON, GOLD, SAFFRON, IVORY, SANS, SERIF } from "@nakshra/shared-config/theme";
import { CONTACT_INFO } from "@nakshra/shared-config/contact";
import { pyramidImg, baglaImg, navratnaImg, gemstonImg, yantraPlateImg, pendantSilImg } from "@nakshra/shared-config/data";
import { useTranslation } from "react-i18next";

export function WhyNakshra() {
  const { t } = useTranslation();

  const WHY_ITEMS = [
    { icon: Flame,   title: t("why.temple_energized", "Temple Energized"),    desc: t("why.mantra_rounds", "Every item consecrated through 108 mantra rounds by Vedic pandits"),    img: pyramidImg,    tag: "Sacred Ritual"       },
    { icon: Gem,     title: t("why.artisan_direct", "Artisan-Direct Authenticity"), desc: t("why.artisan_desc", "We visit every craftsman at India's sacred centres personally. No middlemen, no factories — ever."), img: baglaImg, tag: "Verified Quality" },
    { icon: Star,    title: t("why.astrology_approved", "Jyotish & Vastu Approved"), desc: t("why.astrology_desc", "India's most respected astrologers and Vastu consultants curate each product before it reaches you."), img: navratnaImg, tag: "Expert Endorsed" },
    { icon: Shield,  title: t("why.guarantee_title", "Worry-Free Guarantee"), desc: t("why.guarantee_desc", "Don't feel the energy shift? Return anything within 7 days, no questions. Your peace comes first."), img: gemstonImg, tag: "7-Day Policy" },
  ];

  return (
    <section className="relative overflow-hidden" style={{ background: "#07030A" }}>
      <style>{`
        @keyframes driftGlow { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.08)} }
        @keyframes lineGrow { from{width:0} to{width:100%} }
        .why-card:hover .why-line { animation: lineGrow 0.5s ease forwards; }
        .why-card:hover { transform: translateY(-4px); }
      `}</style>
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ position: "absolute", top: "-10%", left: "-5%", width: "55%", height: "70%", background: "radial-gradient(ellipse at 30% 30%,rgba(91,31,36,0.55) 0%,rgba(91,31,36,0.15) 45%,transparent 70%)", filter: "blur(80px)", animation: "driftGlow 8s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "-15%", right: "-5%", width: "50%", height: "65%", background: "radial-gradient(ellipse at 70% 70%,rgba(200,160,68,0.2) 0%,rgba(231,139,47,0.08) 45%,transparent 70%)", filter: "blur(70px)", animation: "driftGlow 11s ease-in-out infinite", animationDelay: "3s" }} />
        <div style={{ position: "absolute", inset: 0, opacity: 0.03, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundSize: "180px" }} />
      </div>

      <div className="relative z-10 pt-12 lg:pt-24 pb-0 px-6 lg:px-16 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 lg:gap-8 mb-8 lg:mb-20">
          <div>
            <div className="flex items-center gap-3 mb-3 lg:mb-6">
              <div style={{ width: 32, height: 1, background: `linear-gradient(to right,${GOLD},transparent)` }} />
              <span className="text-[10px] tracking-[0.35em] uppercase font-bold" style={{ color: GOLD, fontFamily: SANS }}>{t("why.badge", "The Nakshra Difference")}</span>
            </div>
            <p className="mb-1 lg:mb-2 text-[10px] lg:text-sm font-medium tracking-widest uppercase" style={{ color: "rgba(250,247,242,0.28)", fontFamily: SANS, letterSpacing: "0.22em" }}>{t("why.title", "Why Choose Us")}</p>
            <h2 style={{ fontFamily: SERIF, fontSize: "clamp(1.9rem,6vw,5rem)", fontWeight: 600, color: IVORY, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
              {t("why.heading", "Not just products.")}<br />
              <span style={{ background: `linear-gradient(120deg,${GOLD},${SAFFRON},${GOLD})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                Sacred instruments.
              </span>
            </h2>
          </div>
          <p className="hidden lg:block text-sm leading-relaxed lg:max-w-xs" style={{ color: "rgba(250,247,242,0.45)", fontFamily: SANS }}>
            {t("why.subheading", "12,000+ families trust Nakshra because we treat authenticity as a non-negotiable — not a marketing claim.")}
          </p>
        </div>

        <div className="hidden md:block relative rounded-[2rem] overflow-hidden mb-5 group" style={{ minHeight: 420 }}>
          <img src={pyramidImg} alt="Temple Energized" className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" style={{ filter: "brightness(0.45) saturate(0.9)" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(120deg,rgba(91,31,36,0.85) 0%,rgba(10,4,6,0.6) 50%,rgba(10,4,6,0.2) 100%)" }} />
          <div className="absolute top-0 left-0 right-0" style={{ height: 1, background: `linear-gradient(to right,transparent,${GOLD}60,transparent)` }} />
          <div className="absolute inset-0 p-10 lg:p-16 flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `rgba(231,139,47,0.2)`, border: `1px solid ${SAFFRON}50` }}>
                <Flame size={14} style={{ color: SAFFRON }} />
              </div>
              <span className="text-[10px] font-bold tracking-[0.3em] uppercase" style={{ color: SAFFRON, fontFamily: SANS }}>{t("why.pran_certified", "Pran Pratishtha Certified")}</span>
            </div>
            <div>
              <h3 className="mb-5" style={{ fontFamily: SERIF, fontSize: "clamp(1.8rem,4vw,3rem)", fontWeight: 500, color: IVORY, lineHeight: 1.15, maxWidth: "560px" }}>
                {t("why.mantra_rounds", "Every item consecrated through 108 mantra rounds by Vedic pandits")}
              </h3>
            </div>
          </div>
        </div>


        <div className="md:hidden -mx-6 px-6 mb-6">
          <div className="flex gap-3 overflow-x-auto pb-3" style={{ scrollbarWidth: "none", msOverflowStyle: "none", scrollSnapType: "x mandatory" }}>
            <div className="relative rounded-2xl overflow-hidden flex-shrink-0 snap-start" style={{ width: "72vw", height: 220 }}>
              <img src={pyramidImg} alt="Temple Energized" className="absolute inset-0 w-full h-full object-cover" style={{ filter: "brightness(0.4)" }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top,rgba(7,3,10,0.95) 0%,rgba(91,31,36,0.4) 100%)" }} />
              <div className="absolute inset-0 p-5 flex flex-col justify-between">
                <div className="flex items-center gap-2"><Flame size={11} style={{ color: SAFFRON }} /><span className="text-[9px] font-bold tracking-wider uppercase" style={{ color: SAFFRON, fontFamily: SANS }}>Temple Energized</span></div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold leading-snug" style={{ fontFamily: SERIF, color: IVORY }}>Consecrated through 108 mantra rounds</h3>
                  <div className="flex flex-wrap gap-1.5">{["Certificate", "Vedic Pandit"].map(t => (<span key={t} className="px-2 py-0.5 rounded-full text-[8px] font-semibold" style={{ background: "rgba(200,160,68,0.15)", border: "1px solid rgba(200,160,68,0.3)", color: GOLD, fontFamily: SANS }}>{t}</span>))}</div>
                </div>
              </div>
            </div>
            {[
              { img: baglaImg, icon: Gem, tag: "Artisan Direct", title: "100% Authentic, Always", color: GOLD },
              { img: navratnaImg, icon: Star, tag: "Expert Reviewed", title: "Jyotish Approved", color: SAFFRON },
              { img: gemstonImg, icon: Shield, tag: "7-Day Returns", title: "Worry-Free Guarantee", color: "#A8C5DA" },
            ].map(({ img, icon: Icon, tag, title, color }) => (
              <div key={title} className="relative rounded-2xl overflow-hidden flex-shrink-0 snap-start" style={{ width: "55vw", height: 220 }}>
                <img src={img} alt={title} className="absolute inset-0 w-full h-full object-cover" style={{ filter: "brightness(0.35)" }} />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top,rgba(7,3,10,0.97) 0%,rgba(7,3,10,0.4) 100%)" }} />
                <div className="absolute inset-0 p-5 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5"><Icon size={11} style={{ color }} /><span className="text-[9px] font-bold tracking-wider uppercase" style={{ color, fontFamily: SANS }}>{tag}</span></div>
                  <h3 className="text-sm font-semibold leading-snug" style={{ fontFamily: SERIF, color: IVORY }}>{title}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden md:grid md:grid-cols-3 gap-4 mb-5">
          {[
            { img: baglaImg,    icon: Gem,    tag: "Sourced Directly", title: "Artisan-Direct Authenticity", body: "We visit every craftsman at India's sacred centres personally. No middlemen, no factories — ever.", color: GOLD },
            { img: navratnaImg, icon: Star,   tag: "Expert Reviewed",  title: "Jyotish & Vastu Approved",    body: "India's most respected astrologers and Vastu consultants curate each product before it reaches you.", color: SAFFRON },
            { img: gemstonImg,  icon: Shield, tag: "7-Day Returns",    title: "Worry-Free Guarantee",         body: "Don't feel the energy shift? Return anything within 7 days, no questions. Your peace comes first.", color: "#A8C5DA" },
          ].map(({ img, icon: Icon, tag, title, body, color }) => (
            <div key={title} className="why-card relative rounded-[1.5rem] overflow-hidden group cursor-default transition-all duration-400" style={{ minHeight: 300 }}>
              <img src={img} alt={title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" style={{ filter: "brightness(0.38) saturate(0.8)" }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top,rgba(7,3,10,0.97) 0%,rgba(7,3,10,0.5) 60%,transparent 100%)" }} />
              <div className="absolute inset-0 p-7 flex flex-col justify-between">
                <div className="flex items-center gap-2"><Icon size={13} style={{ color }} /><span className="text-[9px] font-bold tracking-[0.3em] uppercase" style={{ color, fontFamily: SANS }}>{tag}</span></div>
                <div>
                  <div className="why-line mb-3" style={{ height: 1, width: 0, background: `linear-gradient(to right,${color},transparent)`, transition: "width 0.5s ease" }} />
                  <h3 className="mb-2" style={{ fontFamily: SERIF, fontSize: "1.15rem", fontWeight: 500, color: IVORY, lineHeight: 1.25 }}>{title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(250,247,242,0.5)", fontFamily: SANS }}>{body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-px mb-5" style={{ background: "rgba(250,247,242,0.06)", borderRadius: 20, overflow: "hidden" }}>
          {[
            { n: "12,000+", l: t("why.stat_families", "Families Served"), sub: t("why.stat_states", "Across 18 states") },
            { n: "100%",    l: t("why.temple_energized", "Temple Energized"), sub: "No exceptions" },
            { n: "4.9 / 5", l: t("why.stat_rating", "Customer Rating"), sub: "3,200+ reviews" },
            { n: "7 Days",  l: t("why.stat_window", "Return Window"), sub: "No questions asked" },
          ].map(({ n, l, sub }) => (
            <div key={l} className="flex flex-col items-center justify-center py-6 lg:py-9 px-3 text-center transition-all duration-300 hover:bg-white/5" style={{ background: "rgba(250,247,242,0.02)" }}>
              <div style={{ fontFamily: SERIF, fontSize: "clamp(1.2rem,3.5vw,2.4rem)", fontWeight: 600, color: IVORY, letterSpacing: "-0.02em" }}>{n}</div>
              <div className="mt-1 text-[10px] lg:text-xs font-semibold tracking-wide" style={{ color: GOLD, fontFamily: SANS }}>{l}</div>
              <div className="mt-0.5 text-[9px] lg:text-[10px]" style={{ color: "rgba(250,247,242,0.3)", fontFamily: SANS }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 w-full mt-2 mb-6 lg:mb-12 rounded-2xl lg:rounded-[1.75rem] overflow-hidden" style={{ background: "linear-gradient(135deg,rgba(91,31,36,0.6) 0%,rgba(40,15,20,0.9) 50%,rgba(91,31,36,0.4) 100%)", border: "1px solid rgba(200,160,68,0.2)" }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 20% 50%,rgba(200,160,68,0.1) 0%,transparent 60%)", pointerEvents: "none" }} />
        <div className="relative z-10 px-6 py-8 lg:px-10 lg:py-10 flex flex-col gap-6">
          <div>
            <span className="text-[10px] tracking-[0.3em] uppercase font-bold mb-3 block" style={{ color: GOLD, fontFamily: SANS }}>{t("help.badge", "Expert Guidance")}</span>
            <h3 className="mb-2" style={{ fontFamily: SERIF, fontSize: "clamp(1.3rem,3vw,2rem)", fontWeight: 700, color: IVORY, lineHeight: 1.15 }}>{t("help.title", "Confused? Let Us Help You Choose.")}</h3>
            <p className="text-sm" style={{ color: "rgba(250,247,242,0.5)", fontFamily: SANS }}>{t("help.subtitle", "Our Vedic experts will personally guide you to the right remedy for your specific situation.")}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: Mail,          label: t("help.email", "Email Us"),  sub: CONTACT_INFO.email,        href: CONTACT_INFO.emailMailto, green: false, target: undefined },
              { icon: Phone,         label: t("help.call", "Call Us"),   sub: CONTACT_INFO.phoneDisplay, href: CONTACT_INFO.phoneTel,     green: false, target: undefined },
              { icon: MessageCircle, label: t("help.whatsapp", "WhatsApp"),  sub: t("help.chat", "Chat instantly"),          href: CONTACT_INFO.whatsappUrl,   green: true,  target: "_blank" },
            ].map(({ icon: Ic, label, sub, href, green, target }) => (
              <a key={label} href={href} target={target} rel="noopener noreferrer" className="flex items-center gap-4 px-5 py-4 rounded-2xl cursor-pointer transition-all duration-200 hover:brightness-110 active:scale-98"
                style={{ background: green ? "rgba(74,183,95,0.85)" : "rgba(250,247,242,0.06)", border: green ? "none" : "1px solid rgba(250,247,242,0.08)" }}>
                <Ic size={18} style={{ color: green ? "#fff" : GOLD, flexShrink: 0 }} />
                <div>
                  <div className="text-sm font-bold" style={{ color: green ? "#fff" : IVORY, fontFamily: SANS }}>{label}</div>
                  <div className="text-[11px]" style={{ color: green ? "rgba(255,255,255,0.75)" : "rgba(250,247,242,0.4)", fontFamily: SANS }}>{sub}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

