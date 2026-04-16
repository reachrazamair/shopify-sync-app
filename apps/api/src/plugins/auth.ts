import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { timingSafeEqual } from 'crypto';
import { env } from '../config/env.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const authPlugin: FastifyPluginAsync = fp(async (fastify) => {
  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const apiKey = request.headers['x-api-key'];
      if (!apiKey || typeof apiKey !== 'string') {
        return reply.status(401).send({ error: 'Missing x-api-key header' });
      }

      const expected = Buffer.from(env.API_KEY);
      const provided = Buffer.from(apiKey);

      if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
        return reply.status(401).send({ error: 'Invalid API key' });
      }
    },
  );
});

export default authPlugin;
