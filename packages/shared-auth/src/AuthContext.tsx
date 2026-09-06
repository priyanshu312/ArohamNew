import { createContext, useContext, useState, ReactNode, useEffect, useRef } from "react";
import { supabase, firebaseAuth } from "@nakshra/shared-services";
import { api } from "@nakshra/shared-api";
import { setCookie, getCookie, deleteCookie } from "@nakshra/shared-utils/cookies";
import { safeLocalStorage, safeSessionStorage } from "@nakshra/shared-utils/storage";

interface UnifiedUser {
  id: string;
  email?: string | null;
  role?: string;
  user_metadata?: {
    full_name?: string;
    phone?: string;
    role?: string;
  };
}

interface AuthContextValue {
  isLoggedIn: boolean;
  showAuth: boolean;
  user: UnifiedUser | null;
  session: any | null;
  cartSynced: boolean;
  login: (userData?: any) => void;
  logout: () => Promise<void>;
  openAuth: () => void;
  closeAuth: (loggedIn?: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UnifiedUser | null>(() => {
    try {
      const mockSession = safeLocalStorage.getItem("Nakshra_mock_session") || getCookie("Nakshra_session");
      return mockSession ? JSON.parse(mockSession) : null;
    } catch (e) {
      return null;
    }
  });
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return !!(safeLocalStorage.getItem("Nakshra_mock_session") || getCookie("Nakshra_session"));
  });
  const [showAuth, setShowAuth] = useState(false);
  const [session, setSession] = useState<any | null>(() => {
    try {
      const mockSession = safeLocalStorage.getItem("Nakshra_mock_session") || getCookie("Nakshra_session");
      return mockSession ? { user: JSON.parse(mockSession) } : null;
    } catch (e) {
      return null;
    }
  });
  const [cartSynced, setCartSynced] = useState(false);

  // Sync cart and orders helper
  const handleCartSync = async () => {
    setCartSynced(false);
    const localCart = safeLocalStorage.getItem("Nakshra_cart");
    if (localCart) {
      try {
        const parsed = JSON.parse(localCart);
        if (Array.isArray(parsed) && parsed.length > 0) {
          for (const item of parsed) {
            await api("/cart", {
              method: "POST",
              body: JSON.stringify({ productId: item.product.id, qty: item.qty }),
            }).catch(() => {});
          }
        }
        safeLocalStorage.removeItem("Nakshra_cart");
      } catch (e) {
        console.error("Failed to sync cart", e);
      }
    }
    setCartSynced(true);
  };

  const handleOrderSync = (userData: any) => {
    const userId = userData?.id;
    if (!userId) return;
    try {
      const guestOrdersStr = safeLocalStorage.getItem("Nakshra_guest_orders");
      if (guestOrdersStr) {
        const guestOrders = JSON.parse(guestOrdersStr);
        if (Array.isArray(guestOrders) && guestOrders.length > 0) {
          const userOrdersKey = `Nakshra_user_orders_${userId}`;
          const existingUserOrdersStr = safeLocalStorage.getItem(userOrdersKey);
          const existingUserOrders = existingUserOrdersStr ? JSON.parse(existingUserOrdersStr) : [];
          const merged = [...existingUserOrders];

          const userPhone = userData.user_metadata?.phone ? String(userData.user_metadata.phone).replace(/\D/g, "").slice(-10) : "";
          const userEmail = String(userData.email || "").trim().toLowerCase();

          guestOrders.forEach((go: any) => {
            const addr = go.shipping_address || go.address || {};
            const orderPhone = String(addr.phone || go.phone || "").replace(/\D/g, "").slice(-10);
            const orderEmail = String(addr.email || go.email || "").trim().toLowerCase();

            const matchesPhone = userPhone && orderPhone && orderPhone === userPhone;
            const matchesEmail = userEmail && orderEmail && orderEmail === userEmail;

            // Only migrate guest orders that belong to this phone or email
            if (matchesPhone || matchesEmail) {
              if (!merged.some((u: any) => String(u.id) === String(go.id))) {
                const updatedGo = { ...go, user_id: userId };
                merged.push(updatedGo);
                if (go.id) {
                  Promise.resolve(
                    supabase.from("orders").update({ user_id: userId }).eq("id", go.id)
                  ).catch(() => {});
                }
              }
            }
          });
          safeLocalStorage.setItem(userOrdersKey, JSON.stringify(merged));
        }
      }
    } catch (e) {
      console.error("Failed to migrate guest orders", e);
    }
  };

  const handleUserSupabaseSync = (userData: any) => {
    if (!userData?.id) return;
    const fullName = userData.user_metadata?.full_name || userData.fullName || userData.name || null;
    const phone = userData.user_metadata?.phone || userData.phone || null;
    const email = userData.email || null;

    if (fullName || phone || email) {
      Promise.resolve(
        supabase.from("users").upsert({
          id: userData.id,
          full_name: fullName,
          phone: phone,
          email: email
        })
      ).catch(err => console.warn("Supabase user sync error:", err));
    }
  };

  useEffect(() => {
    const checkBlockedAndInit = async () => {
      const rawSession = safeLocalStorage.getItem("Nakshra_mock_session") || getCookie("Nakshra_session");
      if (rawSession) {
        try {
          const parsed = JSON.parse(rawSession);
          const table = (parsed.role === "astrologer" || parsed.user_metadata?.role === "astrologer") ? "astrologers" : "users";
          
          let userExists = false;
          let isBlocked = false;

          try {
            const { data } = await supabase.from(table).select("id, status").eq("id", parsed.id).maybeSingle();
            if (data && data.id) {
              userExists = true;
              if (String(data.status).toUpperCase() === "BLOCKED") {
                isBlocked = true;
              }
            }
          } catch (e) {}

          // If user was deleted or blocked in DB, force logout immediately and clear local state
          if (!userExists || isBlocked) {
            await logout();
            return;
          }

          setUser(parsed);
          setIsLoggedIn(true);
          setSession({ user: parsed });
          safeLocalStorage.setItem("Nakshra_mock_session", JSON.stringify(parsed));
          setCookie("Nakshra_session", JSON.stringify(parsed), 365);

          handleCartSync();
          if (parsed?.id) {
            handleOrderSync(parsed);
            handleUserSupabaseSync(parsed);
          }
        } catch (e) {
          safeLocalStorage.removeItem("Nakshra_mock_session");
          deleteCookie("Nakshra_session");
        }
      }
    };

    checkBlockedAndInit();

    const syncSupabaseSession = async () => {
      try {
        const { data: { session: sbSession } } = await supabase.auth.getSession();
        if (sbSession?.user) {
          const u = {
            id: sbSession.user.id,
            email: sbSession.user.email,
            user_metadata: sbSession.user.user_metadata,
            role: sbSession.user.user_metadata?.role || "astrologer"
          };
          setUser(u as any);
          setIsLoggedIn(true);
          setSession(sbSession);
          safeLocalStorage.setItem("Nakshra_mock_session", JSON.stringify(u));
          setCookie("Nakshra_session", JSON.stringify(u), 365);
        }
      } catch (e) {}
    };

    syncSupabaseSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, sbSession) => {
      if (sbSession?.user) {
        const u = {
          id: sbSession.user.id,
          email: sbSession.user.email,
          user_metadata: sbSession.user.user_metadata,
          role: sbSession.user.user_metadata?.role || "astrologer"
        };
        setUser(u as any);
        setIsLoggedIn(true);
        setSession(sbSession);
        safeLocalStorage.setItem("Nakshra_mock_session", JSON.stringify(u));
        setCookie("Nakshra_session", JSON.stringify(u), 365);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Real-time background watcher: Check every 4 seconds if logged-in user still exists & is active in DB
  useEffect(() => {
    if (!isLoggedIn || !user?.id) return;

    const intervalId = setInterval(async () => {
      try {
        const table = (user.role === "astrologer" || user.user_metadata?.role === "astrologer") ? "astrologers" : "users";
        const { data } = await supabase.from(table).select("id, status").eq("id", user.id).maybeSingle();
        
        // If account was deleted or blocked in DB, force immediate logout
        if (!data || !data.id || String(data.status).toUpperCase() === "BLOCKED") {
          console.warn("[AuthWatcher] User was deleted or blocked in database. Force logging out.");
          await logout();
          safeSessionStorage.setItem("Nakshra_auth_notice", "Your account is no longer active.");
          if (typeof window !== "undefined" && window.location) {
            window.location.href = "/";
          }
        }
      } catch (e) {}
    }, 4000);

    return () => clearInterval(intervalId);
  }, [isLoggedIn, user?.id]);

  const login = (userData?: any) => {
    setIsLoggedIn(true);
    if (userData) {
      setUser(userData);
      setSession({ user: userData });
      safeLocalStorage.setItem("Nakshra_mock_session", JSON.stringify(userData));
      setCookie("Nakshra_session", JSON.stringify(userData), 365);

      handleCartSync();
      if (userData?.id) {
        handleOrderSync(userData);
        handleUserSupabaseSync(userData);
      }
    }
  };
  
  const logout = async () => {
    try { await firebaseAuth.signOut(); } catch (e) {}
    try { await supabase.auth.signOut(); } catch (e) {}
    safeLocalStorage.removeItem("Nakshra_mock_session");
    deleteCookie("Nakshra_session");
    
    // Clear all cart & order caches from localStorage
    safeLocalStorage.removeItem("Nakshra_cart");
    safeLocalStorage.removeItem("Nakshra_buy_now_intent");
    if (user?.id) {
      safeLocalStorage.removeItem(`Nakshra_user_cart_${user.id}`);
      safeLocalStorage.removeItem(`Nakshra_user_orders_${user.id}`);
      if (user.user_metadata?.phone) {
        const pDigits = String(user.user_metadata.phone).replace(/\D/g, "");
        safeLocalStorage.removeItem(`Nakshra_registered_user_phone_${pDigits}`);
        safeLocalStorage.removeItem(`Nakshra_registered_user_phone_${pDigits.slice(-10)}`);
      }
    }
    
    // Clear all user-specific data from sessionStorage to prevent cross-account leakage
    safeSessionStorage.removeItem("Nakshra_user_profile");
    safeSessionStorage.removeItem("Nakshra_shipping_addr");
    safeSessionStorage.removeItem("Nakshra_last_order_id");
    safeSessionStorage.removeItem("Nakshra_last_order_items");
    safeSessionStorage.removeItem("Nakshra_order_total");
    safeSessionStorage.removeItem("Nakshra_payment_mode");
    
    // Clear live chat/consultation fallback states
    safeLocalStorage.removeItem("Nakshra_latest_live_session");
    safeLocalStorage.removeItem("Nakshra_accepted_session_ids");
    
    setIsLoggedIn(false);
    setUser(null);
    setSession(null);
    setCartSynced(false);
  };
  const openAuth = () => setShowAuth(true);
  const closeAuth = (loggedIn?: boolean) => {
    setShowAuth(false);
    if (loggedIn) setIsLoggedIn(true);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, showAuth, user, session, cartSynced, login, logout, openAuth, closeAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
