import 'server-only';
import { Resend, type Response as ResendResponse } from 'resend';
import { getSupportConfig, normalizeSupportEmail, type SupportConfig } from './support-config';
import { normalizeRfcMessageId } from './support-validation';

type SupportMailErrorCode = 'CONFIGURATION' | 'INVALID_INPUT' | 'DEVELOPMENT_RECIPIENT_BLOCKED' | 'PROVIDER_UNAVAILABLE' | 'PROVIDER_RATE_LIMITED' | 'PROVIDER_REJECTED' | 'INVALID_WEBHOOK';

const ERROR_MESSAGES: Record<SupportMailErrorCode, string> = {
  CONFIGURATION: 'Support email is not fully configured. Check the server email settings.',
  INVALID_INPUT: 'The email request contains an invalid address, header, or message.',
  DEVELOPMENT_RECIPIENT_BLOCKED: 'Development mode can only send to the configured test recipient. The message was not sent or forwarded.',
  PROVIDER_UNAVAILABLE: 'The email provider is temporarily unavailable. The saved message can be retried.',
  PROVIDER_RATE_LIMITED: 'The email provider requested a pause before another attempt.',
  PROVIDER_REJECTED: 'The email provider rejected this request. Check configuration and delivery status before retrying.',
  INVALID_WEBHOOK: 'The email webhook signature or event is invalid.',
};

export class SupportMailError extends Error {
  constructor(public readonly code: SupportMailErrorCode, public readonly retryable = false, public readonly retryAfterSeconds: number | null = null) {
    super(ERROR_MESSAGES[code]);
    this.name = 'SupportMailError';
  }
}

const REQUEST_TIMEOUT_MS = 8_000;
const MAX_RESPONSE_BYTES = 2_000_000;
const HEADER_CONTROL = /[\u0000-\u001f\u007f]/;
const TOKEN = /^[a-f0-9]{48}$/;

function retryAfterSeconds(value: string | null): number {
  if (!value) return 60;
  const seconds = /^\d+$/.test(value) ? Number(value) : Math.ceil((Date.parse(value) - Date.now()) / 1000);
  return Number.isFinite(seconds) ? Math.max(1, Math.min(seconds, 3600)) : 60;
}

/**
 * Keep SDK request construction/signature verification while avoiding its automatic
 * development logging of untrusted provider error bodies (which may contain PII).
 */
class SupportResend extends Resend {
  constructor(key: string) {
    super(key, { baseUrl: 'https://api.resend.com' });
  }

  override async fetchRequest<T>(path: string, options: RequestInit = {}): Promise<ResendResponse<T>> {
    if (!/^\/emails(?:\/receiving\/[a-zA-Z0-9-]+(?:\?html_format=cid)?)?$/.test(path)) throw new SupportMailError('INVALID_INPUT');
    try {
      const response = await fetch(`${this.baseUrl}${path}`, { ...options, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      if (!response.ok) {
        // Do not read, log, or return provider error text, addresses, or request data.
        await response.body?.cancel();
        if (response.status === 429) throw new SupportMailError('PROVIDER_RATE_LIMITED', true, retryAfterSeconds(response.headers.get('retry-after')));
        if (response.status >= 500 || [408, 409, 425].includes(response.status)) throw new SupportMailError('PROVIDER_UNAVAILABLE', true, 60);
        throw new SupportMailError('PROVIDER_REJECTED');
      }
      const reader = response.body?.getReader();
      if (!reader) throw new SupportMailError('PROVIDER_UNAVAILABLE', true, 60);
      const chunks: Uint8Array[] = [];
      let length = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        length += chunk.value.byteLength;
        if (length > MAX_RESPONSE_BYTES) {
          await reader.cancel();
          throw new SupportMailError('PROVIDER_REJECTED');
        }
        chunks.push(chunk.value);
      }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      const data = JSON.parse(new TextDecoder().decode(bytes)) as T;
      return { data, error: null, headers: Object.fromEntries(response.headers.entries()) };
    } catch (error) {
      if (error instanceof SupportMailError) throw error;
      throw new SupportMailError('PROVIDER_UNAVAILABLE', true, 60);
    }
  }
}

export interface SendSupportEmailInput {
  id: string;
  to: string;
  subject: string;
  text: string;
  replyTo: string;
  inReplyTo?: string;
  references?: string[];
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

export async function sendSupportEmail(input: SendSupportEmailInput, config: SupportConfig = getSupportConfig()): Promise<{ id: string }> {
  if (!config.configured) throw new SupportMailError('CONFIGURATION');
  if (!input || typeof input.to !== 'string' || typeof input.replyTo !== 'string' || typeof input.id !== 'string' || typeof input.subject !== 'string' || typeof input.text !== 'string'
    || (input.inReplyTo !== undefined && typeof input.inReplyTo !== 'string')
    || (input.references !== undefined && (!Array.isArray(input.references) || input.references.some((value) => typeof value !== 'string')))) {
    throw new SupportMailError('INVALID_INPUT');
  }
  const to = normalizeSupportEmail(input.to);
  const replyTo = normalizeSupportEmail(input.replyTo);
  if (!to || !replyTo || /[<>]/.test(input.to + input.replyTo) || !/^[a-zA-Z0-9_-]{1,200}$/.test(input.id)
    || !input.subject.trim() || input.subject.length > 250 || HEADER_CONTROL.test(input.subject)
    || !input.text.trim() || input.text.length > 100_000 || /[\u0000\u000b\u000c]/.test(input.text)
    || (input.inReplyTo !== undefined && normalizeRfcMessageId(input.inReplyTo) !== input.inReplyTo)
    || (input.references !== undefined && (input.references.length > 20 || input.references.some((value) => normalizeRfcMessageId(value) !== value)))) {
    throw new SupportMailError('INVALID_INPUT');
  }
  if (config.mode === 'development' && to !== config.testRecipient) throw new SupportMailError('DEVELOPMENT_RECIPIENT_BLOCKED');

  const headers: Record<string, string> = {};
  if (input.inReplyTo) headers['In-Reply-To'] = input.inReplyTo;
  if (input.references?.length) headers.References = input.references.join(' ');
  const html = `<!doctype html><html><body style="margin:0;background:#f8f7f4;color:#25241f;font-family:Arial,sans-serif"><div style="max-width:600px;margin:0 auto;padding:36px 24px"><p style="font-size:12px;letter-spacing:3px;color:#8b702f">DREAMVAULT</p><div style="padding:24px 0;border-top:1px solid #dedbd3;border-bottom:1px solid #dedbd3;font-size:15px;line-height:1.8;overflow-wrap:anywhere">${escapeHtml(input.text).replace(/\r\n?|\n/g, '<br>')}</div><p style="font-size:12px;line-height:1.7;color:#67645c">DreamVault Support</p></div></body></html>`;
  try {
    const { data, error } = await new SupportResend(config.apiKey).emails.send({
      from: `"${config.fromName.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}" <${config.fromEmail}>`,
      to: [to], subject: input.subject, text: input.text, html, replyTo,
      ...(Object.keys(headers).length ? { headers } : {}),
    }, { idempotencyKey: `support/${input.id}` });
    if (error || !data || typeof data.id !== 'string') throw new SupportMailError('PROVIDER_REJECTED');
    return { id: data.id };
  } catch (error) {
    if (error instanceof SupportMailError) throw error;
    throw new SupportMailError('PROVIDER_UNAVAILABLE', true, 60);
  }
}

export interface ReceivedSupportEmail {
  id: string;
  from: string;
  to: string[];
  subject: string;
  text: string | null;
  html: string | null;
  headers: Record<string, string>;
  message_id: string | null;
  received_for: string[];
  authentication: { spf: string; dkim: string; dmarc: string } | null;
  attachments: { id: string; filename: string | null; content_type: string; size: number }[];
}

export async function fetchReceivedEmail(id: string, config: SupportConfig = getSupportConfig()): Promise<ReceivedSupportEmail> {
  if (!config.configured) throw new SupportMailError('CONFIGURATION');
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(id)) throw new SupportMailError('INVALID_INPUT');
  try {
    // CID avoids downloading/re-embedding inline images. Never fetch attachment URLs.
    const { data, error } = await new SupportResend(config.apiKey).emails.receiving.get(id, { html_format: 'cid' });
    if (error || !data || typeof data.id !== 'string' || typeof data.from !== 'string' || !Array.isArray(data.to)) throw new SupportMailError('PROVIDER_REJECTED');
    const headers: Record<string, string> = {};
    for (const [name, value] of Object.entries(data.headers ?? {})) {
      if (typeof value === 'string' && name.length < 100 && value.length <= 10_000) headers[name.toLowerCase()] = value;
    }
    // The REST response includes authentication before the current SDK types do.
    const verdict = (data as unknown as Record<string, unknown>).authentication;
    const authentication = verdict && typeof verdict === 'object' && !Array.isArray(verdict) ? verdict as Record<string, unknown> : null;
    return {
      id: data.id,
      from: data.from,
      to: data.to.filter((value): value is string => typeof value === 'string').slice(0, 100),
      subject: typeof data.subject === 'string' ? data.subject.slice(0, 1000) : '',
      text: typeof data.text === 'string' ? data.text : null,
      html: typeof data.html === 'string' ? data.html : null,
      headers,
      message_id: typeof data.message_id === 'string' ? data.message_id : null,
      received_for: Array.isArray(data.received_for) ? data.received_for.filter((value): value is string => typeof value === 'string').slice(0, 100) : [],
      // This is the provider's receiving-server verdict, not a sender supplied header.
      authentication: authentication && ['spf', 'dkim', 'dmarc'].every((key) => typeof authentication[key] === 'string') ? {
        spf: authentication.spf as string, dkim: authentication.dkim as string, dmarc: authentication.dmarc as string,
      } : null,
      attachments: (data.attachments ?? []).slice(0, 100).map((attachment) => ({
        id: String(attachment.id).slice(0, 100), filename: typeof attachment.filename === 'string' ? attachment.filename.slice(0, 255) : null,
        content_type: typeof attachment.content_type === 'string' ? attachment.content_type.slice(0, 150) : 'application/octet-stream',
        size: Number.isSafeInteger(attachment.size) && attachment.size >= 0 ? attachment.size : 0,
      })),
    };
  } catch (error) {
    if (error instanceof SupportMailError) throw error;
    throw new SupportMailError('PROVIDER_UNAVAILABLE', true, 60);
  }
}

export interface SupportWebhookEvent {
  type: string;
  created_at: string;
  data: Record<string, unknown>;
}

export function verifySupportWebhook(raw: string, headers: Headers, config: SupportConfig = getSupportConfig()): SupportWebhookEvent {
  if (!config.webhookConfigured) throw new SupportMailError('CONFIGURATION');
  if (raw.length > 256_000) throw new SupportMailError('INVALID_WEBHOOK');
  try {
    // The SDK checks the signed raw bytes and timestamp freshness, not re-stringified JSON.
    const event = new SupportResend(config.apiKey || 're_webhook_verification_only').webhooks.verify({
      payload: raw,
      headers: { id: headers.get('svix-id') ?? '', timestamp: headers.get('svix-timestamp') ?? '', signature: headers.get('svix-signature') ?? '' },
      webhookSecret: config.webhookSecret,
    });
    if (!event || typeof event.type !== 'string' || typeof event.created_at !== 'string' || !event.data || typeof event.data !== 'object' || Array.isArray(event.data)) throw new Error();
    return event as unknown as SupportWebhookEvent;
  } catch {
    throw new SupportMailError('INVALID_WEBHOOK');
  }
}

export function makeSupportReplyAddress(token: string, config: SupportConfig = getSupportConfig()): string {
  if (!TOKEN.test(token)) throw new SupportMailError('INVALID_INPUT');
  const address = normalizeSupportEmail(`r+${token}@${config.inboundDomain}`);
  if (!address) throw new SupportMailError('CONFIGURATION');
  return address;
}

export function parseSupportReplyToken(recipients: string[], config: SupportConfig = getSupportConfig()): string | null {
  if (!recipients.length || recipients.length > 100) return null;
  const allowed = new Set([config.inboundDomain, ...config.previousInboundDomains]);
  const tokens = new Set<string>();
  for (const recipient of recipients) {
    const address = normalizeSupportEmail(recipient);
    if (!address) return null;
    const [local, domain] = address.split('@');
    // A mixed-domain recipient list or two different reply tokens is ambiguous.
    if (!allowed.has(domain)) return null;
    if (local.startsWith('r+')) {
      const token = local.slice(2);
      if (!TOKEN.test(token)) return null;
      tokens.add(token);
    }
  }
  return tokens.size === 1 ? [...tokens][0] : null;
}

/** Plain text only. The result must still be rendered as text, never innerHTML. */
export function htmlToSafeText(html: string): string {
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', copy: '©', reg: '®', euro: '€', pound: '£', yen: '¥', bull: '•', laquo: '«', raquo: '»' };
  return html.slice(0, MAX_RESPONSE_BYTES)
    .replace(/<!--[\s\S]*?(?:-->|$)/g, '')
    .replace(/<(script|style|noscript|iframe|object|svg|template)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi, '')
    .replace(/<br\b[^>]*\/?\s*>/gi, '\n')
    .replace(/<\/(?:p|div|section|article|h[1-6]|li|tr|blockquote)\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
      if (!code.startsWith('#')) return entities[code.toLowerCase()] ?? entity;
      const point = code[1]?.toLowerCase() === 'x' ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
      return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : '�';
    })
    .replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
