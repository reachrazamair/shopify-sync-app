import { getShopifyProduct } from '../../services/shopify.js';
import type { ValidatedOrder } from './validateOrder.js';
import type { ShopifyProduct } from '@repo/types';

export interface EnrichedOrder extends ValidatedOrder {
  enrichedProducts: Record<number, ShopifyProduct | null>;
}

export async function enrichOrder(order: ValidatedOrder): Promise<EnrichedOrder> {
  const productIds = [
    ...new Set(order.line_items.map((li) => li.product_id).filter((id): id is number => id !== null)),
  ];

  const productEntries = await Promise.all(
    productIds.map(async (id) => {
      const product = await getShopifyProduct(id);
      return [id, product] as const;
    }),
  );

  const enrichedProducts = Object.fromEntries(productEntries) as Record<number, ShopifyProduct | null>;

  return { ...order, enrichedProducts };
}
