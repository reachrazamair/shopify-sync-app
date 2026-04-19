import { prisma } from '@repo/db';
import { encrypt, decrypt } from './encryption.js';

export interface StoreConnectionRecord {
  shopDomain: string;
  adminApiToken: string;
  webhookSecret: string;
  shopifyWebhookId: string | null;
  webhookTopic: string;
  connectedAt: Date;
}

export async function getActiveConnection(): Promise<StoreConnectionRecord | null> {
  const row = await prisma.shopifyConnection.findFirst();
  if (!row) return null;

  return {
    shopDomain: row.shopDomain,
    adminApiToken: decrypt(row.encryptedToken),
    webhookSecret: decrypt(row.encryptedSecret),
    shopifyWebhookId: row.shopifyWebhookId,
    webhookTopic: row.webhookTopic,
    connectedAt: row.connectedAt,
  };
}

export async function saveConnection(data: {
  shopDomain: string;
  adminApiToken: string;
  webhookSecret: string;
  shopifyWebhookId: string | null;
}): Promise<void> {
  await prisma.shopifyConnection.upsert({
    where: { shopDomain: data.shopDomain },
    create: {
      shopDomain: data.shopDomain,
      encryptedToken: encrypt(data.adminApiToken),
      encryptedSecret: encrypt(data.webhookSecret),
      shopifyWebhookId: data.shopifyWebhookId || null,
    },
    update: {
      encryptedToken: encrypt(data.adminApiToken),
      encryptedSecret: encrypt(data.webhookSecret),
      shopifyWebhookId: data.shopifyWebhookId || null,
    },
  });
}

export async function clearConnection(): Promise<void> {
  await prisma.shopifyConnection.deleteMany({});
}
