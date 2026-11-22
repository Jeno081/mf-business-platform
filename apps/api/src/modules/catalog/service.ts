import { createHash } from 'node:crypto';
import { prisma, Prisma, type ProductStatus } from '@mf/database';
import { AppError } from '../../middlewares/error-handler';
import type {
  AdminProductListQuery,
  CreateProductInput,
  ProductListQuery,
  StockAdjustmentInput,
  UpdateProductInput,
} from './schemas';

const cardInclude = {
  brand: { select: { id: true, name: true, slug: true } },
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { position: 'asc' as const }, take: 1, select: { url: true, alt: true } },
  variants: {
    where: { isActive: true },
    select: { id: true, color: true, storage: true, stockQuantity: true },
  },
} satisfies Prisma.ProductInclude;

const detailInclude = {
  ...cardInclude,
  images: { orderBy: { position: 'asc' as const }, select: { id: true, url: true, alt: true, position: true } },
  specs: { orderBy: { position: 'asc' as const }, select: { label: true, value: true } },
  features: { orderBy: { position: 'asc' as const }, select: { text: true } },
  reviews: {
    where: { status: 'APPROVED' as const },
    orderBy: { createdAt: 'desc' as const },
    take: 5,
    select: {
      id: true,
      rating: true,
      title: true,
      body: true,
      createdAt: true,
      user: { select: { firstName: true, lastName: true } },
    },
  },
} satisfies Prisma.ProductInclude;

type CardProduct = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;
type DetailProduct = Prisma.ProductGetPayload<{ include: typeof detailInclude }>;

export interface ProductCardDto {
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

export interface ProductDetailDto extends ProductCardDto {
  description: string | null;
  features: string[];
  specs: { label: string; value: string }[];
  images: { id: string; url: string; alt: string | null }[];
  variants: { id: string; color: string | null; storage: string | null; stockQuantity: number }[];
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: string;
  reviewsList: {
    id: string;
    rating: number;
    title: string | null;
    body: string | null;
    author: string;
    createdAt: string;
  }[];
}

function stockOf(product: { variants: { stockQuantity: number }[] }): number {
  return product.variants.reduce((total, variant) => total + variant.stockQuantity, 0);
}

function mapCard(product: CardProduct): ProductCardDto {
  const stock = stockOf(product);
  const colors = [...new Set(product.variants.map((variant) => variant.color).filter(Boolean))] as string[];

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    subtitle: product.subtitle,
    series: product.series,
    badge: product.badge,
    badgeTone: product.badgeTone,
    brand: product.brand,
    category: product.category,
    price: Number(product.price),
    compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
    currency: product.currency,
    status: product.status,
    rating: Number(product.ratingAverage),
    reviews: product.ratingCount,
    stock,
    inStock: stock > 0,
    featured: product.isFeatured,
    image: product.images[0]?.url ?? null,
    imageAlt: product.images[0]?.alt ?? null,
    colors,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      color: variant.color,
      storage: variant.storage,
      stockQuantity: variant.stockQuantity,
    })),
  };
}

function mapDetail(product: DetailProduct): ProductDetailDto {
  const card = mapCard(product);
  return {
    ...card,
    description: product.description,
    features: product.features.map((feature) => feature.text),
    specs: product.specs.map((spec) => ({ label: spec.label, value: spec.value })),
    images: product.images.map((image) => ({ id: image.id, url: image.url, alt: image.alt })),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      color: variant.color,
      storage: variant.storage,
      stockQuantity: variant.stockQuantity,
    })),
    metaTitle: product.metaTitle,
    metaDescription: product.metaDescription,
    createdAt: product.createdAt.toISOString(),
    reviewsList: product.reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      title: review.title,
      body: review.body,
      author:
        [review.user.firstName, review.user.lastName].filter(Boolean).join(' ') || 'Client MF Business',
      createdAt: review.createdAt.toISOString(),
    })),
  };
}

function searchClauses(search: string): Prisma.ProductWhereInput[] {
  const terms = search
    .replace(/[-_]+/g, ' ')
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, 6);

  return terms.map((term) => ({
    OR: [
      { name: { contains: term } },
      { series: { contains: term } },
      { subtitle: { contains: term } },
      { brand: { name: { contains: term } } },
      { category: { name: { contains: term } } },
    ],
  }));
}

function buildWhere(
  query: ProductListQuery | AdminProductListQuery,
  options: { includeDrafts?: boolean } = {},
): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
  };

  if (!options.includeDrafts) {
    where.status = 'ACTIVE';
  } else if ('status' in query && query.status) {
    where.status = query.status as ProductStatus;
  }

  if (query.search) {
    where.AND = searchClauses(query.search);
  }
  if (query.category) {
    where.category = { slug: query.category };
  }
  if (query.brand) {
    where.brand = { slug: query.brand };
  }
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.price = {
      ...(query.minPrice !== undefined ? { gte: new Prisma.Decimal(query.minPrice) } : {}),
      ...(query.maxPrice !== undefined ? { lte: new Prisma.Decimal(query.maxPrice) } : {}),
    };
  }
  if (query.featured !== undefined) {
    where.isFeatured = query.featured;
  }
  if (query.inStock) {
    where.variants = { some: { isActive: true, stockQuantity: { gt: 0 } } };
  }

  return where;
}

function orderByFor(sort: ProductListQuery['sort']): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case 'price-asc':
      return { price: 'asc' };
    case 'price-desc':
      return { price: 'desc' };
    case 'rating':
      return { ratingAverage: 'desc' };
    case 'name':
      return { name: 'asc' };
    case 'newest':
    default:
      return { createdAt: 'desc' };
  }
}

export async function listProducts(query: ProductListQuery) {
  const where = buildWhere(query);
  const skip = (query.page - 1) * query.perPage;

  const [total, rows] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: cardInclude,
      orderBy: orderByFor(query.sort),
      skip,
      take: query.perPage,
    }),
  ]);

  return {
    data: rows.map(mapCard),
    meta: {
      page: query.page,
      perPage: query.perPage,
      total,
      totalPages: Math.ceil(total / query.perPage),
    },
  };
}

export async function getProductBySlug(slug: string): Promise<ProductDetailDto> {
  const product = await prisma.product.findFirst({
    where: { slug, status: 'ACTIVE', deletedAt: null },
    include: detailInclude,
  });

  if (!product) {
    throw new AppError('Produit introuvable.', 404, 'PRODUCT_NOT_FOUND');
  }

  return mapDetail(product);
}

export async function getRelatedProducts(slug: string, limit = 4): Promise<ProductCardDto[]> {
  const product = await prisma.product.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, categoryId: true },
  });

  if (!product) {
    throw new AppError('Produit introuvable.', 404, 'PRODUCT_NOT_FOUND');
  }

  const rows = await prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      id: { not: product.id },
      status: 'ACTIVE',
      deletedAt: null,
    },
    include: cardInclude,
    orderBy: { isFeatured: 'desc' },
    take: Math.min(Math.max(limit, 1), 8),
  });

  return rows.map(mapCard);
}

export async function listBrands() {
  const rows = await prisma.brand.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          products: { where: { status: 'ACTIVE', deletedAt: null } },
        },
      },
    },
  });

  return rows.map((brand) => ({
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    logoUrl: brand.logoUrl,
    productCount: brand._count.products,
  }));
}

export async function listCategories() {
  const rows = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    include: {
      _count: {
        select: {
          products: { where: { status: 'ACTIVE', deletedAt: null } },
        },
      },
    },
  });

  return rows.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    imageUrl: category.imageUrl,
    position: category.position,
    productCount: category._count.products,
  }));
}

export async function adminListProducts(query: AdminProductListQuery) {
  const where = buildWhere(query, { includeDrafts: true });
  const skip = (query.page - 1) * query.perPage;

  const [total, rows] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: cardInclude,
      orderBy: orderByFor(query.sort),
      skip,
      take: query.perPage,
    }),
  ]);

  return {
    data: rows.map(mapCard),
    meta: {
      page: query.page,
      perPage: query.perPage,
      total,
      totalPages: Math.ceil(total / query.perPage),
    },
  };
}

export async function adminGetProduct(id: string): Promise<ProductDetailDto> {
  const product = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    include: detailInclude,
  });

  if (!product) {
    throw new AppError('Produit introuvable.', 404, 'PRODUCT_NOT_FOUND');
  }

  return mapDetail(product);
}

function skuFromSlug(slug: string): string {
  const base = slug
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56);
  const hash = createHash('sha1').update(slug).digest('hex').slice(0, 6).toUpperCase();
  return `${base}-${hash}`.slice(0, 80);
}

export async function createProduct(input: CreateProductInput, actorId: string) {
  const [brand, category, existing] = await Promise.all([
    prisma.brand.findUnique({ where: { id: input.brandId } }),
    prisma.category.findUnique({ where: { id: input.categoryId } }),
    prisma.product.findUnique({ where: { slug: input.slug } }),
  ]);

  if (!brand) throw new AppError('Marque introuvable.', 404, 'BRAND_NOT_FOUND');
  if (!category) throw new AppError('Catégorie introuvable.', 404, 'CATEGORY_NOT_FOUND');
  if (existing) throw new AppError('Ce slug est déjà utilisé.', 409, 'SLUG_ALREADY_USED');

  const product = await prisma.product.create({
    data: {
      name: input.name,
      slug: input.slug,
      sku: skuFromSlug(input.slug),
      subtitle: input.subtitle ?? null,
      series: input.series ?? null,
      description: input.description ?? null,
      shortDescription: input.subtitle ?? null,
      price: new Prisma.Decimal(input.price),
      compareAtPrice: input.compareAtPrice ? new Prisma.Decimal(input.compareAtPrice) : null,
      status: input.status,
      isFeatured: input.isFeatured,
      brandId: brand.id,
      categoryId: category.id,
      variants: {
        create: {
          sku: `${skuFromSlug(input.slug)}-1`.slice(0, 80),
          name: input.color ?? 'Standard',
          color: input.color ?? null,
          stockQuantity: input.stock,
          isActive: true,
        },
      },
    },
    include: cardInclude,
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: 'PRODUCT_CREATED',
      entityType: 'Product',
      entityId: product.id,
      after: { name: product.name, slug: product.slug, price: Number(product.price) },
    },
  });

  return mapCard(product);
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
  actorId: string,
): Promise<ProductCardDto> {
  const existing = await prisma.product.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new AppError('Produit introuvable.', 404, 'PRODUCT_NOT_FOUND');

  if (input.brandId) {
    const brand = await prisma.brand.findUnique({ where: { id: input.brandId } });
    if (!brand) throw new AppError('Marque introuvable.', 404, 'BRAND_NOT_FOUND');
  }
  if (input.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
    if (!category) throw new AppError('Catégorie introuvable.', 404, 'CATEGORY_NOT_FOUND');
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.subtitle !== undefined ? { subtitle: input.subtitle } : {}),
      ...(input.series !== undefined ? { series: input.series } : {}),
      ...(input.badge !== undefined ? { badge: input.badge } : {}),
      ...(input.badgeTone !== undefined ? { badgeTone: input.badgeTone } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.price !== undefined ? { price: new Prisma.Decimal(input.price) } : {}),
      ...(input.compareAtPrice !== undefined
        ? { compareAtPrice: input.compareAtPrice === null ? null : new Prisma.Decimal(input.compareAtPrice) }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.brandId !== undefined ? { brandId: input.brandId } : {}),
    },
    include: cardInclude,
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: 'PRODUCT_UPDATED',
      entityType: 'Product',
      entityId: product.id,
      before: { name: existing.name, price: Number(existing.price), status: existing.status },
      after: { name: product.name, price: Number(product.price), status: product.status },
    },
  });

  return mapCard(product);
}

export async function archiveProduct(id: string, actorId: string): Promise<void> {
  const existing = await prisma.product.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new AppError('Produit introuvable.', 404, 'PRODUCT_NOT_FOUND');

  await prisma.product.update({
    where: { id },
    data: { status: 'ARCHIVED', deletedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: 'PRODUCT_ARCHIVED',
      entityType: 'Product',
      entityId: id,
      before: { name: existing.name, status: existing.status },
    },
  });
}

export async function adjustStock(
  variantId: string,
  input: StockAdjustmentInput,
  actorId: string,
) {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { id: true, productId: true, stockQuantity: true, name: true },
  });

  if (!variant) throw new AppError('Variante introuvable.', 404, 'VARIANT_NOT_FOUND');

  const nextStock = variant.stockQuantity + input.quantityDelta;
  if (nextStock < 0) {
    throw new AppError('Le stock ne peut pas devenir négatif.', 400, 'NEGATIVE_STOCK');
  }

  const [updated] = await prisma.$transaction([
    prisma.productVariant.update({
      where: { id: variantId },
      data: { stockQuantity: nextStock },
    }),
    prisma.inventoryMovement.create({
      data: {
        variantId,
        type: input.type,
        quantityDelta: input.quantityDelta,
        note: input.note ?? null,
        createdById: actorId,
      },
    }),
  ]);

  return {
    id: updated.id,
    productId: updated.productId,
    name: updated.name,
    stockQuantity: updated.stockQuantity,
  };
}
