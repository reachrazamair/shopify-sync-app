import { ApplicationFailure } from '@temporalio/activity';
import { z } from 'zod';

const ShopifyLineItemSchema = z.object({
  id: z.number(),
  product_id: z.number().nullable(),
  variant_id: z.number().nullable(),
  title: z.string(),
  variant_title: z.string().nullable(),
  sku: z.string().nullable(),
  quantity: z.number().int().positive(),
  price: z.string(),
});

const ShopifyAddressSchema = z.object({
  address1: z.string().nullable(),
  address2: z.string().nullable(),
  city: z.string().nullable(),
  province: z.string().nullable(),
  country: z.string().nullable(),
  zip: z.string().nullable(),
  name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
});

export const ShopifyOrderSchema = z.object({
  id: z.number(),
  order_number: z.number(),
  name: z.string(),
  email: z.union([z.string().email(), z.literal(''), z.null()]).optional(),
  total_price: z.string(),
  currency: z.string().length(3),
  financial_status: z.string(),
  fulfillment_status: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  customer: z
    .object({
      id: z.number(),
      email: z.string(),
      first_name: z.string(),
      last_name: z.string(),
      phone: z.string().nullable(),
    })
    .nullable(),
  line_items: z.array(ShopifyLineItemSchema).min(1),
  shipping_address: ShopifyAddressSchema.nullable(),
  billing_address: ShopifyAddressSchema.nullable().optional(),
});

export type ValidatedOrder = z.infer<typeof ShopifyOrderSchema>;

export function validateOrder(rawPayload: unknown): ValidatedOrder {
  const result = ShopifyOrderSchema.safeParse(rawPayload);

  if (!result.success) {
    throw ApplicationFailure.nonRetryable(
      `Order validation failed: ${result.error.message}`,
      'ValidationError',
      result.error.flatten(),
    );
  }

  return result.data;
}
