import { z } from 'zod';

const booleanQuery = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')
  .optional();

export const productListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(1).max(60).default(24),
    search: z.string().trim().max(120).optional(),
    category: z.string().trim().max(80).optional(),
    brand: z.string().trim().max(80).optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    featured: booleanQuery,
    inStock: booleanQuery,
    sort: z.enum(['newest', 'price-asc', 'price-desc', 'rating', 'name']).default('newest'),
  })
  .refine(
    (value) =>
      value.minPrice === undefined ||
      value.maxPrice === undefined ||
      value.minPrice <= value.maxPrice,
    { message: 'Le prix minimum doit être inférieur ou égal au prix maximum.', path: ['minPrice'] },
  );

export const adminProductListQuerySchema = productListQuerySchema.and(
  z.object({
    status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
  }),
);

export const productIdSchema = z.object({
  id: z.string().min(1),
});

export const productSlugSchema = z.object({
  slug: z.string().min(1).max(191),
});

export const createProductSchema = z
  .object({
    name: z.string().trim().min(2).max(191),
    slug: z.string().trim().min(2).max(191),
    brandId: z.string().min(1),
    categoryId: z.string().min(1),
    price: z.coerce.number().positive(),
    compareAtPrice: z.coerce.number().positive().optional(),
    subtitle: z.string().trim().max(191).optional(),
    series: z.string().trim().max(120).optional(),
    description: z.string().trim().max(20_000).optional(),
    stock: z.coerce.number().int().min(0).default(0),
    color: z.string().trim().max(80).optional(),
    isFeatured: z.boolean().default(false),
    status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).default('DRAFT'),
  })
  .strict();

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(2).max(191).optional(),
    subtitle: z.string().trim().max(191).nullable().optional(),
    series: z.string().trim().max(120).nullable().optional(),
    badge: z.string().trim().max(60).nullable().optional(),
    badgeTone: z.string().trim().max(40).nullable().optional(),
    description: z.string().trim().max(20_000).nullable().optional(),
    price: z.coerce.number().positive().optional(),
    compareAtPrice: z.coerce.number().positive().nullable().optional(),
    status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
    isFeatured: z.boolean().optional(),
    categoryId: z.string().min(1).optional(),
    brandId: z.string().min(1).optional(),
  })
  .strict();

export const stockAdjustmentSchema = z
  .object({
    quantityDelta: z.coerce.number().int().refine((value) => value !== 0, {
      message: 'Le mouvement doit être différent de zéro.',
    }),
    type: z.enum(['RESTOCK', 'SALE', 'RETURN', 'ADJUSTMENT', 'RESERVATION', 'RELEASE']).default('ADJUSTMENT'),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

export type ProductListQuery = z.infer<typeof productListQuerySchema>;
export type AdminProductListQuery = z.infer<typeof adminProductListQuerySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
