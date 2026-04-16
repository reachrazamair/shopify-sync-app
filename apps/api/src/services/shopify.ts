import type { ShopifyProduct } from '@repo/types';
import { env } from '../config/env.js';

const BASE_URL = `https://${env.SHOPIFY_SHOP_DOMAIN}/admin/api/${env.SHOPIFY_API_VERSION}`;

async function shopifyFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'X-Shopify-Access-Token': env.SHOPIFY_ADMIN_API_TOKEN,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(25_000), // 25s — under activity's 30s timeout
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export async function getShopifyProduct(productId: number): Promise<ShopifyProduct | null> {
  try {
    const data = await shopifyFetch<{ product: ShopifyProduct }>(`/products/${productId}.json`);
    return data.product;
  } catch {
    return null;
  }
}
