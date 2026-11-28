import { z } from 'zod';

const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+0-9][0-9\s().-]{7,19}$/, 'Numéro de téléphone invalide.');

export const createOrderSchema = z
  .object({
    items: z
      .array(
        z.object({
          variantId: z.string().min(1),
          quantity: z.coerce.number().int().min(1).max(10),
        }),
      )
      .min(1)
      .max(30),
    customer: z.object({
      name: z.string().trim().min(2).max(160),
      phone: phoneSchema,
      email: z.string().trim().email().max(191).optional().or(z.literal('')),
      city: z.string().trim().min(2).max(100),
      commune: z.string().trim().min(2).max(100),
      address: z.string().trim().min(5).max(255),
      note: z.string().trim().max(500).optional(),
    }),
    paymentMethod: z
      .enum(['CASH_ON_DELIVERY', 'MOBILE_MONEY'])
      .default('CASH_ON_DELIVERY'),
    idempotencyKey: z.string().min(8).max(191).optional(),
    pushToken: z.string().trim().min(20).max(500).optional(),
  })
  .strict();

export const orderNumberSchema = z.object({
  orderNumber: z.string().min(3).max(40),
});

export const adminOrderListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'])
    .optional(),
  paymentStatus: z
    .enum(['PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'])
    .optional(),
  search: z.string().trim().max(120).optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
});

export const updateOrderStatusSchema = z
  .object({
    status: z.enum([
      'PENDING',
      'CONFIRMED',
      'PREPARING',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
      'REFUNDED',
    ]),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

export const markOrderPaidSchema = z
  .object({
    paid: z.boolean().default(true),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type AdminOrderListQuery = z.infer<typeof adminOrderListQuerySchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type MarkOrderPaidInput = z.infer<typeof markOrderPaidSchema>;
