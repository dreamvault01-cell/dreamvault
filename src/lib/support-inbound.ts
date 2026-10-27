import 'server-only';
import { getSupportConfig, normalizeSupportEmail, type SupportConfig } from './support-config';
import { readSupportBody, supportJson } from './support-http';
import { fetchReceivedEmail, htmlToSafeText, parseSupportReplyToken, SupportMailError, verifySupportWebhook, type ReceivedSupportEmail, type SupportWebhookEvent } from './support-mail';
import type { SupportIncomingInput } from './support-store';
import type { SupportAttachment, SupportDeliveryStatus } from './support-types';
import { normalizeRfcMessageId, supportDeliveryEventStatus, SupportError } from './support-validation';

type DeliveryInput = { eventId: string; type: string; emailId: string; status: SupportDeliveryStatus; occurredAt: Date };
export interface SupportInboundDependencies {
  wasProcessed(eventId: string): Promise<boolean>;
  fetchEmail(id: string, config: SupportConfig): Promise<ReceivedSupportEmail>;
  storeIncoming(input: SupportIncomingInput): Promise<{ ticketId: string | null; duplicate: boolean }>;
  storeDelivery(input: DeliveryInput): Promise<boolean>;
}

// No database connection or provider request is made until a verified event needs it.
const dependencies: SupportInboundDependencies = {
  wasProcessed: async (id) => (await import('./support-store')).supportWebhookWasProcessed(id),
  fetchEmail: fetchReceivedEmail,
  storeIncoming: async (input) => (await import('./support-store')).storeSupportIncoming(input),
  storeDelivery: async (input) => (await import('./support-store')).storeSupportDeliveryEvent(input),
};

const EVENT_ID = /^[a-zA-Z0-9_-]{1,200}$/;
const EMAIL_ID = /^[a-zA-Z0-9-]{1,100}$/;
const REMOVE_CONTROLS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
export type SupportWebhookResult = 'accepted' | 'duplicate' | 'skipped';

function cleanText(value: string, length: number): string {
  return value.replace(REMOVE_CONTROLS, '').replace(/\r\n?/g, '\n').trim().slice(0, length);
}

function ignoreAutomatedEmail(email: ReceivedSupportEmail): boolean {
  const headers = Object.fromEntries(Object.entries(email.headers).map(([name, value]) => [name.toLowerCase(), value.trim()]));
  if ('auto-submitted' in headers && headers['auto-submitted'].split(';')[0].trim().toLowerCase() !== 'no') return true;
  if (/(?:^|[\s,;])(?:bulk|list|junk)(?:$|[\s,;])/i.test(headers.precedence ?? '')) return true;
  if ('return-path' in headers && ['', '<>'].includes(headers['return-path'].replace(/\s/g, ''))) return true;
  if (headers['list-id']) return true;
  if (/^multipart\/report\b/i.test(headers['content-type'] ?? '')) return true;
  if (['x-autoreply', 'x-autorespond'].some((name) => headers[name] && !/^(?:no|false)$/i.test(headers[name]))) return true;
  return false;
}

function attachmentsForInbox(email: ReceivedSupportEmail): SupportAttachment[] {
  return email.attachments.slice(0, 10).map((attachment) => ({
    name: cleanText(attachment.filename || 'Attachment', 255).replace(/[\/\\]/g, '_') || 'Attachment',
    contentType: /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(attachment.content_type) ? attachment.content_type : 'application/octet-stream',
    size: Number.isSafeInteger(attachment.size) && attachment.size >= 0 ? attachment.size : 0,
  }));
}

function targetForInbox(to: string[], config: SupportConfig): { to: string[]; replyToken: string | null } | null {
  if (!to.length || to.length > 100) return null;
  const addresses = to.map(normalizeSupportEmail);
  if (addresses.some((address) => !address)) return null;
  const recipients = addresses as string[];
  const tokenRecipients = recipients.filter((address) => address.split('@')[0].startsWith('r+'));
  if (tokenRecipients.length) {
    // Never turn malformed/ambiguous reply mail into a fresh, unrelated ticket.
    if (tokenRecipients.length !== recipients.length) return null;
    const replyToken = parseSupportReplyToken(recipients, config);
    return replyToken ? { to: recipients, replyToken } : null;
  }
  const local = config.supportEmail.split('@')[0];
  const direct = new Set([config.supportEmail, ...config.previousInboundDomains.map((domain) => `${local}@${domain}`)]);
  return recipients.every((address) => direct.has(address)) ? { to: recipients, replyToken: null } : null;
}

function eventDate(value: string): Date {
  const match = typeof value === 'string' ? /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?(?:Z|\+00:00)$/.exec(value) : null;
  if (!match) throw new SupportError(400, 'Invalid email event timestamp.');
  // Provider timestamps can contain micro/nanoseconds; PostgreSQL/JS use milliseconds.
  const normalized = `${match[1]}.${(match[2] ?? '').padEnd(3, '0').slice(0, 3)}Z`;
  const date = new Date(normalized);
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() < 2000 || date.getTime() > Date.now() + 5 * 60_000) throw new SupportError(400, 'Invalid email event timestamp.');
  // Date.parse normalizes impossible dates such as February 30; do not accept them.
  if (date.toISOString().slice(0, 19) !== match[1]) throw new SupportError(400, 'Invalid email event timestamp.');
  return date;
}

/** Called only after raw-body signature verification; injectable for isolated tests. */
export async function processSupportWebhookEvent(event: SupportWebhookEvent, eventId: string, config: SupportConfig = getSupportConfig(), deps: SupportInboundDependencies = dependencies): Promise<SupportWebhookResult> {
  if (!EVENT_ID.test(eventId)) throw new SupportError(400, 'Invalid email webhook identifier.');
  const deliveryStatus = supportDeliveryEventStatus(event.type);
  if (event.type !== 'email.received' && !deliveryStatus) return 'skipped';
  const emailId = event.data.email_id;
  if (typeof emailId !== 'string' || !EMAIL_ID.test(emailId)) throw new SupportError(400, 'Invalid email event identifier.');
  if (await deps.wasProcessed(eventId)) return 'duplicate';

  if (deliveryStatus) {
    const stored = await deps.storeDelivery({ eventId, type: event.type, emailId, status: deliveryStatus, occurredAt: eventDate(event.created_at) });
    // Delivery can arrive before the send response has committed its provider ID.
    if (!stored) throw new SupportError(503, 'The delivery event is not ready to process. Please retry.');
    return 'accepted';
  }

  const email = await deps.fetchEmail(emailId, config);
  const authentication = email.authentication;
  // Resend's trusted API verdict calls unsigned/unaligned DKIM "gray". A DKIM
  // pass is From-aligned; accept it when DMARC is gray (e.g. no DMARC policy),
  // but never override an explicit DMARC failure or trust sender-written headers.
  const authenticated = authentication?.dmarc === 'pass' || (authentication?.dmarc === 'gray' && authentication.dkim === 'pass');
  if (email.id !== emailId || !authenticated) return 'skipped';
  const from = normalizeSupportEmail(email.from);
  const replyDomains = new Set([config.inboundDomain, ...config.previousInboundDomains]);
  const ownReplyAddress = from && replyDomains.has(from.split('@')[1]) && /^r\+[a-f0-9]{48}$/.test(from.split('@')[0]);
  if (!from || from === config.fromEmail || from === config.supportEmail || ownReplyAddress || /^(?:mailer-daemon|postmaster)(?:[+.-]|@)/i.test(from) || ignoreAutomatedEmail(email)) return 'skipped';
  const target = targetForInbox(email.to, config);
  if (!target) return 'skipped';
  const text = email.text ? cleanText(email.text, 20_000) : '';
  const body = text || (email.html ? cleanText(htmlToSafeText(email.html), 20_000) : '');
  const result = await deps.storeIncoming({
    eventId, emailId, from, to: target.to, replyToken: target.replyToken,
    subject: cleanText(email.subject, 150).replace(/\n/g, ' '), body,
    messageId: normalizeRfcMessageId(email.message_id), attachments: attachmentsForInbox(email),
  });
  // The store also checks the token's original customer. A mismatch never creates a ticket.
  return result.duplicate ? 'duplicate' : result.ticketId ? 'accepted' : 'skipped';
}

export async function handleSupportWebhookRequest(request: Request, config: SupportConfig = getSupportConfig(), deps: SupportInboundDependencies = dependencies): Promise<Response> {
  try {
    if (!config.webhookConfigured) throw new SupportMailError('CONFIGURATION');
    const eventId = request.headers.get('svix-id') ?? '';
    if (!EVENT_ID.test(eventId) || !request.headers.get('svix-timestamp') || !request.headers.get('svix-signature') || (request.headers.get('svix-signature')?.length ?? 0) > 8192) {
      throw new SupportMailError('INVALID_WEBHOOK');
    }
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new SupportMailError('INVALID_WEBHOOK');
    const raw = await readSupportBody(request, 128 * 1024);
    const event = verifySupportWebhook(raw, request.headers, config);
    await processSupportWebhookEvent(event, eventId, config, deps);
    // No customer addresses, conversation IDs, tokens or processing details are public.
    return supportJson({ received: true });
  } catch (error) {
    let status = 503;
    if (error instanceof SupportMailError && ['INVALID_WEBHOOK', 'INVALID_INPUT'].includes(error.code)) status = 400;
    if (error instanceof SupportError && [400, 413].includes(error.status)) status = error.status;
    const response = supportJson({ error: status === 413 ? 'The email webhook is too large.' : status === 400 ? 'Invalid email webhook.' : 'Email webhook processing is temporarily unavailable. Please retry.' }, status);
    if (status === 503) response.headers.set('Retry-After', '60');
    return response;
  }
}
