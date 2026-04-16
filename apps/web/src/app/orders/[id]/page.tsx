import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@repo/db';
import { Nav } from '@/components/nav';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProcessingTimeline } from '@/components/orders/ProcessingTimeline';
import type { OrderStatus, SyncLog } from '@repo/types';

type OrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

const statusVariant: Record<OrderStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  COMPLETED: 'default',
  PENDING: 'outline',
  PROCESSING: 'secondary',
  FAILED: 'destructive',
};

export default async function OrderDetailPage(props: OrderDetailPageProps) {
  const { id } = await props.params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      lineItems: true,
      syncLogs: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!order) notFound();

  const shippingAddress = order.shippingAddress as {
    address1?: string | null;
    address2?: string | null;
    city?: string | null;
    province?: string | null;
    country?: string | null;
    zip?: string | null;
  } | null;

  const syncLogs: SyncLog[] = order.syncLogs.map((l) => ({
    ...l,
    orderId: l.orderId ?? null,
    createdAt: l.createdAt.toISOString(),
    completedAt: l.completedAt?.toISOString() ?? null,
  }));

  return (
    <div className="flex flex-col min-h-screen">
      <Nav />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/orders" className="text-sm text-muted-foreground hover:text-foreground">
            ← Orders
          </Link>
          <h1 className="text-xl font-semibold">{order.orderNumber}</h1>
          <Badge variant={statusVariant[order.status]}>{order.status}</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Customer */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Customer</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p>{order.customerName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p>{order.customerEmail}</p>
                </div>
                {order.customerPhone && (
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p>{order.customerPhone}</p>
                  </div>
                )}
                {shippingAddress && (
                  <div>
                    <p className="text-muted-foreground">Shipping</p>
                    <p>
                      {[
                        shippingAddress.address1,
                        shippingAddress.address2,
                        shippingAddress.city,
                        shippingAddress.province,
                        shippingAddress.zip,
                        shippingAddress.country,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Order date</p>
                  <p>{new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-medium">
                    {parseFloat(order.totalPrice.toString()).toLocaleString('en-US', {
                      style: 'currency',
                      currency: order.currency,
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Line Items</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.lineItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <p className="font-medium">{item.productTitle}</p>
                          {item.variantTitle && (
                            <p className="text-xs text-muted-foreground">{item.variantTitle}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {item.sku ?? '—'}
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {parseFloat(item.price.toString()).toLocaleString('en-US', {
                            style: 'currency',
                            currency: order.currency,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          {(
                            parseFloat(item.price.toString()) * item.quantity
                          ).toLocaleString('en-US', {
                            style: 'currency',
                            currency: order.currency,
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Right column — Processing timeline */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Processing History</CardTitle>
              </CardHeader>
              <CardContent>
                <ProcessingTimeline logs={syncLogs} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
