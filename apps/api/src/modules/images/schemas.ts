import { z } from 'zod';

export const attachImageSchema = z
  .object({
    url: z.string().url().max(500),
    publicId: z.string().trim().max(191).optional(),
    alt: z.string().trim().max(191).optional(),
  })
  .strict();

export const updateImageSchema = z
  .object({
    alt: z.string().trim().max(191).nullable().optional(),
    position: z.coerce.number().int().min(0).max(1000).optional(),
  })
  .strict();

export const imageParamsSchema = z.object({
  id: z.string().min(1),
  imageId: z.string().min(1),
});
