import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler';
import { requireAdmin, requireAuth } from '../../middlewares/auth';
import { streamInvoice } from '../../lib/invoice';
import {
  adminOrderListQuerySchema,
  markOrderPaidSchema,
  updateOrderStatusSchema,
} from './schemas';
import {
  adminGetOrder,
  adminListOrders,
  markOrderPaid,
  updateOrderStatus,
} from './service';

const idSchema = z.object({ id: z.string().min(3).max(40) });

export const adminOrdersRouter = Router();

adminOrdersRouter.use(requireAuth, requireAdmin);

adminOrdersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = adminOrderListQuerySchema.parse(req.query);
    res.json(await adminListOrders(query));
  }),
);

adminOrdersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json({ data: await adminGetOrder(id) });
  }),
);

adminOrdersRouter.get(
  '/:id/invoice',
  asyncHandler(async (req, res) => {
    const { id } = idSchema.parse(req.params);
    await streamInvoice(id, res, req.query.download === '1');
  }),
);

adminOrdersRouter.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const { id } = idSchema.parse(req.params);
    const input = updateOrderStatusSchema.parse(req.body);
    res.json({ data: await updateOrderStatus(id, input, req.auth!.userId) });
  }),
);

adminOrdersRouter.patch(
  '/:id/payment',
  asyncHandler(async (req, res) => {
    const { id } = idSchema.parse(req.params);
    const input = markOrderPaidSchema.parse(req.body);
    res.json({ data: await markOrderPaid(id, input, req.auth!.userId) });
  }),
);
