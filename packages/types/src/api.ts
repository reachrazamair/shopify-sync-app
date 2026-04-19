import type { Order, OrderStatus } from './orders.js';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface OrderFilters {
  status?: OrderStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface DailyVolume {
  date: string;
  count: number;
  revenue: string;
}

export interface StatusBreakdown {
  PENDING: number;
  PROCESSING: number;
  COMPLETED: number;
  FAILED: number;
}

export interface StatsResponse {
  totalOrders: number;
  totalRevenue: string;
  successRate: number;
  ordersToday: number;
  statusBreakdown: StatusBreakdown;
  dailyVolume: DailyVolume[];
}

export interface WebhookStartResponse {
  workflowId: string;
  message: string;
}

export type OrderListResponse = PaginatedResponse<Order>;

export interface StoreConnectionStatus {
  connected: boolean;
  shopDomain?: string;
  tokenRedacted?: string;
  webhookRegistered: boolean;
  shopifyWebhookId?: string;
  webhookTopic?: string;
  connectedAt?: string;
}
