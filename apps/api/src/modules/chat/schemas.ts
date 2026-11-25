import { z } from 'zod';

export const chatMessageSchema = z
  .object({
    body: z.string().trim().min(1, 'Le message est vide.').max(2000, 'Message trop long (2000 caractères max).'),
  })
  .strict();

export const chatConversationIdSchema = z.object({
  id: z.string().min(3).max(40),
});

export const chatMessagesQuerySchema = z.object({
  before: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const adminChatListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(['OPEN', 'PENDING', 'CLOSED']).optional(),
  search: z.string().trim().max(120).optional(),
});

export const adminChatUpdateSchema = z
  .object({
    status: z.enum(['OPEN', 'PENDING', 'CLOSED']).optional(),
    assignedAdminId: z.string().min(1).max(40).nullable().optional(),
  })
  .strict();

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type AdminChatListQuery = z.infer<typeof adminChatListQuerySchema>;
export type AdminChatUpdateInput = z.infer<typeof adminChatUpdateSchema>;
