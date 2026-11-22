export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  brand: string;
  price: number;
  image: string | null;
  variantId: string | null;
  variantLabel: string | null;
  quantity: number;
  stock: number;
}

export const CART_KEY = 'mf-cart-v1';
export const CART_EVENT = 'mf-cart-change';

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as CartItem;
  return (
    typeof item.productId === 'string' &&
    typeof item.slug === 'string' &&
    typeof item.name === 'string' &&
    typeof item.price === 'number' &&
    typeof item.quantity === 'number'
  );
}

export function readCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isCartItem) : [];
  } catch {
    return [];
  }
}

export function persistCart(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(CART_EVENT));
}

export function addCartItem(items: CartItem[], item: CartItem): CartItem[] {
  const existing = items.find(
    (line) => line.productId === item.productId && line.variantId === item.variantId,
  );

  if (existing) {
    return items.map((line) =>
      line.productId === item.productId && line.variantId === item.variantId
        ? {
            ...line,
            quantity: Math.min(line.stock || line.quantity + item.quantity, line.quantity + item.quantity),
          }
        : line,
    );
  }

  return [...items, { ...item, quantity: Math.min(item.quantity, Math.max(item.stock, 1)) }];
}

export function updateCartQuantity(
  items: CartItem[],
  productId: string,
  variantId: string | null,
  quantity: number,
): CartItem[] {
  if (quantity <= 0) {
    return items.filter(
      (line) => !(line.productId === productId && line.variantId === variantId),
    );
  }
  return items.map((line) =>
    line.productId === productId && line.variantId === variantId
      ? { ...line, quantity: Math.min(quantity, Math.max(line.stock, 1)) }
      : line,
  );
}

export function removeCartItem(
  items: CartItem[],
  productId: string,
  variantId: string | null,
): CartItem[] {
  return items.filter(
    (line) => !(line.productId === productId && line.variantId === variantId),
  );
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}

export function deliveryFee(subtotal: number, threshold = 150, fee = 5): number {
  return subtotal >= threshold ? 0 : fee;
}

export function cartTotal(items: CartItem[], threshold = 150, fee = 5): number {
  const subtotal = cartSubtotal(items);
  return subtotal + deliveryFee(subtotal, threshold, fee);
}
