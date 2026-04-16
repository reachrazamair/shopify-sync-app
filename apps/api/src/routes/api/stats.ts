import type { FastifyPluginAsync } from 'fastify';
import type { Prisma } from '@repo/db';

export const statsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/stats', { preHandler: [fastify.authenticate] }, async (_request, reply) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [totalOrders, ordersToday, statusGroups, revenueResult, dailyVolume] = await Promise.all([
      // Total orders
      fastify.prisma.order.count(),

      // Orders today
      fastify.prisma.order.count({
        where: { createdAt: { gte: today } },
      }),

      // Status breakdown
      fastify.prisma.order.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),

      // Total revenue (completed only)
      fastify.prisma.order.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { totalPrice: true },
      }),

      // Daily volume last 30 days
      fastify.prisma.$queryRaw<{ date: string; count: bigint; revenue: string }[]>`
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

    const completed = statusBreakdown.COMPLETED;
    const successRate = totalOrders > 0 ? Math.round((completed / totalOrders) * 100) : 0;

    const totalRevenue = (revenueResult._sum.totalPrice as Prisma.Decimal | null)?.toString() ?? '0';

    return reply.send({
      totalOrders,
      totalRevenue,
      successRate,
      ordersToday,
      statusBreakdown,
      dailyVolume: dailyVolume.map((row) => ({
        date: row.date,
        count: Number(row.count),
        revenue: row.revenue,
      })),
    });
  });
};
