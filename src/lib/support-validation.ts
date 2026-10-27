import { SUPPORT_STATUSES, type SupportStatus, type SupportDeliveryStatus } from './support-types';

export const SUPPORT_BODY_LIMIT = 5000;
export const SUPPORT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const SUPPORT_TOKEN = /^[a-f0-9]{48}$/;

export class SupportError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'SupportError';
  }
}

export function validateSupportId(value: string): string {
  if (!SUPPORT_UUID.test(value)) throw new SupportError(400, 'Please use a valid message reference.');
  return value.toLowerCase();
}

export function validateSupportBody(value: unknown): { submissionId: string; body: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new SupportError(400, 'Please provide a message.');
  const data = value as Record<string, unknown>;
  const submissionId = typeof data.submissionId === 'string' ? validateSupportId(data.submissionId) : '';
  const body = typeof data.body === 'string' ? data.body.trim() : '';
  if (!submissionId || !body || body.length > SUPPORT_BODY_LIMIT || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(body)) {
    throw new SupportError(400, `Please enter a message of 1–${SUPPORT_BODY_LIMIT} characters and a valid submission reference.`);
  }
  return { submissionId, body };
}

export function validateSupportStatus(value: unknown): SupportStatus {
  if (typeof value !== 'string' || !SUPPORT_STATUSES.includes(value as SupportStatus)) throw new SupportError(400, 'Please choose a valid conversation status.');
  return value as SupportStatus;
}

export function supportEmailSubject(subject: string, ticketId: string): string {
  const clean = subject.replace(/[\r\n\x00]/g, ' ').trim().replace(/^(?:re:\s*)+/i, '').trim().slice(0, 135);
  return `Re: ${clean || 'Your message'} [DV-${ticketId.slice(0, 8).toUpperCase()}]`;
}

export function normalizeRfcMessageId(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 998 || /[\x00-\x1f\x7f]/.test(value)) return null;
  const clean = value.trim();
  return /^<[^<>\s]+@[^<>\s]+>$/.test(clean) ? clean : null;
}

const DELIVERY_EVENTS: Record<string, SupportDeliveryStatus> = {
  'email.sent': 'SENT',
  'email.delivered': 'DELIVERED',
  'email.bounced': 'BOUNCED',
  'email.complained': 'BOUNCED',
  'email.suppressed': 'BOUNCED',
  'email.failed': 'FAILED',
  'email.delivery_delayed': 'SENT',
};

export function supportDeliveryEventStatus(type: string): SupportDeliveryStatus | null {
  return Object.prototype.hasOwnProperty.call(DELIVERY_EVENTS, type) ? DELIVERY_EVENTS[type] : null;
}

export function canAdvanceSupportDelivery(current: string, next: string, previousAt: Date | null, eventAt: Date): boolean {
  if (previousAt && previousAt > eventAt) return false;
  if (['BOUNCED', 'BLOCKED', 'FAILED'].includes(current) && ['SENT', 'DELIVERED'].includes(next)) return false;
  if (current === 'DELIVERED' && ['SENT', 'FAILED'].includes(next)) return false;
  return true;
}
