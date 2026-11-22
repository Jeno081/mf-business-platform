'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  addCartItem,
  cartCount,
  cartSubtotal,
  CART_EVENT,
  CART_KEY,
  persistCart,
  readCart,
  removeCartItem,
  updateCartQuantity,
  type CartItem,
} from '@/lib/cart';

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (item: CartItem) => void;
  setQuantity: (productId: string, variantId: string | null, quantity: number) => void;
  removeItem: (productId: string, variantId: string | null) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(readCart());

    const sync = () => setItems(readCart());
    window.addEventListener(CART_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CART_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const commit = useCallback((next: CartItem[]) => {
    setItems(next);
    persistCart(next);
  }, []);

  const addItem = useCallback(
    (item: CartItem) => {
      const current = readCart();
      commit(addCartItem(current, item));
    },
    [commit],
  );

  const setQuantity = useCallback(
    (productId: string, variantId: string | null, quantity: number) => {
      commit(updateCartQuantity(readCart(), productId, variantId, quantity));
    },
    [commit],
  );

  const removeItem = useCallback(
    (productId: string, variantId: string | null) => {
      commit(removeCartItem(readCart(), productId, variantId));
    },
    [commit],
  );

  const clearCart = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(CART_KEY);
      window.dispatchEvent(new CustomEvent(CART_EVENT));
    }
    setItems([]);
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: cartCount(items),
      subtotal: cartSubtotal(items),
      addItem,
      setQuantity,
      removeItem,
      clearCart,
    }),
    [items, addItem, setQuantity, removeItem, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart doit être utilisé dans CartProvider');
  }
  return context;
}
