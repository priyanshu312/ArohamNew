import { useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, Send, Sparkles, ShoppingBag, CheckCircle2 } from "lucide-react";
import { MAROON, SERIF, SANS } from "@nakshra/shared-config/theme";
import { useTranslation } from "react-i18next";

interface ConsultChatModalProps {
  session: any;
  selectedAstrologer: any;
  messages: any[];
  inputMessage: string;
  isTyping: boolean;
  onInputChange: (val: string) => void;
  onSendMessage: (text?: string) => void;
  onEndSession: () => void;
  onClose: () => void;
  onAddToCart: (product: any) => void;
  localCartToast: string | null;
}

export function ConsultChatModal({
  session,
  selectedAstrologer,
  messages,
  inputMessage,
  isTyping,
  onInputChange,
  onSendMessage,
  onEndSession,
  onClose,
  onAddToCart,
  localCartToast,
}: ConsultChatModalProps) {
  const { t } = useTranslation();
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);

  const starterQuestions = [
    t("consult.q1", "Which Rudraksha bead is best suited for my Rashi?"),
    t("consult.q2", "Which Gemstone should I wear for career growth & wealth?"),
    t("consult.q3", "How do I balance negative planetary influences (Graha Dosha)?"),
    t("consult.q4", "Which Vastu product will bring peace to my home?"),
  ];

  useEffect(() => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (session?.status === "completed" || session?.status === "ended") {
      const timer = setTimeout(() => {
        onCloseRef.current();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [session?.status]);

  if (!session || !selectedAstrologer) return null;

  return createPortal(
    <div className="fixed inset-0 w-full h-[100dvh] z-[9999] bg-[#1C0608]/85 backdrop-blur-md flex items-center justify-center p-0 sm:p-4" style={{ fontFamily: SANS }}>
      <div className="w-full max-w-5xl bg-[#FCFAF7] rounded-none sm:rounded-[32px] border-0 sm:border-2 sm:border-amber-900/15 shadow-2xl flex flex-col h-[100dvh] sm:h-[90vh] sm:max-h-[880px] overflow-hidden relative animate-in fade-in zoom-in-95 duration-300">
        
        {/* Top Header Bar */}
        <div className="p-4 sm:px-6 border-b border-amber-900/15 flex items-center justify-between shadow-lg shrink-0 z-10" style={{ background: `linear-gradient(135deg, ${MAROON} 0%, #4D1418 100%)` }}>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-all border border-white/10"
              title="Back"
            >
              <ChevronLeft size={20} />
            </button>
            
            <div className="relative">
              <img src={selectedAstrologer.avatar} alt={selectedAstrologer.name} className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-300 shadow-md" />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#4D1418] bg-emerald-400 animate-pulse shadow-sm" />
            </div>
            
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5 leading-tight" style={{ fontFamily: SERIF }}>
                <span className="truncate">{selectedAstrologer.name}</span>
                <span className="px-1.5 py-0.5 rounded-full text-[8px] font-extrabold bg-amber-400/25 text-amber-200 border border-amber-400/30 tracking-wider uppercase w-fit">
                  Vedic Certified
                </span>
              </h3>
              <p className="text-[10px] sm:text-[11px] text-amber-200/70 font-semibold flex items-center gap-1 mt-0.5 truncate max-w-[125px] sm:max-w-none">
                <Sparkles size={10} className="text-amber-400" />
                {selectedAstrologer.title}
              </p>
            </div>
          </div>

          <button
            onClick={onEndSession}
            className="px-4.5 py-2 rounded-2xl text-xs font-bold transition-all bg-red-950/40 text-red-200 border border-red-500/30 hover:bg-red-950/70 active:scale-95"
          >
            {t("consult.end_session", "End Chat")}
          </button>
        </div>

        {session.status === "pending" ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 bg-[#FCFAF7]">
            <div className="relative flex items-center justify-center">
              <div className="w-24 h-24 rounded-full border-4 border-amber-900/10 border-t-[#5B1F24] animate-spin absolute" />
              <img src={selectedAstrologer.avatar} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg" />
            </div>
            <div className="space-y-2 max-w-md">
              <h3 className="text-xl font-bold text-[#5B1F24]" style={{ fontFamily: SERIF }}>Connecting to {selectedAstrologer.name}...</h3>
              <p className="text-xs text-amber-950/70 leading-relaxed font-semibold">
                Please wait while the astrologer accepts your consultation request. This usually takes less than a minute.
              </p>
            </div>
            <div className="flex gap-1.5 justify-center items-center">
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-bounce delay-100" />
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-bounce delay-200" />
            </div>
          </div>
        ) : (
          <>
            {/* Live Messages Body */}
            <div ref={chatScrollContainerRef} className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
              {messages.map((m) => (
                <div key={m.id} className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[85%] sm:max-w-[70%] p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                    m.sender === "user"
                      ? "bg-[#5B1F24] text-white rounded-br-none"
                      : "bg-white text-[#3E3125] border border-amber-900/10 rounded-bl-none"
                  }`}>
                    <p>{m.text}</p>
    
                    {m.recommendedProduct && (
                      <div className="mt-3 pt-3 border-t border-amber-900/10 flex items-center gap-3 bg-amber-50/50 p-2.5 rounded-xl">
                        <img src={m.recommendedProduct.img} alt={m.recommendedProduct.name} className="w-12 h-12 rounded-lg object-cover border border-amber-900/10" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#5B1F24] truncate">{m.recommendedProduct.name}</p>
                          <p className="text-xs font-extrabold text-amber-700">₹{m.recommendedProduct.price}</p>
                        </div>
                        <button
                          onClick={() => onAddToCart(m.recommendedProduct)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#5B1F24] text-white flex items-center gap-1 shadow-sm active:scale-95"
                        >
                          <ShoppingBag size={12} />
                          Buy
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-amber-900/40 mt-1 px-1">{m.timestamp}</span>
                </div>
              ))}
    
              {isTyping && (
                <div className="flex items-center gap-2 p-3 bg-white rounded-2xl text-xs text-amber-900/60 border border-amber-900/10 w-fit">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce delay-100" />
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce delay-200" />
                  <span className="font-semibold text-[11px] ml-1">{selectedAstrologer.name} is typing...</span>
                </div>
              )}
            </div>
    
            {/* Starter Questions Pills */}
            {messages.length < 3 && (
              <div className="px-4 py-2 bg-amber-50/60 border-t border-amber-900/10 flex items-center gap-2 overflow-x-auto scrollbar-none">
                {starterQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => onSendMessage(q)}
                    className="px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-white text-amber-900 border border-amber-900/15 hover:bg-amber-100 whitespace-nowrap shadow-2xs"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
    
            {/* Input Bar */}
            {session.status === "completed" || session.status === "ended" ? (
              <div className="p-4 border-t border-amber-900/15 bg-amber-50 text-center text-xs font-bold text-amber-900 flex items-center justify-center gap-2 shrink-0 animate-pulse">
                <CheckCircle2 size={16} className="text-amber-700" />
                <span>Chat session ended. Redirecting to consult page in 3 seconds...</span>
              </div>
            ) : (
              <div className="p-3 sm:p-5 border-t border-amber-900/15 bg-white flex items-center gap-2.5 shrink-0">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => onInputChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onSendMessage()}
                  placeholder={t("consult.type_placeholder", "Type your message...")}
                  className="flex-1 h-12 px-4 rounded-2xl text-xs sm:text-sm border border-amber-900/20 outline-none focus:border-[#5B1F24] transition-all bg-[#FAF6F0]/50 text-[#3C3024] font-medium"
                />
                <button
                  onClick={() => onSendMessage()}
                  disabled={!inputMessage.trim()}
                  className="h-12 w-12 sm:w-auto sm:px-6 rounded-2xl font-bold text-xs sm:text-sm text-white flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50 bg-[#5B1F24] hover:brightness-110"
                >
                  <Send size={15} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {localCartToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[10001] pointer-events-none">
          <div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-[#5B1F24]/95 text-amber-100 shadow-xl font-bold text-xs sm:text-sm">
            <span className="text-emerald-400 text-lg">✓</span>
            <span>{localCartToast} added to cart!</span>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
