import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@mf/database';
import { asyncHandler } from '../../lib/async-handler';
import { requireAdmin, requireAuth } from '../../middlewares/auth';

const querySchema = z.object({
  days: z.coerce.number().int().min(7).max(365).default(30),
});

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export const adminAnalyticsRouter = Router();

adminAnalyticsRouter.use(requireAuth, requireAdmin);

adminAnalyticsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { days } = querySchema.parse(req.query);
    const from = new Date();
    from.setUTCHours(0, 0, 0, 0);
    from.setUTCDate(from.getUTCDate() - (days - 1));

    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: from } },
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        items: {
          select: {
            productName: true,
            quantity: true,
            lineTotal: true,
            productId: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const validOrders = orders.filter(
      (order) => order.status !== 'CANCELLED' && order.status !== 'REFUNDED',
    );
    const revenue = validOrders.reduce((sum, order) => sum + Number(order.total), 0);
    const statuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

    const dailyMap = new Map<string, { revenue: number; orders: number }>();
    for (let index = 0; index < days; index += 1) {
      const day = new Date(from);
      day.setUTCDate(from.getUTCDate() + index);
      dailyMap.set(dayKey(day), { revenue: 0, orders: 0 });
    }

    for (const order of validOrders) {
      const key = dayKey(order.createdAt);
      const current = dailyMap.get(key);
      if (current) {
        current.revenue += Number(order.total);
        current.orders += 1;
      }
    }

    const topProductsMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const order of validOrders) {
      for (const item of order.items) {
        const key = item.productId ?? item.productName;
        const current = topProductsMap.get(key) ?? {
          name: item.productName,
          quantity: 0,
          revenue: 0,
        };
        current.quantity += item.quantity;
        current.revenue += Number(item.lineTotal);
        topProductsMap.set(key, current);
      }
    }

    const topProducts = [...topProductsMap.values()]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 6);

    res.json({
      data: {
        range: { days, from: from.toISOString() },
        summary: {
          revenue,
          orders: orders.length,
          averageOrderValue: validOrders.length
            ? Math.round((revenue / validOrders.length) * 100) / 100
            : 0,
          delivered: orders.filter((order) => order.status === 'DELIVERED').length,
          pending: orders.filter((order) => order.status === 'PENDING').length,
          cancelled: orders.filter((order) => order.status === 'CANCELLED').length,
        },
        revenueByDay: [...dailyMap.entries()].map(([date, value]) => ({
          date,
          revenue: Math.round(value.revenue * 100) / 100,
          orders: value.orders,
        })),
        ordersByStatus: statuses.map((status) => ({
          status,
          count: orders.filter((order) => order.status === status).length,
        })),
        topProducts,
      },
    });
  }),
);
