export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'https://mf-business-api.onrender.com';

export interface Brand {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  productCount: number;
}

export interface ProductVariant {
  id: string;
  color: string | null;
  storage: string | null;
  stockQuantity: number;
}

export interface Product {
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
  variants: ProductVariant[];
}

export interface HomeData {
  featured: Product[];
  categories: Category[];
  brands: Brand[];
  hero: Product;
  promoProducts: Product[];
  totalProducts: number;
}

interface ProductsResponse {
  data: Product[];
  meta: { total: number };
}

interface SingleResponse<T> {
  data: T;
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    next: { revalidate: 120 },
  } as RequestInit);

  if (!response.ok) {
    throw new Error(`API ${response.status} sur ${path}`);
  }

  return (await response.json()) as T;
}

export function imageUrl(path: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${API_URL}${path}`;
}

export function formatPrice(value: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(value)} $`;
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const response = await request<ProductsResponse>(
    '/api/v1/products?featured=true&perPage=8&sort=rating',
  );
  return response.data;
}

export async function getCategories(): Promise<Category[]> {
  const response = await request<{ data: Category[] }>('/api/v1/categories');
  return response.data;
}

export async function getBrands(): Promise<Brand[]> {
  const response = await request<{ data: Brand[] }>('/api/v1/brands');
  return response.data;
}

export async function getProduct(slug: string): Promise<Product> {
  const response = await request<SingleResponse<Product>>(`/api/v1/products/${slug}`);
  return response.data;
}

async function getPromoProducts(): Promise<Product[]> {
  const slugs = ['chargeur-anker-40w', 'powerbank-anker-10000', 'cable-usbc-100w'];
  const results = await Promise.allSettled(slugs.map((slug) => getProduct(slug)));

  return results
    .filter((result): result is PromiseFulfilledResult<Product> => result.status === 'fulfilled')
    .map((result) => result.value);
}

export async function getHomeData(): Promise<HomeData> {
  const [featured, categories, brands, promoProducts] = await Promise.all([
    getFeaturedProducts(),
    getCategories(),
    getBrands(),
    getPromoProducts(),
  ]);

  let hero = featured[0];
  try {
    hero = await getProduct('iphone-18-pro-max');
  } catch {
    // On garde le premier produit en vedette si la fiche hero est indisponible.
  }

  if (!hero) {
    throw new Error('Le catalogue est vide.');
  }

  const totalProducts = categories.reduce((total, category) => total + category.productCount, 0);

  return { featured, categories, brands, hero, promoProducts, totalProducts };
}
