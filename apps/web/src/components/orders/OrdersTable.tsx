'use client';

import Link from 'next/link';
import { useQueryState } from 'nuqs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Order, OrderStatus, PaginatedResponse } from '@repo/types';

const statusVariant: Record<OrderStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  COMPLETED: 'default',
  PENDING: 'outline',
  PROCESSING: 'secondary',
  FAILED: 'destructive',
};

const ALL_STATUSES = 'ALL';

export function OrdersTable({ initialData }: { initialData: PaginatedResponse<Order> }) {
  const [status, setStatus] = useQueryState('status', { defaultValue: ALL_STATUSES, shallow: false });
  const [search, setSearch] = useQueryState('search', { defaultValue: '', shallow: false });
  const [page, setPage] = useQueryState('page', { defaultValue: '1', shallow: false });

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    void setSearch(e.target.value);
    void setPage('1');
  }

  function handleStatus(value: string | null) {
    void setStatus(value);
    void setPage('1');
  }

  function handlePage(next: number) {
    void setPage(String(next));
  }

  const { data: orders, total, pageSize } = initialData;
  const currentPage = parseInt(page, 10);
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Search customer, email, order #..."
          value={search}
          onChange={handleSearch}
          className="max-w-xs"
        />
        <Select value={status} onValueChange={handleStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PROCESSING">Processing</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link href={`/orders/${order.id}`} className="font-medium hover:underline">
                      {order.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{order.customerEmail}</TableCell>
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
                    {new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} order{total !== 1 ? 's' : ''}</span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => handlePage(currentPage - 1)}
          >
            Previous
          </Button>
          <span className="flex items-center px-2">
            {currentPage} / {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => handlePage(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
