import { createPortal } from "react-dom";
import { X, MessageSquare, ShoppingBag } from "lucide-react";
import { SERIF, SANS } from "@nakshra/shared-config/theme";
import { useTranslation } from "react-i18next";

interface PastHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userHistorySessions: any[];
  selectedHistorySession: any;
  historySessionMessages: any[];
  onSelectSession: (sess: any) => void;
  onAddToCart: (p: any) => void;
  astrologers: any[];
}

export function PastHistoryModal({
  isOpen,
  onClose,
  userHistorySessions,
  selectedHistorySession,
  historySessionMessages,
  onSelectSession,
  onAddToCart,
  astrologers,
}: PastHistoryModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const getAstroName = (astroId: string) => {
    const matched = astrologers.find(a => a.id === astroId);
    return matched ? matched.name : "Vedic Scholar";
  };

  const getRelativeTimestamp = (dateStr: string, timeStr: string) => {
    if (!dateStr) return timeStr;
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${timeStr}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${timeStr}`;
    } else {
      const formattedDate = date.toLocaleDateString([], {
        day: "numeric",
        month: "short",
      });
      return `${formattedDate}, ${timeStr}`;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-[#FAF7F2] w-full max-w-4xl h-[90vh] rounded-3xl border border-amber-900/20 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-amber-900/15 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-[#5B1F24]" />
            <h3 className="font-bold text-base text-[#5B1F24]" style={{ fontFamily: SERIF }}>
              {t("consult.past_history", "My Past Consultations")}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5 text-amber-900/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Sessions List */}
          <div className="w-full md:w-80 border-r border-amber-900/10 bg-white/50 overflow-y-auto p-3 space-y-2 shrink-0">
            {userHistorySessions.length === 0 ? (
              <p className="text-xs text-stone-500 text-center py-8">No past consultations found.</p>
            ) : (
              userHistorySessions.map((sess) => {
                const isSel = selectedHistorySession?.id === sess.id;
                return (
                  <div
                    key={sess.id}
                    onClick={() => onSelectSession(sess)}
                    className={`p-3 rounded-2xl cursor-pointer transition-all border ${
                      isSel
                        ? "bg-[#5B1F24] text-white border-[#5B1F24] shadow-md"
                        : "bg-white text-stone-800 border-amber-900/10 hover:border-amber-900/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold truncate">
                        {sess.topic || "Vedic Consultation"}
                      </span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          isSel ? "bg-amber-400/20 text-amber-200" : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {sess.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span
                        className={`text-[10px] block ${
                          isSel ? "text-amber-200/70" : "text-stone-400"
                        }`}
                      >
                        {new Date(sess.created_at).toLocaleDateString([], {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                        {", "}
                        {new Date(sess.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span
                        className={`text-[10px] font-semibold truncate max-w-[130px] ${
                          isSel ? "text-amber-300" : "text-[#5B1F24]"
                        }`}
                      >
                        with {getAstroName(sess.astrologer_id)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Session Detail Chat View */}
          <div className="flex-1 bg-[#FAF7F2] p-4 overflow-y-auto flex flex-col space-y-3">
            {!selectedHistorySession ? (
              <div className="flex-1 flex items-center justify-center text-xs text-stone-400">
                Select a session to view transcript
              </div>
            ) : (
              historySessionMessages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.sender === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl text-xs ${
                      m.sender === "user"
                        ? "bg-[#5B1F24] text-white rounded-br-none"
                        : "bg-white text-stone-800 border border-amber-900/10 rounded-bl-none shadow-xs"
                    }`}
                  >
                    <p className="leading-relaxed">{m.text}</p>
 
                    {m.recommendedProduct && (
                      <div className="mt-2 pt-2 border-t border-amber-900/10 flex items-center gap-2">
                        <img
                          src={m.recommendedProduct.img}
                          alt={m.recommendedProduct.name}
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold truncate">
                            {m.recommendedProduct.name}
                          </p>
                          <p className="text-[9px] text-amber-600 font-bold">
                            ₹{m.recommendedProduct.price}
                          </p>
                        </div>
                        <button
                          onClick={() => onAddToCart(m.recommendedProduct)}
                          className="px-2 py-1 rounded-md text-[9px] font-bold bg-amber-500 text-white flex items-center gap-1"
                        >
                          <ShoppingBag size={10} />
                          Buy
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-stone-400 mt-0.5 px-1">
                    {getRelativeTimestamp(m.created_at, m.timestamp)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
