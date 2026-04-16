import type { EnrichedOrder } from './enrichOrder.js';

export interface TransformedOrder {
  shopifyOrderId: string;
  orderNumber: string;
  totalPrice: string;
  currency: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string | null;
  shippingAddress: {
    address1: string | null;
    address2: string | null;
    city: string | null;
    province: string | null;
    country: string | null;
    zip: string | null;
  } | null;
  rawPayload: unknown;
  lineItems: {
    shopifyLineId: string;
    productTitle: string;
    variantTitle: string | null;
    sku: string | null;
    quantity: number;
    price: string;
  }[];
}

export function transformOrder(order: EnrichedOrder): TransformedOrder {
  const customerName = order.customer
    ? `${order.customer.first_name} ${order.customer.last_name}`.trim()
    : 'Guest';

  const customerEmail =
    order.customer?.email ?? order.email ?? 'unknown@example.com';

  return {
    shopifyOrderId: String(order.id),
    orderNumber: order.name,
    totalPrice: order.total_price,
    currency: order.currency,
    customerEmail,
    customerName,
    customerPhone: order.customer?.phone ?? null,
    shippingAddress: order.shipping_address
      ? {
          address1: order.shipping_address.address1,
          address2: order.shipping_address.address2,
          city: order.shipping_address.city,
          province: order.shipping_address.province,
          country: order.shipping_address.country,
          zip: order.shipping_address.zip,
        }
      : null,
    rawPayload: order,
    lineItems: order.line_items.map((li) => ({
      shopifyLineId: String(li.id),
      productTitle: li.title,
      variantTitle: li.variant_title,
      sku: li.sku,
      quantity: li.quantity,
      price: li.price,
    })),
  };
}
