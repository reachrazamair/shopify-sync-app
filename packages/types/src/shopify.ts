// Shopify webhook payload shape for orders/create
export interface ShopifyWebhookOrder {
  id: number;
  order_number: number;
  name: string;
  email: string;
  total_price: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  created_at: string;
  updated_at: string;
  customer: ShopifyCustomer | null;
  line_items: ShopifyLineItem[];
  shipping_address: ShopifyAddress | null;
  billing_address: ShopifyAddress | null;
}

export interface ShopifyCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
}

export interface ShopifyLineItem {
  id: number;
  product_id: number | null;
  variant_id: number | null;
  title: string;
  variant_title: string | null;
  sku: string | null;
  quantity: number;
  price: string;
}

export interface ShopifyAddress {
  address1: string | null;
  address2: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  zip: string | null;
  name: string | null;
  phone: string | null;
}

// Shopify Admin API product response
export interface ShopifyProduct {
  id: number;
  title: string;
  vendor: string;
  product_type: string;
  handle: string;
  status: string;
}
