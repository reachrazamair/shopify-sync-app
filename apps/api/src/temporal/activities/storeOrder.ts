import { prisma } from '@repo/db';
import type { TransformedOrder } from './transformOrder.js';

export async function storeOrder(order: TransformedOrder): Promise<string> {
  const result = await prisma.order.upsert({
    where: { shopifyOrderId: order.shopifyOrderId },
    create: {
      shopifyOrderId: order.shopifyOrderId,
      orderNumber: order.orderNumber,
      status: 'PROCESSING',
      totalPrice: order.totalPrice,
      currency: order.currency,
      customerEmail: order.customerEmail,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      ...(order.shippingAddress ? { shippingAddress: order.shippingAddress } : {}),
      rawPayload: order.rawPayload as object,
      lineItems: {
        createMany: {
          data: order.lineItems,
          skipDuplicates: true,
        },
      },
    },
    update: {
      status: 'COMPLETED',
      processedAt: new Date(),
      customerEmail: order.customerEmail,
      customerName: order.customerName,
    },
    select: { id: true },
  });

  return result.id;
}
