import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../../lib/async-handler';
import { pushSubscribeSchema, pushUnsubscribeSchema } from './schemas';
import { subscribeToPush, unsubscribeFromPush, pushStats, sendPushCampaign } from './service';
import { pushCampaignSchema } from './schemas';
import { requireAdmin, requireAuth } from '../../middlewares/auth';

const pushLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

export const pushRouter = Router();

pushRouter.post(
  '/subscribe',
  pushLimiter,
  asyncHandler(async (req, res) => {
    const input = pushSubscribeSchema.parse(req.body);
    const result = await subscribeToPush(input.token, req.get('user-agent') ?? null);
    res.status(201).json({ data: { id: result.id } });
  }),
);

pushRouter.post(
  '/unsubscribe',
  pushLimiter,
  asyncHandler(async (req, res) => {
    const input = pushUnsubscribeSchema.parse(req.body);
    res.json({ data: await unsubscribeFromPush(input.token) });
  }),
);

export const adminPushRouter = Router();

adminPushRouter.use(requireAuth, requireAdmin);

adminPushRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    res.json({ data: await pushStats() });
  }),
);

adminPushRouter.post(
  '/send',
  pushLimiter,
  asyncHandler(async (req, res) => {
    const input = pushCampaignSchema.parse(req.body);
    res.status(201).json({ data: await sendPushCampaign(input) });
  }),
);
