import 'server-only';

import { getCustomerOrderStatus, getOrderNotificationLabel, type OrderNotificationKind } from './order-types';
import { normalizeSupportEmail } from './support-config';

export interface OrderEmailConfig {
  mode: 'development' | 'live';
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyTo: string;
  testRecipient: string;
  appUrl: string;
  configured: boolean;
  issues: string[];
}

export class OrderMailError extends Error {
  constructor(public readonly code: 'CONFIGURATION' | 'INVALID_INPUT' | 'RECIPIENT_BLOCKED' | 'PROVIDER_UNAVAILABLE' | 'PROVIDER_REJECTED', public readonly retryable = false) {
    super(code === 'CONFIGURATION'
      ? 'Order email is not configured yet.'
      : code === 'RECIPIENT_BLOCKED'
        ? 'Development mode can only deliver order emails to the configured test recipient.'
        : code === 'PROVIDER_UNAVAILABLE'
          ? 'The email provider is temporarily unavailable.'
          : code === 'PROVIDER_REJECTED'
            ? 'The email provider rejected this order email.'
            : 'The order email contains invalid data.');
    this.name = 'OrderMailError';
  }
}

const CONTROL = /[\u0000-\u001f\u007f]/;
const RESEND_DOMAIN = /@(resend\.dev|(?:[^@]+\.)?resend\.app)$/i;

function readMailbox(env: Readonly<Record<string, string | undefined>>, name: string, fallback: string, issues: string[]) {
  const raw = env[name] ?? fallback;
  const normalized = normalizeSupportEmail(raw);
  if (!normalized || raw.includes('<') || raw.includes('>')) {
    issues.push(`${name} must be one plain email address.`);
    return '';
  }
  return normalized;
}

function readAppUrl(env: Readonly<Record<string, string | undefined>>, mode: 'development' | 'live', issues: string[]) {
  const raw = (env.ORDER_APP_URL ?? env.SUPPORT_APP_URL ?? 'http://localhost:3000').trim().replace(/\/+$/, '');
  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash || CONTROL.test(raw)) throw new Error();
    if (mode === 'live' && (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new Error();
    return url.toString().replace(/\/+$/, '');
  } catch {
    issues.push('ORDER_APP_URL must be an absolute website URL; live mode requires public HTTPS.');
    return '';
  }
}

/** Server-only configuration. It is intentionally separate from support mail. */
export function getOrderEmailConfig(env: Readonly<Record<string, string | undefined>> = process.env): OrderEmailConfig {
  const issues: string[] = [];
  const requestedMode = (env.ORDER_EMAIL_MODE ?? 'development').trim();
  const mode: 'development' | 'live' = requestedMode === 'live' ? 'live' : 'development';
  if (!['development', 'live'].includes(requestedMode)) issues.push('ORDER_EMAIL_MODE must be development or live.');

  const fromEmail = readMailbox(env, 'ORDER_FROM_EMAIL', env.SUPPORT_FROM_EMAIL ?? 'onboarding@resend.dev', issues);
  // Parentheses are deliberate: JavaScript does not allow `??` and `||` to
  // be mixed without making the intended fallback explicit.
  const replyToFallback = env.SUPPORT_EMAIL_ADDRESS ?? (fromEmail || 'support@soliheleug.resend.app');
  const replyTo = readMailbox(env, 'ORDER_REPLY_TO_EMAIL', replyToFallback, issues);
  const testRecipient = readMailbox(env, 'ORDER_TEST_RECIPIENT', env.SUPPORT_TEST_RECIPIENT ?? 'dreamvault01@gmail.com', issues);
  const fromName = (env.ORDER_FROM_NAME ?? 'DreamVault').trim();
  if (!fromName || fromName.length > 100 || CONTROL.test(fromName) || /[<>]/.test(fromName)) issues.push('ORDER_FROM_NAME must be a plain display name of 1–100 characters.');
  const appUrl = readAppUrl(env, mode, issues);
  const apiKey = (env.RESEND_API_KEY ?? '').trim();
  if (!/^re_[a-zA-Z0-9_-]{8,}$/.test(apiKey) || CONTROL.test(apiKey)) issues.push('RESEND_API_KEY is missing or invalid.');
  if (mode === 'live') {
    if (RESEND_DOMAIN.test(fromEmail)) issues.push('ORDER_FROM_EMAIL must use your verified domain in live mode.');
    if (RESEND_DOMAIN.test(replyTo)) issues.push('ORDER_REPLY_TO_EMAIL must use your verified support mailbox in live mode.');
  }

  return {
    mode, apiKey, fromEmail, fromName, replyTo, testRecipient, appUrl,
    configured: issues.length === 0,
    issues,
  };
}

export interface OrderEmailContentInput {
  kind: OrderNotificationKind;
  orderReference: string;
  customerName: string;
  totalAmount: number;
  items: Array<{ name: string; quantity: number; price: number; configuration: string }>;
  fulfillmentStatus: string;
  paymentStatus: string;
  trackingCarrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  cancellationReason?: string | null;
}

export interface PreparedOrderEmail {
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
}

function notificationCopy(input: OrderEmailContentInput) {
  switch (input.kind) {
    case 'ORDER_RECEIVED':
      return { title: 'We received your order', intro: 'Your cash-on-delivery order is safely recorded. We will prepare it with care.', button: 'View your order' };
    case 'ORDER_CONFIRMED':
      return { title: 'Your order is confirmed', intro: 'Your payment is confirmed and your print is ready to enter our fulfilment queue.', button: 'View your order' };
    case 'ORDER_SHIPPED':
      return { title: 'Your print is on its way', intro: 'Your order has left our studio and is now travelling to you.', button: 'Track your order' };
    case 'ORDER_DELIVERED':
      return { title: 'Your print has arrived', intro: 'We hope it feels right at home on your wall.', button: 'View your order' };
    case 'ORDER_CANCELLED':
      return { title: 'Your order was cancelled', intro: 'Your order has been cancelled before dispatch.', button: 'View your order' };
    case 'PAYMENT_REVIEW':
      return { title: 'We are reviewing your payment', intro: 'We received a payment update after the checkout hold expired. Our team will contact you shortly with the next step.', button: 'View your order' };
    case 'REFUND_COMPLETED':
      return { title: 'Your refund is complete', intro: 'Your cancellation refund has been completed through the original payment method. Banks and payment providers may take a short time to show it in your balance.', button: 'View your order' };
  }
}

/** Build the exact message once, before it enters the durable outbox. */
export function prepareOrderEmail(input: OrderEmailContentInput, config: Pick<OrderEmailConfig, 'appUrl'>): PreparedOrderEmail {
  const copy = notificationCopy(input);
  const orderUrl = `${config.appUrl}/orders/${encodeURIComponent(input.orderReference)}`;
  const destination = input.kind === 'ORDER_SHIPPED' && input.trackingUrl ? input.trackingUrl : orderUrl;
  const lineItems = input.items.map((item) => `${item.name} × ${item.quantity} — ${item.configuration}`).join('\n');
  const trackingLines = input.trackingCarrier && input.trackingNumber
    ? `\nCourier: ${input.trackingCarrier}\nTracking number: ${input.trackingNumber}\n`
    : '';
  const cancellationLine = input.cancellationReason ? `\nReason: ${input.cancellationReason}\n` : '';
  const text = [
    `DreamVault — ${copy.title}`,
    '',
    `Hello ${input.customerName},`,
    '',
    copy.intro,
    '',
    `Order reference: ${input.orderReference}`,
    `Order total: ${formatMoney(input.totalAmount)}`,
    `Order status: ${getCustomerOrderStatus(input.fulfillmentStatus, input.paymentStatus)}`,
    trackingLines.trim(),
    cancellationLine.trim(),
    '',
    'Your selection:',
    lineItems,
    '',
    `${copy.button}: ${destination}`,
    '',
    'DreamVault',
  ].filter(Boolean).join('\n');
  const itemHtml = input.items.map((item) => `<li style="margin:0 0 8px"><strong>${escapeHtml(item.name)}</strong> × ${item.quantity}<br><span style="color:#66645c">${escapeHtml(item.configuration)}</span></li>`).join('');
  const trackingHtml = input.trackingCarrier && input.trackingNumber
    ? `<p style="margin:20px 0 0"><strong>Courier</strong><br>${escapeHtml(input.trackingCarrier)} · ${escapeHtml(input.trackingNumber)}</p>`
    : '';
  const cancellationHtml = input.cancellationReason
    ? `<p style="margin:20px 0 0"><strong>Reason</strong><br>${escapeHtml(input.cancellationReason)}</p>`
    : '';
  const html = `<!doctype html><html><body style="margin:0;background:#f8f7f4;color:#25241f;font-family:Arial,sans-serif"><div style="max-width:600px;margin:0 auto;padding:38px 24px"><p style="margin:0 0 24px;font-size:12px;letter-spacing:3px;color:#8b702f">DREAMVAULT</p><div style="padding:28px 0;border-top:1px solid #dedbd3;border-bottom:1px solid #dedbd3"><h1 style="margin:0 0 16px;font-size:26px;line-height:1.25;font-family:Georgia,serif">${escapeHtml(copy.title)}</h1><p style="margin:0;color:#545149;font-size:15px;line-height:1.7">Hello ${escapeHtml(input.customerName)},<br><br>${escapeHtml(copy.intro)}</p><div style="margin:24px 0;padding:16px;background:#ffffff;border:1px solid #e4e1da"><strong>Order ${escapeHtml(input.orderReference)}</strong><br><span style="color:#66645c">${escapeHtml(getCustomerOrderStatus(input.fulfillmentStatus, input.paymentStatus))} · ${escapeHtml(formatMoney(input.totalAmount))}</span></div>${trackingHtml}${cancellationHtml}<p style="margin:24px 0 10px;font-size:12px;letter-spacing:1.5px;color:#8b702f;text-transform:uppercase">Your selection</p><ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.55">${itemHtml}</ul><p style="margin:28px 0 0"><a href="${escapeHtml(destination)}" style="display:inline-block;padding:13px 20px;background:#b38600;color:#fff;text-decoration:none;font-weight:bold">${escapeHtml(copy.button)}</a></p></div><p style="margin:20px 0 0;font-size:12px;color:#77736b;line-height:1.6">Questions? Reply to this email and our support team will help.</p></div></body></html>`;
  return { subject: `DreamVault · ${copy.title} · ${input.orderReference}`, text, html };
}

export async function sendOrderEmail(
  input: { id: string; to: string; subject: string; text: string; html: string },
  config: OrderEmailConfig = getOrderEmailConfig(),
): Promise<{ id: string }> {
  if (!config.configured) throw new OrderMailError('CONFIGURATION');
  const recipient = normalizeSupportEmail(input.to);
  if (!recipient || !/^[a-zA-Z0-9_-]{1,200}$/.test(input.id) || !input.subject.trim() || input.subject.length > 250 || !input.text.trim() || !input.html.trim()) {
    throw new OrderMailError('INVALID_INPUT');
  }
  const to = config.mode === 'development' ? config.testRecipient : recipient;
  if (config.mode === 'development' && !to) throw new OrderMailError('RECIPIENT_BLOCKED');
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `order/${input.id}`,
      },
      body: JSON.stringify({
        from: `"${config.fromName.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}" <${config.fromEmail}>`,
        to: [to], reply_to: config.replyTo, subject: input.subject, text: input.text, html: input.html,
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new OrderMailError(response.status >= 500 || response.status === 408 || response.status === 429 ? 'PROVIDER_UNAVAILABLE' : 'PROVIDER_REJECTED', response.status >= 500 || response.status === 408 || response.status === 429);
    }
    const payload: unknown = await response.json();
    const id = payload && typeof payload === 'object' && 'id' in payload && typeof payload.id === 'string' ? payload.id : null;
    if (!id) throw new OrderMailError('PROVIDER_REJECTED');
    return { id };
  } catch (error) {
    if (error instanceof OrderMailError) throw error;
    throw new OrderMailError('PROVIDER_UNAVAILABLE', true);
  }
}

export function getOrderEmailDeliveryIssue(config: OrderEmailConfig) {
  return config.configured ? null : config.issues[0] || 'Order email is not configured yet.';
}

export { getOrderNotificationLabel };
