import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Order, OrderStatus } from '@repo/types';

const statusVariant: Record<OrderStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  COMPLETED: 'default',
  PENDING: 'outline',
  PROCESSING: 'secondary',
  FAILED: 'destructive',
};

export function RecentOrders({ orders }: { orders: Order[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Recent Orders</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <Link href={`/orders/${order.id}`} className="font-medium hover:underline">
                    {order.orderNumber}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{order.customerName}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[order.status]}>{order.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {parseFloat(order.totalPrice).toLocaleString('en-US', {
                    style: 'currency',
                    currency: order.currency,
                  })}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(order.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
