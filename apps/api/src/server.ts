import { prisma } from '@mf/database';
import { app } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';

const server = app.listen(env.PORT, () => {
  logger.info(`API MF Business démarrée sur http://localhost:${env.PORT}`);
  logger.info(`Health check : http://localhost:${env.PORT}/health`);
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Arrêt en cours…');
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Arrêt terminé.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Arrêt forcé après expiration du délai.');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Promesse rejetée non gérée');
});

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Exception non capturée');
  process.exit(1);
});
