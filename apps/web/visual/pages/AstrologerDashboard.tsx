import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { supabase } from "@nakshra/shared-services";
import { MAROON, GOLD, IVORY, SANS, SERIF } from "@nakshra/shared-config/theme";
import { useAuth } from "@nakshra/shared-auth";
import { useProducts } from "@nakshra/shared-hooks/useProducts";
import { generateUUID } from "@nakshra/shared-utils/uuid";
import { AstrologerOnboardingWizard } from "../components/astrologer/AstrologerOnboardingWizard";
import { AstrologerOnboardingStatus } from "../components/astrologer/AstrologerOnboardingStatus";
import {
  Send,
  UserCheck,
  ShieldCheck,
  Sparkles,
  MessageCircle,
  Clock,
  Check,
  X,
  User,
  Camera,
  Star,
  DollarSign,
  TrendingUp,
  BookOpen,
  ShoppingBag,
  Award,
  AlertCircle,
  PhoneCall,
  Wallet,
  MessageSquare,
  FileText,
  Settings,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Lock,
  ThumbsUp,
  LogOut,
  BarChart2,
  Bell,
  Headphones,
  Users,
  Layers,
  Activity,
  ChevronLeft,
  RefreshCw
} from "lucide-react";

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80"
];

const QUICK_ASTRO_RESPONSES = [
  "Hari Om! Please share your Exact Time & Date of Birth.",
  "I am analyzing your Prashna Kundali planetary positions right now.",
  "Your Rahu Mahadasha is active. I recommend wearing a 5 Mukhi Rudraksha.",
  "According to your 7th House position, Jupiter brings strong marriage prospects."
];

type MainTab = "overview" | "workstation" | "wallet" | "reviews" | "remedies" | "profile";

export function AstrologerDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const mockStrForId = localStorage.getItem("Nakshra_mock_session");
  const currentUserObj = user || (mockStrForId ? JSON.parse(mockStrForId) : null);
  // Use a valid UUID syntax fallback instead of 'astro-1' to prevent Postgres syntax errors when executing queries.
  const currentAstroId = currentUserObj?.id || "00000000-0000-0000-0000-000000000001";

  // Collect all possible IDs this astrologer might be known by
  const getAllAstroIds = (): string[] => {
    const ids = new Set<string>();
    ids.add(currentAstroId);
    try {
      const mockStr = localStorage.getItem("Nakshra_mock_session");
      if (mockStr) {
        const mock = JSON.parse(mockStr);
        if (mock?.id) ids.add(mock.id);
        if (mock?.astrologerProfile?.id) ids.add(mock.astrologerProfile.id);
      }
    } catch (e) {}
    return Array.from(ids);
  };


  const [activeTab, setActiveTab] = useState<MainTab>("overview");
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState("");

  const [isChatOnline, setIsChatOnline] = useState(true);
  const [filterTab, setFilterTab] = useState<"all" | "active" | "completed">("all");

  const [workingHours, setWorkingHours] = useState(() => {
    try {
      const cached = localStorage.getItem(`Nakshra_astro_working_hours_${currentAstroId}`);
      return cached ? JSON.parse(cached) : { enabled: false, start: "09:00", end: "22:00" };
    } catch (e) {
      return { enabled: false, start: "09:00", end: "22:00" };
    }
  });

  const checkIsCurrentlyWorking = () => {
    if (workingHours && workingHours.enabled) {
      const { start, end } = workingHours;
      if (start && end) {
        const nowTime = new Date();
        const hrs = String(nowTime.getHours()).padStart(2, "0");
        const mins = String(nowTime.getMinutes()).padStart(2, "0");
        const currentTimeStr = `${hrs}:${mins}`;
        if (start <= end) {
          return currentTimeStr >= start && currentTimeStr <= end;
        } else {
          return currentTimeStr >= start || currentTimeStr <= end;
        }
      }
    }
    return false;
  };
  const isCurrentlyWorking = checkIsCurrentlyWorking();

  const [isChatOnlineRef, setIsChatOnlineRef] = useState(isChatOnline);
  useEffect(() => {
    setIsChatOnlineRef(isChatOnline);
  }, [isChatOnline]);

  const [dbTransactions, setDbTransactions] = useState<any[]>([]);
  const [seekerNames, setSeekerNames] = useState<Record<string, string>>({});
  const [dbReviews, setDbReviews] = useState<any[]>([]);
  const [dbRemedyProducts, setDbRemedyProducts] = useState<any[]>([]);
  const { products: hookRemedyProducts } = useProducts();
  const remedyProducts = dbRemedyProducts.length > 0 ? dbRemedyProducts : hookRemedyProducts;
  const [financialStats, setFinancialStats] = useState({
    todayEarnings: 0,
    monthlyEarnings: 0,
    lifetimeEarnings: 0,
    totalConsultations: 0,
    averageRating: 4.95
  });

  const [loginPhone, setLoginPhone] = useState("");
  const [loginOtp, setLoginOtp] = useState("");
  const [loginStep, setLoginStep] = useState<"phone" | "otp">("phone");
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState("");

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneDigits = loginPhone.replace(/\D/g, "");
    if (!loginPhone.trim() || phoneDigits.length < 10) {
      setPortalError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setPortalError("");
    setPortalLoading(true);

    try {
      const { data } = await supabase
        .from("astrologers")
        .select("status")
        .or(`phone.eq.${phoneDigits},phone.eq.+91${phoneDigits},phone.eq.91${phoneDigits}`)
        .limit(1);
      if (data && data.length > 0 && String(data[0].status).toUpperCase() === "BLOCKED") {
        setPortalLoading(false);
        setPortalError("Sorry, you are blocked. Can't login.");
        return;
      }
    } catch (err) {}

    setTimeout(() => {
      setPortalLoading(false);
      setLoginStep("otp");
    }, 500);
  };

  const handleVerifyPortalOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginOtp !== "123456" && loginOtp.length !== 6) {
      setPortalError("Invalid OTP. Use test OTP 123456.");
      return;
    }
    setPortalError("");
    setPortalLoading(true);

    const phoneDigits = loginPhone.replace(/\D/g, "");
    let matchedAstro: any = null;

    try {
      const { data } = await supabase
        .from("astrologers")
        .select("*")
        .or(`phone.eq.${phoneDigits},phone.eq.+91${phoneDigits},phone.eq.91${phoneDigits}`)
        .limit(1);
      if (data && data.length > 0 && data[0].id) {
        matchedAstro = data[0];
      }
    } catch (err) {}

    if (matchedAstro && String(matchedAstro.status).toUpperCase() === "BLOCKED") {
      setPortalLoading(false);
      setPortalError("Sorry, you are blocked. Can't login.");
      return;
    }

    const finalAstroId = matchedAstro?.id || generateUUID();
    const finalAstroName = matchedAstro?.full_name || matchedAstro?.name || "Acharya Devrat Sharma";
    const finalEmail = matchedAstro?.email || `astrologer_${phoneDigits.slice(-4)}@Nakshra.com`;

    const astroUser = {
      id: finalAstroId,
      email: finalEmail,
      user_metadata: {
        full_name: finalAstroName,
        phone: phoneDigits,
        role: "astrologer"
      },
      role: "astrologer"
    };

    if (!matchedAstro) {
      try {
        await supabase.from("astrologers").insert({
          id: finalAstroId,
          full_name: finalAstroName,
          email: finalEmail,
          phone: phoneDigits,
          title: "Senior Vedic Jyotish Master",
          experience_years: 8,
          specialties: ["Vedic Kundali", "Sacred Remedies"],
          languages: ["Hindi", "English"],
          rating: 4.95,
          is_online: true,
          avatar_url: PRESET_AVATARS[0],
          price_per_min: 20,
          role: "astrologer",
          bio: "PENDING_WIZARD_COMPLETION"
        });
      } catch (err) {}
    }

    try {
      localStorage.removeItem("Nakshra_astro_onboarding_app_current");
      localStorage.setItem("Nakshra_mock_session", JSON.stringify(astroUser));
      localStorage.setItem("Nakshra_accepted_session_ids", JSON.stringify([]));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {}

    setTimeout(() => {
      setPortalLoading(false);
      window.location.reload();
    }, 400);
  };

  const [profile, setProfile] = useState({
    name: user?.user_metadata?.full_name || "Acharya Astrologer",
    email: user?.email || "acharya.vedic@Nakshra.com",
    phone: user?.user_metadata?.phone || "9876543210",
    dob: "1988-06-15",
    title: "Senior Vedic Jyotish & Prashna Kundali Master",
    experience: "8",
    specialty: "Vedic Kundali",
    languages: "Hindi, English, Sanskrit, Gujarati",
    degree: "Jyotish Acharya (BHU, Varanasi)",
    bio: "PENDING_WIZARD_COMPLETION",
    avatar: PRESET_AVATARS[0],
    pricePerMin: "20"
  });

  const [showProfileWizard, setShowProfileWizard] = useState(false);

  const [onboardingApp, setOnboardingApp] = useState<any>(() => {
    try {
      const stored = localStorage.getItem(`Nakshra_astro_onboarding_app_${currentAstroId}`) ||
                     localStorage.getItem("Nakshra_astro_onboarding_app_current");
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });
  const [bypassedOnboarding, setBypassedOnboarding] = useState(() => {
    try {
      const stored = localStorage.getItem(`Nakshra_astro_wizard_done_${currentAstroId}`);
      return stored === "true";
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    const fetchOnboardingStatus = async () => {
      if (!currentAstroId) return;
      try {
        const apiBase = (import.meta.env.VITE_ADMIN_API_URL as string) || (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:5001";
        const res = await fetch(`${apiBase}/api/admin/onboarding/applications/${currentAstroId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.application) {
            setOnboardingApp(data.application);
            localStorage.setItem(`Nakshra_astro_onboarding_app_${currentAstroId}`, JSON.stringify(data.application));
          }
        }
      } catch (e) {}
    };

    fetchOnboardingStatus();
    const interval = setInterval(fetchOnboardingStatus, 3000);
    return () => clearInterval(interval);
  }, [currentAstroId]);

  useEffect(() => {
    const wizardDone = localStorage.getItem(`Nakshra_astro_wizard_done_${currentAstroId}`);
    if (wizardDone) {
      setShowProfileWizard(false);
      return;
    }
    if (!profile.bio || profile.bio === "PENDING_WIZARD_COMPLETION" || profile.bio.trim() === "") {
      setShowProfileWizard(true);
    }
  }, [profile.bio, currentAstroId]);

  const [acceptedSessionIds, setAcceptedSessionIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("Nakshra_accepted_session_ids");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch (e) {
      return new Set();
    }
  });


  const syncProfileToDBAndLocal = async (p: typeof profile) => {
    if (!currentAstroId) return;

    let languagesList: string[] = ["Hindi", "English"];
    if (Array.isArray(p.languages)) {
      languagesList = p.languages;
    } else if (typeof p.languages === "string") {
      languagesList = p.languages.split(",").map(l => l.trim()).filter(Boolean);
    }

    const formattedObj = {
      id: currentAstroId,
      name: p.name || "Acharya Astrologer",
      title: p.title || "Senior Vedic Astrologer",
      experience: `${p.experience || 5}+ Years Exp`,
      rating: 4.95,
      consultations: 0,
      specialties: p.specialty ? (Array.isArray(p.specialty) ? p.specialty : [p.specialty, "Vedic Kundali"]) : ["Vedic Kundali"],
      languages: languagesList,
      avatar: p.avatar || PRESET_AVATARS[0],
      status: isChatOnline && checkIsCurrentlyWorking() ? "online" : "offline",
      pricePerMin: parseFloat(p.pricePerMin) || 20,
      bio: p.bio || "",
      working_hours: workingHours
    };

    try {
      const existing = JSON.parse(localStorage.getItem("Nakshra_registered_astrologers") || "[]");
      const idx = existing.findIndex((a: any) => a.id === currentAstroId);
      let updated = [...existing];
      if (idx !== -1) {
        updated[idx] = { ...updated[idx], ...formattedObj };
      } else {
        updated.unshift(formattedObj);
      }
      localStorage.setItem("Nakshra_registered_astrologers", JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {}

    try {
      await supabase.from("astrologers").upsert({
        id: currentAstroId,
        full_name: p.name,
        email: p.email,
        phone: p.phone,
        title: p.title,
        experience_years: parseInt(p.experience) || 5,
        specialties: formattedObj.specialties,
        languages: languagesList,
        bio: p.bio,
        avatar_url: p.avatar,
        price_per_min: parseFloat(p.pricePerMin) || 20,
        is_online: isChatOnline,
        role: "astrologer",
        working_hours: workingHours
      });
    } catch (e) {}
  };

  useEffect(() => {
    let mockSession: any = null;
    try {
      const stored = localStorage.getItem("Nakshra_mock_session");
      if (stored) mockSession = JSON.parse(stored);
    } catch (e) {}

    const currentUser = user || mockSession;
    const isAstroRole =
      (currentUser as any)?.role === "astrologer" ||
      (currentUser?.user_metadata as any)?.role === "astrologer" ||
      mockSession?.role === "astrologer";

    if (!currentUser) {
      // No redirect - the inline Scholar Portal login UI handles this
      return;
    }

    const astroId = currentUser?.id;
    if (!astroId) return;

    let currentP = { ...profile };
    try {
      const cached = localStorage.getItem(`Nakshra_astro_profile_${astroId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        currentP = { ...currentP, ...parsed };
        setProfile(currentP);
        if (currentP.bio && currentP.bio !== "PENDING_WIZARD_COMPLETION" && currentP.bio.trim() !== "") {
          localStorage.setItem(`Nakshra_astro_wizard_done_${astroId}`, "true");
          setShowProfileWizard(false);
        }
      }
    } catch (e) {}

    const fetchAndSyncAstroProfile = async () => {
      try {
        const { data } = await supabase
          .from("astrologers")
          .select("*")
          .eq("id", astroId)
          .maybeSingle();

        if (data) {
          const dbProfile = {
            name: data.full_name || data.name || currentP.name,
            email: data.email || currentP.email,
            phone: data.phone || currentP.phone,
            dob: data.dob || "1988-06-15",
            title: data.title || currentP.title,
            experience: String(data.experience_years || currentP.experience),
            specialty: Array.isArray(data.specialties) ? data.specialties[0] : (data.specialties || currentP.specialty),
            languages: Array.isArray(data.languages) ? data.languages.join(", ") : (data.languages || currentP.languages),
            degree: data.degree || currentP.degree,
            bio: data.bio || "",
            avatar: data.avatar_url || currentP.avatar,
            pricePerMin: String(data.price_per_min || currentP.pricePerMin)
          };
          
          setProfile(dbProfile);
          localStorage.setItem(`Nakshra_astro_profile_${astroId}`, JSON.stringify(dbProfile));
          if (data.working_hours) {
            setWorkingHours({
              enabled: data.working_hours.enabled ?? false,
              start: data.working_hours.start || "09:00",
              end: data.working_hours.end || "22:00"
            });
            localStorage.setItem(`Nakshra_astro_working_hours_${astroId}`, JSON.stringify(data.working_hours));
          }
          if (dbProfile.bio && dbProfile.bio !== "PENDING_WIZARD_COMPLETION" && dbProfile.bio.trim() !== "") {
            localStorage.setItem(`Nakshra_astro_wizard_done_${astroId}`, "true");
            setShowProfileWizard(false);
          }
        } else {
          syncProfileToDBAndLocal(currentP);
        }
      } catch (e) {}
    };

    fetchAndSyncAstroProfile();
    broadcastStatus(isChatOnline && checkIsCurrentlyWorking());

    const syncAll = () => {
      fetchSessions();
      fetchDatabaseData();
    };

    window.addEventListener("storage", syncAll);
    window.addEventListener("focus", syncAll);

    fetchSessions();
    fetchDatabaseData();

    // 3-second polling so incoming chat requests show instantly across devices
    const pollInterval = setInterval(() => {
      fetchSessions();
      fetchDatabaseData();
    }, 3000);

    const sub = supabase
      .channel(`incoming-requests-${currentAstroId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_sessions", filter: `astrologer_id=eq.${currentAstroId}` }, () => {
        fetchSessions();
        fetchDatabaseData();
      })
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("storage", syncAll);
      window.removeEventListener("focus", syncAll);
      supabase.removeChannel(sub);
    };
  }, [user, currentAstroId]);

  const [isSeekerTyping, setIsSeekerTyping] = useState(false);
  const seekerTypingTimerRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSeekerTyping]);

  useEffect(() => {
    if (!activeSession?.id) return;

    fetchMessages(activeSession.id);

    const activeMsgInterval = setInterval(async () => {
      fetchMessages(activeSession.id);
      try {
        const { data } = await supabase
          .from("chat_sessions")
          .select("status")
          .eq("id", activeSession.id)
          .maybeSingle();
        if (data && (data.status === "completed" || data.status === "ended" || data.status === "declined")) {
          if (activeSession.status !== data.status) {
            fetchSessions();
            setActiveSession(prev => prev ? { ...prev, status: data.status } : null);
          }
        }
      } catch (e) {}
    }, 2000);

    const channel = supabase
      .channel(`astro-messages-${activeSession.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `session_id=eq.${activeSession.id}` }, payload => {
        if (payload.new) {
          const newMsg = {
            id: payload.new.id,
            session_id: payload.new.session_id,
            sender: payload.new.sender || payload.new.sender_type,
            text: payload.new.text || payload.new.message_text,
            created_at: payload.new.created_at || new Date().toISOString(),
            recommendedProduct: payload.new.recommended_product_slug ? remedyProducts.find(p => p.slug === payload.new.recommended_product_slug) : null
          };
          setMessages(prev => {
            const index = prev.findIndex(m => m.id === newMsg.id || (m.text?.trim() === newMsg.text?.trim() && m.sender === newMsg.sender));
            if (index !== -1) {
              const updated = [...prev];
              updated[index] = newMsg;
              return updated;
            }
            return [...prev, newMsg];
          });
        }
      })
      .subscribe();

    const astroTypingChannel = supabase
      .channel(`typing-${activeSession.id}`)
      .on("broadcast", { event: "typing" }, payload => {
        if (payload.payload?.sender === "user") {
          setIsSeekerTyping(true);
          if (seekerTypingTimerRef.current) clearTimeout(seekerTypingTimerRef.current);
          seekerTypingTimerRef.current = setTimeout(() => setIsSeekerTyping(false), 3000);
        }
      })
      .on("broadcast", { event: "end-chat" }, () => {
        fetchSessions();
        setActiveSession(prev => prev ? { ...prev, status: "completed" } : null);
      })
      .subscribe();

    const syncSeekerTypingStorage = () => {
      try {
        const lastTyping = localStorage.getItem(`Nakshra_typing_${activeSession.id}_user`);
        if (lastTyping && Date.now() - Number(lastTyping) < 3000) {
          setIsSeekerTyping(true);
          if (seekerTypingTimerRef.current) clearTimeout(seekerTypingTimerRef.current);
          seekerTypingTimerRef.current = setTimeout(() => setIsSeekerTyping(false), 3000);
        }
      } catch (e) {}
    };

    window.addEventListener("storage", syncSeekerTypingStorage);

    return () => {
      clearInterval(activeMsgInterval);
      if (seekerTypingTimerRef.current) clearTimeout(seekerTypingTimerRef.current);
      window.removeEventListener("storage", syncSeekerTypingStorage);
      supabase.removeChannel(channel);
      supabase.removeChannel(astroTypingChannel);
    };
  }, [activeSession?.id]);

  const handleReplyChange = (val: string) => {
    setReply(val);
    if (!activeSession?.id) return;

    try {
      localStorage.setItem(`Nakshra_typing_${activeSession.id}_astrologer`, String(Date.now()));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {}

    try {
      supabase.channel(`typing-${activeSession.id}`).send({
        type: "broadcast",
        event: "typing",
        payload: { sender: "astrologer", timestamp: Date.now() }
      });
    } catch (e) {}
  };

  const fetchDatabaseData = async () => {
    try {
      const allIds = getAllAstroIds();
      const { data: txns } = await supabase
        .from("astrologer_transactions")
        .select("*")
        .in("astrologer_id", allIds)
        .order("created_at", { ascending: false });

      let loadedTxns = txns || [];

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      let todaySum = 0;
      let monthSum = 0;
      let lifetimeSum = 0;

      loadedTxns.forEach(t => {
        const amount = Number(t.amount) || 0;
        const created = new Date(t.created_at || Date.now()).getTime();
        lifetimeSum += amount;
        if (created >= todayStart.getTime()) todaySum += amount;
        if (created >= monthStart.getTime()) monthSum += amount;
      });

      setDbTransactions(loadedTxns);
      setFinancialStats(prev => ({
        ...prev,
        todayEarnings: todaySum,
        monthlyEarnings: monthSum,
        lifetimeEarnings: lifetimeSum,
        totalConsultations: loadedTxns.length
      }));
    } catch (e) {}

    try {
      const { data: revs } = await supabase
        .from("astrologer_reviews")
        .select("*")
        .eq("astrologer_id", currentAstroId)
        .order("created_at", { ascending: false });

      if (revs && revs.length > 0) {
        setDbReviews(revs);
        const avg = revs.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / revs.length;
        setFinancialStats(prev => ({ ...prev, averageRating: Number(avg.toFixed(2)) }));
      }
    } catch (e) {}



    try {
      const { data: prods } = await supabase.from("products").select("*").limit(15);
      if (prods && prods.length > 0) {
        const filtered = prods
          .filter(p => p.slug !== "nepal-origin-1-mukhi-rudraksha-17mm-to-22mm-kaju-shape" && p.slug !== "nepal-origin-5-mukhi-rudraksha-bead-8mm-to-12mm-free-gift")
          .map(p => ({
            ...p,
            price: p.price / 100
          }));
        setDbRemedyProducts(filtered);
      }
    } catch (e) {}
  };

  const handleLogout = async () => {
    await broadcastStatus(false);
    try {
      localStorage.removeItem("Nakshra_astro_onboarding_app_current");
      localStorage.removeItem("Nakshra_mock_session");
      localStorage.removeItem(`Nakshra_astro_onboarding_app_${currentAstroId}`);
      localStorage.removeItem(`Nakshra_astro_profile_${currentAstroId}`);
      localStorage.removeItem(`Nakshra_astro_working_hours_${currentAstroId}`);
      localStorage.removeItem(`Nakshra_astro_wizard_done_${currentAstroId}`);
      await logout();
    } catch (e) {}
    navigate("/auth?role=astrologer");
  };

  const toggleChatOnline = async () => {
    const nextStatus = !isChatOnline;
    setIsChatOnline(nextStatus);
    broadcastStatus(nextStatus);
  };



  const broadcastStatus = async (statusBool: boolean) => {
    try {
      const existing = JSON.parse(localStorage.getItem("Nakshra_registered_astrologers") || "[]");
      if (Array.isArray(existing) && existing.length > 0) {
        const updated = existing.map((a: any) => {
          if (a.id === currentAstroId || !user?.id) {
            return { ...a, status: statusBool ? "online" : "offline" };
          }
          return a;
        });
        localStorage.setItem("Nakshra_registered_astrologers", JSON.stringify(updated));
      }

      localStorage.setItem("Nakshra_global_online_status", JSON.stringify({
        userId: currentAstroId,
        isOnline: statusBool,
        timestamp: Date.now()
      }));

      window.dispatchEvent(new Event("storage"));
    } catch (e) {}

    try {
      if (currentAstroId) {
        await supabase.from("astrologers").update({ is_online: statusBool }).eq("id", currentAstroId);
      }
    } catch (e) {}
  };

  const fetchSessions = async () => {
    let sessionList: any[] = [];
    const allIds = getAllAstroIds();
    try {
      const orFilter = allIds.map(id => `astrologer_id.eq.${id}`).join(",");
      const { data } = await supabase
        .from("chat_sessions")
        .select("*")
        .or(orFilter)
        .order("created_at", { ascending: false });
      if (data && data.length > 0) sessionList = data;
    } catch (e) {}

    try {
      const latestLocal = localStorage.getItem("Nakshra_latest_live_session");
      if (latestLocal) {
        const parsed = JSON.parse(latestLocal);
        if (allIds.includes(parsed.astrologer_id) || !parsed.astrologer_id) {
          if (!sessionList.some(s => s.id === parsed.id)) {
            sessionList.unshift(parsed);
          }
        }
      }
    } catch (e) {}

    sessionList.sort((a, b) => {
      const statusWeight = (status: string) => {
        if (status === "pending") return 3;
        if (status === "active") return 2;
        if (status === "completed") return 1;
        return 0;
      };

      const weightA = statusWeight(a.status);
      const weightB = statusWeight(b.status);

      if (weightA !== weightB) {
        return weightB - weightA;
      }

      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      return timeB - timeA;
    });

    setSessions(sessionList);
    fetchSeekerNames(sessionList);

    if (activeSession) {
      const match = sessionList.find(s => s.id === activeSession.id);
      if (match && (match.status === "completed" || match.status === "ended" || match.status === "declined")) {
        if (activeSession.status !== match.status) {
          setActiveSession(match);
        }
      }
    }
  };

  const fetchSeekerNames = async (sessionList: any[]) => {
    const userIds = Array.from(new Set(sessionList.map(s => s.user_id).filter(Boolean)));
    if (userIds.length === 0) return;
    try {
      const { data } = await supabase
        .from("users")
        .select("id, full_name")
        .in("id", userIds);
      if (data && data.length > 0) {
        const mapping: Record<string, string> = {};
        data.forEach(u => {
          mapping[u.id] = u.full_name;
        });
        setSeekerNames(prev => ({ ...prev, ...mapping }));
      }
    } catch (e) {}
  };

  const getTransactionUserName = (t: any) => {
    const session = sessions.find(s => s.id === t.session_id);
    if (session) {
      const resolvedName = session.user_name || session.user_email?.split("@")[0] || seekerNames[session.user_id];
      if (resolvedName) return resolvedName;
    }

    if (t.user_name && t.user_name.startsWith("Seeker #")) {
      const sliceId = t.user_name.replace("Seeker #", "").trim();
      const matchedUserId = Object.keys(seekerNames).find(key => key.slice(0, 6) === sliceId || key.slice(0, 8) === sliceId);
      if (matchedUserId) {
        return seekerNames[matchedUserId];
      }
    }

    return t.user_name || "Seeker";
  };
  const saveProfile = async () => {
    try {
      const updatedProfile = { ...profile };
      if (!updatedProfile.bio || updatedProfile.bio === "PENDING_WIZARD_COMPLETION" || updatedProfile.bio.trim() === "") {
        updatedProfile.bio = "Certified Vedic Astrologer guiding seekers with sacred remedies, Kundali readings, and traditional wisdom.";
      }
      setProfile(updatedProfile);
      localStorage.setItem(`Nakshra_astro_profile_${currentAstroId}`, JSON.stringify(updatedProfile));
      localStorage.setItem(`Nakshra_astro_working_hours_${currentAstroId}`, JSON.stringify(workingHours));
      localStorage.setItem(`Nakshra_astro_wizard_done_${currentAstroId}`, "true");
      await syncProfileToDBAndLocal(updatedProfile);
    } catch (e) {}

    setShowProfileWizard(false);
    setActiveTab("overview");
  };

  const acceptSession = async (s: any) => {
    const updatedSet = new Set(acceptedSessionIds);
    updatedSet.add(s.id);
    setAcceptedSessionIds(updatedSet);
    try {
      localStorage.setItem("Nakshra_accepted_session_ids", JSON.stringify(Array.from(updatedSet)));
      localStorage.setItem(`Nakshra_session_start_time_${s.id}`, Date.now().toString());
    } catch (e) {}

    const activeObj = { ...s, status: "active" };
    setActiveSession(activeObj);
    setActiveTab("workstation");

    setSessions(prev => prev.map(item => item.id === s.id ? { ...item, status: "active" } : item));

    try {
      const latestLocal = localStorage.getItem("Nakshra_latest_live_session");
      if (latestLocal) {
        const parsed = JSON.parse(latestLocal);
        if (parsed.id === s.id) {
          parsed.status = "active";
          localStorage.setItem("Nakshra_latest_live_session", JSON.stringify(parsed));
          window.dispatchEvent(new Event("storage"));
        }
      }
    } catch (e) {}

    try {
      await supabase.from("chat_sessions").update({ status: "active", astrologer_id: currentAstroId }).eq("id", s.id);
    } catch (e) {}

    try {
      await supabase.from("chat_messages").insert({
        session_id: s.id,
        sender: "astrologer",
        text: "Astrologer is here to help you."
      });
    } catch (e) {}

    fetchMessages(s.id);
  };

  const rejectSession = async (s: any) => {
    try {
      await supabase.from("chat_sessions").update({ status: "declined" }).eq("id", s.id);
      setSessions(prev => prev.filter(item => item.id !== s.id));
      if (activeSession?.id === s.id) setActiveSession(null);
    } catch {
      setSessions(prev => prev.filter(item => item.id !== s.id));
    }
  };

  const fetchMessages = async (sessionId: string) => {
    let loadedMsgs: any[] = [];
    try {
      const { data } = await supabase.from("chat_messages").select("*").eq("session_id", sessionId).order("created_at", { ascending: true });
      if (data && data.length > 0) {
        const filtered = data.filter(m => (m.text || m.message_text) !== "Namaste! Astrologer will join your chat soon.");
        loadedMsgs = filtered.map(m => ({
          ...m,
          sender: m.sender || m.sender_type,
          text: m.text || m.message_text,
          recommendedProduct: m.recommended_product_slug ? remedyProducts.find(p => p.slug === m.recommended_product_slug) : null
        }));
      }
    } catch (e) {}

    try {
      const localMsgs = JSON.parse(localStorage.getItem(`Nakshra_live_chat_${sessionId}`) || "[]");
      if (Array.isArray(localMsgs) && localMsgs.length > 0) {
        const filteredLocal = localMsgs.filter(lm => lm.text !== "Namaste! Astrologer will join your chat soon.");
        filteredLocal.forEach(lm => {
          const index = loadedMsgs.findIndex(m => m.id === lm.id || (m.text?.trim() === lm.text?.trim() && m.sender === lm.sender));
          if (index === -1) {
            loadedMsgs.push(lm);
          }
        });
      }
    } catch (e) {}

    setMessages(loadedMsgs);
  };

  const sendMessage = async (customText?: string, productRemedy?: any) => {
    const messageText = customText || reply;
    if (!messageText.trim() && !productRemedy) return;
    if (!activeSession) return;

    const newMsg = {
      id: Date.now().toString(),
      session_id: activeSession.id,
      sender: "astrologer",
      text: messageText,
      recommendedProduct: productRemedy || null,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, newMsg]);
    if (!customText) setReply("");

    try {
      await supabase.from("chat_messages").insert({
        session_id: activeSession.id,
        sender: "astrologer",
        sender_type: "astrologer",
        text: messageText,
        message_text: messageText,
        recommended_product_slug: productRemedy?.slug || null
      });
    } catch (e) {}

    try {
      const existingKey = `Nakshra_live_chat_${activeSession.id}`;
      const existing = JSON.parse(localStorage.getItem(existingKey) || "[]");
      const updated = [...existing, newMsg];
      localStorage.setItem(existingKey, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {}
  };

  const endSession = async () => {
    if (!activeSession) return;

    const endedAt = new Date().toISOString();
    const sessionStartStr = localStorage.getItem(`Nakshra_session_start_time_${activeSession.id}`);
    const startTime = sessionStartStr ? parseInt(sessionStartStr) : new Date(activeSession.created_at || Date.now()).getTime();
    const endTime = Date.now();
    const durationMins = Math.max(1, Math.round((endTime - startTime) / (1000 * 60)));
    const ratePerMin = parseFloat(profile.pricePerMin) || 20;
    const totalAmount = durationMins * ratePerMin;

    try {
      const endChannel = supabase.channel(`typing-${activeSession.id}`);
      endChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await endChannel.send({
            type: "broadcast",
            event: "end-chat",
            payload: { sessionId: activeSession.id }
          });
          supabase.removeChannel(endChannel);
        }
      });
    } catch (e) {}

    try {
      await supabase.from("chat_sessions").update({
        status: "completed",
        ended_at: endedAt
      }).eq("id", activeSession.id);
    } catch {}

    const resolvedName = activeSession.user_name || activeSession.user_email?.split("@")[0] || seekerNames[activeSession.user_id] || "Devotee";

    try {
      await supabase.from("astrologer_transactions").insert({
        astrologer_id: currentAstroId,
        session_id: activeSession.id,
        user_name: resolvedName,
        session_type: "Live Chat",
        duration_mins: durationMins,
        rate_per_min: ratePerMin,
        amount: totalAmount,
        status: "Settled"
      });
    } catch {}

    try {
      localStorage.removeItem(`Nakshra_session_start_time_${activeSession.id}`);
    } catch (e) {}

    setAcceptedSessionIds(prev => {
      const copy = new Set(prev);
      copy.delete(activeSession.id);
      try {
        localStorage.setItem("Nakshra_accepted_session_ids", JSON.stringify(Array.from(copy)));
      } catch (e) {}
      return copy;
    });

    setSessions(prev => prev.map(item => item.id === activeSession.id ? { ...item, status: "completed" } : item));
    setActiveSession(prev => prev ? { ...prev, status: "completed" } : null);
    fetchDatabaseData();
  };

  const filteredSessions = sessions.filter(s => {
    if (filterTab === "active") {
      return (s.status === "active" || acceptedSessionIds.has(s.id)) && s.status !== "completed" && s.status !== "ended" && s.status !== "declined";
    }
    if (filterTab === "completed") return s.status === "completed";
    return true;
  });

  const pendingCount = sessions.filter(s => s.status === "pending" && !acceptedSessionIds.has(s.id)).length;
  const pendingSession = sessions.find(s => s.status === "pending" && !acceptedSessionIds.has(s.id));

  const mockStr = localStorage.getItem("Nakshra_mock_session");
  const currentUser = user || (mockStr ? JSON.parse(mockStr) : null);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center p-4" style={{ fontFamily: SANS }}>
        <div className="bg-white border-2 border-amber-900/15 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#5B1F24] text-amber-300 flex items-center justify-center mx-auto shadow-md">
            <Award size={32} />
          </div>
          <div>
            <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-300">
              Verified Scholar Access
            </span>
            <h1 className="text-2xl font-extrabold text-[#5B1F24] mt-2" style={{ fontFamily: SERIF }}>Nakshra Scholar Portal</h1>
            <p className="text-xs text-amber-900/60 mt-1 font-medium">Sign in with your registered phone number to manage your consultation workstation.</p>
          </div>

          {portalError && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-bold border border-red-200">
              {portalError}
            </div>
          )}

          {loginStep === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-[#5B1F24] mb-1">Mobile Phone Number</label>
                <input
                  type="tel"
                  value={loginPhone}
                  onChange={e => setLoginPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full h-12 px-4 rounded-xl text-xs bg-amber-50/50 border border-amber-900/20 text-[#3C3024] outline-none focus:border-[#5B1F24] font-semibold"
                />
              </div>
              <button
                type="submit"
                disabled={portalLoading}
                className="w-full py-3.5 rounded-xl text-xs font-bold text-white shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${MAROON}, #7A2A30)` }}
              >
                <span>{portalLoading ? "Sending OTP..." : "Get Verification Code"}</span>
                <Send size={14} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyPortalOtp} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-[#5B1F24] mb-1">Enter 6-Digit OTP Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={loginOtp}
                  onChange={e => setLoginOtp(e.target.value)}
                  placeholder="Use test code 123456"
                  className="w-full h-12 px-4 rounded-xl text-center text-base tracking-widest font-mono bg-amber-50/50 border border-amber-900/20 text-[#3C3024] outline-none focus:border-[#5B1F24]"
                />
              </div>
              <button
                type="submit"
                disabled={portalLoading}
                className="w-full py-3.5 rounded-xl text-xs font-bold text-white shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${MAROON}, #7A2A30)` }}
              >
                <span>{portalLoading ? "Verifying..." : "Verify & Open Workstation"}</span>
                <CheckCircle2 size={14} />
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-amber-900/10 flex items-center justify-between text-xs font-semibold text-amber-900/60">
            <button onClick={() => navigate("/")} className="hover:underline hover:text-[#5B1F24]">← Return Home</button>
            <span>Need Help? Contact Support</span>
          </div>
        </div>
      </div>
    );
  }

  const isApprovedAndLive = (onboardingApp?.status === "APPROVED" && onboardingApp?.is_live === true) || bypassedOnboarding;

  if (!isApprovedAndLive) {
    if (!onboardingApp) {
      return (
        <AstrologerOnboardingWizard
          initialPhone={loginPhone || profile.phone}
          astroId={currentAstroId}
          onComplete={(appData) => {
            setOnboardingApp(appData);
          }}
        />
      );
    }

    return (
      <AstrologerOnboardingStatus
        application={onboardingApp}
        onEnterDashboard={() => {
          try {
            localStorage.setItem(`Nakshra_astro_wizard_done_${currentAstroId}`, "true");
          } catch (e) {}
          setBypassedOnboarding(true);
        }}
      />
    );
  }

  return (
    <div className="h-screen max-h-screen flex flex-col bg-[#FAF6F0] overflow-hidden" style={{ fontFamily: SANS, color: "#4A3E31" }}>
      <style>{`
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      
      <header className="px-4 md:px-6 py-2.5 md:py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 sticky top-0 z-40 transition-all duration-500" style={{ background: "rgba(250,247,242,0.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(91,31,36,0.1)", boxShadow: "0 2px 24px rgba(91,31,36,0.06)" }}>
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <img src={profile.avatar} alt={profile.name} className="w-11 h-11 rounded-2xl object-cover border-2 border-amber-300 shadow-md" />
            <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#FAF7F2] ${isChatOnline && isCurrentlyWorking ? "bg-emerald-400 animate-pulse" : "bg-gray-400"}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[#5B1F24] tracking-wide" style={{ fontFamily: SERIF }}>{profile.name}</h1>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-400/10 text-amber-800 border border-amber-400/20 flex items-center gap-1">
                <Award size={10} /> Certified Scholar
              </span>
            </div>
            <p className="text-xs text-amber-900/60 font-semibold">{profile.title} • ₹{profile.pricePerMin}/min</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          
          {pendingCount > 0 && (
            <button
              onClick={() => setActiveTab("workstation")}
              className="px-3 py-1.5 rounded-xl bg-amber-400 text-black font-extrabold text-xs flex items-center gap-1.5 animate-bounce shadow-md"
            >
              <Bell size={14} />
              <span>{pendingCount} Ringing</span>
            </button>
          )}

          <button
            onClick={toggleChatOnline}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold tracking-wide transition-all flex items-center gap-1.5 border shadow-sm active:scale-95 ${
              isChatOnline
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                : "bg-amber-900/5 text-amber-900/60 border-amber-900/10 hover:bg-amber-900/10"
            }`}
          >
            <MessageSquare size={13} />
            <span>CHAT: {isChatOnline ? "ONLINE" : "OFFLINE"}</span>
          </button>



          <button
            onClick={handleLogout}
            title="Log Out Astrologer Session"
            className="px-3.5 py-2 rounded-xl text-xs font-extrabold tracking-wide bg-red-50 hover:bg-red-100 text-red-700 border border-red-200/60 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        <aside className="w-full lg:w-64 bg-[#FCFAF7] border-b lg:border-b-0 lg:border-r border-amber-900/10 p-3 lg:p-4 flex flex-row lg:flex-col justify-start lg:justify-between overflow-x-auto lg:overflow-y-auto shrink-0 scrollbar-none">
          <div className="flex lg:flex-col gap-1.5 lg:space-y-1 w-full">
            {[
              { id: "overview", label: "Dashboard & Analytics", icon: BarChart2 },
              { id: "workstation", label: "Live Workstation & Queue", icon: MessageCircle, badge: pendingCount },
              { id: "wallet", label: "Earnings & Wallet", icon: Wallet },
              { id: "reviews", label: "Ratings & Reviews", icon: Star },
              { id: "remedies", label: "Remedies Catalog", icon: ShoppingBag },
              { id: "profile", label: "Profile & Rate Settings", icon: User }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as MainTab)}
                  className={`w-auto lg:w-full px-3.5 py-2.5 lg:py-3 rounded-xl lg:rounded-2xl text-[11px] lg:text-xs font-bold lg:font-extrabold flex items-center justify-between gap-2.5 transition-all whitespace-nowrap ${
                    isActive
                      ? "text-white shadow-md"
                      : "text-amber-900/80 hover:text-[#5B1F24] hover:bg-amber-900/10"
                  }`}
                  style={isActive ? { background: `linear-gradient(135deg, ${MAROON}, #8C1D24)` } : {}}
                >
                  <div className="flex items-center gap-2 lg:gap-3">
                    <Icon size={16} className={isActive ? "text-amber-300" : "text-amber-900/60"} />
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge ? (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-400 text-black">
                      {tab.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="hidden lg:block pt-4 border-t border-amber-900/15 mt-6 space-y-3">
            <div className="p-3.5 rounded-2xl bg-white border border-amber-900/10 text-xs shadow-xs">
              <p className="text-xs font-bold text-[#5B1F24] mb-1" style={{ fontFamily: SERIF }}>Nakshra Scholar Helpline</p>
              <p className="text-[10px] text-amber-900/70 leading-relaxed">Dedicated Astrologer support available 24x7.</p>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden bg-[#FAF6F0]">
              {/* TAB 0: DASHBOARD & ANALYTICS OVERVIEW */}
          {activeTab === "overview" && (
            <div className="p-6 sm:p-8 space-y-6 max-w-6xl mx-auto w-full overflow-y-auto">
              
               {/* Profile Completion Alert Banner */}
              {(!profile.bio || profile.bio === "PENDING_WIZARD_COMPLETION" || profile.bio.trim() === "") && (
                <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 rounded-2xl bg-amber-500 text-black shrink-0 font-extrabold shadow-sm">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#5B1F24]" style={{ fontFamily: SERIF }}>
                        Complete Your Scholar Profile & Practice Details
                      </h3>
                      <p className="text-xs text-amber-900/70 mt-0.5">
                        Upload your photo, set per-minute consultation rate (₹/min), languages & bio so users can book you on the Consult page.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
                    <button
                      onClick={() => setShowProfileWizard(true)}
                      className="flex-1 md:flex-none px-5 py-2.5 rounded-2xl text-xs font-bold text-white shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                      style={{ background: `linear-gradient(135deg, ${MAROON}, #7A2A30)` }}
                    >
                      <User size={14} />
                      <span>Complete Profile Now</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("profile")}
                      className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-white text-[#5B1F24] border border-amber-900/15 hover:bg-amber-50"
                    >
                      Quick Settings
                    </button>
                  </div>
                </div>
              )}

              <div>
                <h2 className="text-xl font-bold text-[#5B1F24]" style={{ fontFamily: SERIF }}>Professional Scholar Control Center</h2>
                <p className="text-xs text-amber-900/70">Overview of active consultations, seeker metrics, and total database payouts.</p>
              </div>

              <div className="max-w-md">
                <div className="p-5 rounded-3xl bg-white border border-amber-900/15 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-amber-900/60 text-xs font-bold">
                    <span>Total Consultations</span>
                    <MessageSquare size={16} className="text-[#5B1F24]" />
                  </div>
                  <h3 className="text-2xl font-black text-[#5B1F24]">{financialStats.totalConsultations} Sessions</h3>
                  <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <TrendingUp size={11} /> Realtime Database Log
                  </p>
                </div>
              </div>

              {/* Hiding Recent Completed Consultations & Quick Controls for now */}
              {false && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-amber-900/15 shadow-xs space-y-4">
                    <h3 className="text-sm font-bold text-[#5B1F24]" style={{ fontFamily: SERIF }}>Recent Completed Consultations</h3>
                    {sessions.filter(s => s.status === "completed").length === 0 ? (
                      <div className="p-8 text-center text-xs text-amber-900/60 bg-amber-50/50 rounded-2xl border border-amber-900/10">
                        No completed session records in database yet. Completed sessions will show here.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sessions.filter(s => s.status === "completed").slice(0, 4).map(s => (
                          <div key={s.id} className="p-3.5 rounded-2xl bg-[#FAF6F0] border border-amber-900/10 flex items-center justify-between text-xs">
                            <div>
                              <p className="font-bold text-[#5B1F24]">{s.user_name || s.user_email?.split("@")[0] || seekerNames[s.user_id] || `Devotee (#${s.user_id?.slice(0, 6)})`}</p>
                              <p className="text-[11px] text-amber-900/60">{s.topic || "Vedic Consultation"} • {new Date(s.created_at || Date.now()).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Completed
                              </span>
                              <button
                                onClick={() => {
                                  setActiveSession(s);
                                  setActiveTab("workstation");
                                  fetchMessages(s.id);
                                }}
                                className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-amber-900/10 hover:bg-amber-900/15 text-[#5B1F24] transition-all flex items-center gap-1"
                              >
                                <MessageSquare size={12} />
                                <span>View Chat Log</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-6 rounded-3xl bg-white border border-amber-900/15 shadow-xs space-y-4">
                    <h3 className="text-sm font-bold text-[#5B1F24]" style={{ fontFamily: SERIF }}>Quick Controls</h3>
                    <div className="space-y-3">
                      <button
                        onClick={() => setActiveTab("workstation")}
                        className="w-full p-3.5 rounded-2xl bg-amber-900/10 hover:bg-amber-900/15 text-[#5B1F24] font-bold text-xs flex items-center justify-between transition-all"
                      >
                        <span className="flex items-center gap-2"><MessageCircle size={15} /> Enter Live Workstation</span>
                        <ArrowUpRight size={15} />
                      </button>

                      <button
                        onClick={() => setActiveTab("wallet")}
                        className="w-full p-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-between transition-all border border-emerald-200"
                      >
                        <span className="flex items-center gap-2"><Wallet size={15} /> Request Instant Payout</span>
                        <ArrowUpRight size={15} />
                      </button>

                      <button
                        onClick={() => setActiveTab("profile")}
                        className="w-full p-3.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-[#5B1F24] font-bold text-xs flex items-center justify-between transition-all border border-amber-900/15"
                      >
                        <span className="flex items-center gap-2"><Settings size={15} /> Edit Per-Minute Fee</span>
                        <ArrowUpRight size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "workstation" && (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden h-full">
              <div className={`w-full md:w-1/3 border-r border-amber-900/15 p-4 sm:p-5 bg-[#F7F0E6] flex flex-col justify-between h-full ${activeSession ? "hidden md:flex" : "flex"}`}>
                <div>
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-900/15">
                    <h2 className="text-xs font-bold tracking-wider uppercase flex items-center gap-2" style={{ color: MAROON }}>
                      <Sparkles size={15} className="text-amber-600" />
                      <span>Live Consultation Queue</span>
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#5B1F24] text-amber-200">
                      {filteredSessions.length} Requests
                    </span>
                  </div>

                  <div className="flex gap-1 mb-4 bg-white/70 p-1 rounded-xl border border-amber-900/15 shadow-xs">
                    {(["all", "active", "completed"] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setFilterTab(tab)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                          filterTab === tab ? "bg-[#5B1F24] text-white shadow-xs" : "text-amber-900/70 hover:text-[#5B1F24]"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
                    {filteredSessions.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-white border border-amber-900/10 text-center text-xs text-amber-900/70 space-y-2 shadow-xs">
                        <Clock size={24} className="mx-auto text-amber-700/50" />
                        <p className="font-semibold text-[#5B1F24]">No pending requests right now.</p>
                      </div>
                    ) : (
                      filteredSessions.map(s => {
                        const isActive = activeSession?.id === s.id;
                        const isAccepted = s.status === "active" || acceptedSessionIds.has(s.id) || isActive;
                        const isPending = s.status === "pending" && !isAccepted;

                        return (
                          <div
                            key={s.id}
                            className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between gap-3 ${
                              isActive
                                ? "bg-[#FFFDF9] border-amber-600/50 shadow-md ring-1 ring-amber-600/30"
                                : "bg-white border-amber-900/10 hover:border-amber-900/25 shadow-xs"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-xs text-[#5B1F24]">{seekerNames[s.user_id] || s.user_name || s.user_email?.split("@")[0] || `Seeker #${s.user_id?.slice(0, 8)}`}</span>
                                  {isPending && (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-600 text-white animate-pulse">
                                      Ringing
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-amber-900/70 font-semibold">{s.topic || "Vedic Kundali Consultation"}</p>
                              </div>
                              <span className="text-[10px] text-amber-900/50">{new Date(s.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-amber-900/10 w-full">
                              {s.status === "completed" || s.status === "ended" ? (
                                <button
                                  onClick={() => {
                                    setActiveSession(s);
                                    fetchMessages(s.id);
                                  }}
                                  className={`w-full py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                                    isActive
                                      ? "bg-[#5B1F24] text-white border-[#5B1F24] shadow-md"
                                      : "bg-amber-900/10 text-[#5B1F24] border border-amber-900/20 hover:bg-amber-900/15"
                                  }`}
                                >
                                  <Check size={13} /> {isActive ? "Viewing Past Chat History" : "View Chat History"}
                                </button>
                              ) : s.status === "declined" ? (
                                <button
                                  disabled
                                  className="w-full py-2 rounded-xl text-xs font-bold bg-red-50 text-red-700/50 border border-red-200/50 flex items-center justify-center gap-1.5 cursor-not-allowed"
                                >
                                  <X size={13} /> Consultation Declined
                                </button>
                              ) : isAccepted ? (
                                <button
                                  onClick={() => acceptSession(s)}
                                  className="w-full py-2 rounded-xl text-xs font-bold bg-amber-900/10 text-[#5B1F24] border border-amber-900/20 hover:bg-amber-900/15 transition-all flex items-center justify-center gap-1.5"
                                >
                                  <MessageCircle size={13} /> {isActive ? "Currently Active Room" : "Open Consultation Room"}
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => acceptSession(s)}
                                    className="flex-1 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
                                    style={{ background: `linear-gradient(135deg, ${MAROON}, #7A2A30)` }}
                                  >
                                    <Check size={14} /> Accept & Chat
                                  </button>
                                  <button
                                    onClick={() => rejectSession(s)}
                                    className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-900/10 hover:bg-amber-900/20 text-amber-900 border border-amber-900/20 transition-all flex items-center justify-center active:scale-95"
                                  >
                                    <X size={14} /> Decline
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className={`w-full md:w-2/3 p-4 sm:p-6 flex flex-col justify-between bg-[#FFFDF9] h-full ${!activeSession ? "hidden md:flex" : "flex"}`}>
                {activeSession ? (
                  <>
                    <div className="flex justify-between items-center pb-4 border-b border-amber-900/15 mb-4 shrink-0">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Mobile Back Button */}
                        <button
                          onClick={() => setActiveSession(null)}
                          className="md:hidden p-2 rounded-xl bg-amber-900/10 text-amber-900 hover:bg-amber-900/20 transition-all active:scale-95 shrink-0"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-sm sm:text-base font-bold text-[#5B1F24] truncate" style={{ fontFamily: SERIF }}>
                              {seekerNames[activeSession.user_id] || activeSession.user_name || activeSession.user_email?.split("@")[0] || `Devotee (#${activeSession.user_id?.slice(0, 6)})`}
                            </h2>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" /> Live
                            </span>
                          </div>
                          <p className="text-[10px] sm:text-xs text-amber-900/60 mt-0.5 truncate">Topic: {activeSession.topic || "Vedic Guidance"}</p>
                        </div>
                      </div>

                      <button
                        onClick={endSession}
                        className="px-3.5 py-2 text-xs font-bold rounded-xl bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 active:scale-95 transition-all shrink-0"
                      >
                        End Session
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto mb-4 p-4 rounded-2xl bg-[#FAF6F0] border border-amber-900/15 space-y-3 min-h-[300px]">
                      {messages.map(m => (
                        <div
                          key={m.id}
                          className={`p-3.5 rounded-2xl max-w-[80%] text-xs leading-relaxed ${
                            m.sender === "astrologer"
                              ? "ml-auto text-white rounded-tr-xs shadow-md"
                              : "mr-auto bg-white text-[#4A3E31] border border-amber-900/15 rounded-tl-xs shadow-xs"
                          }`}
                          style={m.sender === "astrologer" ? { background: `linear-gradient(135deg, ${MAROON}, #7A2A30)` } : {}}
                        >
                          <p className="whitespace-pre-line">{m.text}</p>
                          {m.recommendedProduct && (
                            <div className="mt-3 p-3 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white flex items-center gap-3">
                              <img src={m.recommendedProduct.image || m.recommendedProduct.img} alt={m.recommendedProduct.name} className="w-10 h-10 rounded-lg object-cover border border-white/30" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[9px] font-extrabold uppercase text-amber-200">Recommended Sacred Remedy</p>
                                <h4 className="font-bold text-xs truncate text-white">{m.recommendedProduct.name}</h4>
                                <p className="text-xs font-bold text-amber-300">₹{m.recommendedProduct.price}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {isSeekerTyping && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-amber-900/80 p-3 bg-white rounded-2xl w-fit border border-amber-900/10 shadow-xs animate-pulse">
                          <RefreshCw size={13} className="animate-spin text-amber-600" />
                          <span>Devotee is typing...</span>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    <div className="mb-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {QUICK_ASTRO_RESPONSES.map((resp, idx) => (
                        <button
                          key={idx}
                          onClick={() => sendMessage(resp)}
                          className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-amber-900/5 hover:bg-amber-900/10 text-[#5B1F24] border border-amber-900/15 transition-all"
                        >
                          {resp}
                        </button>
                      ))}
                    </div>

                    {activeSession.status === "completed" || activeSession.status === "ended" || activeSession.status === "declined" ? (
                      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center text-xs font-bold text-amber-900 flex items-center justify-center gap-2 shadow-xs shrink-0">
                        <CheckCircle2 size={16} className="text-amber-700 animate-pulse" />
                        <span>This consultation has been completed. The chat log is read-only.</span>
                      </div>
                    ) : (
                      <>
                        <div className="mb-3 p-3 rounded-2xl bg-[#F7F0E6] border border-amber-900/15">
                          <p className="text-[10px] font-extrabold uppercase text-[#5B1F24] mb-2 flex items-center gap-1">
                            <ShoppingBag size={12} /> Recommend Sacred Remedy Item:
                          </p>
                          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                            {remedyProducts.map(prod => (
                              <button
                                key={prod.slug || prod.id}
                                onClick={() => sendMessage(`I recommend wearing this sacred item to balance your planetary stars:`, prod)}
                                className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-amber-50 border border-amber-900/15 text-[#4A3E31] flex items-center gap-2 transition-all active:scale-95 shadow-xs"
                              >
                                <img src={(prod as any).image || prod.img} alt={prod.name} className="w-5 h-5 rounded-md object-cover" />
                                <span>{prod.name} (₹{prod.price})</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={reply}
                            onChange={e => handleReplyChange(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && sendMessage()}
                            placeholder="Type your astrological remedy or guidance..."
                            className="flex-1 h-12 px-4 rounded-xl text-xs bg-white border border-amber-900/20 text-[#4A3E31] outline-none focus:border-[#5B1F24] transition-all shadow-xs"
                          />
                          <button
                            onClick={() => sendMessage()}
                            disabled={!reply.trim()}
                            className="h-12 px-6 rounded-xl font-bold text-xs text-white flex items-center gap-2 shadow-md active:scale-95 transition-all disabled:opacity-50"
                            style={{ background: `linear-gradient(135deg, ${MAROON}, #7A2A30)` }}
                          >
                            <span>Send</span>
                            <Send size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-amber-900/40 space-y-4 p-8 text-center">
                    <div className="p-5 rounded-full bg-amber-900/10 border border-amber-900/20 text-[#5B1F24]">
                      <MessageCircle size={48} />
                    </div>
                    <h3 className="text-lg font-bold text-[#5B1F24]" style={{ fontFamily: SERIF }}>Astrologer Workstation Ready</h3>
                    <p className="text-xs max-w-sm text-amber-900/60 leading-relaxed">
                      Select an incoming consultation request from the left queue to accept and begin live Vedic guidance.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}


          {activeTab === "wallet" && (
            <div className="p-6 sm:p-8 space-y-6 max-w-5xl mx-auto w-full overflow-y-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#5B1F24]" style={{ fontFamily: SERIF }}>Earnings & Wallet Dashboard</h2>
                  <p className="text-xs text-amber-900/70">Track your daily, monthly, and lifetime database consultation payouts.</p>
                </div>
                <button
                  onClick={() => alert(`Withdrawal request for ₹${financialStats.todayEarnings || 0} initiated via UPI / Netbanking. Settlement within 24 hours.`)}
                  className="px-5 py-3 rounded-2xl font-bold text-xs bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg active:scale-95 transition-all"
                >
                  Withdraw Payout (₹{(financialStats.todayEarnings || 0).toLocaleString("en-IN")})
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-3xl bg-white border border-emerald-200 shadow-xs">
                  <p className="text-xs text-emerald-800 font-bold uppercase tracking-wider mb-1">Today's Earnings</p>
                  <h3 className="text-2xl font-black text-emerald-600">₹{(financialStats.todayEarnings || 0).toLocaleString("en-IN")}</h3>
                  <p className="text-[11px] text-amber-900/60 mt-1">Live Database Settlement</p>
                </div>

                <div className="p-5 rounded-3xl bg-white border border-amber-900/15 shadow-xs">
                  <p className="text-xs text-[#5B1F24] font-bold uppercase tracking-wider mb-1">This Month</p>
                  <h3 className="text-2xl font-black text-[#5B1F24]">₹{(financialStats.monthlyEarnings || 0).toLocaleString("en-IN")}</h3>
                  <p className="text-[11px] text-amber-900/60 mt-1">{financialStats.totalConsultations} Consultations</p>
                </div>

                <div className="p-5 rounded-3xl bg-white border border-purple-200 shadow-xs">
                  <p className="text-xs text-purple-800 font-bold uppercase tracking-wider mb-1">Lifetime Payouts</p>
                  <h3 className="text-2xl font-black text-purple-700">₹{(financialStats.lifetimeEarnings || 0).toLocaleString("en-IN")}</h3>
                  <p className="text-[11px] text-amber-900/60 mt-1">Direct Bank Transfers</p>
                </div>
              </div>

              <div className="bg-white border border-amber-900/15 rounded-3xl p-6 shadow-xs">
                <h3 className="text-sm font-bold text-[#5B1F24] mb-4" style={{ fontFamily: SERIF }}>Recent Database Session Earnings</h3>
                {dbTransactions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-amber-900/60 bg-amber-50/50 rounded-2xl border border-amber-900/10">
                    No transactions recorded in database yet. Completed sessions will automatically populate here.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-amber-900/10 text-amber-900/60 text-[11px]">
                          <th className="pb-3 font-semibold">Transaction ID</th>
                          <th className="pb-3 font-semibold">Seeker Name</th>
                          <th className="pb-3 font-semibold">Session Type</th>
                          <th className="pb-3 font-semibold">Duration</th>
                          <th className="pb-3 font-semibold">Earnings</th>
                          <th className="pb-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-900/5">
                        {dbTransactions.map(t => (
                          <tr key={t.id} className="hover:bg-amber-50/50">
                            <td className="py-3.5 font-mono text-[#5B1F24] font-bold">{t.id?.slice(0, 8)}</td>
                            <td className="py-3.5 font-bold text-[#4A3E31]">{getTransactionUserName(t)}</td>
                            <td className="py-3.5 text-amber-900/70">{t.session_type || "Live Chat"}</td>
                            <td className="py-3.5 text-amber-900/70">{t.duration_mins || 1} mins</td>
                            <td className="py-3.5 font-bold text-emerald-600">₹{t.amount}</td>
                            <td className="py-3.5">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                {t.status || "Settled"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="p-6 sm:p-8 space-y-6 max-w-5xl mx-auto w-full overflow-y-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#5B1F24]" style={{ fontFamily: SERIF }}>Customer Reviews & Ratings</h2>
                  <p className="text-xs text-amber-900/70">Seeker feedback and ratings from live Vedic consultations.</p>
                </div>
                <div className="flex items-center gap-2 bg-[#5B1F24] px-4 py-2 rounded-2xl text-amber-200 font-bold text-sm shadow-md">
                  <Star size={18} fill="#C8A044" stroke="none" />
                  <span>{financialStats.averageRating} ★ Rating ({dbReviews.length} Reviews)</span>
                </div>
              </div>

              {dbReviews.length === 0 ? (
                <div className="p-12 text-center text-xs text-amber-900/60 bg-white rounded-3xl border border-amber-900/15 shadow-xs">
                  <Star size={32} className="mx-auto text-amber-400 mb-2" />
                  <p className="font-bold text-[#5B1F24]">No Database Reviews Yet</p>
                  <p className="text-[11px] text-amber-900/60 mt-1">Ratings submitted by users after consultations will show here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dbReviews.map(r => (
                    <div key={r.id} className="p-5 rounded-3xl bg-white border border-amber-900/15 space-y-2 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#5B1F24]">{r.user_name || "Seeker"}</span>
                          <span className="flex text-amber-500 text-xs">
                            {"★".repeat(r.rating || 5)}
                          </span>
                        </div>
                        <span className="text-xs text-amber-900/50">{new Date(r.created_at || Date.now()).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-amber-900/80 leading-relaxed font-medium">"{r.text}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "remedies" && (
            <div className="p-6 sm:p-8 space-y-6 max-w-5xl mx-auto w-full overflow-y-auto">
              <div>
                <h2 className="text-xl font-bold text-[#5B1F24]" style={{ fontFamily: SERIF }}>Sacred Remedies Catalog</h2>
                <p className="text-xs text-amber-900/70">These active remedies can be recommended during live chats.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {remedyProducts.map(prod => (
                  <div key={prod.slug || prod.id} className="p-4 rounded-3xl bg-white border border-amber-900/15 space-y-3 flex flex-col justify-between shadow-xs">
                    <div>
                      <img src={(prod as any).image || prod.img} alt={prod.name} className="w-full h-32 rounded-2xl object-cover border border-amber-900/10 mb-3" />
                      <h4 className="font-bold text-xs text-[#5B1F24]">{prod.name}</h4>
                      <p className="text-xs font-bold text-amber-700 mt-1">₹{prod.price}</p>
                    </div>
                    <button
                      onClick={() => alert(`Item "${prod.name}" ready to recommend during chat.`)}
                      className="w-full py-2 rounded-xl text-xs font-bold bg-amber-900/10 hover:bg-amber-900/15 text-[#5B1F24] border border-amber-900/15 transition-all"
                    >
                      Active Remedy Item
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "profile" && (
            <div className="p-6 sm:p-8 space-y-6 max-w-3xl mx-auto w-full overflow-y-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#5B1F24]" style={{ fontFamily: SERIF }}>Astrologer Profile Settings</h2>
                  <p className="text-xs text-amber-900/70">Update your qualifications, bio, and per-minute fee in Supabase.</p>
                </div>
                <button
                  onClick={saveProfile}
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white shadow-lg active:scale-95 transition-all"
                  style={{ background: `linear-gradient(135deg, ${MAROON}, #7A2A30)` }}
                >
                  Save Profile Changes
                </button>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-amber-900/15 space-y-4 shadow-xs">
                <div>
                  <label className="block text-xs font-bold text-[#5B1F24] mb-1">Full Name</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                    className="w-full h-11 px-3.5 rounded-xl text-xs bg-amber-50/50 border border-amber-900/15 text-[#4A3E31] outline-none focus:border-[#5B1F24]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#5B1F24] mb-1">Per-Minute Rate (₹/min)</label>
                    <input
                      type="number"
                      value={profile.pricePerMin}
                      onChange={e => setProfile(p => ({ ...p, pricePerMin: e.target.value }))}
                      className="w-full h-11 px-3.5 rounded-xl text-xs bg-amber-50/50 border border-amber-900/15 text-emerald-700 font-bold outline-none focus:border-[#5B1F24]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5B1F24] mb-1">Experience (Years)</label>
                    <input
                      type="number"
                      value={profile.experience}
                      onChange={e => setProfile(p => ({ ...p, experience: e.target.value }))}
                      className="w-full h-11 px-3.5 rounded-xl text-xs bg-amber-50/50 border border-amber-900/15 text-[#4A3E31] outline-none focus:border-[#5B1F24]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5B1F24] mb-1">Title Badge</label>
                  <input
                    type="text"
                    value={profile.title}
                    onChange={e => setProfile(p => ({ ...p, title: e.target.value }))}
                    className="w-full h-11 px-3.5 rounded-xl text-xs bg-amber-50/50 border border-amber-900/15 text-[#4A3E31] outline-none focus:border-[#5B1F24]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5B1F24] mb-1">Bio & Vedic Practice Summary</label>
                  <textarea
                    rows={4}
                    value={profile.bio === "PENDING_WIZARD_COMPLETION" ? "" : profile.bio}
                    onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                    className="w-full p-3.5 rounded-xl text-xs bg-amber-50/50 border border-amber-900/15 text-[#4A3E31] outline-none focus:border-[#5B1F24] leading-relaxed"
                  />
                </div>

                {/* Working Hours settings */}
                <div className="pt-4 border-t border-amber-900/15 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#5B1F24] flex items-center gap-2" style={{ fontFamily: SERIF }}>
                    <Clock size={14} className="text-amber-600" />
                    <span>Working Hours & Auto-Offline</span>
                  </h4>
                  <p className="text-[11px] text-amber-900/60 leading-relaxed">
                    Configure your active hours. When enabled, your status will automatically show as Offline to seekers outside these hours (e.g. during night/sleep).
                  </p>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="workingHoursEnabled"
                      checked={workingHours.enabled}
                      onChange={e => setWorkingHours(prev => ({ ...prev, enabled: e.target.checked }))}
                      className="rounded border-amber-900/20 text-[#5B1F24] focus:ring-[#5B1F24] h-4 w-4"
                    />
                    <label htmlFor="workingHoursEnabled" className="text-xs font-bold text-[#4A3E31]">
                      Enable Auto-Offline Outside Working Hours
                    </label>
                  </div>

                  {workingHours.enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-amber-900/70 mb-1">Shift Start Time (HH:MM)</label>
                        <input
                          type="time"
                          value={workingHours.start}
                          onChange={e => setWorkingHours(prev => ({ ...prev, start: e.target.value }))}
                          className="w-full h-11 px-3.5 rounded-xl text-xs bg-amber-50/50 border border-amber-900/15 text-[#4A3E31] outline-none focus:border-[#5B1F24]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-amber-900/70 mb-1">Shift End Time (HH:MM)</label>
                        <input
                          type="time"
                          value={workingHours.end}
                          onChange={e => setWorkingHours(prev => ({ ...prev, end: e.target.value }))}
                          className="w-full h-11 px-3.5 rounded-xl text-xs bg-amber-50/50 border border-amber-900/15 text-[#4A3E31] outline-none focus:border-[#5B1F24]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Profile Completion Modal Wizard Overlay */}
      {showProfileWizard && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FAF6F0] w-full max-w-2xl rounded-3xl border border-amber-900/20 shadow-2xl p-6 sm:p-8 space-y-6 relative max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-amber-900/15">
              <div>
                <h2 className="text-lg font-bold text-[#5B1F24]" style={{ fontFamily: SERIF }}>Complete Astrologer Profile</h2>
                <p className="text-xs text-amber-900/70">Fill out your professional credentials to appear live in the User Consult Directory.</p>
              </div>
              <button
                onClick={() => setShowProfileWizard(false)}
                className="p-2 rounded-xl bg-amber-900/10 hover:bg-amber-900/20 text-[#5B1F24]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Avatar Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#5B1F24]">Choose Profile Photo</label>
              <div className="flex items-center gap-3 flex-wrap">
                {PRESET_AVATARS.map((av, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setProfile(p => ({ ...p, avatar: av }))}
                    className={`relative rounded-2xl overflow-hidden border-2 transition-all ${
                      profile.avatar === av ? "border-amber-600 ring-2 ring-amber-600/40 scale-105" : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={av} alt="Avatar option" className="w-14 h-14 object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#5B1F24] mb-1">Full Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                  className="w-full h-11 px-3.5 rounded-xl text-xs bg-white border border-amber-900/15 text-[#4A3E31] outline-none focus:border-[#5B1F24]"
                  placeholder="e.g. Acharya Devrat Sharma"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#5B1F24] mb-1">Per-Minute Rate (₹/min)</label>
                  <input
                    type="number"
                    value={profile.pricePerMin}
                    onChange={e => setProfile(p => ({ ...p, pricePerMin: e.target.value }))}
                    className="w-full h-11 px-3.5 rounded-xl text-xs bg-white border border-amber-900/15 text-emerald-700 font-bold outline-none focus:border-[#5B1F24]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5B1F24] mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    value={profile.experience}
                    onChange={e => setProfile(p => ({ ...p, experience: e.target.value }))}
                    className="w-full h-11 px-3.5 rounded-xl text-xs bg-white border border-amber-900/15 text-[#4A3E31] outline-none focus:border-[#5B1F24]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5B1F24] mb-1">Professional Title</label>
                <input
                  type="text"
                  value={profile.title}
                  onChange={e => setProfile(p => ({ ...p, title: e.target.value }))}
                  className="w-full h-11 px-3.5 rounded-xl text-xs bg-white border border-amber-900/15 text-[#4A3E31] outline-none focus:border-[#5B1F24]"
                  placeholder="e.g. Senior Vedic Jyotish & Prashna Kundali Master"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#5B1F24] mb-1">Primary Specialty</label>
                  <input
                    type="text"
                    value={profile.specialty}
                    onChange={e => setProfile(p => ({ ...p, specialty: e.target.value }))}
                    className="w-full h-11 px-3.5 rounded-xl text-xs bg-white border border-amber-900/15 text-[#4A3E31] outline-none focus:border-[#5B1F24]"
                    placeholder="e.g. Vedic Kundali, Gemstone Remedies"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5B1F24] mb-1">Languages Spoken</label>
                  <input
                    type="text"
                    value={profile.languages}
                    onChange={e => setProfile(p => ({ ...p, languages: e.target.value }))}
                    className="w-full h-11 px-3.5 rounded-xl text-xs bg-white border border-amber-900/15 text-[#4A3E31] outline-none focus:border-[#5B1F24]"
                    placeholder="e.g. Hindi, English, Sanskrit"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5B1F24] mb-1">Bio & Practice Summary</label>
                <textarea
                  rows={3}
                  value={profile.bio === "PENDING_WIZARD_COMPLETION" ? "" : profile.bio}
                  onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                  className="w-full p-3.5 rounded-xl text-xs bg-white border border-amber-900/15 text-[#4A3E31] outline-none focus:border-[#5B1F24] leading-relaxed"
                  placeholder="Describe your experience, credentials, and astrological guidance style..."
                />
              </div>
            </div>

            <div className="pt-4 border-t border-amber-900/15 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowProfileWizard(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-900/10 text-amber-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveProfile}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg active:scale-95 transition-all flex items-center gap-2"
                style={{ background: `linear-gradient(135deg, ${MAROON}, #7A2A30)` }}
              >
                <Check size={14} />
                <span>Save & Publish Profile Live</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Floating Incoming Consultation Request Banner (Ringing Toast) */}
      {pendingSession && (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm bg-white rounded-3xl border-2 border-amber-500 shadow-2xl p-5 space-y-4 animate-bounce" style={{ fontFamily: SANS }}>
          {/* Glowing pulse ring */}
          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
          </span>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400/10 text-amber-700 flex items-center justify-center border border-amber-400/20 shrink-0">
              <Bell size={20} className="animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-extrabold text-xs text-amber-800 uppercase tracking-wider">Incoming Consultation</h3>
              <p className="text-sm font-bold text-[#5B1F24] truncate" style={{ fontFamily: SERIF }}>
                {seekerNames[pendingSession.user_id] || `Seeker #${pendingSession.user_id?.slice(-6) || "Devotee"}`}
              </p>
              <p className="text-[11px] text-amber-900/60 font-semibold truncate mt-0.5">
                Topic: {pendingSession.topic || "Vedic Guidance"}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => rejectSession(pendingSession)}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-amber-900/5 text-[#5B1F24] border border-amber-900/10 hover:bg-amber-900/10 transition-all active:scale-95"
            >
              Decline
            </button>
            <button
              onClick={() => acceptSession(pendingSession)}
              className="flex-1 py-2.5 rounded-xl text-xs font-extrabold text-white shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              style={{ background: `linear-gradient(135deg, ${MAROON}, #8C1D24)` }}
            >
              <Check size={14} /> Accept Request
            </button>
          </div>
        </div>
      )}


    </div>
  );
}
