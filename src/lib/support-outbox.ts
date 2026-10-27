import 'server-only';
import { getSupportConfig, type SupportConfig } from './support-config';
import { makeSupportReplyAddress, sendSupportEmail, SupportMailError, type SendSupportEmailInput } from './support-mail';
import { beginSupportDelivery, claimSupportMessage, finishSupportDelivery, supportDeliveryBlock, type ClaimedSupportMessage } from './support-store';

export interface SupportProcessResult { processed: number; sent: number; failed: number; blocked: number; queued: number }
interface OutboxDependencies {
  config: SupportConfig;
  claim: typeof claimSupportMessage;
  begin: typeof beginSupportDelivery;
  finish: typeof finishSupportDelivery;
  send: (input: SendSupportEmailInput, config: SupportConfig) => Promise<{ id: string }>;
  now: () => number;
}

/** Durable database jobs, bounded work, leased claims and stable provider idempotency. */
export async function processSupportOutbox(
  options: { ticketId?: string; limit?: number; budgetMs?: number } = {},
  overrides: Partial<OutboxDependencies> = {},
): Promise<SupportProcessResult> {
  const deps: OutboxDependencies = {
    config: getSupportConfig(), claim: claimSupportMessage, begin: beginSupportDelivery,
    finish: finishSupportDelivery, send: sendSupportEmail, now: Date.now, ...overrides,
  };
  const result: SupportProcessResult = { processed: 0, sent: 0, failed: 0, blocked: 0, queued: 0 };
  const limit = Math.max(1, Math.min(10, options.limit ?? 5));
  const deadline = deps.now() + Math.max(100, Math.min(25_000, options.budgetMs ?? 15_000));
  while (result.processed < limit && deps.now() < deadline) {
    let message: ClaimedSupportMessage | null = await deps.claim(options.ticketId);
    if (!message) break;
    result.processed++;
    const blocked = supportDeliveryBlock(message.toEmail ?? '', deps.config);
    if (blocked) {
      await deps.finish(message, { status: 'BLOCKED', error: blocked });
      result.blocked++;
      continue;
    }
    if ((message.firstAttemptAt && deps.now() - message.firstAttemptAt.getTime() >= 23 * 60 * 60 * 1000) || message.attempts >= 5) {
      await deps.finish(message, { status: 'FAILED', error: 'The safe retry window or attempt limit has been reached. Check Resend delivery before writing a new reply.' });
      result.failed++;
      continue;
    }
    try {
      const replyTo = message.kind === 'NOTIFICATION' ? deps.config.supportEmail : makeSupportReplyAddress(message.replyToken, deps.config);
      // Persist the exact sender/reply address at the first network attempt. Later
      // config changes must not mutate a request covered by an idempotency key.
      message = await deps.begin(message, replyTo, deps.config);
      if (deps.config.mode === 'live' && /@(resend\.dev|(?:[^@]+\.)?resend\.app)$/i.test(message.fromEmail ?? '')) {
        await deps.finish(message, { status: 'BLOCKED', error: 'This message was attempted with a development sender. Review it before sending a new live reply.' });
        result.blocked++;
        continue;
      }
      const sender = { ...deps.config, fromEmail: message.fromEmail!, fromName: message.fromName! };
      const sent = await deps.send({
        id: message.id, to: message.toEmail!, subject: message.subject, text: message.body,
        replyTo: message.replyToEmail!,
        ...(message.inReplyTo ? { inReplyTo: message.inReplyTo, references: [message.inReplyTo] } : {}),
      }, sender);
      await deps.finish(message, { status: 'SENT', providerId: sent.id });
      result.sent++;
    } catch (error) {
      // If the network accepted the message but the DB write failed, the lease
      // and stable key permit a safe retry; never invent a replacement message.
      if (!(error instanceof SupportMailError)) throw error;
      if (['CONFIGURATION', 'DEVELOPMENT_RECIPIENT_BLOCKED'].includes(error.code)) {
        await deps.finish(message, { status: 'BLOCKED', error: error.message });
        result.blocked++;
      } else if (error.retryable && message.attempts < 5) {
        const delaySeconds = Math.min(3600, Math.max(error.retryAfterSeconds ?? 0, 60 * 2 ** Math.max(0, message.attempts - 1)));
        await deps.finish(message, { status: 'QUEUED', error: error.message, delaySeconds });
        result.queued++;
        // Stop this invocation on provider failures, rather than consuming its quota.
        break;
      } else {
        await deps.finish(message, { status: 'FAILED', error: error.message });
        result.failed++;
      }
    }
  }
  return result;
}
