import { Router } from 'express';
import type { HealthResponse } from '@mf/types';

export const healthRouter: Router = Router();

healthRouter.get('/', (_req, res) => {
  const payload: HealthResponse = {
    status: 'ok',
    service: 'mf-business-api',
    version: '0.1.0',
    environment: process.env.NODE_ENV ?? 'development',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
  };

  res.status(200).json(payload);
});
