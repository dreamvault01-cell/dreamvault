import 'server-only';

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { RazorpayWebhookInput } from './order-store';

export class RazorpayWebhookError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'RazorpayWebhookError';
  }
}

const MAX_WEBHOOK_BYTES = 256 * 1024;
const PROVIDER_ID = /^(?:order|pay)_[A-Za-z0-9_]+$/;

function text(value: unknown, maxLength = 200) {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength && !/[\u0000-\u001f\u007f]/.test(value)
    ? value
    : null;
}

function providerId(value: unknown, prefix: 'order' | 'pay') {
  const candidate = text(value, 191);
  return candidate && candidate.startsWith(`${prefix}_`) && PROVIDER_ID.test(candidate) ? candidate : null;
}

function paise(value: unknown) {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 1) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : null;
  }
  return null;
}

function eventTime(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  const date = new Date(value * 1_000);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function equalSignature(expected: string, received: string) {
  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(received, 'hex');
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

/**
 * Read and authenticate the original byte sequence. Do not call `json()`
 * first: a re-serialized body would fail Razorpay's HMAC verification.
 */
export async function readVerifiedRazorpayWebhook(request: Request): Promise<RazorpayWebhookInput> {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim() ?? '';
  if (secret.length < 16) throw new RazorpayWebhookError(503, 'Razorpay webhooks are not configured yet.');
  if (Number(request.headers.get('content-length')) > MAX_WEBHOOK_BYTES) {
    throw new RazorpayWebhookError(413, 'Webhook request is too large.');
  }
  const raw = await request.text();
  if (!raw || Buffer.byteLength(raw, 'utf8') > MAX_WEBHOOK_BYTES) {
    throw new RazorpayWebhookError(413, 'Webhook request is too large.');
  }
  const signature = request.headers.get('x-razorpay-signature') ?? '';
  const expected = createHmac('sha256', secret).update(raw, 'utf8').digest('hex');
  if (!/^[a-f0-9]{64}$/i.test(signature) || !equalSignature(expected, signature)) {
    throw new RazorpayWebhookError(401, 'Webhook signature is invalid.');
  }
  const eventId = text(request.headers.get('x-razorpay-event-id'), 191);
  if (!eventId) throw new RazorpayWebhookError(400, 'Webhook event identifier is missing.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new RazorpayWebhookError(400, 'Webhook payload is not valid JSON.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new RazorpayWebhookError(400, 'Webhook payload is invalid.');
  }
  const payload = parsed as Record<string, unknown>;
  const eventType = text(payload.event, 100);
  if (!eventType) throw new RazorpayWebhookError(400, 'Webhook event type is missing.');
  const entities = payload.payload && typeof payload.payload === 'object' && !Array.isArray(payload.payload)
    ? payload.payload as Record<string, unknown>
    : {};
  const paymentEnvelope = entities.payment && typeof entities.payment === 'object' && !Array.isArray(entities.payment)
    ? entities.payment as Record<string, unknown>
    : {};
  const orderEnvelope = entities.order && typeof entities.order === 'object' && !Array.isArray(entities.order)
    ? entities.order as Record<string, unknown>
    : {};
  const payment = paymentEnvelope.entity && typeof paymentEnvelope.entity === 'object' && !Array.isArray(paymentEnvelope.entity)
    ? paymentEnvelope.entity as Record<string, unknown>
    : {};
  const order = orderEnvelope.entity && typeof orderEnvelope.entity === 'object' && !Array.isArray(orderEnvelope.entity)
    ? orderEnvelope.entity as Record<string, unknown>
    : {};

  const razorpayPaymentId = providerId(payment.id, 'pay');
  const razorpayOrderId = providerId(payment.order_id, 'order') ?? providerId(order.id, 'order');
  const paymentStatus = text(payment.status, 40);
  const captured = eventType === 'payment.captured'
    || (eventType === 'order.paid' && paymentStatus === 'captured');

  return {
    eventId,
    eventType,
    payloadHash: createHash('sha256').update(raw, 'utf8').digest('hex'),
    occurredAt: eventTime(payload.created_at),
    razorpayOrderId,
    razorpayPaymentId,
    amountPaise: paise(payment.amount) ?? paise(order.amount_paid),
    currency: text(payment.currency, 10) ?? text(order.currency, 10),
    captured,
  };
}
