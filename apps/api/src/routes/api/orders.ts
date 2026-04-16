import type { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import type { OrderStatus } from '@repo/types';

const OrderStatusEnum = Type.Union([
  Type.Literal('PENDING'),
  Type.Literal('PROCESSING'),
  Type.Literal('COMPLETED'),
  Type.Literal('FAILED'),
]);

const OrdersQuerySchema = Type.Object({
  page: Type.Optional(Type.Number({ minimum: 1, default: 1 })),
  pageSize: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 20 })),
  status: Type.Optional(OrderStatusEnum),
  dateFrom: Type.Optional(Type.String()),
  dateTo: Type.Optional(Type.String()),
  search: Type.Optional(Type.String({ maxLength: 100 })),
});

export const ordersRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/orders
  fastify.get(
    '/api/orders',
    {
      preHandler: [fastify.authenticate],
      schema: { querystring: OrdersQuerySchema },
    },
    async (request, reply) => {
      const {
        page = 1,
        pageSize = 20,
        status,
        dateFrom,
        dateTo,
        search,
      } = request.query as {
        page?: number;
        pageSize?: number;
        status?: OrderStatus;
        dateFrom?: string;
        dateTo?: string;
        search?: string;
      };

      const where = {
        ...(status && { status }),
        ...(dateFrom || dateTo
          ? {
              createdAt: {
                ...(dateFrom && { gte: new Date(dateFrom) }),
                ...(dateTo && { lte: new Date(dateTo) }),
              },
            }
          : {}),
        ...(search && {
          OR: [
            { customerEmail: { contains: search, mode: 'insensitive' as const } },
            { customerName: { contains: search, mode: 'insensitive' as const } },
            { orderNumber: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
      };

      const [orders, total] = await Promise.all([
        fastify.prisma.order.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: { lineItems: true },
        }),
        fastify.prisma.order.count({ where }),
      ]);

      return reply.send({
        data: orders,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      });
    },
  );

  // GET /api/orders/:id
  fastify.get(
    '/api/orders/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const order = await fastify.prisma.order.findUnique({
        where: { id },
        include: {
          lineItems: true,
          syncLogs: { orderBy: { createdAt: 'asc' } },
        },
      });

      if (!order) {
        return reply.status(404).send({ error: 'Order not found' });
      }

      return reply.send(order);
    },
  );
};
