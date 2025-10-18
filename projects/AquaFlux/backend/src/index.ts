import app from '@/app';
import { config } from '@/config';
import { setupPaymentEventListeners } from '@/events/event.listeners';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

const port = config.port;

// Setup application event listeners
setupPaymentEventListeners();

// Start the server
const server = app.listen(port, () => {
  logger.info(`Server is running on http://localhost:${port}`);
});

// Graceful shutdown
const shutdown = (signal: string) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed.');
    prisma.$disconnect().then(() => {
      logger.info('Prisma client disconnected.');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
