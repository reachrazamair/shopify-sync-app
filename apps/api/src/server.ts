import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import prismaPlugin from './plugins/prisma.js';
import authPlugin from './plugins/auth.js';
import { shopifyWebhookRoutes } from './routes/webhooks/shopify.js';
import { ordersRoutes } from './routes/api/orders.js';
import { statsRoutes } from './routes/api/stats.js';
import { storeRoutes } from './routes/api/store.js';
import { env } from './config/env.js';

export async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      ...(env.NODE_ENV === 'development' && {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      }),
    },
  });

  // Plugins
  await fastify.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  await fastify.register(sensible);
  await fastify.register(prismaPlugin);
  await fastify.register(authPlugin);

  // Routes
  await fastify.register(shopifyWebhookRoutes);
  await fastify.register(ordersRoutes);
  await fastify.register(statsRoutes);
  await fastify.register(storeRoutes);

  // Health check (no auth)
  fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  return fastify;
}

// Start server when run directly
const server = await buildServer();
await server.listen({ port: env.PORT, host: '0.0.0.0' });
