import React from 'react';
import { WishlistProvider as BaseWishlistProvider, useWishlist as useBaseWishlist } from '@nakshra/shared-state';
import { NakshraProduct } from '@nakshra/shared-types/product';
import { useAuth } from './AuthContext';

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <BaseWishlistProvider>{children}</BaseWishlistProvider>;
};

// Wraps the shared wishlist so a logged-out tap redirects to sign-in instead of
// silently building a guest wishlist (mobile-only behavior — web still allows guests).
export const useWishlist = () => {
  const base = useBaseWishlist();
  const { isLoggedIn, openAuth } = useAuth();

  const addToWishlist = (product: NakshraProduct) => {
    if (!isLoggedIn) { openAuth(); return; }
    base.addToWishlist(product);
  };

  const toggleWishlist = (product: NakshraProduct) => {
    if (!isLoggedIn) { openAuth(); return; }
    base.toggleWishlist(product);
  };

  return { ...base, addToWishlist, toggleWishlist };
};
