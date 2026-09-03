import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { ShoppingCart, Heart, Search, User, Menu, X } from "lucide-react";
import { MAROON, GOLD, SAFFRON, IVORY, SANS, SERIF } from "@aroham/shared-config/theme";
import { useCart } from "@aroham/shared-state";
import { useAuth } from "@aroham/shared-auth";
import { useWishlist } from "@aroham/shared-state";
import { SearchModal } from "./SearchModal";
import { LanguageSelector } from "./LanguageSelector";
import { useTranslation } from "react-i18next";
import { KundliModal } from "../product/KundliModal";

export function Nav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartCount, openCart } = useCart();
  const { isLoggedIn, openAuth } = useAuth();
  const { wishlist } = useWishlist();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isKundliOpen, setIsKundliOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => document.getElementById("nav-search-input")?.focus(), 100);
    }
  }, [isSearchOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isCartPage = location.pathname !== "/";
  const solid = scrolled || isCartPage || open;

  const navLinks: [string, () => void][] = [
    [t("nav.home", "Home"), () => { navigate("/"); setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50); }],
    [t("nav.shop", "Shop"), () => navigate("/shop")],
    [t("nav.consult", "Consult"), () => navigate("/consult")],
    ["📜 Make My Kundli", () => setIsKundliOpen(true)],
    ...(isLoggedIn ? [[t("nav.my_orders", "My Orders"), () => navigate("/profile?tab=orders")] as [string, () => void]] : []),
  ];

  return (
    <>
      {isSearchOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/5 backdrop-blur-[1px] transition-opacity cursor-pointer" 
          onClick={() => { setIsSearchOpen(false); setQuery(""); }} 
        />
      )}
      <nav role="navigation" aria-label="Main navigation"
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: solid ? "rgba(250,247,242,0.97)" : "transparent",
          backdropFilter: solid ? "blur(12px)" : "none",
          borderBottom: solid ? `1px solid rgba(91,31,36,0.1)` : "none",
          boxShadow: solid ? "0 2px 24px rgba(91,31,36,0.06)" : "none",
          fontFamily: SANS
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between h-16 lg:h-20">
          <button onClick={() => navigate("/")} className={`flex items-center gap-2.5 group transition-all duration-500 overflow-hidden whitespace-nowrap ${isSearchOpen ? 'opacity-0 max-w-0 pointer-events-none lg:opacity-100 lg:max-w-none lg:pointer-events-auto' : 'opacity-100 max-w-none'}`}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-transform group-hover:scale-105 flex-shrink-0"
              style={{ background: `linear-gradient(135deg,${MAROON},${SAFFRON})`, color: IVORY, fontFamily: SERIF }}>ॐ</div>
            <span className="text-xl font-semibold tracking-wide" style={{ fontFamily: SERIF, color: solid ? MAROON : "#FFD700" }}>Aroham</span>
          </button>
          
          <div className={`hidden lg:flex items-center gap-12 transition-all duration-500 overflow-hidden whitespace-nowrap ${isSearchOpen ? 'opacity-100 max-w-none pointer-events-auto' : 'opacity-100 max-w-none'}`}>
            {navLinks.map(([l, fn]) => (
              <button key={l} onClick={fn}
                className="text-base font-medium tracking-wide transition-colors duration-200 hover:opacity-70"
                style={{ color: solid ? MAROON : "#FAF7F2" }}>{l}</button>
            ))}
          </div>
          
          <div className="hidden lg:flex items-center gap-4 transition-all duration-300">
            {/* Multilingual Selector Placed Directly in Front of Search Button */}
            <LanguageSelector solid={solid} />
            <div className="relative">
              <div className="flex items-center transition-all duration-500 ease-out overflow-hidden rounded-full"
                   style={{
                     width: isSearchOpen ? '280px' : '36px',
                     maxWidth: isSearchOpen ? '280px' : '36px',
                     background: isSearchOpen ? (solid ? "rgba(255,255,255,0.95)" : "rgba(15,10,12,0.95)") : "transparent",
                     border: isSearchOpen ? `1px solid ${solid ? 'rgba(91,31,36,0.15)' : 'rgba(200,160,68,0.3)'}` : 'transparent'
                   }}>
                {isSearchOpen ? (
                  <>
                    <Search size={16} className="ml-3 flex-shrink-0" style={{ color: solid ? MAROON : GOLD }} />
                    <input id="nav-search-input" type="text" placeholder={t("nav.search_placeholder", "Search for yantras, rudraksha...")}
                      className="flex-1 w-full bg-transparent border-none outline-none px-3 py-2 text-sm"
                      style={{ color: solid ? MAROON : IVORY, fontFamily: SANS }}
                      value={query} onChange={(e) => setQuery(e.target.value)} />
                    <button onClick={() => { setIsSearchOpen(false); setQuery(""); }} className="p-1.5 mr-1 rounded-full hover:bg-black/5 flex-shrink-0" style={{ color: solid ? MAROON : IVORY }}>
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <button aria-label="Search" onClick={() => setIsSearchOpen(true)} className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-black/5" style={{ color: solid ? MAROON : IVORY }}><Search size={18} strokeWidth={1.5} /></button>
                )}
              </div>
              <div className="hidden lg:block">
                <SearchModal isOpen={isSearchOpen} onClose={() => { setIsSearchOpen(false); setQuery(""); }} query={query} setQuery={setQuery} solid={solid} isMobile={false} />
              </div>
            </div>
            <button aria-label="Wishlist" onClick={() => navigate("/wishlist")} className="relative p-2 rounded-full transition-colors hover:bg-black/5" style={{ color: solid ? MAROON : IVORY }}>
              <Heart size={18} strokeWidth={1.5} />
              {wishlist.length > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-[10px] flex items-center justify-center font-semibold" style={{ background: "#E74C3C" }}>{wishlist.length}</span>}
            </button>
            <button aria-label="Open cart" onClick={openCart} className="relative p-2 rounded-full transition-colors hover:bg-black/5" style={{ color: solid ? MAROON : IVORY }}>
              <ShoppingCart size={18} strokeWidth={1.5} />
              {cartCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-[10px] flex items-center justify-center font-semibold" style={{ background: GOLD }}>{cartCount}</span>}
            </button>
            {isLoggedIn ? (
              <button onClick={() => navigate("/profile?tab=profile")}
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all hover:opacity-90 hover:scale-105"
                style={{ background: `linear-gradient(135deg,${MAROON},${SAFFRON})`, color: IVORY }}>
                <User size={16} />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={openAuth} className="px-5 py-2 rounded-full text-sm font-medium tracking-wide transition-all duration-200 hover:opacity-90 shadow-2xs" style={{ background: MAROON, color: IVORY }}>{t("nav.sign_in", "Sign In")}</button>
                <button onClick={() => { navigate("/auth?role=astrologer"); }} className="px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-all duration-200 hover:bg-amber-900/10 border flex items-center gap-1" style={{ borderColor: solid ? "rgba(91,31,36,0.3)" : "rgba(200,160,68,0.4)", color: solid ? MAROON : GOLD }}>
                  <span>{t("nav.astrologer_signin", "Astrologer? Sign In / Join")}</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Right Action Icons */}
          <div className="lg:hidden flex items-center gap-3 transition-all duration-300" style={{ color: solid ? MAROON : IVORY }}>
            {/* Multilingual Selector Placed Directly in Front of Search Button on Mobile */}
            <LanguageSelector solid={solid} isMobile />
            <div className="relative w-full flex justify-end">
              <div className="flex items-center transition-all duration-500 ease-out overflow-hidden rounded-full"
                   style={{ 
                     width: isSearchOpen ? 'calc(100vw - 140px)' : '28px',
                     background: isSearchOpen ? (solid ? "rgba(255,255,255,0.95)" : "rgba(15,10,12,0.95)") : "transparent",
                     border: isSearchOpen ? `1px solid ${solid ? 'rgba(91,31,36,0.15)' : 'rgba(200,160,68,0.3)'}` : 'transparent'
                   }}>
                {isSearchOpen ? (
                  <>
                    <Search size={14} className="ml-3 flex-shrink-0" style={{ color: solid ? MAROON : GOLD }} />
                    <input id="nav-search-input-mobile" type="text" placeholder={t("nav.search_placeholder", "Search...")}
                      className="flex-1 w-full bg-transparent border-none outline-none px-2 py-1.5 text-[13px]"
                      style={{ color: solid ? MAROON : IVORY, fontFamily: SANS }}
                      value={query} onChange={(e) => setQuery(e.target.value)} />
                    <button onClick={() => { setIsSearchOpen(false); setQuery(""); }} className="p-1 mr-1 rounded-full hover:bg-black/5 flex-shrink-0" style={{ color: solid ? MAROON : IVORY }}>
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <button aria-label="Search" onClick={() => setIsSearchOpen(true)} className="p-1"><Search size={20} strokeWidth={1.5} /></button>
                )}
              </div>
              <div className="lg:hidden block">
                <SearchModal isOpen={isSearchOpen} onClose={() => { setIsSearchOpen(false); setQuery(""); }} query={query} setQuery={setQuery} solid={solid} isMobile={true} />
              </div>
            </div>
            <button aria-label="Wishlist" onClick={() => navigate("/wishlist")} className="relative p-1 flex-shrink-0">
              <Heart size={20} strokeWidth={1.5} />
              {wishlist.length > 0 && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-white text-[9px] flex items-center justify-center font-semibold" style={{ background: "#E74C3C" }}>{wishlist.length}</span>}
            </button>
            <button aria-label="Open cart" onClick={openCart} className="relative p-1 flex-shrink-0">
              <ShoppingCart size={20} strokeWidth={1.5} />
              {cartCount > 0 && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-white text-[9px] flex items-center justify-center font-semibold" style={{ background: GOLD }}>{cartCount}</span>}
            </button>
            <button aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)} className="p-1 flex-shrink-0">
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        <div id="mobile-menu" className="lg:hidden overflow-hidden transition-all duration-300"
          style={{ maxHeight: open ? "400px" : "0", background: "rgba(250,247,242,0.98)", backdropFilter: "blur(16px)" }}>
          <div className="px-6 pt-2 pb-6 flex flex-col gap-4">
            {navLinks.map(([l, fn]) => (
              <button key={l} onClick={() => { fn(); setOpen(false); }} className="py-2 text-sm font-medium border-b text-left" style={{ color: MAROON, borderColor: "rgba(91,31,36,0.08)" }}>{l}</button>
            ))}
            <button onClick={() => { navigate("/wishlist"); setOpen(false); }} className="py-2 text-sm font-medium border-b text-left flex items-center justify-between" style={{ color: MAROON, borderColor: "rgba(91,31,36,0.08)" }}>
              <span>{t("nav.wishlist", "Wishlist")}</span>
            </button>
            {!isLoggedIn && (
              <button onClick={() => { openAuth(); navigate("?role=astrologer", { replace: true }); setOpen(false); }} className="py-2 text-sm font-semibold border-b text-left text-amber-900 flex items-center justify-between" style={{ borderColor: "rgba(91,31,36,0.08)" }}>
                <span>{t("nav.astrologer_signin", "Astrologer? Sign In / Join")}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">Vedic Portal</span>
              </button>
            )}
            {isLoggedIn ? (
              <button onClick={() => { navigate("/profile?tab=profile"); setOpen(false); }} className="mt-2 py-3 rounded-full text-sm font-medium flex items-center justify-center gap-2" style={{ background: MAROON, color: IVORY }}><User size={15} />My Profile</button>
            ) : (
              <button onClick={() => { openAuth(); setOpen(false); }} className="mt-2 py-3 rounded-full text-sm font-medium" style={{ background: MAROON, color: IVORY }}>{t("nav.sign_in", "Sign In")}</button>
            )}
          </div>
        </div>
      </nav>
      <KundliModal isOpen={isKundliOpen} onClose={() => setIsKundliOpen(false)} />
    </>
  );
}

