import { z } from 'zod';

export const adminLoginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1).max(128),
    totp: z.string().trim().min(6).max(8).optional(),
    recoveryCode: z.string().trim().min(8).max(16).optional(),
  })
  .strict();

export const setupSchema = z
  .object({
    setupToken: z.string().min(20),
  })
  .strict();

export const enableSchema = z
  .object({
    setupToken: z.string().min(20),
    code: z.string().trim().min(6).max(8),
  })
  .strict();

export const disableSchema = z
  .object({
    password: z.string().min(1).max(128),
    code: z.string().trim().min(6).max(8),
  })
  .strict();

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type SetupInput = z.infer<typeof setupSchema>;
export type EnableInput = z.infer<typeof enableSchema>;
export type DisableInput = z.infer<typeof disableSchema>;
