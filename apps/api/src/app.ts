import { randomUUID } from 'node:crypto';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './lib/logger';
import { errorHandler, notFoundHandler } from './middlewares/error-handler';
import { adminAuthRouter } from './modules/admin-auth/routes';
import { authRouter } from './modules/auth/routes';
import { adminCatalogRouter, catalogRouter } from './modules/catalog/routes';
import { adminOrdersRouter } from './modules/orders/admin-routes';
import { ordersRouter } from './modules/orders/routes';
import { healthRouter } from './routes/health';

export const app: Express = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.CORS_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origine CORS non autorisée : ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(
  pinoHttp({
    logger,
    genReqId(req, res) {
      const id = (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
      res.setHeader('x-request-id', id);
      return id;
    },
  }),
);

app.get('/', (_req, res) => {
  res.json({
    name: 'MF Business API',
    version: '0.1.0',
    documentation: '/api/v1',
    health: '/health',
  });
});

app.get('/api/v1', (_req, res) => {
  res.json({
    name: 'MF Business API',
    version: '0.1.0',
    endpoints: {
      health: '/api/v1/health',
      auth: '/api/v1/auth',
      adminAuth: '/api/v1/admin/auth',
      orders: '/api/v1/orders',
      adminOrders: '/api/v1/admin/orders',
    },
  });
});

app.use('/health', healthRouter);
app.use('/api/v1/health', healthRouter);
app.use(
  '/images',
  express.static(path.resolve(__dirname, '../public/images'), {
    maxAge: '7d',
    immutable: true,
  }),
);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/admin/auth', adminAuthRouter);
app.use('/api/v1/admin/orders', adminOrdersRouter);
app.use('/api/v1/orders', ordersRouter);
app.use('/api/v1', catalogRouter);
app.use('/api/v1/admin', adminCatalogRouter);

app.use(notFoundHandler);
app.use(errorHandler);
