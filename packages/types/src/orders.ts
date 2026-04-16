export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type SyncStatus = 'PENDING' | 'SUCCESS' | 'FAILURE';

export interface Order {
  id: string;
  shopifyOrderId: string;
  orderNumber: string;
  status: OrderStatus;
  totalPrice: string;
  currency: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string | null;
  shippingAddress: ShippingAddress | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lineItems?: LineItem[];
  syncLogs?: SyncLog[];
}

export interface ShippingAddress {
  address1: string | null;
  address2: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  zip: string | null;
}

export interface LineItem {
  id: string;
  orderId: string;
  shopifyLineId: string;
  productTitle: string;
  variantTitle: string | null;
  sku: string | null;
  quantity: number;
  price: string;
}

export interface SyncLog {
  id: string;
  orderId: string | null;
  eventType: string;
  status: SyncStatus;
  errorMessage: string | null;
  workflowRunId: string | null;
  activityName: string | null;
  durationMs: number | null;
  createdAt: string;
  completedAt: string | null;
}

export interface Product {
  id: string;
  shopifyProductId: string;
  title: string;
  vendor: string | null;
  productType: string | null;
  handle: string | null;
  status: string | null;
  lastSyncedAt: string;
  createdAt: string;
  updatedAt: string;
}
