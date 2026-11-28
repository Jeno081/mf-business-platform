import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@mf/database';
import { asyncHandler } from '../../lib/async-handler';

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const announcementsRouter = Router();

announcementsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { limit } = querySchema.parse(req.query);
    const announcements = await prisma.announcement.findMany({
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        body: true,
        url: true,
        publishedAt: true,
      },
    });

    res.set('Cache-Control', 'no-store');
    res.json({
      data: announcements.map((item) => ({
        ...item,
        publishedAt: item.publishedAt.toISOString(),
      })),
    });
  }),
);
