export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'https://mf-business-api.onrender.com';

export class AdminApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(message: string, status = 500, code = 'ADMIN_API_ERROR', details?: unknown) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  token?: string | null;
  body?: unknown;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, body, headers, ...init } = options;
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: { code?: string; message?: string; details?: unknown } })
    | null;

  if (!response.ok) {
    throw new AdminApiError(
      payload?.error?.message ?? `Erreur API ${response.status}.`,
      response.status,
      payload?.error?.code ?? 'ADMIN_API_ERROR',
      payload?.error?.details,
    );
  }

  return (payload ?? ({} as T)) as T;
}

export interface AdminUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  twoFactorEnabled?: boolean;
  lastLoginAt?: string | null;
}

export interface SessionResponse {
  accessToken: string;
  expiresIn: number;
  user: AdminUser;
}

export interface SetupRequired {
  requiresTwoFactorSetup: true;
  setupToken: string;
}

export type LoginResponse = SessionResponse | SetupRequired;

export interface SetupResponse {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

export interface EnableResponse extends SessionResponse {
  recoveryCodes: string[];
}

export async function loginRequest(
  email: string,
  password: string,
  secondFactor?: { totp?: string; recoveryCode?: string },
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/api/v1/admin/auth/login', {
    method: 'POST',
    body: { email, password, ...secondFactor },
  });
}

export function setupRequest(setupToken: string): Promise<SetupResponse> {
  return apiFetch<SetupResponse>('/api/v1/admin/auth/2fa/setup', {
    method: 'POST',
    body: { setupToken },
  });
}

export function enableRequest(setupToken: string, code: string): Promise<EnableResponse> {
  return apiFetch<EnableResponse>('/api/v1/admin/auth/2fa/enable', {
    method: 'POST',
    body: { setupToken, code },
  });
}

export function refreshRequest(): Promise<SessionResponse> {
  return apiFetch<SessionResponse>('/api/v1/admin/auth/refresh', { method: 'POST' });
}

export function meRequest(token: string): Promise<{ user: AdminUser }> {
  return apiFetch<{ user: AdminUser }>('/api/v1/admin/auth/me', { token });
}

export function logoutRequest(): Promise<void> {
  return apiFetch<void>('/api/v1/admin/auth/logout', { method: 'POST' });
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; perPage: number; total: number; totalPages: number };
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  total: number;
  currency: string;
  itemsCount: number;
  itemsPreview: string[];
  createdAt: string;
}

export interface OrderDetail extends OrderSummary {
  subtotal: number;
  deliveryFee: number;
  customer: { name: string; phone: string; email: string | null };
  shippingAddress: {
    recipient: string;
    phone: string;
    city: string;
    commune: string;
    address: string;
    note?: string | null;
  };
  notes: string | null;
  items: {
    id: string;
    productName: string;
    variantLabel: string | null;
    sku: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }[];
  payments: { id: string; status: string; method: string; provider: string; amount: number; paidAt: string | null }[];
  statusHistory: { id: string; status: string; note: string | null; createdAt: string }[];
  shipments: { id: string; status: string; carrier: string | null; trackingNumber: string | null; deliveredAt: string | null }[];
}

export interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  series: string | null;
  badge: string | null;
  badgeTone: string | null;
  brand: { id: string; name: string; slug: string };
  category: { id: string; name: string; slug: string };
  price: number;
  compareAtPrice: number | null;
  currency: string;
  status: string;
  rating: number;
  reviews: number;
  stock: number;
  inStock: boolean;
  featured: boolean;
  image: string | null;
  imageAlt: string | null;
  colors: string[];
  variants: { id: string; color: string | null; storage: string | null; stockQuantity: number }[];
}

export interface ProductDetailAdmin extends AdminProduct {
  description: string | null;
  features: string[];
  specs: { label: string; value: string }[];
  images: { id: string; url: string; alt: string | null }[];
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: string;
}

export interface BrandOption {
  id: string;
  name: string;
  slug: string;
}
export interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

export async function fetchOrders(
  token: string,
  query: Record<string, string | number | undefined>,
): Promise<Paginated<OrderSummary>> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  return apiFetch<Paginated<OrderSummary>>(`/api/v1/admin/orders?${params.toString()}`, { token });
}

export function fetchOrder(token: string, id: string): Promise<{ data: OrderDetail }> {
  return apiFetch<{ data: OrderDetail }>(`/api/v1/admin/orders/${id}`, { token });
}

export function updateOrderStatus(
  token: string,
  id: string,
  status: string,
  note?: string,
): Promise<{ data: OrderDetail }> {
  return apiFetch<{ data: OrderDetail }>(`/api/v1/admin/orders/${id}/status`, {
    token,
    method: 'PATCH',
    body: { status, note },
  });
}

export function markOrderPaid(token: string, id: string, paid: boolean): Promise<{ data: OrderDetail }> {
  return apiFetch<{ data: OrderDetail }>(`/api/v1/admin/orders/${id}/payment`, {
    token,
    method: 'PATCH',
    body: { paid },
  });
}

export async function fetchProducts(
  token: string,
  query: Record<string, string | number | undefined>,
): Promise<Paginated<AdminProduct>> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  return apiFetch<Paginated<AdminProduct>>(`/api/v1/admin/products?${params.toString()}`, { token });
}

export function fetchProduct(token: string, id: string): Promise<{ data: ProductDetailAdmin }> {
  return apiFetch<{ data: ProductDetailAdmin }>(`/api/v1/admin/products/${id}`, { token });
}

export function updateProduct(
  token: string,
  id: string,
  body: Record<string, unknown>,
): Promise<{ data: ProductDetailAdmin }> {
  return apiFetch<{ data: ProductDetailAdmin }>(`/api/v1/admin/products/${id}`, {
    token,
    method: 'PATCH',
    body,
  });
}

export function createProduct(
  token: string,
  body: Record<string, unknown>,
): Promise<{ data: AdminProduct }> {
  return apiFetch<{ data: AdminProduct }>('/api/v1/admin/products', {
    token,
    method: 'POST',
    body,
  });
}

export function adjustStock(
  token: string,
  variantId: string,
  quantityDelta: number,
  type = 'ADJUSTMENT',
  note?: string,
): Promise<{ data: { id: string; stockQuantity: number } }> {
  return apiFetch<{ data: { id: string; stockQuantity: number } }>(
    `/api/v1/admin/variants/${variantId}/stock`,
    { token, method: 'PATCH', body: { quantityDelta, type, note } },
  );
}

export function fetchBrands(token: string): Promise<{ data: BrandOption[] }> {
  return apiFetch<{ data: BrandOption[] }>('/api/v1/brands', { token });
}

export function fetchCategories(token: string): Promise<{ data: CategoryOption[] }> {
  return apiFetch<{ data: CategoryOption[] }>('/api/v1/categories', { token });
}

export function imageUrl(path: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${API_URL}${path}`;
}

export function formatPrice(value: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(value)} $`;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
] as const;

export const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  PREPARING: 'En préparation',
  SHIPPED: 'Expédiée',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
  REFUNDED: 'Remboursée',
  PAID: 'Payée',
};

export const PAYMENT_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  AUTHORIZED: 'Autorisé',
  PAID: 'Payé',
  FAILED: 'Échoué',
  REFUNDED: 'Remboursé',
  PARTIALLY_REFUNDED: 'Partiellement remboursé',
  CASH_ON_DELIVERY: 'À la livraison',
  MOBILE_MONEY: 'Mobile Money',
};

export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};
