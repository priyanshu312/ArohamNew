import { useState, useEffect, useRef } from "react";
import { User, MessageSquare } from "lucide-react";
import { SANS, SERIF } from "@nakshra/shared-config/theme";
import { useAuth } from "@nakshra/shared-auth";
import { useCart } from "@nakshra/shared-state";
import { supabase } from "@nakshra/shared-services";
import { useProducts } from "@nakshra/shared-hooks/useProducts";
import { generateUUID } from "@nakshra/shared-utils/uuid";
import { useTranslation } from "react-i18next";

import { ConsultHero } from "@visual/components/consult/ConsultHero";
import { AstrologerCard, Astrologer } from "@visual/components/consult/AstrologerCard";
import { PastHistoryModal } from "@visual/components/consult/PastHistoryModal";
import { ConsultChatModal } from "@visual/components/consult/ConsultChatModal";

const isAstrologerActive = (isOnline: boolean, workingHours: any) => {
  if (!isOnline) return false;
  if (workingHours && workingHours.enabled) {
    const { start, end } = workingHours;
    if (start && end) {
      const nowTime = new Date();
      const hrs = String(nowTime.getHours()).padStart(2, "0");
      const mins = String(nowTime.getMinutes()).padStart(2, "0");
      const currentTimeStr = `${hrs}:${mins}`;
      if (start <= end) {
        if (currentTimeStr < start || currentTimeStr > end) return false;
      } else {
        if (currentTimeStr < start && currentTimeStr > end) return false;
      }
    }
  }
  return true;
};

const getDatabaseAstrologers = (): Astrologer[] => {
  try {
    const customRegistered = JSON.parse(localStorage.getItem("Nakshra_registered_astrologers") || "[]");
    if (Array.isArray(customRegistered)) {
      return customRegistered.filter((a: any) => a.bio && a.bio !== "PENDING_WIZARD_COMPLETION" && a.bio.trim() !== "");
    }
  } catch (e) {}
  return [];
};

export function ConsultPage() {
  const { isLoggedIn, user, openAuth } = useAuth();
  const { addToCart } = useCart();
  const { products } = useProducts();
  const { t } = useTranslation();

  const [selectedTopic, setSelectedTopic] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [astrologers, setAstrologers] = useState<Astrologer[]>(getDatabaseAstrologers);
  const [selectedAstrologer, setSelectedAstrologer] = useState<Astrologer | null>(null);
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [localCartToast, setLocalCartToast] = useState<string | null>(null);
  const localToastTimer = useRef<any>(null);

  const [showUserHistoryModal, setShowUserHistoryModal] = useState(false);
  const [userHistorySessions, setUserHistorySessions] = useState<any[]>([]);
  const [selectedHistorySession, setSelectedHistorySession] = useState<any | null>(null);
  const [historySessionMessages, setHistorySessionMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!isLoggedIn || !user) {
      setUserHistorySessions([]);
      setSelectedHistorySession(null);
      setHistorySessionMessages([]);
    }
  }, [isLoggedIn, user]);

  const findProduct = (slug: string) => products.find(p => p.slug === slug);

  const handleAddToCart = (product: any) => {
    if (!product) return;
    addToCart(product, 1);
    if (localToastTimer.current) clearTimeout(localToastTimer.current);
    setLocalCartToast(product.name);
    localToastTimer.current = setTimeout(() => setLocalCartToast(null), 2200);
  };

  useEffect(() => {
    const syncAstrologers = () => {
      let list = getDatabaseAstrologers();
      const computedList = list.map(a => ({
        ...a,
        status: (isAstrologerActive(a.status === "online" || a.status === "busy", a.workingHours)
          ? (a.status === "busy" ? "busy" : "online")
          : "offline") as "online" | "offline" | "busy"
      }));
      setAstrologers(computedList);
    };

    syncAstrologers();
    window.addEventListener("storage", syncAstrologers);
    window.addEventListener("focus", syncAstrologers);

    const fetchRealtimeAstrologers = async () => {
      try {
        const { data } = await supabase.from("astrologers").select("*");
        if (data) {
          const completedData = data.filter(liveData => liveData.bio && liveData.bio !== "PENDING_WIZARD_COMPLETION" && liveData.bio.trim() !== "" && liveData.status !== "BLOCKED");
          const dbFormatted: Astrologer[] = completedData.map(liveData => ({
            id: liveData.id,
            name: liveData.full_name || liveData.name || "Acharya Astrologer",
            title: liveData.title || "Senior Vedic Jyotish Master",
            experience: `${liveData.experience_years || 5}+`,
            rating: Number(liveData.rating) || 4.95,
            consultations: liveData.consultations_count || 120,
            specialties: liveData.specialties || ["Vedic Kundali", "Gemstones"],
            languages: liveData.languages || ["Hindi", "English"],
            avatar: liveData.avatar_url || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
            status: (isAstrologerActive(liveData.is_online, liveData.working_hours) ? "online" : "offline") as "online" | "offline" | "busy",
            pricePerMin: Number(liveData.price_per_min) || 20,
            bio: liveData.bio,
            lastActiveAt: liveData.last_active_at,
            workingHours: liveData.working_hours
          }));
          setAstrologers(dbFormatted);
          // Sync back to local storage so focus/storage listeners don't overwrite with old/empty cache
          try {
            localStorage.setItem("Nakshra_registered_astrologers", JSON.stringify(dbFormatted));
          } catch (e) {}
        }
      } catch (err) {}
    };

    fetchRealtimeAstrologers();
    const interval = setInterval(fetchRealtimeAstrologers, 3000);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", syncAstrologers);
      window.removeEventListener("focus", syncAstrologers);
    };
  }, []);

  const openUserHistoryModal = async () => {
    if (!isLoggedIn || !user?.id) { openAuth(); return; }
    setShowUserHistoryModal(true);
    try {
      const { data } = await supabase.from("chat_sessions").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (data && data.length > 0) {
        setUserHistorySessions(data);
        viewPastSessionChat(data[0]);
      }
    } catch (e) {}
  };

  const viewPastSessionChat = async (sess: any) => {
    setSelectedHistorySession(sess);
    try {
      const { data } = await supabase.from("chat_messages").select("*").eq("session_id", sess.id).order("created_at", { ascending: true });
      if (data) {
        setHistorySessionMessages(data.map(m => ({
          id: m.id,
          sender: m.sender || m.sender_type,
          text: m.text || m.message_text,
          timestamp: new Date(m.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          created_at: m.created_at || new Date().toISOString(),
          recommendedProduct: m.recommended_product_slug ? findProduct(m.recommended_product_slug) : null
        })));
      }
    } catch (e) {}
  };

  const startConsultation = async (astro: Astrologer) => {
    if (!isLoggedIn || !user?.id) { openAuth(); return; }
    setSelectedAstrologer(astro);
    const sessionUuid = generateUUID();
    const createdSession = {
      id: sessionUuid,
      user_id: user.id,
      astrologer_id: astro.id,
      status: "pending",
      topic: "Vedic Kundali & Horoscope",
      created_at: new Date().toISOString()
    };
    setSession(createdSession);
    setMessages([]);

    // Insert into Supabase table
    try {
      await supabase.from("chat_sessions").insert(createdSession);
    } catch (e) {}

    // Save to localStorage for instant local/offline sync
    try {
      localStorage.setItem("Nakshra_latest_live_session", JSON.stringify(createdSession));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {}
  };

  const handleSendMessage = async (textToSend?: string) => {
    const msgText = textToSend || inputMessage;
    if (!msgText.trim() || !session || !selectedAstrologer) return;
    
    const userMsg = {
      id: "msg-" + Date.now(),
      session_id: session.id,
      sender: "user",
      text: msgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputMessage("");

    // Insert to Supabase table
    try {
      await supabase.from("chat_messages").insert({
        session_id: session.id,
        sender: "user",
        sender_type: "user",
        text: msgText,
        message_text: msgText
      });
    } catch (e) {}

    // Save to localStorage for instant offline/same-browser sync
    try {
      const existingKey = `Nakshra_live_chat_${session.id}`;
      const existing = JSON.parse(localStorage.getItem(existingKey) || "[]");
      localStorage.setItem(existingKey, JSON.stringify([...existing, userMsg]));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {}
  };

  // Sync session status and messages between user and astrologer
  useEffect(() => {
    if (!session?.id) return;

    const syncInterval = setInterval(async () => {
      // 1. Fetch latest session status
      try {
        const { data: sessData } = await supabase
          .from("chat_sessions")
          .select("status")
          .eq("id", session.id)
          .maybeSingle();
        if (sessData && sessData.status !== session.status) {
          setSession((prev: any) => prev ? { ...prev, status: sessData.status } : null);
        }
      } catch (e) {}

      // 2. Fetch latest messages from Supabase
      try {
        const { data: dbMsgs } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("session_id", session.id)
          .order("created_at", { ascending: true });
        if (dbMsgs) {
          const formatted = dbMsgs.map(m => ({
            id: m.id,
            sender: m.sender || m.sender_type,
            text: m.text || m.message_text,
            timestamp: new Date(m.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            recommendedProduct: m.recommended_product_slug ? findProduct(m.recommended_product_slug) : null
          }));
          setMessages(formatted);
        }
      } catch (e) {}
    }, 2000);

    const handleStorage = () => {
      try {
        const latestLocal = localStorage.getItem("Nakshra_latest_live_session");
        if (latestLocal) {
          const parsed = JSON.parse(latestLocal);
          if (parsed.id === session.id && parsed.status !== session.status) {
            setSession((prev: any) => prev ? { ...prev, status: parsed.status } : null);
          }
        }

        const localMsgs = JSON.parse(localStorage.getItem(`Nakshra_live_chat_${session.id}`) || "[]");
        if (Array.isArray(localMsgs) && localMsgs.length > 0) {
          setMessages(prev => {
            const merged = [...prev];
            localMsgs.forEach(lm => {
              if (!merged.some(m => m.id === lm.id)) {
                merged.push(lm);
              }
            });
            return merged;
          });
        }
      } catch (e) {}
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener("storage", handleStorage);
    };
  }, [session?.id, session?.status]);

  const endSession = async () => {
    if (!session?.id) return;
    setSession(prev => prev ? { ...prev, status: "completed" } : null);
    try {
      await supabase.from("chat_sessions").update({ status: "completed", ended_at: new Date().toISOString() }).eq("id", session.id);
    } catch (e) {}
  };

  const filteredAstrologers = astrologers.filter(a => {
    if (a.status === "offline") return false;
    const matchesTopic = selectedTopic === "All" ? true : selectedTopic === "Online Now" ? a.status === "online" : a.specialties.some(s => s.toLowerCase().includes(selectedTopic.toLowerCase()));
    const matchesSearch = !searchQuery.trim() ? true : a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTopic && matchesSearch;
  });

  const onlineCount = astrologers.filter(a => a.status === "online").length;

  return (
    <div className="bg-[#FCFAF7] min-h-screen pb-12" style={{ fontFamily: SANS, color: "#3E3125" }}>
      <ConsultHero
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedTopic={selectedTopic}
        setSelectedTopic={setSelectedTopic}
        onlineCount={onlineCount}
        astrologers={astrologers}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pt-6">
        <div className="flex justify-end mb-4">
          <button
            onClick={openUserHistoryModal}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold bg-white text-[#5B1F24] border border-amber-900/15 shadow-xs hover:bg-amber-50 transition-colors"
          >
            <MessageSquare size={14} />
            <span>{t("consult.past_history", "My Past Consultations")}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6.5">
          {filteredAstrologers.length === 0 ? (
            <div className="col-span-full p-12 rounded-3xl bg-white border border-amber-900/10 text-center space-y-3 max-w-md mx-auto">
              <User size={32} className="mx-auto text-amber-900/30" />
              <h3 className="text-base font-bold text-[#5B1F24]" style={{ fontFamily: SERIF }}>No Scholars Found</h3>
              <button
                onClick={() => { setSelectedTopic("All"); setSearchQuery(""); }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#5B1F24] text-white"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            filteredAstrologers.map(astro => (
              <AstrologerCard key={astro.id} astro={astro} onStartConsultation={startConsultation} />
            ))
          )}
        </div>
      </div>

      <PastHistoryModal
        isOpen={showUserHistoryModal}
        onClose={() => setShowUserHistoryModal(false)}
        userHistorySessions={userHistorySessions}
        selectedHistorySession={selectedHistorySession}
        historySessionMessages={historySessionMessages}
        onSelectSession={viewPastSessionChat}
        onAddToCart={handleAddToCart}
        astrologers={astrologers}
      />

      <ConsultChatModal
        session={session}
        selectedAstrologer={selectedAstrologer}
        messages={messages}
        inputMessage={inputMessage}
        isTyping={false}
        onInputChange={setInputMessage}
        onSendMessage={handleSendMessage}
        onEndSession={endSession}
        onClose={() => { setSession(null); setSelectedAstrologer(null); }}
        onAddToCart={handleAddToCart}
        localCartToast={localCartToast}
      />
    </div>
  );
}
