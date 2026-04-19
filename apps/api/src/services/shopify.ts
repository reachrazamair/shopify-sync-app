import type { ShopifyProduct } from '@repo/types';
import { env } from '../config/env.js';

export interface ShopifyClientConfig {
  shopDomain: string;
  adminApiToken: string;
  apiVersion?: string;
}

function baseUrl(config: ShopifyClientConfig): string {
  return `https://${config.shopDomain}/admin/api/${config.apiVersion ?? env.SHOPIFY_API_VERSION}`;
}

async function shopifyFetch<T>(
  config: ShopifyClientConfig,
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${baseUrl(config)}${path}`, {
    ...options,
    headers: {
      'X-Shopify-Access-Token': config.adminApiToken,
      'Content-Type': 'application/json',
      ...((options?.headers as Record<string, string>) ?? {}),
    },
    signal: AbortSignal.timeout(25_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export async function getShopifyProduct(
  config: ShopifyClientConfig,
  productId: number,
): Promise<ShopifyProduct | null> {
  try {
    const data = await shopifyFetch<{ product: ShopifyProduct }>(
      config,
      `/products/${productId}.json`,
    );
    return data.product;
  } catch {
    return null;
  }
}

export async function validateShopifyCredentials(config: ShopifyClientConfig): Promise<boolean> {
  try {
    await shopifyFetch<unknown>(config, '/shop.json');
    return true;
  } catch {
    return false;
  }
}

export async function registerWebhook(
  config: ShopifyClientConfig,
  topic: string,
  callbackUrl: string,
): Promise<{ id: number; topic: string; address: string }> {
  const data = await shopifyFetch<{ webhook: { id: number; topic: string; address: string } }>(
    config,
    '/webhooks.json',
    {
      method: 'POST',
      body: JSON.stringify({
        webhook: { topic, address: callbackUrl, format: 'json' },
      }),
    },
  );
  return data.webhook;
}

export async function deleteWebhook(
  config: ShopifyClientConfig,
  webhookId: string,
): Promise<void> {
  const res = await fetch(`${baseUrl(config)}/webhooks/${webhookId}.json`, {
    method: 'DELETE',
    headers: { 'X-Shopify-Access-Token': config.adminApiToken },
    signal: AbortSignal.timeout(25_000),
  });
  // 404 = already deleted on Shopify side — acceptable
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`Shopify delete webhook error ${res.status}: ${text}`);
  }
}
