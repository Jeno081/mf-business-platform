import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../../lib/async-handler';
import { z } from 'zod';
import { createOrderSchema } from './schemas';
import { createOrder, getTrackingOrder } from './service';
import { verifyOrderToken } from '../../lib/order-token';
import { streamInvoice } from '../../lib/invoice';

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

const trackingParamSchema = z.object({ token: z.string().min(20).max(2000) });

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


ordersRouter.get(
  '/track/:token',
  asyncHandler(async (req, res) => {
    const { token } = trackingParamSchema.parse(req.params);
    const orderId = verifyOrderToken(token);
    res.json({ data: await getTrackingOrder(orderId) });
  }),
);

ordersRouter.get(
  '/track/:token/invoice',
  asyncHandler(async (req, res) => {
    const { token } = trackingParamSchema.parse(req.params);
    const orderId = verifyOrderToken(token);
    const order = await getTrackingOrder(orderId);
    if (order.status === 'PENDING' || order.status === 'CANCELLED') {
      res.status(409).json({
        error: {
          code: 'INVOICE_NOT_AVAILABLE',
          message: 'La facture sera disponible après validation de la commande.',
        },
      });
      return;
    }
    await streamInvoice(orderId, res, req.query.download === '1');
  }),
);
