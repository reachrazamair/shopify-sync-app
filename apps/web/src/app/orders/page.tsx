import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { prisma } from '@repo/db';
import { Nav } from '@/components/nav';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { NotConnectedState } from '@/components/NotConnectedState';
import { apiFetch } from '@/lib/api';
import type { OrderListResponse, OrderStatus, StoreConnectionStatus } from '@repo/types';

export const dynamic = 'force-dynamic';

type OrdersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function getConnectionStatus(): Promise<StoreConnectionStatus> {
  const row = await prisma.shopifyConnection.findFirst({
    select: {
      shopDomain: true,
      shopifyWebhookId: true,
      webhookTopic: true,
      connectedAt: true,
    },
  });

  if (!row) return { connected: false, webhookRegistered: false };

  return {
    connected: true,
    shopDomain: row.shopDomain,
    webhookRegistered: row.shopifyWebhookId !== null,
    shopifyWebhookId: row.shopifyWebhookId ?? undefined,
    webhookTopic: row.webhookTopic,
    connectedAt: row.connectedAt.toISOString(),
  };
}

export default async function OrdersPage(props: OrdersPageProps) {
  const [connectionStatus, searchParams] = await Promise.all([
    getConnectionStatus(),
    props.searchParams,
  ]);

  return (
    <div className="flex flex-col min-h-screen">
      <Nav connectionStatus={connectionStatus} />
      {connectionStatus.connected ? (
        <ConnectedOrders searchParams={searchParams} />
      ) : (
        <NotConnectedState />
      )}
    </div>
  );
}

async function ConnectedOrders({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const status = typeof searchParams?.['status'] === 'string' ? searchParams['status'] : undefined;
  const search = typeof searchParams?.['search'] === 'string' ? searchParams['search'] : undefined;
  const page = typeof searchParams?.['page'] === 'string' ? searchParams['page'] : '1';

  const params = new URLSearchParams({ page, pageSize: '20' });
  if (status && status !== 'ALL') params.set('status', status as OrderStatus);
  if (search) params.set('search', search);

  const data = await apiFetch<OrderListResponse>(`/api/orders?${params.toString()}`);

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Orders</h1>
      <NuqsAdapter>
        <OrdersTable initialData={data} />
      </NuqsAdapter>
    </main>
  );
}
