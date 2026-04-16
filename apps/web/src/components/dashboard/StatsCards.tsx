import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { StatsResponse } from '@repo/types';

function StatCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function StatsCards({ stats }: { stats: StatsResponse }) {
  const revenue = parseFloat(stats.totalRevenue).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard title="Total Orders" value={stats.totalOrders.toLocaleString()} />
      <StatCard title="Total Revenue" value={revenue} sub="Completed orders only" />
      <StatCard title="Success Rate" value={`${stats.successRate}%`} />
      <StatCard title="Orders Today" value={stats.ordersToday.toLocaleString()} />
    </div>
  );
}
