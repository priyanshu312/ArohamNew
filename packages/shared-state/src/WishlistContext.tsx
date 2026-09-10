import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { NakshraProduct } from "@nakshra/shared-types/product";
import { supabase } from "@nakshra/shared-services";
import { useAuth } from "@nakshra/shared-auth";
import { safeLocalStorage } from "@nakshra/shared-utils/storage";

interface WishlistContextValue {
  wishlist: NakshraProduct[];
  addToWishlist: (product: NakshraProduct) => void;
  removeFromWishlist: (productId: number) => void;
  toggleWishlist: (product: NakshraProduct) => void;
  isInWishlist: (productId: number) => boolean;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn, user } = useAuth();
  const [wishlist, setWishlist] = useState<NakshraProduct[]>([]);
  
  // Track previous login state to detect logout
  const prevIsLoggedIn = useRef<boolean | null>(null);
  const isLoggingOut = useRef(false);
  // Don't write to Supabase until the remote wishlist for this user has loaded,
  // otherwise the persist effect races ahead and re-uploads a stale local cache
  // (which resurrects items the user removed on another device).
  const hydrated = useRef(false);

  // Load wishlist from local storage/db based on login status
  useEffect(() => {
    const justLoggedOut = prevIsLoggedIn.current === true && !isLoggedIn;
    if (justLoggedOut) isLoggingOut.current = true;
    prevIsLoggedIn.current = isLoggedIn;

    if (justLoggedOut) {
      setWishlist([]);
      safeLocalStorage.removeItem("Nakshra_wishlist");
      setTimeout(() => { isLoggingOut.current = false; }, 100);
    } else if (user?.id) {
      // 1. Load user-specific local storage cache first for instant load
      const userKey = `Nakshra_user_wishlist_${user.id}`;
      const userCached = safeLocalStorage.getItem(userKey);
      const hasSyncedBefore = !!userCached;
      let initialList: NakshraProduct[] = [];
      if (userCached) {
        try { initialList = JSON.parse(userCached); } catch (e) {}
      } else {
        // Fallback to guest list to carry it over on login
        const guestCached = safeLocalStorage.getItem("Nakshra_wishlist");
        if (guestCached) {
          try { initialList = JSON.parse(guestCached); } catch (e) {}
        }
      }
      hydrated.current = false;
      setWishlist(initialList);

      // 2. Fetch the wishlist from Supabase. If this device has synced before,
      //    the remote copy is authoritative (so removals on other devices stick).
      //    On a first login here, carry local/guest items over into the remote set.
      supabase.from("user_wishlists")
        .select("items")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          const remote: any[] | null = data && Array.isArray(data.items) ? data.items : null;
          if (remote) {
            if (hasSyncedBefore) {
              setWishlist(remote);
            } else {
              setWishlist(prev => {
                const merged = [...remote];
                prev.forEach((item) => { if (!merged.some(p => p.id === item.id)) merged.push(item); });
                return merged;
              });
            }
          }
          hydrated.current = true;
        }, () => { hydrated.current = true; });
    } else {
      // Load guest wishlist
      const guestCached = safeLocalStorage.getItem("Nakshra_wishlist");
      if (guestCached) {
        try { setWishlist(JSON.parse(guestCached)); } catch (e) {}
      }
    }
  }, [isLoggedIn, user?.id]);

  // Persist changes
  useEffect(() => {
    if (isLoggingOut.current) return;

    safeLocalStorage.setItem("Nakshra_wishlist", JSON.stringify(wishlist));
    if (user?.id) {
      safeLocalStorage.setItem(`Nakshra_user_wishlist_${user.id}`, JSON.stringify(wishlist));
      // Wait until the remote copy has loaded so we don't overwrite it with a
      // stale local cache on mount.
      if (!hydrated.current) return;
      Promise.resolve(
        supabase.from("user_wishlists").upsert({
          user_id: user.id,
          items: wishlist,
          updated_at: new Date().toISOString()
        })
      ).catch(() => {});
    }
  }, [wishlist, user?.id]);

  const addToWishlist = (product: NakshraProduct) => {
    setWishlist(prev => {
      if (prev.some(p => p.id === product.id)) return prev;
      return [...prev, product];
    });
  };

  const removeFromWishlist = (productId: number) => {
    setWishlist(prev => prev.filter(p => p.id !== productId));
  };

  const toggleWishlist = (product: NakshraProduct) => {
    const exists = wishlist.some(p => p.id === product.id);
    if (exists) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  const isInWishlist = (productId: number) => {
    return wishlist.some(p => p.id === productId);
  };

  return (
    <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist, toggleWishlist, isInWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
