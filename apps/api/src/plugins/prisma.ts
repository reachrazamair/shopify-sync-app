import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@repo/db';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: typeof prisma;
  }
}

const prismaPlugin: FastifyPluginAsync = fp(async (fastify) => {
  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
});

export default prismaPlugin;
