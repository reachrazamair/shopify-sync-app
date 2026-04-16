import { PrismaClient, OrderStatus, SyncStatus } from '@prisma/client';

const prisma = new PrismaClient();

const statuses: OrderStatus[] = ['PENDING', 'PROCESSING', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'FAILED'];

const products = [
  { title: 'Classic T-Shirt', variant: 'Blue / M', sku: 'TS-BLU-M', price: '29.99' },
  { title: 'Running Shoes', variant: 'Size 10', sku: 'RS-10', price: '89.99' },
  { title: 'Wireless Headphones', variant: 'Black', sku: 'WH-BLK', price: '149.99' },
  { title: 'Coffee Mug', variant: '12oz', sku: 'CM-12', price: '14.99' },
  { title: 'Yoga Mat', variant: 'Purple', sku: 'YM-PRP', price: '39.99' },
];

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  console.log('🌱 Seeding database...');

  await prisma.syncLog.deleteMany();
  await prisma.lineItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();

  // Seed products
  await prisma.product.createMany({
    data: products.map((p, i) => ({
      shopifyProductId: `gid://shopify/Product/${7000000000 + i}`,
      title: p.title,
      vendor: 'Demo Vendor',
      productType: 'General',
      handle: p.title.toLowerCase().replace(/ /g, '-'),
      status: 'active',
      lastSyncedAt: new Date(),
    })),
  });

  // Seed 20 orders
  for (let i = 0; i < 20; i++) {
    const status = statuses[i % statuses.length] as OrderStatus;
    const shopifyOrderId = `${5000000000 + i}`;
    const daysBack = randomBetween(0, 30);
    const createdAt = daysAgo(daysBack);
    const product = products[i % products.length]!;
    const quantity = randomBetween(1, 3);
    const totalPrice = (parseFloat(product.price) * quantity).toFixed(2);
    const firstNames = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'];
    const firstName = firstNames[i % firstNames.length]!;
    const lastName = lastNames[i % lastNames.length]!;

    const order = await prisma.order.create({
      data: {
        shopifyOrderId,
        orderNumber: `#${1000 + i}`,
        status,
        totalPrice,
        currency: 'USD',
        customerEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        customerName: `${firstName} ${lastName}`,
        customerPhone: `+1555${String(i).padStart(7, '0')}`,
        shippingAddress: {
          address1: `${100 + i} Main St`,
          address2: null,
          city: 'New York',
          province: 'NY',
          country: 'US',
          zip: '10001',
        },
        rawPayload: {
          id: parseInt(shopifyOrderId),
          order_number: 1000 + i,
          email: `${firstName.toLowerCase()}@example.com`,
          total_price: totalPrice,
          currency: 'USD',
        },
        processedAt: status === 'COMPLETED' || status === 'FAILED' ? createdAt : null,
        createdAt,
        updatedAt: createdAt,
        lineItems: {
          create: [
            {
              shopifyLineId: `${8000000000 + i}`,
              productTitle: product.title,
              variantTitle: product.variant,
              sku: product.sku,
              quantity,
              price: product.price,
            },
          ],
        },
      },
    });

    // Sync logs per order
    const events: { eventType: string; activityName: string | null; status: SyncStatus }[] = [
      { eventType: 'workflow_started', activityName: null, status: 'SUCCESS' },
      { eventType: 'validateOrder', activityName: 'validateOrder', status: 'SUCCESS' },
      { eventType: 'enrichOrder', activityName: 'enrichOrder', status: status === 'FAILED' ? 'FAILURE' : 'SUCCESS' },
    ];

    if (status !== 'FAILED') {
      events.push(
        { eventType: 'transformOrder', activityName: 'transformOrder', status: 'SUCCESS' },
        { eventType: 'storeOrder', activityName: 'storeOrder', status: 'SUCCESS' },
        { eventType: 'workflow_completed', activityName: null, status: 'SUCCESS' },
      );
    }

    await prisma.syncLog.createMany({
      data: events.map((e, j) => ({
        orderId: order.id,
        eventType: e.eventType,
        activityName: e.activityName,
        status: e.status,
        errorMessage: e.status === 'FAILURE' ? 'Shopify API timeout after 3 retries' : null,
        workflowRunId: `workflow-run-${shopifyOrderId}`,
        durationMs: randomBetween(50, 2000),
        createdAt: new Date(createdAt.getTime() + j * 1000),
        completedAt: new Date(createdAt.getTime() + j * 1000 + randomBetween(50, 2000)),
      })),
    });
  }

  const orderCount = await prisma.order.count();
  const logCount = await prisma.syncLog.count();
  console.log(`✅ Seeded ${orderCount} orders and ${logCount} sync log entries`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
