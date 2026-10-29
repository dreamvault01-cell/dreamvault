'use client';

import React, { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import type { FrameStyle, PaperQuality, ProductFormat } from '@/lib/product-configuration';

export interface CartItem {
  id: string;
  /** The exact database ProductVariant ID for new configuration-aware carts. */
  variantId?: string;
  configurationKey?: string;
  format?: ProductFormat;
  paper?: PaperQuality;
  frame?: FrameStyle;
  configurationLabel?: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  image: string;
  size: string;
  quantity: number;
  slug: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemKey: string) => void;
  updateQuantity: (itemKey: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  totalSavings: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const EMPTY_CART: CartItem[] = [];
const subscribeToHydration = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * A configuration is the cart identity, not just the artwork and size. This
 * makes an A3 poster and an A3 walnut-framed print separate line items.
 */
export function getCartItemKey(item: Pick<CartItem, 'id' | 'size' | 'variantId'>) {
  return item.variantId ? `variant:${item.variantId}` : `legacy:${item.id}:${item.size}`;
}

export function getCartItemDescription(item: Pick<CartItem, 'size' | 'configurationLabel'>) {
  return item.configurationLabel ? `${item.size} · ${item.configurationLabel}` : item.size;
}

function isStoredCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string'
    && typeof item.name === 'string'
    && typeof item.image === 'string'
    && typeof item.size === 'string'
    && typeof item.slug === 'string'
    && typeof item.price === 'number'
    && Number.isFinite(item.price)
    && typeof item.quantity === 'number'
    && Number.isInteger(item.quantity)
    && item.quantity > 0;
}

function readStoredCart() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('dreamvault-cart');
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isStoredCartItem) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const hydrated = useSyncExternalStore(subscribeToHydration, getClientSnapshot, getServerSnapshot);
  const [storedItems, setItems] = useState<CartItem[]>(readStoredCart);
  // Hydration must render the same empty cart as the server before exposing
  // the browser's saved selections. Never persist that temporary snapshot.
  const items = hydrated ? storedItems : EMPTY_CART;
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem('dreamvault-cart', JSON.stringify(storedItems));
    } catch {
      // Storage can be unavailable or full; the in-memory cart remains usable.
    }
  }, [hydrated, storedItems]);

  const addToCart = useCallback((item: CartItem) => {
    const itemKey = getCartItemKey(item);
    setItems((previous) => {
      const existing = previous.find((candidate) => getCartItemKey(candidate) === itemKey);
      if (existing) {
        return previous.map((candidate) => (
          getCartItemKey(candidate) === itemKey
            ? { ...item, quantity: candidate.quantity + item.quantity }
            : candidate
        ));
      }
      return [...previous, item];
    });
    setIsCartOpen(true);
  }, []);

  const removeFromCart = useCallback((itemKey: string) => {
    setItems((previous) => previous.filter((item) => getCartItemKey(item) !== itemKey));
  }, []);

  const updateQuantity = useCallback((itemKey: string, quantity: number) => {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setItems((previous) => previous.filter((item) => getCartItemKey(item) !== itemKey));
      return;
    }
    setItems((previous) => previous.map((item) => (
      getCartItemKey(item) === itemKey ? { ...item, quantity } : item
    )));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + Math.round(item.price * 100) * item.quantity, 0) / 100;
  const totalSavings = items.reduce(
    (sum, item) => sum + Math.max(0, Math.round((item.compareAtPrice || item.price) * 100) - Math.round(item.price * 100)) * item.quantity,
    0
  ) / 100;

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        totalSavings,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
