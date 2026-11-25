import { z } from 'zod';

export const pushSubscribeSchema = z
  .object({
    token: z.string().trim().min(20).max(500),
    platform: z.string().trim().max(40).optional(),
  })
  .strict();

export const pushUnsubscribeSchema = z
  .object({
    token: z.string().trim().min(20).max(500),
  })
  .strict();

export const pushCampaignSchema = z
  .object({
    title: z.string().trim().min(2).max(120),
    body: z.string().trim().min(2).max(500),
    url: z.string().trim().max(500).optional().or(z.literal('')),
  })
  .strict();

export type PushSubscribeInput = z.infer<typeof pushSubscribeSchema>;
export type PushCampaignInput = z.infer<typeof pushCampaignSchema>;
