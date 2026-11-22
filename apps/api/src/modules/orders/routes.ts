import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../../lib/async-handler';
import { createOrderSchema } from './schemas';
import { createOrder } from './service';

const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Trop de tentatives de commande. Réessayez dans quelques minutes.',
    },
  },
});

export const ordersRouter = Router();

ordersRouter.post(
  '/',
  orderLimiter,
  asyncHandler(async (req, res) => {
    const headerKey = req.header('idempotency-key');
    const input = createOrderSchema.parse({
      ...req.body,
      idempotencyKey: headerKey || req.body?.idempotencyKey,
    });
    const order = await createOrder(input);
    res.status(201).json({ data: order });
  }),
);
