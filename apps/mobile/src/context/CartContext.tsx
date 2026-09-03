import React from 'react';
import { CartProvider as BaseCartProvider, useCart as useBaseCart, AppliedCoupon } from '@nakshra/shared-state';
import { NakshraProduct } from '@nakshra/shared-types/product';
import { CartItem } from '@nakshra/shared-types/cart';
import { useAuth } from './AuthContext';

interface CustomCartContextType {
  items: CartItem[];
  cart: CartItem[];
  cartCount: number;
  subtotal: number;
  discount: number;
  total: number;
  cartTotal: number;
  appliedCoupon: AppliedCoupon | null;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  showCart: boolean;
  openCart: () => void;
  closeCart: () => void;
  // Returns false (and redirects to sign-in) instead of adding when the user is logged out,
  // so callers can skip whatever they'd normally do next (open the cart drawer, go to checkout).
  addToCart: (product: NakshraProduct, qty?: number, openSidebar?: boolean) => boolean;
  removeFromCart: (id: number) => void;
  updateQty: (id: number, deltaOrQty: number) => void;
  clearCart: () => void;
  toast: string | null;
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <BaseCartProvider>{children}</BaseCartProvider>;
};

export const useCart = (): CustomCartContextType => {
  const base = useBaseCart();
  const { isLoggedIn, openAuth } = useAuth();

  const addToCart = (product: NakshraProduct, qty?: number, openSidebar?: boolean) => {
    if (!isLoggedIn) {
      openAuth();
      return false;
    }
    base.addToCart(product, qty, openSidebar);
    return true;
  };

  const updateQty = (id: number, deltaOrQty: number) => {
    const existing = base.items.find(i => i.product.id === id);
    if (!existing) return;
    let delta = deltaOrQty;
    if (deltaOrQty > 0 && deltaOrQty !== 1 && deltaOrQty !== -1) {
      delta = deltaOrQty - existing.qty;
    }
    if (delta === 0) return;
    base.updateQty(id, delta);
  };

  return {
    ...base,
    cart: base.items,
    cartTotal: base.total,
    addToCart,
    updateQty,
  };
};
