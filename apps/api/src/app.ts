import { randomUUID } from 'node:crypto';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './lib/logger';
import { errorHandler, notFoundHandler } from './middlewares/error-handler';
import { healthRouter } from './routes/health';

export const app: Express = express();

app.disable('x-powered-by');
app.use(helmet());
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
    },
  });
});

app.use('/health', healthRouter);
app.use('/api/v1/health', healthRouter);

app.use(notFoundHandler);
app.use(errorHandler);
