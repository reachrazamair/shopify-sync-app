import type { FastifyPluginAsync } from 'fastify';
import { verifyShopifyHmac } from '../../services/hmac.js';
import { getTemporalClient } from '../../config/temporal.js';
import { env } from '../../config/env.js';
import { getActiveConnection } from '../../services/storeConnection.js';
import type { ShopifyWebhookOrder } from '@repo/types';

export const shopifyWebhookRoutes: FastifyPluginAsync = async (fastify) => {
  // Override the built-in JSON parser to get raw Buffer for HMAC verification
  fastify.removeContentTypeParser('application/json');
  fastify.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => {
    done(null, body);
  });

  fastify.post('/webhooks/shopify/orders', async (request, reply) => {
    const signature = request.headers['x-shopify-hmac-sha256'];
    const rawBody = request.body as Buffer;

    // 1. Verify HMAC
    if (!signature || typeof signature !== 'string') {
      return reply.status(401).send({ error: 'Missing HMAC signature' });
    }

    // Read secret from DB (UI-connected store), fall back to env var for existing deployments
    const connection = await getActiveConnection();
    const webhookSecret = connection?.webhookSecret ?? env.SHOPIFY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      request.log.error('No webhook secret configured — connect a store via the dashboard');
      return reply.status(503).send({ error: 'No store connected' });
    }

    if (!verifyShopifyHmac(rawBody, signature, webhookSecret)) {
      request.log.warn('Invalid Shopify HMAC signature');
      return reply.status(401).send({ error: 'Invalid signature' });
    }

    // 2. Parse body
    let order: ShopifyWebhookOrder;
    try {
      order = JSON.parse(rawBody.toString()) as ShopifyWebhookOrder;
    } catch {
      return reply.status(400).send({ error: 'Invalid JSON body' });
    }

    const shopifyOrderId = String(order.id);

    // 3. Idempotency check
    const existing = await fastify.prisma.order.findUnique({
      where: { shopifyOrderId },
      select: { id: true },
    });

    if (existing) {
      request.log.info({ shopifyOrderId }, 'Duplicate webhook — order already exists');
      return reply.status(200).send({ message: 'Already processed' });
    }

    // 4. Start Temporal workflow
    const client = await getTemporalClient();
    const workflowId = `shopify-order-${shopifyOrderId}`;

    await client.workflow.start('orderSyncWorkflow', {
      taskQueue: env.TEMPORAL_TASK_QUEUE,
      workflowId,
      args: [order],
      workflowExecutionTimeout: '10 minutes',
    });

    request.log.info({ shopifyOrderId, workflowId }, 'Workflow started');

    // 5. Return 200 immediately (Shopify requires < 5s)
    return reply.status(200).send({ workflowId, message: 'Workflow started' });
  });
};
