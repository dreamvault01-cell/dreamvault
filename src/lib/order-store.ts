import 'server-only';

import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import prisma from './prisma';
import { queueOrderNotification, type OrderForNotification } from './order-notifications';
import {
  canApplyFulfillmentAction,
  canMarkOrderRefunded,
  getRecordedCaptureOutcome,
  type FulfillmentAction,
} from './order-types';
import type { ValidatedCheckoutInput } from './order-validation';
import {
  getConfigurationLabel,
  normalizeProductConfiguration,
} from './product-configuration';

type Transaction = Prisma.TransactionClient;

export class OrderStoreError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'OrderStoreError';
  }
}

interface AggregatedCheckoutLine {
  productId: string;
  variantId: string;
  quantity: number;
  expectedUnitPrice: number;
}

interface PreparedLine extends AggregatedCheckoutLine {
  productName: string;
  price: number;
  variantSku: string | null;
  size: string;
  configuration: { size: string; format: string; paper: string; frame: string; label: string };
}

interface ReservationRow {
  id: string;
  orderId: string;
  variantId: string;
  quantity: number;
  status: string;
  expiresAt: Date | null;
  committedAt: Date | null;
  releasedAt: Date | null;
}

export interface PaymentFinalizationInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amountPaise: number;
  currency: string;
  source: 'CHECKOUT_CALLBACK' | 'WEBHOOK';
  // Browser callbacks are additionally tied to the signed-in customer. The
  // provider webhook intentionally omits this because it is authenticated by
  // its own signature.
  expectedUserId?: string;
}

export interface PaymentFinalizationResult {
  orderId: string;
  orderReference: string;
  outcome: 'PAID' | 'ALREADY_PAID' | 'REVIEW';
}

function orderReference(now = new Date()) {
  const date = [now.getUTCFullYear(), String(now.getUTCMonth() + 1).padStart(2, '0'), String(now.getUTCDate()).padStart(2, '0')].join('');
  return `DV-${date}-${randomBytes(8).toString('hex').toUpperCase()}`;
}

function aggregateLines(items: ValidatedCheckoutInput['items']): AggregatedCheckoutLine[] {
  const lines = new Map<string, AggregatedCheckoutLine>();
  for (const item of items) {
    const prior = lines.get(item.variantId);
    if (prior && prior.productId !== item.id) {
      throw new OrderStoreError(400, 'A selected configuration does not match its artwork. Refresh your cart and try again.');
    }
    if (prior && Math.round(prior.expectedUnitPrice * 100) !== Math.round(item.expectedUnitPrice * 100)) {
      throw new OrderStoreError(409, 'Your cart contains different prices for the same configuration. Review the print options before checking out.');
    }
    const quantity = (prior?.quantity ?? 0) + item.quantity;
    if (quantity > 99) throw new OrderStoreError(400, 'A configuration cannot exceed 99 prints in one order.');
    lines.set(item.variantId, { productId: item.id, variantId: item.variantId, quantity, expectedUnitPrice: item.expectedUnitPrice });
  }
  return [...lines.values()].sort((first, second) => first.variantId.localeCompare(second.variantId));
}

async function inOrderTransaction<T>(operation: (tx: Transaction) => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 12_000,
        timeout: 25_000,
      });
    } catch (error) {
      lastError = error;
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
      if (code !== 'P2034' || attempt === 2) throw error;
    }
  }
  throw lastError;
}

async function lockOrder(tx: Transaction, orderId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`order/${orderId}`}))`;
}

async function lockVariants(tx: Transaction, variantIds: string[]) {
  for (const variantId of [...new Set(variantIds)].sort()) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`inventory/${variantId}`}))`;
  }
}

async function getOrderWithReservations(tx: Transaction, id: string) {
  return tx.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: { select: { name: true } } } },
      reservations: true,
    },
  });
}

function notificationOrder(order: Awaited<ReturnType<typeof getOrderWithReservations>>): OrderForNotification {
  if (!order) throw new OrderStoreError(404, 'Order not found.');
  return {
    id: order.id,
    orderReference: order.orderReference,
    shippingName: order.shippingName,
    shippingEmail: order.shippingEmail,
    totalAmount: order.totalAmount,
    fulfillmentStatus: order.fulfillmentStatus,
    paymentStatus: order.paymentStatus,
    trackingCarrier: order.trackingCarrier,
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
    cancellationReason: order.cancellationReason,
    items: order.items,
  };
}

async function addEvent(tx: Transaction, orderId: string, type: string, message?: string, data: Prisma.InputJsonValue = {}, actorId?: string) {
  await tx.orderEvent.create({ data: { orderId, type, message, data, actorId } });
}

async function reserveVariant(tx: Transaction, variantId: string, quantity: number) {
  const rows = await tx.$queryRaw<{ id: string }[]>`UPDATE "ProductVariant"
    SET "reservedStock"="reservedStock"+${quantity}
    WHERE "id"=${variantId} AND "stock"-"reservedStock">=${quantity}
    RETURNING "id"`;
  if (!rows[0]) throw new OrderStoreError(409, 'One of your selected prints just sold out. Please review your cart and try again.');
}

async function releaseReservations(tx: Transaction, orderId: string, reservations: ReservationRow[], now: Date) {
  const active = reservations.filter((reservation) => reservation.status === 'RESERVED');
  await lockVariants(tx, active.map((reservation) => reservation.variantId));
  for (const reservation of active) {
    const rows = await tx.$queryRaw<{ id: string }[]>`UPDATE "ProductVariant"
      SET "reservedStock"="reservedStock"-${reservation.quantity}
      WHERE "id"=${reservation.variantId} AND "reservedStock">=${reservation.quantity}
      RETURNING "id"`;
    if (!rows[0]) throw new OrderStoreError(503, 'Inventory needs review before this order can be released.');
    await tx.inventoryReservation.update({
      where: { id: reservation.id },
      data: { status: 'RELEASED', releasedAt: now },
    });
  }
}

async function canCommitReservations(tx: Transaction, reservations: ReservationRow[]) {
  if (!reservations.length || reservations.some((reservation) => reservation.status !== 'RESERVED')) return false;
  await lockVariants(tx, reservations.map((reservation) => reservation.variantId));
  const variants = await tx.productVariant.findMany({
    where: { id: { in: reservations.map((reservation) => reservation.variantId) } },
    select: { id: true, stock: true, reservedStock: true },
  });
  const byId = new Map(variants.map((variant) => [variant.id, variant]));
  return reservations.every((reservation) => {
    const variant = byId.get(reservation.variantId);
    return Boolean(variant && variant.stock >= reservation.quantity && variant.reservedStock >= reservation.quantity);
  });
}

async function commitReservations(tx: Transaction, orderId: string, reservations: ReservationRow[], now: Date) {
  if (!await canCommitReservations(tx, reservations)) return false;
  for (const reservation of reservations) {
    const rows = await tx.$queryRaw<{ id: string }[]>`UPDATE "ProductVariant"
      SET "stock"="stock"-${reservation.quantity},"reservedStock"="reservedStock"-${reservation.quantity}
      WHERE "id"=${reservation.variantId} AND "stock">=${reservation.quantity} AND "reservedStock">=${reservation.quantity}
      RETURNING "id"`;
    if (!rows[0]) return false;
    await tx.inventoryReservation.update({
      where: { id: reservation.id },
      data: { status: 'COMMITTED', committedAt: now, expiresAt: null },
    });
  }
  await tx.order.update({
    where: { id: orderId },
    data: { stockCommittedAt: now, reservationExpiresAt: null },
  });
  return true;
}

async function restockCommittedReservations(tx: Transaction, reservations: ReservationRow[], now: Date) {
  const committed = reservations.filter((reservation) => reservation.status === 'COMMITTED');
  await lockVariants(tx, committed.map((reservation) => reservation.variantId));
  for (const reservation of committed) {
    await tx.productVariant.update({
      where: { id: reservation.variantId },
      data: { stock: { increment: reservation.quantity } },
    });
    await tx.inventoryReservation.update({
      where: { id: reservation.id },
      data: { status: 'RESTOCKED', releasedAt: now },
    });
  }
}

async function prepareLines(tx: Transaction, lines: AggregatedCheckoutLine[]): Promise<PreparedLine[]> {
  const prepared: PreparedLine[] = [];
  await lockVariants(tx, lines.map((line) => line.variantId));
  for (const line of lines) {
    const variant = await tx.productVariant.findUnique({
      where: { id: line.variantId },
      include: { product: { select: { id: true, name: true, status: true } } },
    });
    if (!variant || variant.productId !== line.productId || variant.product.status !== 'ACTIVE') {
      throw new OrderStoreError(409, 'One of your selected artworks is no longer available. Please return to the product page and choose again.');
    }
    if (Math.round(variant.price * 100) !== Math.round(line.expectedUnitPrice * 100)) {
      throw new OrderStoreError(409, 'The price of a selected print has changed. Return to its product page, review the current price, and add it to your cart again. No order has been placed.');
    }
    const configuration = normalizeProductConfiguration({
      size: variant.size,
      format: variant.format,
      paper: variant.paper,
      frame: variant.frame,
    });
    prepared.push({
      ...line,
      productName: variant.product.name,
      price: variant.price,
      variantSku: variant.sku,
      size: configuration.size,
      configuration: {
        size: configuration.size,
        format: configuration.format,
        paper: configuration.paper,
        frame: configuration.frame,
        label: getConfigurationLabel(configuration),
      },
    });
  }
  return prepared;
}

export interface CreatedCheckoutOrder {
  id: string;
  orderReference: string;
  totalAmount: number;
  paymentMethod: 'RAZORPAY' | 'COD';
  reservationExpiresAt: Date | null;
}

/** Create a draft order and atomically hold its exact configurations. */
export async function createCheckoutOrder(input: ValidatedCheckoutInput, userId: string): Promise<CreatedCheckoutOrder> {
  // A checkout request also performs a small cleanup pass. This keeps stock
  // accurate even before a production scheduler has had a chance to run.
  await releaseExpiredReservations({ limit: 20 });
  const lines = aggregateLines(input.items);
  const now = new Date();
  const expiresAt = input.paymentMethod === 'RAZORPAY' ? new Date(now.getTime() + 15 * 60_000) : null;

  return inOrderTransaction(async (tx) => {
    const prepared = await prepareLines(tx, lines);
    // Reserve only after every line is validated. A failed later line rolls the
    // whole transaction back, including every earlier reservation.
    for (const line of prepared) await reserveVariant(tx, line.variantId, line.quantity);
    const totalPaise = prepared.reduce((sum, line) => sum + Math.round(line.price * 100) * line.quantity, 0);
    if (!Number.isSafeInteger(totalPaise) || totalPaise < 100) throw new OrderStoreError(400, 'Order total must be at least ₹1.');
    const reference = orderReference(now);
    const order = await tx.order.create({
      data: {
        orderReference: reference,
        userId,
        totalAmount: totalPaise / 100,
        shippingName: input.shipping.name,
        shippingEmail: input.shipping.email,
        shippingPhone: input.shipping.phone,
        shippingAddress: input.shipping.address,
        shippingCity: input.shipping.city,
        shippingState: input.shipping.state,
        shippingPin: input.shipping.pin,
        paymentMethod: input.paymentMethod,
        status: 'PENDING',
        paymentStatus: input.paymentMethod === 'COD' ? 'COD_PENDING' : 'PENDING',
        fulfillmentStatus: 'UNFULFILLED',
        refundStatus: input.paymentMethod === 'COD' ? 'NOT_REQUIRED' : 'NONE',
        reservationExpiresAt: expiresAt,
        items: {
          create: prepared.map((line) => ({
            productId: line.productId,
            variantId: line.variantId,
            variantSku: line.variantSku,
            quantity: line.quantity,
            price: line.price,
            size: line.size,
            configuration: line.configuration,
          })),
        },
      },
    });
    await tx.inventoryReservation.createMany({
      data: prepared.map((line) => ({
        orderId: order.id,
        variantId: line.variantId,
        quantity: line.quantity,
        status: 'RESERVED',
        expiresAt,
      })),
    });
    await addEvent(tx, order.id, 'ORDER_CREATED', 'Checkout started.', { paymentMethod: input.paymentMethod });
    await addEvent(tx, order.id, 'STOCK_RESERVED', 'Inventory was temporarily held for checkout.', { expiresAt: expiresAt?.toISOString() ?? null });

    if (input.paymentMethod === 'COD') {
      const withReservations = await getOrderWithReservations(tx, order.id);
      if (!withReservations || !await commitReservations(tx, order.id, withReservations.reservations, now)) {
        throw new OrderStoreError(409, 'The selected stock could not be confirmed. Please try again.');
      }
      await addEvent(tx, order.id, 'STOCK_COMMITTED', 'Stock committed for cash on delivery.');
      const ready = await getOrderWithReservations(tx, order.id);
      await queueOrderNotification(tx, notificationOrder(ready), 'ORDER_RECEIVED');
    }

    return {
      id: order.id,
      orderReference: reference,
      totalAmount: totalPaise / 100,
      paymentMethod: input.paymentMethod,
      reservationExpiresAt: expiresAt,
    };
  });
}

export async function attachRazorpayOrder(orderId: string, razorpayOrderId: string) {
  return inOrderTransaction(async (tx) => {
    await lockOrder(tx, orderId);
    const order = await tx.order.findUnique({ where: { id: orderId }, select: { id: true, razorpayOrderId: true, paymentStatus: true } });
    if (!order) throw new OrderStoreError(404, 'Order not found.');
    if (order.paymentStatus !== 'PENDING') throw new OrderStoreError(409, 'This order is no longer awaiting an online payment.');
    if (order.razorpayOrderId && order.razorpayOrderId !== razorpayOrderId) throw new OrderStoreError(409, 'A payment session already exists for this order.');
    if (!order.razorpayOrderId) {
      await tx.order.update({ where: { id: orderId }, data: { razorpayOrderId } });
      await addEvent(tx, orderId, 'PAYMENT_SESSION_CREATED', 'Secure payment session created.');
    }
  });
}

/** Release a draft checkout if Razorpay could not create its payment order. */
export async function cancelUnstartedPayment(orderId: string) {
  return inOrderTransaction(async (tx) => {
    await lockOrder(tx, orderId);
    const order = await getOrderWithReservations(tx, orderId);
    if (!order || order.stockCommittedAt || order.paymentStatus !== 'PENDING') return;
    await releaseReservations(tx, order.id, order.reservations, new Date());
    await tx.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED', paymentStatus: 'FAILED', fulfillmentStatus: 'CANCELLED', cancelledAt: new Date(), reservationExpiresAt: null },
    });
    await addEvent(tx, order.id, 'PAYMENT_SESSION_FAILED', 'Payment session could not be created; held stock was released.');
  });
}

async function markPaymentReview(tx: Transaction, orderId: string, paymentId: string, source: PaymentFinalizationInput['source'], message: string) {
  const current = await tx.order.findUnique({ where: { id: orderId }, select: { fulfillmentStatus: true } });
  await tx.order.update({
    where: { id: orderId },
    data: {
      status: 'PAYMENT_REVIEW',
      paymentStatus: 'PAID_REVIEW',
      razorpayPaymentId: paymentId,
      // A late payment may arrive after the scheduler cancelled and released
      // an unpaid checkout. Expose the refund workflow for that received money.
      refundStatus: current?.fulfillmentStatus === 'CANCELLED' ? 'PENDING' : undefined,
    },
  });
  await addEvent(tx, orderId, 'PAYMENT_REVIEW', message, { source, paymentId });
  const ready = await getOrderWithReservations(tx, orderId);
  await queueOrderNotification(tx, notificationOrder(ready), 'PAYMENT_REVIEW');
  return { orderId, orderReference: ready!.orderReference, outcome: 'REVIEW' as const };
}

async function finalizeCapturedPaymentInTransaction(tx: Transaction, input: PaymentFinalizationInput): Promise<PaymentFinalizationResult> {
  const found = await tx.order.findUnique({ where: { razorpayOrderId: input.razorpayOrderId }, select: { id: true } });
  if (!found) throw new OrderStoreError(404, 'Payment order was not found.');
  await lockOrder(tx, found.id);
  const order = await getOrderWithReservations(tx, found.id);
  if (!order) throw new OrderStoreError(404, 'Order not found.');
  if (input.expectedUserId && order.userId !== input.expectedUserId) {
    throw new OrderStoreError(403, 'This payment does not belong to your account.');
  }
  if (order.paymentMethod !== 'RAZORPAY') throw new OrderStoreError(409, 'This order does not use online payment.');
  if (order.razorpayPaymentId && order.razorpayPaymentId !== input.razorpayPaymentId) {
    await addEvent(tx, order.id, 'PAYMENT_DUPLICATE_REVIEW', 'A second payment identifier was received for this order and needs staff review.', { source: input.source, paymentId: input.razorpayPaymentId });
    return { orderId: order.id, orderReference: order.orderReference, outcome: 'REVIEW' };
  }
  const recordedOutcome = order.razorpayPaymentId === input.razorpayPaymentId
    ? getRecordedCaptureOutcome(order.paymentStatus, order.refundStatus, Boolean(order.stockCommittedAt))
    : null;
  if (recordedOutcome) {
    return { orderId: order.id, orderReference: order.orderReference, outcome: recordedOutcome };
  }
  if (input.currency.toUpperCase() !== 'INR' || input.amountPaise !== Math.round(order.totalAmount * 100)) {
    // A signed provider event with a mismatched value is never fulfilled.
    // Keep its stock hold intact and surface it to staff instead of retrying
    // the same webhook indefinitely or trusting a browser total.
    return markPaymentReview(tx, order.id, input.razorpayPaymentId, input.source, 'Payment was captured with an amount or currency that does not match the saved order.');
  }
  if (!await canCommitReservations(tx, order.reservations)) {
    return markPaymentReview(tx, order.id, input.razorpayPaymentId, input.source, 'Payment was captured but the stock hold needs staff review.');
  }
  const now = new Date();
  if (!await commitReservations(tx, order.id, order.reservations, now)) {
    return markPaymentReview(tx, order.id, input.razorpayPaymentId, input.source, 'Payment was captured but inventory could not be committed automatically.');
  }
  await tx.order.update({
    where: { id: order.id },
    data: { status: 'PAID', paymentStatus: 'PAID', razorpayPaymentId: input.razorpayPaymentId },
  });
  await addEvent(tx, order.id, 'PAYMENT_CAPTURED', 'Online payment captured and verified.', { source: input.source, paymentId: input.razorpayPaymentId });
  await addEvent(tx, order.id, 'STOCK_COMMITTED', 'Reserved inventory was committed after payment.');
  const ready = await getOrderWithReservations(tx, order.id);
  await queueOrderNotification(tx, notificationOrder(ready), 'ORDER_CONFIRMED');
  return { orderId: order.id, orderReference: order.orderReference, outcome: 'PAID' };
}

/** Idempotent final step shared by the browser callback and Razorpay webhook. */
export async function finalizeCapturedPayment(input: PaymentFinalizationInput): Promise<PaymentFinalizationResult> {
  return inOrderTransaction((tx) => finalizeCapturedPaymentInTransaction(tx, input));
}

export interface RazorpayWebhookInput {
  eventId: string;
  eventType: string;
  payloadHash: string;
  occurredAt: Date | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  amountPaise: number | null;
  currency: string | null;
  captured: boolean;
}

/** Store every verified provider event once, then safely react to captured money. */
export async function processRazorpayWebhook(input: RazorpayWebhookInput) {
  return inOrderTransaction(async (tx) => {
    const existing = await tx.paymentWebhookEvent.findUnique({ where: { providerEventId: input.eventId } });
    if (existing) return { duplicate: true, outcome: 'IGNORED' as const };
    const order = input.razorpayOrderId
      ? await tx.order.findUnique({ where: { razorpayOrderId: input.razorpayOrderId }, select: { id: true } })
      : null;
    await tx.paymentWebhookEvent.create({
      data: {
        providerEventId: input.eventId,
        eventType: input.eventType,
        orderId: order?.id,
        paymentId: input.razorpayPaymentId,
        payloadHash: input.payloadHash,
        occurredAt: input.occurredAt,
      },
    });
    // Keep verified events for unknown provider orders too. Acknowledging the
    // event prevents an unrelated Razorpay event from being retried forever;
    // our checkout attaches its Razorpay order before it is exposed to a
    // customer, so an unknown order cannot be a valid DreamVault checkout.
    if (!order || !input.captured || !input.razorpayOrderId || !input.razorpayPaymentId || input.amountPaise === null || !input.currency) {
      if (order) await addEvent(tx, order.id, `RAZORPAY_${input.eventType.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`, 'Payment provider event received.');
      return { duplicate: false, outcome: 'IGNORED' as const };
    }
    const result = await finalizeCapturedPaymentInTransaction(tx, {
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      amountPaise: input.amountPaise,
      currency: input.currency,
      source: 'WEBHOOK',
    });
    return { duplicate: false, outcome: result.outcome, orderReference: result.orderReference };
  });
}

/** Release payment holds that passed their expiry. Safe on overlapping workers. */
export async function releaseExpiredReservations(options: { limit?: number } = {}) {
  const limit = Math.max(1, Math.min(100, options.limit ?? 25));
  const candidates = await prisma.order.findMany({
    where: {
      paymentStatus: 'PENDING',
      stockCommittedAt: null,
      reservationExpiresAt: { lt: new Date() },
    },
    select: { id: true },
    take: limit,
    orderBy: { reservationExpiresAt: 'asc' },
  });
  let released = 0;
  for (const candidate of candidates) {
    const changed = await inOrderTransaction(async (tx) => {
      await lockOrder(tx, candidate.id);
      const order = await getOrderWithReservations(tx, candidate.id);
      if (!order || order.paymentStatus !== 'PENDING' || order.stockCommittedAt || !order.reservationExpiresAt || order.reservationExpiresAt >= new Date()) return false;
      await releaseReservations(tx, order.id, order.reservations, new Date());
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          paymentStatus: 'EXPIRED',
          fulfillmentStatus: 'CANCELLED',
          reservationExpiresAt: null,
          cancelledAt: new Date(),
          cancellationReason: 'Payment window expired before a captured payment was confirmed.',
        },
      });
      await addEvent(tx, order.id, 'RESERVATION_EXPIRED', 'Unpaid checkout hold expired and inventory was released.');
      return true;
    });
    if (changed) released++;
  }
  return { checked: candidates.length, released };
}

export interface FulfillmentTransitionInput {
  action: FulfillmentAction;
  actorId: string;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string | null;
  cancellationReason?: string | null;
}

export interface RefundCompletionInput {
  actorId: string;
  razorpayRefundId: string;
  // These facts come only from a direct Razorpay API lookup in the admin
  // route. Rechecking them inside the order transaction prevents a stale
  // dashboard read from recording a refund against the wrong payment.
  verifiedPaymentId: string;
  verifiedAmountPaise: number;
  verifiedCurrency: string;
}

export interface CodCollectionInput {
  actorId: string;
}

/** Apply only legal fulfilment transitions; every change is written to the audit timeline. */
export async function transitionOrderFulfillment(orderId: string, input: FulfillmentTransitionInput) {
  return inOrderTransaction(async (tx) => {
    await lockOrder(tx, orderId);
    const order = await getOrderWithReservations(tx, orderId);
    if (!order) throw new OrderStoreError(404, 'Order not found.');
    if (!canApplyFulfillmentAction(order.fulfillmentStatus, order.paymentStatus, input.action)) {
      throw new OrderStoreError(409, 'That fulfilment change is not available for the current order state.');
    }
    const now = new Date();
    if (input.action === 'PROCESS') {
      await tx.order.update({ where: { id: order.id }, data: { status: 'PROCESSING', fulfillmentStatus: 'PROCESSING', processingAt: now } });
      await addEvent(tx, order.id, 'FULFILLMENT_STARTED', 'Order moved into preparation.', {}, input.actorId);
    }
    if (input.action === 'SHIP') {
      if (!input.carrier || !input.trackingNumber) throw new OrderStoreError(400, 'Courier and tracking number are required before marking an order as shipped.');
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'SHIPPED', fulfillmentStatus: 'SHIPPED', shippedAt: now,
          trackingCarrier: input.carrier, trackingNumber: input.trackingNumber, trackingUrl: input.trackingUrl ?? null,
        },
      });
      await addEvent(tx, order.id, 'ORDER_SHIPPED', 'Order handed to the courier.', { carrier: input.carrier, trackingNumber: input.trackingNumber }, input.actorId);
      const ready = await getOrderWithReservations(tx, order.id);
      await queueOrderNotification(tx, notificationOrder(ready), 'ORDER_SHIPPED');
    }
    if (input.action === 'DELIVER') {
      await tx.order.update({ where: { id: order.id }, data: { status: 'DELIVERED', fulfillmentStatus: 'DELIVERED', deliveredAt: now } });
      await addEvent(tx, order.id, 'ORDER_DELIVERED', 'Order marked as delivered.', {}, input.actorId);
      const ready = await getOrderWithReservations(tx, order.id);
      await queueOrderNotification(tx, notificationOrder(ready), 'ORDER_DELIVERED');
    }
    if (input.action === 'CANCEL') {
      if (order.stockCommittedAt) await restockCommittedReservations(tx, order.reservations, now);
      else await releaseReservations(tx, order.id, order.reservations, now);
      const refundStatus = order.paymentMethod === 'COD' ? 'NOT_REQUIRED' : ['PAID', 'PAID_REVIEW'].includes(order.paymentStatus) ? 'PENDING' : 'NONE';
      const paymentStatus = order.paymentStatus === 'PENDING' ? 'CANCELLED' : order.paymentStatus;
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED', fulfillmentStatus: 'CANCELLED', paymentStatus, refundStatus,
          reservationExpiresAt: null, cancelledAt: now, cancellationReason: input.cancellationReason ?? null,
        },
      });
      await addEvent(tx, order.id, 'ORDER_CANCELLED', 'Order cancelled before dispatch.', { refundStatus, reason: input.cancellationReason ?? null }, input.actorId);
      const ready = await getOrderWithReservations(tx, order.id);
      await queueOrderNotification(tx, notificationOrder(ready), 'ORDER_CANCELLED');
    }
    return getOrderWithReservations(tx, order.id);
  });
}

/**
 * Record a completed monetary refund only after staff has issued it in
 * Razorpay. This is intentionally not bundled into cancellation: returning
 * stock and returning money are different operations and each must be
 * auditable.
 */
export async function markOrderRefunded(orderId: string, input: RefundCompletionInput) {
  return inOrderTransaction(async (tx) => {
    await lockOrder(tx, orderId);
    const order = await getOrderWithReservations(tx, orderId);
    if (!order) throw new OrderStoreError(404, 'Order not found.');
    if (order.refundStatus === 'REFUNDED') {
      if (order.razorpayRefundId === input.razorpayRefundId) return order;
      throw new OrderStoreError(409, 'This order already has a different recorded refund.');
    }
    if (!canMarkOrderRefunded(order.refundStatus, order.paymentStatus, order.fulfillmentStatus)) {
      throw new OrderStoreError(409, 'This order is not ready to be marked as refunded. Cancel the paid, undispatched order first.');
    }
    const expectedAmountPaise = Math.round(order.totalAmount * 100);
    if (
      order.paymentMethod !== 'RAZORPAY'
      || !order.razorpayPaymentId
      || input.verifiedPaymentId !== order.razorpayPaymentId
      || input.verifiedAmountPaise !== expectedAmountPaise
      || input.verifiedCurrency?.toUpperCase() !== 'INR'
    ) {
      throw new OrderStoreError(409, 'The completed Razorpay refund could not be verified against this order.');
    }
    const now = new Date();
    try {
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'REFUNDED',
          refundStatus: 'REFUNDED',
          razorpayRefundId: input.razorpayRefundId,
          refundCompletedAt: now,
        },
      });
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
      if (code === 'P2002') throw new OrderStoreError(409, 'That Razorpay refund ID is already recorded on another order.');
      throw error;
    }
    await addEvent(tx, order.id, 'REFUND_COMPLETED', 'Verified Razorpay refund recorded as completed.', {
      razorpayRefundId: input.razorpayRefundId,
      paymentId: input.verifiedPaymentId,
      amountPaise: input.verifiedAmountPaise,
      currency: input.verifiedCurrency?.toUpperCase(),
    }, input.actorId);
    const ready = await getOrderWithReservations(tx, order.id);
    await queueOrderNotification(tx, notificationOrder(ready), 'REFUND_COMPLETED');
    return ready;
  });
}

/**
 * Record a COD settlement after delivery confirmation. This intentionally
 * happens after fulfilment, because a courier's delivery scan and the store's
 * receipt of cash are separate operational facts.
 */
export async function markCodPaymentCollected(orderId: string, input: CodCollectionInput) {
  return inOrderTransaction(async (tx) => {
    await lockOrder(tx, orderId);
    const order = await getOrderWithReservations(tx, orderId);
    if (!order) throw new OrderStoreError(404, 'Order not found.');
    if (order.paymentStatus === 'PAID' && order.paymentMethod === 'COD') return order;
    if (order.paymentMethod !== 'COD' || order.paymentStatus !== 'COD_PENDING' || order.fulfillmentStatus !== 'DELIVERED') {
      throw new OrderStoreError(409, 'Only a delivered cash-on-delivery order can be marked as collected.');
    }
    await tx.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'PAID' },
    });
    await addEvent(tx, order.id, 'COD_PAYMENT_COLLECTED', 'Cash-on-delivery payment recorded as collected.', {}, input.actorId);
    return getOrderWithReservations(tx, order.id);
  });
}
