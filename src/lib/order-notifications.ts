import 'server-only';

import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import prisma from './prisma';
import {
  getOrderEmailConfig,
  OrderMailError,
  prepareOrderEmail,
  sendOrderEmail,
} from './order-mail';
import type { OrderNotificationKind } from './order-types';

type DB = typeof prisma | Prisma.TransactionClient;

export interface OrderForNotification {
  id: string;
  orderReference: string;
  shippingName: string;
  shippingEmail: string | null;
  totalAmount: number;
  fulfillmentStatus: string;
  paymentStatus: string;
  trackingCarrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  cancellationReason: string | null;
  items: Array<{
    quantity: number;
    price: number;
    configuration: unknown;
    product: { name: string };
  }>;
}

function configurationLabel(configuration: unknown, fallback = 'Selected print') {
  if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration)) return fallback;
  const value = configuration as Record<string, unknown>;
  return typeof value.label === 'string' && value.label.trim() ? value.label.trim().slice(0, 300) : fallback;
}

/**
 * Queue one immutable email per business event. `upsert` prevents a repeated
 * browser callback or webhook retry from creating duplicate customer emails.
 */
export async function queueOrderNotification(tx: DB, order: OrderForNotification, kind: OrderNotificationKind) {
  if (!order.shippingEmail) return null;
  const content = prepareOrderEmail({
    kind,
    orderReference: order.orderReference,
    customerName: order.shippingName,
    totalAmount: order.totalAmount,
    fulfillmentStatus: order.fulfillmentStatus,
    paymentStatus: order.paymentStatus,
    trackingCarrier: order.trackingCarrier,
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
    cancellationReason: order.cancellationReason,
    items: order.items.map((item) => ({
      name: item.product.name,
      quantity: item.quantity,
      price: item.price,
      configuration: configurationLabel(item.configuration),
    })),
  }, getOrderEmailConfig());
  return tx.orderNotification.upsert({
    where: { orderId_kind: { orderId: order.id, kind } },
    create: {
      orderId: order.id,
      kind,
      toEmail: order.shippingEmail,
      subject: content.subject,
      text: content.text,
      html: content.html,
    },
    update: {},
  });
}

interface NotificationRow {
  id: string;
  orderId: string;
  kind: string;
  toEmail: string;
  subject: string;
  text: string;
  html: string;
  deliveryStatus: string;
  attempts: number;
  nextAttemptAt: Date;
  firstAttemptAt: Date | null;
  lockedUntil: Date | null;
  lockToken: string | null;
  providerEmailId: string | null;
  lastError: string | null;
  createdAt: Date;
}

interface ClaimedNotification extends NotificationRow {
  lockToken: string;
}

async function claimOrderNotification(orderId?: string): Promise<ClaimedNotification | null> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<NotificationRow[]>(Prisma.sql`SELECT n.* FROM "OrderNotification" n
      WHERE (${orderId ?? null}::text IS NULL OR n."orderId"=${orderId ?? null})
        AND ((n."deliveryStatus"='QUEUED' AND n."nextAttemptAt"<=CURRENT_TIMESTAMP)
          OR (n."deliveryStatus"='SENDING' AND n."lockedUntil"<CURRENT_TIMESTAMP))
      ORDER BY n."nextAttemptAt", n."createdAt", n."id"
      FOR UPDATE OF n SKIP LOCKED LIMIT 1`);
    const row = rows[0];
    if (!row) return null;
    const lockToken = randomUUID();
    const lockedUntil = new Date(Date.now() + 90_000);
    await tx.orderNotification.update({
      where: { id: row.id },
      data: { deliveryStatus: 'SENDING', lockToken, lockedUntil },
    });
    return { ...row, lockToken, lockedUntil };
  }, { timeout: 15_000, maxWait: 10_000 });
}

async function beginDelivery(notification: ClaimedNotification) {
  const rows = await prisma.$queryRaw<NotificationRow[]>`UPDATE "OrderNotification" SET
    "attempts"="attempts"+1,"firstAttemptAt"=COALESCE("firstAttemptAt",clock_timestamp()),"lastError"=NULL
    WHERE "id"=${notification.id} AND "lockToken"=${notification.lockToken} RETURNING *`;
  if (!rows[0]) throw new Error('Another worker is handling this notification.');
  return rows[0];
}

async function finishDelivery(notification: ClaimedNotification, result: { status: 'SENT' | 'QUEUED' | 'FAILED' | 'BLOCKED'; providerId?: string; error?: string; delaySeconds?: number }) {
  const nextAttemptAt = new Date(Date.now() + (result.delaySeconds ?? 60) * 1000);
  await prisma.orderNotification.updateMany({
    where: { id: notification.id, lockToken: notification.lockToken },
    data: {
      deliveryStatus: result.status,
      providerEmailId: result.providerId,
      lastError: result.error?.slice(0, 300) ?? null,
      nextAttemptAt,
      lockedUntil: null,
      lockToken: null,
      sentAt: result.status === 'SENT' ? new Date() : undefined,
    },
  });
}

export interface OrderOutboxResult {
  processed: number;
  sent: number;
  failed: number;
  blocked: number;
  queued: number;
}

interface OrderOutboxDependencies {
  config: ReturnType<typeof getOrderEmailConfig>;
  claim: typeof claimOrderNotification;
  begin: typeof beginDelivery;
  finish: typeof finishDelivery;
  send: typeof sendOrderEmail;
  now: () => number;
}

/** Leased, idempotent worker for transactional order notifications. */
export async function processOrderOutbox(
  options: { orderId?: string; limit?: number; budgetMs?: number } = {},
  overrides: Partial<OrderOutboxDependencies> = {},
): Promise<OrderOutboxResult> {
  const deps: OrderOutboxDependencies = {
    config: overrides.config ?? getOrderEmailConfig(),
    claim: claimOrderNotification,
    begin: beginDelivery,
    finish: finishDelivery,
    send: sendOrderEmail,
    now: Date.now,
    ...overrides,
  };
  const { config } = deps;
  const result: OrderOutboxResult = { processed: 0, sent: 0, failed: 0, blocked: 0, queued: 0 };
  const limit = Math.max(1, Math.min(10, options.limit ?? 5));
  const deadline = deps.now() + Math.max(100, Math.min(25_000, options.budgetMs ?? 12_000));

  while (result.processed < limit && deps.now() < deadline) {
    const notification = await deps.claim(options.orderId);
    if (!notification) break;
    result.processed++;
    let attempts = notification.attempts;
    try {
      // Setup delays and a development recipient restriction are not network
      // attempts. Keep the provider retry budget for actual delivery failures.
      if (!config.configured) throw new OrderMailError('CONFIGURATION');
      if (config.mode === 'development' && notification.toEmail.toLowerCase() !== config.testRecipient) {
        throw new OrderMailError('RECIPIENT_BLOCKED');
      }
      if (attempts >= 5 || (notification.firstAttemptAt && deps.now() - notification.firstAttemptAt.getTime() >= 23 * 60 * 60_000)) {
        // The stable provider key must not be reused after its deduplication
        // window; an old uncertain delivery needs staff review, not a new send.
        await deps.finish(notification, { status: 'FAILED', error: 'The safe automatic retry window has ended. Review this notification before sending another message.' });
        result.failed++;
        continue;
      }
      const begun = await deps.begin(notification);
      attempts = begun.attempts;
      const sent = await deps.send({
        id: begun.id,
        to: begun.toEmail,
        subject: begun.subject,
        text: begun.text,
        html: begun.html,
      }, config);
      await deps.finish(notification, { status: 'SENT', providerId: sent.id });
      result.sent++;
    } catch (error) {
      if (error instanceof OrderMailError) {
        if (error.code === 'CONFIGURATION' || error.code === 'RECIPIENT_BLOCKED') {
          // Setup can be completed after an order is placed (especially during
          // development or a domain migration). Keep the message durable and
          // back off rather than silently abandoning the customer update.
          await deps.finish(notification, { status: 'QUEUED', error: error.message, delaySeconds: 15 * 60 });
          result.queued++;
          break;
        } else if (error.retryable && attempts < 5) {
          const delaySeconds = Math.min(3600, 60 * 2 ** Math.max(0, attempts - 1));
          await deps.finish(notification, { status: 'QUEUED', error: error.message, delaySeconds });
          result.queued++;
          break;
        } else {
          await deps.finish(notification, { status: 'FAILED', error: error.message });
          result.failed++;
        }
      } else {
        // A database error may happen after Resend accepted the message.
        // Preserve the lease for retry with the same idempotency key instead
        // of incorrectly declaring an accepted email to have failed.
        throw error;
      }
    }
  }
  return result;
}
