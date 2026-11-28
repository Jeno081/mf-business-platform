import { randomInt } from 'node:crypto';
import { prisma, Prisma, type OrderStatus } from '@mf/database';
import { AppError } from '../../middlewares/error-handler';
import { writeAuditLog } from '../../lib/audit';
import { signOrderToken, trackingUrl } from '../../lib/order-token';
import {
  notifyAdminNewOrder,
  notifyCustomerOrderStatus,
} from '../push/service';
import type {
  AdminOrderListQuery,
  CreateOrderInput,
  MarkOrderPaidInput,
  UpdateOrderStatusInput,
} from './schemas';

const orderDetailInclude = {
  items: {
    orderBy: { id: 'asc' as const },
    include: {
      variant: { select: { id: true, color: true, storage: true, name: true } },
    },
  },
  payments: { orderBy: { createdAt: 'desc' as const } },
  statusHistory: { orderBy: { createdAt: 'asc' as const } },
  shipments: { orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.OrderInclude;

type OrderDetail = Prisma.OrderGetPayload<{ include: typeof orderDetailInclude }>;

const orderSummaryInclude = {
  items: { select: { id: true, quantity: true, productName: true } },
  payments: { select: { status: true, method: true, provider: true } },
} satisfies Prisma.OrderInclude;

type OrderSummary = Prisma.OrderGetPayload<{ include: typeof orderSummaryInclude }>;

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

function orderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `MF-${date}-${randomInt(1000, 9999)}`;
}

function decimal(value: Prisma.Decimal | number | string): Prisma.Decimal {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

function publicOrder(order: OrderDetail) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    currency: order.currency,
    subtotal: Number(order.subtotal),
    deliveryFee: Number(order.deliveryFee),
    total: Number(order.total),
    customer: {
      name: order.customerName,
      phone: order.customerPhone,
      email: order.customerEmail,
    },
    shippingAddress: order.shippingAddress,
    notes: order.notes,
    createdAt: order.createdAt.toISOString(),
    trackingToken: signOrderToken(order.id),
    trackingUrl: trackingUrl(signOrderToken(order.id)),
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      variantLabel: item.variantLabel,
      sku: item.sku,
      unitPrice: Number(item.unitPrice),
      quantity: item.quantity,
      lineTotal: Number(item.lineTotal),
      variant: item.variant,
    })),
    payments: order.payments.map((payment) => ({
      id: payment.id,
      status: payment.status,
      method: payment.method,
      provider: payment.provider,
      amount: Number(payment.amount),
      paidAt: payment.paidAt?.toISOString() ?? null,
    })),
    statusHistory: order.statusHistory.map((entry) => ({
      id: entry.id,
      status: entry.status,
      note: entry.note,
      createdAt: entry.createdAt.toISOString(),
    })),
    shipments: order.shipments.map((shipment) => ({
      id: shipment.id,
      status: shipment.status,
      carrier: shipment.carrier,
      trackingNumber: shipment.trackingNumber,
      deliveredAt: shipment.deliveredAt?.toISOString() ?? null,
    })),
  };
}

function summaryOrder(order: OrderSummary) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    total: Number(order.total),
    currency: order.currency,
    itemsCount: order.items.reduce((total, item) => total + item.quantity, 0),
    itemsPreview: order.items.slice(0, 3).map((item) => item.productName),
    createdAt: order.createdAt.toISOString(),
  };
}

async function findDetail(id: string): Promise<OrderDetail> {
  const order = await prisma.order.findUnique({
    where: { id },
    include: orderDetailInclude,
  });
  if (!order) throw new AppError('Commande introuvable.', 404, 'ORDER_NOT_FOUND');
  return order;
}

export async function createOrder(input: CreateOrderInput) {
  if (input.idempotencyKey) {
    const existing = await prisma.order.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: orderDetailInclude,
    });
    if (existing) return publicOrder(existing);
  }

  const quantities = new Map<string, number>();
  for (const item of input.items) {
    quantities.set(item.variantId, (quantities.get(item.variantId) ?? 0) + item.quantity);
  }

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: [...quantities.keys()] } },
    include: {
      product: {
        select: { id: true, name: true, price: true, status: true, deletedAt: true },
      },
    },
  });

  if (variants.length !== quantities.size) {
    throw new AppError('Un produit du panier est introuvable.', 400, 'PRODUCT_NOT_FOUND');
  }

  for (const variant of variants) {
    if (
      !variant.isActive ||
      variant.product.status !== 'ACTIVE' ||
      variant.product.deletedAt !== null
    ) {
      throw new AppError(
        `${variant.product.name} n’est plus disponible.`,
        409,
        'PRODUCT_UNAVAILABLE',
      );
    }
    const requested = quantities.get(variant.id) ?? 0;
    if (variant.stockQuantity < requested) {
      throw new AppError(
        `Stock insuffisant pour ${variant.product.name}. Disponible : ${variant.stockQuantity}.`,
        409,
        'OUT_OF_STOCK',
        { variantId: variant.id, available: variant.stockQuantity },
      );
    }
  }

  let subtotal = new Prisma.Decimal(0);
  const preparedItems = variants.map((variant) => {
    const quantity = quantities.get(variant.id) ?? 0;
    const unitPrice = decimal(variant.priceOverride ?? variant.product.price);
    const lineTotal = unitPrice.mul(quantity);
    subtotal = subtotal.add(lineTotal);
    const variantLabel = [variant.color, variant.storage].filter(Boolean).join(' · ');
    return {
      productId: variant.product.id,
      variantId: variant.id,
      productName: variant.product.name,
      variantLabel: variantLabel || variant.name,
      sku: variant.sku,
      unitPrice,
      quantity,
      lineTotal,
    };
  });

  const deliveryFee = subtotal.gte(150) ? new Prisma.Decimal(0) : new Prisma.Decimal(5);
  const total = subtotal.add(deliveryFee);
  const paymentProvider =
    input.paymentMethod === 'MOBILE_MONEY' ? 'MPESA' : 'CASH_ON_DELIVERY';
  const shippingAddress = {
    recipient: input.customer.name,
    phone: input.customer.phone,
    city: input.customer.city,
    commune: input.customer.commune,
    address: input.customer.address,
    note: input.customer.note ?? null,
  };

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const number = orderNumber();

    try {
      const order = await prisma.$transaction(
        async (tx) => {
          for (const item of preparedItems) {
            const updated = await tx.productVariant.updateMany({
              where: {
                id: item.variantId,
                isActive: true,
                stockQuantity: { gte: item.quantity },
              },
              data: { stockQuantity: { decrement: item.quantity } },
            });
            if (updated.count !== 1) {
              throw new AppError(
                `Stock insuffisant pour ${item.productName}.`,
                409,
                'OUT_OF_STOCK',
              );
            }
          }

          const created = await tx.order.create({
            data: {
              orderNumber: number,
              idempotencyKey: input.idempotencyKey ?? null,
              customerName: input.customer.name,
              customerPhone: input.customer.phone,
              customerEmail: input.customer.email || null,
              shippingAddress,
              subtotal,
              deliveryFee,
              total,
              currency: 'USD',
              status: 'PENDING',
              paymentStatus: 'PENDING',
              paymentMethod: input.paymentMethod,
              notes: input.customer.note ?? null,
              customerPushToken: input.pushToken ?? null,
              items: {
                create: preparedItems.map((item) => ({
                  productId: item.productId,
                  variantId: item.variantId,
                  productName: item.productName,
                  variantLabel: item.variantLabel,
                  sku: item.sku,
                  unitPrice: item.unitPrice,
                  quantity: item.quantity,
                  lineTotal: item.lineTotal,
                })),
              },
              statusHistory: {
                create: { status: 'PENDING', note: 'Commande créée depuis le site.' },
              },
              payments: {
                create: {
                  provider: paymentProvider,
                  method: input.paymentMethod,
                  amount: total,
                  status: 'PENDING',
                },
              },
            },
            include: orderDetailInclude,
          });

          await tx.inventoryMovement.createMany({
            data: preparedItems.map((item) => ({
              variantId: item.variantId,
              type: 'SALE',
              quantityDelta: -item.quantity,
              referenceType: 'ORDER',
              referenceId: created.id,
              note: `Commande ${created.orderNumber}`,
            })),
          });

          return created;
        },
        { timeout: 60_000, maxWait: 10_000 },
      );

      const result = publicOrder(order);
      void notifyAdminNewOrder(
        result.orderNumber,
        `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(result.total)} $`,
      ).catch(() => {});
      return result;
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (typeof error === 'object' && error !== null && 'code' in error) {
        const code = (error as { code?: string }).code;
        if (code === 'P2002') {
          if (input.idempotencyKey) {
            const existing = await prisma.order.findUnique({
              where: { idempotencyKey: input.idempotencyKey },
              include: orderDetailInclude,
            });
            if (existing) return publicOrder(existing);
          }
          if (attempt < 5) continue;
        }
      }
      throw error;
    }
  }

  throw new AppError('Impossible de générer un numéro de commande.', 500, 'ORDER_NUMBER_FAILED');
}

export async function adminListOrders(query: AdminOrderListQuery) {
  const where: Prisma.OrderWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
  if (query.search) {
    where.OR = [
      { orderNumber: { contains: query.search } },
      { customerName: { contains: query.search } },
      { customerPhone: { contains: query.search } },
    ];
  }
  if (query.from || query.to) {
    where.createdAt = {
      ...(query.from ? { gte: new Date(query.from) } : {}),
      ...(query.to ? { lte: new Date(`${query.to}T23:59:59.999Z`) } : {}),
    };
  }

  const [total, rows] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: orderSummaryInclude,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
    }),
  ]);

  return {
    data: rows.map(summaryOrder),
    meta: {
      page: query.page,
      perPage: query.perPage,
      total,
      totalPages: Math.ceil(total / query.perPage),
    },
  };
}

export async function adminGetOrder(id: string) {
  return publicOrder(await findDetail(id));
}

export async function getTrackingOrder(id: string) {
  return publicOrder(await findDetail(id));
}

export async function updateOrderStatus(
  id: string,
  input: UpdateOrderStatusInput,
  actorId: string,
) {
  const order = await findDetail(id);

  if (order.status === input.status) {
    return publicOrder(order);
  }

  if (!TRANSITIONS[order.status].includes(input.status)) {
    throw new AppError(
      `Transition impossible de ${order.status} vers ${input.status}.`,
      409,
      'INVALID_ORDER_TRANSITION',
    );
  }

  const now = new Date();
  const isCancel = input.status === 'CANCELLED';

  await prisma.$transaction(
    async (tx) => {
      if (isCancel) {
        for (const item of order.items) {
          if (!item.variantId) continue;
          await tx.productVariant.updateMany({
            where: { id: item.variantId },
            data: { stockQuantity: { increment: item.quantity } },
          });
          await tx.inventoryMovement.create({
            data: {
              variantId: item.variantId,
              type: 'RETURN',
              quantityDelta: item.quantity,
              referenceType: 'ORDER',
              referenceId: order.id,
              note: `Annulation ${order.orderNumber}`,
              createdById: actorId,
            },
          });
        }
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: input.status,
          ...(input.status === 'CONFIRMED' ? { confirmedAt: now } : {}),
          ...(input.status === 'DELIVERED'
            ? {
                deliveredAt: now,
                paymentStatus: 'PAID',
                payments: {
                  updateMany: {
                    where: { status: { in: ['PENDING', 'AUTHORIZED'] } },
                    data: { status: 'PAID', paidAt: now },
                  },
                },
              }
            : {}),
          ...(isCancel ? { cancelledAt: now } : {}),
          ...(input.status === 'REFUNDED'
            ? {
                paymentStatus: 'REFUNDED',
                payments: {
                  updateMany: {
                    where: { status: 'PAID' },
                    data: { status: 'REFUNDED' },
                  },
                },
              }
            : {}),
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: input.status,
          changedById: actorId,
          note: input.note ?? null,
        },
      });
    },
    { timeout: 60_000, maxWait: 10_000 },
  );

  await writeAuditLog({
    actorId,
    action: 'ORDER_STATUS_UPDATED',
    entityType: 'Order',
    entityId: order.id,
    before: { status: order.status },
    after: { status: input.status, note: input.note },
  });

  const updated = publicOrder(await findDetail(order.id));
  const statusMessages: Record<string, string> = {
    CONFIRMED: 'Votre commande est confirmée. Merci pour votre confiance !',
    PREPARING: 'Votre commande est en préparation.',
    SHIPPED: 'Votre commande est en route !',
    DELIVERED: 'Votre commande a été livrée. Merci !',
    CANCELLED: 'Votre commande a été annulée.',
    REFUNDED: 'Votre commande a été remboursée.',
  };
  const statusMessage = statusMessages[input.status];
  if (statusMessage) {
    void notifyCustomerOrderStatus(
      order.customerPushToken,
      order.orderNumber,
      statusMessage,
      updated.trackingUrl,
    ).catch(() => {});
  }
  return updated;
}

export async function markOrderPaid(
  id: string,
  input: MarkOrderPaidInput,
  actorId: string,
) {
  const order = await findDetail(id);

  await prisma.$transaction(
    async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: input.paid ? 'PAID' : 'PENDING' },
      });
      await tx.payment.updateMany({
        where: { orderId: order.id },
        data: input.paid
          ? { status: 'PAID', paidAt: new Date() }
          : { status: 'PENDING', paidAt: null },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: order.status,
          changedById: actorId,
          note: input.note ?? (input.paid ? 'Paiement encaissé.' : 'Paiement remis en attente.'),
        },
      });
    },
    { timeout: 60_000, maxWait: 10_000 },
  );

  await writeAuditLog({
    actorId,
    action: input.paid ? 'ORDER_MARKED_PAID' : 'ORDER_PAYMENT_RESET',
    entityType: 'Order',
    entityId: order.id,
    after: { paid: input.paid },
  });

  return publicOrder(await findDetail(order.id));
}
