export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { prisma } from '@repo/db';
import { Nav } from '@/components/nav';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { VolumeChartWrapper } from '@/components/dashboard/VolumeChartWrapper';
import { RecentOrders } from '@/components/dashboard/RecentOrders';
import { AutoRefresh } from '@/components/AutoRefresh';
import { NotConnectedState } from '@/components/NotConnectedState';
import { Skeleton } from '@/components/ui/skeleton';
import type { StatsResponse, Order, StoreConnectionStatus } from '@repo/types';

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

async function getStats(): Promise<StatsResponse> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [totalOrders, ordersToday, statusGroups, revenueResult, dailyVolume] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: today } } }),
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.order.aggregate({ where: { status: 'COMPLETED' }, _sum: { totalPrice: true } }),
    prisma.$queryRaw<{ date: string; count: bigint; revenue: string }[]>`
      SELECT
        DATE_TRUNC('day', created_at)::date::text AS date,
        COUNT(*)::bigint AS count,
        COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN total_price ELSE 0 END), 0)::text AS revenue
      FROM orders
      WHERE created_at >= ${thirtyDaysAgo}
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date ASC
    `,
  ]);

  const statusBreakdown = { PENDING: 0, PROCESSING: 0, COMPLETED: 0, FAILED: 0 };
  for (const g of statusGroups) {
    statusBreakdown[g.status] = g._count._all;
  }

  const totalRevenue = revenueResult._sum.totalPrice?.toString() ?? '0';
  const successRate = totalOrders > 0
    ? Math.round((statusBreakdown.COMPLETED / totalOrders) * 100)
    : 0;

  return {
    totalOrders,
    totalRevenue,
    successRate,
    ordersToday,
    statusBreakdown,
    dailyVolume: dailyVolume.map((r) => ({
      date: r.date,
      count: Number(r.count),
      revenue: r.revenue,
    })),
  };
}

async function getRecentOrders(): Promise<Order[]> {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  return orders.map((o) => ({
    ...o,
    totalPrice: o.totalPrice.toString(),
    processedAt: o.processedAt?.toISOString() ?? null,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    shippingAddress: o.shippingAddress as Order['shippingAddress'],
  }));
}

export default async function DashboardPage() {
  const connectionStatus = await getConnectionStatus();

  return (
    <div className="flex flex-col min-h-screen">
      <AutoRefresh intervalMs={10000} />
      <Nav connectionStatus={connectionStatus} />
      {connectionStatus.connected ? (
        <ConnectedDashboard />
      ) : (
        <NotConnectedState />
      )}
    </div>
  );
}

async function ConnectedDashboard() {
  const [stats, recentOrders] = await Promise.all([getStats(), getRecentOrders()]);

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <Suspense fallback={<Skeleton className="h-28 w-full" />}>
        <StatsCards stats={stats} />
      </Suspense>
      <VolumeChartWrapper data={stats.dailyVolume} />
      <RecentOrders orders={recentOrders} />
    </main>
  );
}
