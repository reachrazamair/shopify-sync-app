import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Nav } from '@/components/nav';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { apiFetch } from '@/lib/api';
import type { OrderListResponse, OrderStatus } from '@repo/types';
type OrdersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OrdersPage(props: OrdersPageProps) {
  const searchParams = await props.searchParams;
  const status = typeof searchParams?.['status'] === 'string' ? searchParams['status'] : undefined;
  const search = typeof searchParams?.['search'] === 'string' ? searchParams['search'] : undefined;
  const page = typeof searchParams?.['page'] === 'string' ? searchParams['page'] : '1';

  const params = new URLSearchParams({ page, pageSize: '20' });
  if (status && status !== 'ALL') params.set('status', status as OrderStatus);
  if (search) params.set('search', search);

  const data = await apiFetch<OrderListResponse>(`/api/orders?${params.toString()}`);

  return (
    <div className="flex flex-col min-h-screen">
      <Nav />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        <h1 className="text-xl font-semibold">Orders</h1>
        <NuqsAdapter>
          <OrdersTable initialData={data} />
        </NuqsAdapter>
      </main>
    </div>
  );
}
