import type { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { getActiveConnection, saveConnection, clearConnection } from '../../services/storeConnection.js';
import {
  validateShopifyCredentials,
  registerWebhook,
  deleteWebhook,
} from '../../services/shopify.js';
import { env } from '../../config/env.js';

const ConnectBody = Type.Object({
  shopDomain: Type.String({ minLength: 1 }),
  adminApiToken: Type.String({ minLength: 1 }),
  webhookSecret: Type.String({ minLength: 1 }),
});

export const storeRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/store — connection status
  fastify.get('/api/store', { preHandler: [fastify.authenticate] }, async (_request, reply) => {
    const conn = await getActiveConnection();

    if (!conn) {
      return reply.send({ connected: false, webhookRegistered: false });
    }

    const token = conn.adminApiToken;
    const tokenRedacted = token.length > 8
      ? `${token.slice(0, 6)}${'•'.repeat(8)}${token.slice(-4)}`
      : '••••••••';

    return reply.send({
      connected: true,
      shopDomain: conn.shopDomain,
      tokenRedacted,
      webhookRegistered: conn.shopifyWebhookId !== null,
      shopifyWebhookId: conn.shopifyWebhookId,
      webhookTopic: conn.webhookTopic,
      connectedAt: conn.connectedAt.toISOString(),
    });
  });

  // POST /api/store/connect
  fastify.post(
    '/api/store/connect',
    { preHandler: [fastify.authenticate], schema: { body: ConnectBody } },
    async (request, reply) => {
      const raw = request.body as {
        shopDomain: string;
        adminApiToken: string;
        webhookSecret: string;
      };

      // Strip any protocol prefix — accept "my-store.myshopify.com" or "https://my-store.myshopify.com"
      const shopDomain = raw.shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const { adminApiToken, webhookSecret } = raw;

      const config = { shopDomain, adminApiToken };

      // 1. Validate credentials against Shopify
      const valid = await validateShopifyCredentials(config);
      if (!valid) {
        return reply.status(422).send({
          error: 'Invalid credentials — check your store domain and Admin API token',
        });
      }

      // 2. If already connected, delete old webhook first
      const existing = await getActiveConnection();
      if (existing?.shopifyWebhookId) {
        try {
          await deleteWebhook(
            { shopDomain: existing.shopDomain, adminApiToken: existing.adminApiToken },
            existing.shopifyWebhookId,
          );
        } catch (err) {
          request.log.warn({ err }, 'Failed to delete old webhook before reconnect — continuing');
        }
      }

      // 3. Register webhook on Shopify (best-effort — skipped if API_PUBLIC_URL is localhost)
      const callbackUrl = `${env.API_PUBLIC_URL}/webhooks/shopify/orders`;
      let webhookId: string | null = null;
      if (!env.API_PUBLIC_URL.includes('localhost') && !env.API_PUBLIC_URL.includes('127.0.0.1')) {
        try {
          const webhook = await registerWebhook(config, 'orders/create', callbackUrl);
          webhookId = String(webhook.id);
          request.log.info({ shopDomain, webhookId }, 'Shopify webhook registered');
        } catch (err) {
          request.log.warn({ err }, 'Webhook registration failed — store saved without webhook');
        }
      } else {
        request.log.info('Skipping webhook registration for localhost — use ngrok in production');
      }

      // 4. Save encrypted credentials to DB
      await saveConnection({
        shopDomain,
        adminApiToken,
        webhookSecret,
        shopifyWebhookId: webhookId ?? '',
      });

      request.log.info({ shopDomain }, 'Shopify store connected');

      return reply.status(201).send({
        connected: true,
        shopDomain,
        shopifyWebhookId: webhookId,
        webhookRegistered: webhookId !== null,
      });
    },
  );

  // DELETE /api/store/disconnect
  fastify.delete(
    '/api/store/disconnect',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const conn = await getActiveConnection();

      if (!conn) {
        return reply.status(404).send({ error: 'No store connected' });
      }

      // Delete webhook from Shopify (tolerates 404)
      if (conn.shopifyWebhookId) {
        try {
          await deleteWebhook(
            { shopDomain: conn.shopDomain, adminApiToken: conn.adminApiToken },
            conn.shopifyWebhookId,
          );
        } catch (err) {
          request.log.warn({ err }, 'Failed to delete Shopify webhook — clearing DB anyway');
        }
      }

      await clearConnection();

      request.log.info({ shopDomain: conn.shopDomain }, 'Shopify store disconnected');

      return reply.status(204).send();
    },
  );
};
