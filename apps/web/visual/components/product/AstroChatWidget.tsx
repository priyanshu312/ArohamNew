import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, X, Sparkles, ShoppingBag, ExternalLink, Video, UserCheck, RotateCcw, Copy } from "lucide-react";
import { MAROON, GOLD, IVORY, SANS, SERIF } from "@nakshra/shared-config/theme";
import { useAuth } from "@nakshra/shared-auth";
import { useCart } from "@nakshra/shared-state";
import { useNavigate } from "react-router";

interface ProductRecommendation {
  id: number | string;
  slug?: string;
  name: string;
  price: string;
  desc?: string;
  img?: string;
  raw_price?: number;
}

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  products?: ProductRecommendation[];
  consultationHandoff?: boolean;
}

const DEFAULT_WELCOME_MSG: ChatMessage = {
  id: "msg-welcome",
  sender: "bot",
  text: "Namaste! I am your AstroGuide. How can I help you align your stars and find the perfect supportive remedies today?",
};

export function AstroChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [showProactive, setShowProactive] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem("Nakshra_astro_chat_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Error reading chat history from sessionStorage:", e);
    }
    return [DEFAULT_WELCOME_MSG];
  });

  const [inputVal, setInputVal] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Feature 1: Proactive Greeting Bubble (5s delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen && messages.length === 1) {
        setShowProactive(true);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [isOpen, messages.length]);

  // Persistent Guest ID for seamless ML telemetry tracking
  const [guestId, setGuestId] = useState<string>("");

  useEffect(() => {
    let saved = localStorage.getItem("Nakshra_guest_user_id");
    if (!saved) {
      saved = "guest_" + Math.random().toString(36).substring(2, 10);
      localStorage.setItem("Nakshra_guest_user_id", saved);
    }
    setGuestId(saved);
  }, []);

  // Save chat history to sessionStorage whenever messages change (Option 2)
  useEffect(() => {
    try {
      sessionStorage.setItem("Nakshra_astro_chat_history", JSON.stringify(messages));
    } catch (e) {
      console.error("Error saving chat history to sessionStorage:", e);
    }
  }, [messages]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const parseMarkdown = (text: string) => {
    if (!text) return "";
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Format headers
    html = html.replace(/^### (.*?)$/gm, '<h5 style="margin-top: 6px; margin-bottom: 3px; font-weight: bold; color: #C8A044;">$1</h5>');
    html = html.replace(/^## (.*?)$/gm, '<h4 style="margin-top: 8px; margin-bottom: 4px; font-weight: bold; color: #C8A044;">$1</h4>');
    html = html.replace(/^# (.*?)$/gm, '<h3 style="margin-top: 10px; margin-bottom: 5px; font-weight: bold; color: #C8A044;">$1</h3>');

    // Format bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #C8A044; font-weight: 700;">$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong style="color: #C8A044; font-weight: 700;">$1</strong>');

    // Format line breaks
    html = html.replace(/\n/g, "<br>");

    return html;
  };

  const handleSendMessage = async () => {
    const text = inputVal.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: "msg-" + Date.now(),
      sender: "user",
      text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");
    setLoading(true);

    try {
      const apiBase = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:5000";
      const activeUserId = user?.id || guestId || "anonymous_user";

      const res = await fetch(`${apiBase}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: activeUserId,
          message: text,
          pageContext: window.location.pathname,
          history: messages.slice(1),
        }),
      });

      if (!res.ok) throw new Error("Cosmos API unreachable");
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: "msg-res-" + Date.now(),
          sender: "bot",
          text: data.reply || "I cannot reach the cosmos right now.",
          products: data.products || [],
          consultationHandoff: data.consultation_handoff || false,
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: "msg-err-" + Date.now(),
          sender: "bot",
          text: "I had trouble reading the stars. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = (prod: ProductRecommendation) => {
    const slug = prod.slug || String(prod.id);
    setIsOpen(false);
    navigate(`/shop/${slug}`);
  };

  const handleConsultClick = () => {
    setIsOpen(false);
    navigate("/consult");
  };

  return (
    <div className="fixed bottom-6 right-6 z-[999]" style={{ fontFamily: SANS }}>
      {/* Feature 1: Proactive Greeting Bubble */}
      {!isOpen && showProactive && (
        <div className="absolute bottom-16 right-0 mb-2 w-52 bg-white rounded-2xl p-3 shadow-xl border border-amber-900/10 animate-in fade-in slide-in-from-bottom-2">
          <button onClick={() => setShowProactive(false)} className="absolute top-1.5 right-1.5 text-amber-900/40 hover:text-amber-900"><X className="w-3 h-3" /></button>
          <div className="flex items-start gap-2">
            <span className="text-lg">✨</span>
            <p className="text-[11px] font-semibold text-[#3C3024] leading-tight pr-2">
              Looking for personalized Vedic remedies or astrological guidance?
            </p>
          </div>
          <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white border-b border-r border-amber-900/10 rotate-45" />
        </div>
      )}

      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setShowProactive(false);
          }}
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 relative"
          style={{
            background: `linear-gradient(135deg, ${MAROON}, #7A2A30)`,
            boxShadow: "0 8px 32px rgba(91,31,36,0.3)",
          }}
        >
          <MessageSquare className="w-6 h-6" style={{ color: IVORY }} />
          {showProactive && (
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
          )}
          {!showProactive && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
          )}
        </button>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div
          className="w-[380px] h-[540px] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-amber-900/10 animate-in fade-in slide-in-from-bottom-5 duration-300"
          style={{
            boxShadow: "0 12px 40px rgba(91,31,36,0.15)",
          }}
        >
          {/* Header */}
          <div
            className="px-5 py-4 flex items-center justify-between shadow-md shrink-0"
            style={{ background: `linear-gradient(135deg, ${MAROON} 0%, #4D1418 100%)` }}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4" style={{ color: GOLD }} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white" style={{ fontFamily: SERIF }}>
                  Nakshra AstroGuide
                </h3>
                <span className="text-[9px] text-green-400 font-bold tracking-wider uppercase block">
                  Online Advisor
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setMessages([DEFAULT_WELCOME_MSG]);
                  sessionStorage.removeItem("Nakshra_astro_chat_history");
                }}
                className="p-1.5 rounded-lg bg-white/5 text-white/80 hover:bg-white/20 hover:text-white transition-all"
                title="Start Fresh"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 text-white/80 hover:bg-white/20 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#FCFAF7]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    m.sender === "user"
                      ? "text-white rounded-br-none"
                      : "text-[#3C3024] bg-white border border-amber-900/10 rounded-bl-none"
                  }`}
                  style={{
                    background: m.sender === "user" ? `linear-gradient(135deg, ${MAROON}, #7A2A30)` : undefined,
                  }}
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(m.text) }}
                />

                {/* Live Astrologer Consultation Handoff Card (Option 1) */}
                {m.consultationHandoff && (
                  <div className="mt-3 w-full p-3 rounded-2xl bg-gradient-to-r from-[#4D1418] via-[#5B1F24] to-[#3C1014] text-white border border-amber-500/30 shadow-md">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Video className="w-4 h-4 text-amber-300" />
                      <h5 className="font-bold text-xs text-amber-100" style={{ fontFamily: SERIF }}>
                        Personal Kundali & Chart Reading Needed?
                      </h5>
                    </div>
                    <p className="text-[10px] text-amber-200/80 mb-2.5 font-medium leading-tight">
                      For detailed Kundali analysis, Dasha predictions, or matchmaking, consult 1-on-1 with a verified Vedic Astrologer.
                    </p>
                    <button
                      onClick={handleConsultClick}
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:brightness-110 active:scale-95 transition-all"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Book Live Video Consultation</span>
                    </button>
                  </div>
                )}

                {/* Render Interactive Recommended Product Cards */}
                {m.products && m.products.length > 0 && (
                  <div className="mt-3 w-full space-y-2">
                    <span className="text-[10px] font-bold tracking-widest text-amber-900/60 uppercase block px-1">
                      ✨ Recommended Sacred Remedies
                    </span>
                    <div className="space-y-2">
                      {m.products.map((prod) => (
                        <div
                          key={prod.id}
                          className="bg-white rounded-xl p-2.5 border border-amber-900/15 shadow-sm flex items-center justify-between gap-3 hover:border-amber-700 transition-all group"
                        >
                          {prod.img && (
                            <img
                              src={prod.img}
                              alt={prod.name}
                              className="w-11 h-11 rounded-lg object-cover bg-amber-50 shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-xs text-[#3C3024] truncate group-hover:text-[#5B1F24]">
                              {prod.name}
                            </h5>
                            <span className="text-xs font-extrabold text-amber-700 block">
                              {prod.price}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleProductClick(prod)}
                              className="p-1.5 rounded-lg bg-amber-50 text-amber-900 hover:bg-amber-100 transition-all"
                              title="View Product"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                addToCart({
                                  id: String(prod.id),
                                  title: prod.name,
                                  price: prod.raw_price || 99900,
                                  image: prod.img || "",
                                  quantity: 1,
                                } as any);
                              }}
                              className="p-1.5 rounded-lg text-white transition-all shadow-sm active:scale-95"
                              style={{ background: `linear-gradient(135deg, ${MAROON}, #7A2A30)` }}
                              title="Add to Cart"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {m.products.length > 1 && (
                      <button
                        onClick={() => {
                          m.products?.forEach(prod => {
                            addToCart({
                              id: String(prod.id),
                              title: prod.name,
                              price: prod.raw_price || 99900,
                              image: prod.img || "",
                              quantity: 1,
                            } as any);
                          });
                        }}
                        className="w-full mt-3 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        Add All Recommended to Cart (Save 10%)
                      </button>
                    )}
                  </div>
                )}
                {m.consultationHandoff && (
                  <div className="mt-3 bg-gradient-to-br from-amber-50 to-white rounded-xl p-3 border border-amber-900/20 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                        <UserCheck className="w-3.5 h-3.5 text-amber-700" />
                      </div>
                      <h5 className="font-bold text-[11px] text-[#5B1F24]">Astrologer Consultation Recommended</h5>
                    </div>
                    <p className="text-[10px] text-amber-900/80 mb-3 font-medium">For deep insights into your Kundali and personalized life path guidance, we recommend speaking directly with our Vedic Astrologers.</p>
                    <button
                      onClick={() => navigate("/consult")}
                      className="w-full py-2 rounded-lg text-white text-[10px] font-bold shadow-sm transition-all flex items-center justify-center gap-2 bg-[#5B1F24] hover:bg-[#7A2A30]"
                    >
                      <Video className="w-3.5 h-3.5" /> Book Live Consultation
                    </button>
                  </div>
                )}
                {m.sender === "bot" && (
                  <button
                    onClick={() => navigator.clipboard.writeText(m.text)}
                    className="absolute -right-7 bottom-0 p-1 text-amber-900/40 hover:text-amber-900 transition-colors bg-white rounded-md shadow-sm border border-amber-900/10 opacity-0 group-hover:opacity-100"
                    title="Copy response"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 p-3 bg-white rounded-2xl text-xs text-amber-900/60 border border-amber-900/10 w-fit">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce delay-100" />
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce delay-200" />
                <span className="font-semibold text-[10px] ml-1">Consulting the cosmos for your sacred guidance...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          {messages.length <= 2 && !loading && (
            <div className="px-4 py-2 bg-[#FCFAF7] border-t border-amber-900/5 flex items-center gap-1.5 overflow-x-auto shrink-0 no-scrollbar">
              {[
                { label: "💼 Career & Business", prefix: "Recommend a remedy for " },
                { label: "💖 Love & Harmony", prefix: "Recommend a remedy for " },
                { label: "🛡️ Rahu/Ketu Protection", prefix: "What is a good protection from " },
                { label: "🪔 Puja & Yantras", prefix: "Tell me about " }
              ].map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => {
                    const text = chip.prefix + chip.label.replace(/^[^\s]+\s*/, "");
                    setInputVal(text);
                  }}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white text-amber-900 border border-amber-900/15 hover:border-amber-700 hover:bg-amber-50 transition-all shrink-0 shadow-xs"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {/* Input Box */}
          <div className="p-3.5 border-t border-amber-900/10 bg-white flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Ask about remedies, career stability..."
              className="flex-1 h-10 px-4 rounded-xl text-xs border border-amber-900/20 outline-none focus:border-[#5B1F24] bg-[#FAF6F0]/50 text-[#3C3024] font-medium"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputVal.trim() || loading}
              className="h-10 w-10 rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${MAROON}, #7A2A30)`,
              }}
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
