import test from 'node:test';
import assert from 'node:assert/strict';
import { getSupportConfig, type SupportConfig } from './support-config';
import { processSupportOutbox } from './support-outbox';
import { SupportMailError, type SendSupportEmailInput } from './support-mail';
import type { ClaimedSupportMessage } from './support-store';
import { SupportError } from './support-validation';

const NOW = Date.parse('2026-01-02T12:00:00Z');
const MESSAGE_ID = '93dbd178-a58f-46c6-a4bf-a25da2af6612';
const TICKET_ID = '8b8eb5f5-7928-405e-b7ce-0af6898fc821';
const LOCK_TOKEN = '9c3f126e-6f6f-474e-bcf9-fad94a16b081';

function developmentConfig(overrides: Record<string, string | undefined> = {}): SupportConfig {
  return getSupportConfig({
    SUPPORT_EMAIL_MODE: 'development',
    SUPPORT_FROM_EMAIL: 'onboarding@resend.dev',
    SUPPORT_FROM_NAME: 'DreamVault Support',
    SUPPORT_EMAIL_ADDRESS: 'support@test-account.resend.app',
    SUPPORT_INBOUND_DOMAIN: 'test-account.resend.app',
    SUPPORT_TEST_RECIPIENT: 'owner@example.com',
    SUPPORT_NOTIFICATION_EMAIL: 'owner@example.com',
    SUPPORT_APP_URL: 'https://store.example.com',
    RESEND_API_KEY: 're_not_a_real_private_key',
    RESEND_WEBHOOK_SECRET: 'whsec_not_a_real_signing_secret_123456',
    ...overrides,
  });
}

function liveConfig(domain: string): SupportConfig {
  return developmentConfig({
    SUPPORT_EMAIL_MODE: 'live',
    SUPPORT_FROM_EMAIL: `support@${domain}`,
    SUPPORT_EMAIL_ADDRESS: `support@${domain}`,
    SUPPORT_INBOUND_DOMAIN: domain,
  });
}

function message(overrides: Partial<ClaimedSupportMessage> = {}): ClaimedSupportMessage {
  return Object.freeze({
    id: MESSAGE_ID,
    ticketId: TICKET_ID,
    direction: 'OUTBOUND',
    kind: 'REPLY',
    body: 'Thank you for your message. We can help.',
    fromEmail: null,
    fromName: null,
    toEmail: 'owner@example.com',
    replyToEmail: null,
    subject: 'Re: A question [DV-8B8EB5F5]',
    authorId: 'staff-user-id',
    attachments: [],
    deliveryStatus: 'SENDING',
    attempts: 0,
    nextAttemptAt: new Date(NOW),
    firstAttemptAt: null,
    lockedUntil: new Date(NOW + 60_000),
    lockToken: LOCK_TOKEN,
    providerEmailId: null,
    internetMessageId: null,
    inReplyTo: null,
    sentAt: null,
    providerEventAt: null,
    lastError: null,
    createdAt: new Date(NOW - 60_000),
    replyToken: 'a'.repeat(48),
    customerEmail: 'owner@example.com',
    ...overrides,
  } as ClaimedSupportMessage);
}

type OutboxOverrides = NonNullable<Parameters<typeof processSupportOutbox>[1]>;
type FinishResult = Parameters<NonNullable<OutboxOverrides['finish']>>[1];

function harness(jobs: ClaimedSupportMessage[], config = developmentConfig()) {
  let position = 0;
  let clock = NOW;
  const claims: (string | undefined)[] = [];
  const begins: { message: ClaimedSupportMessage; replyTo: string; config: SupportConfig }[] = [];
  const finishes: { message: ClaimedSupportMessage; result: FinishResult }[] = [];
  const sends: { input: SendSupportEmailInput; config: SupportConfig }[] = [];
  const events: string[] = [];
  const dependencies = {
    config,
    now: () => clock,
    claim: async (ticketId?: string): Promise<ClaimedSupportMessage | null> => {
      claims.push(ticketId);
      events.push('claim');
      return jobs[position++] ?? null;
    },
    begin: async (claimed: ClaimedSupportMessage, replyTo: string, current: SupportConfig): Promise<ClaimedSupportMessage> => {
      begins.push({ message: claimed, replyTo, config: current });
      events.push('begin');
      return message({
        ...claimed,
        attempts: claimed.attempts + 1,
        firstAttemptAt: claimed.firstAttemptAt ?? new Date(clock),
        fromEmail: claimed.fromEmail ?? current.fromEmail,
        fromName: claimed.fromName ?? current.fromName,
        replyToEmail: claimed.replyToEmail ?? replyTo,
      });
    },
    finish: async (claimed: ClaimedSupportMessage, result: FinishResult): Promise<void> => {
      events.push(`finish:${result.status}`);
      finishes.push({ message: claimed, result });
    },
    send: async (input: SendSupportEmailInput, current: SupportConfig): Promise<{ id: string }> => {
      events.push('send');
      sends.push({ input, config: current });
      return { id: 'provider-email-id' };
    },
  };
  return {
    dependencies, claims, begins, finishes, sends, events,
    setClock: (value: number) => { clock = value; },
  };
}

test('empty outbox performs no work and passes the ticket filter to the claim operation', async () => {
  const h = harness([]);
  assert.deepEqual(await processSupportOutbox({ ticketId: TICKET_ID }, h.dependencies), {
    processed: 0, sent: 0, failed: 0, blocked: 0, queued: 0,
  });
  assert.deepEqual(h.claims, [TICKET_ID]);
  assert.equal(h.begins.length + h.sends.length + h.finishes.length, 0);
});

test('development recipient restrictions block a job before beginning or sending, without rewriting its recipient', async () => {
  const claimed = message({ toEmail: 'real-customer@example.net' });
  const h = harness([claimed]);
  const result = await processSupportOutbox({}, h.dependencies);
  assert.equal(result.blocked, 1);
  assert.equal(h.begins.length, 0);
  assert.equal(h.sends.length, 0);
  assert.strictEqual(h.finishes[0].message, claimed);
  assert.equal(h.finishes[0].message.toEmail, 'real-customer@example.net');
  assert.equal(h.finishes[0].message.lockToken, LOCK_TOKEN);
  assert.equal(h.finishes[0].result.status, 'BLOCKED');
  assert.match(h.finishes[0].result.error ?? '', /not sent or redirected/);
});

test('both a valid API key and receiving webhook configuration are required before beginning delivery', async () => {
  for (const config of [
    developmentConfig({ RESEND_API_KEY: undefined }),
    developmentConfig({ RESEND_WEBHOOK_SECRET: undefined }),
    developmentConfig({ RESEND_API_KEY: undefined, RESEND_WEBHOOK_SECRET: undefined }),
  ]) {
    const h = harness([message()], config);
    const result = await processSupportOutbox({}, h.dependencies);
    assert.equal(result.blocked, 1);
    assert.equal(h.begins.length, 0);
    assert.equal(h.sends.length, 0);
    assert.equal(h.finishes[0].result.status, 'BLOCKED');
    assert.match(h.finishes[0].result.error ?? '', /API key and receiving webhook/);
  }
});

test('successful delivery records an attempt before network work and finishes with the original claim lease', async () => {
  const claimed = message({ inReplyTo: '<customer-thread@example.com>' });
  const h = harness([claimed]);
  const result = await processSupportOutbox({ ticketId: TICKET_ID }, h.dependencies);
  assert.deepEqual(result, { processed: 1, sent: 1, failed: 0, blocked: 0, queued: 0 });
  assert.deepEqual(h.events, ['claim', 'begin', 'send', 'finish:SENT', 'claim']);
  assert.equal(h.finishes[0].message.attempts, 1);
  assert.equal(h.finishes[0].message.firstAttemptAt?.getTime(), NOW);
  assert.equal(h.finishes[0].message.lockToken, claimed.lockToken);
  assert.equal(h.finishes[0].message.id, claimed.id);
  assert.deepEqual(h.finishes[0].result, { status: 'SENT', providerId: 'provider-email-id' });
  assert.deepEqual(h.sends[0].input, {
    id: claimed.id,
    to: claimed.toEmail,
    subject: claimed.subject,
    text: claimed.body,
    replyTo: `r+${claimed.replyToken}@test-account.resend.app`,
    inReplyTo: '<customer-thread@example.com>',
    references: ['<customer-thread@example.com>'],
  });
  assert.equal(h.sends[0].config.fromEmail, 'onboarding@resend.dev');
  assert.equal(claimed.attempts, 0, 'The original immutable job object was not mutated.');
  assert.equal(claimed.fromEmail, null);
});

test('notification emails use the configured support address rather than a private conversation address', async () => {
  const h = harness([message({ kind: 'NOTIFICATION' })]);
  await processSupportOutbox({}, h.dependencies);
  assert.equal(h.begins[0].replyTo, 'support@test-account.resend.app');
  assert.equal(h.sends[0].input.replyTo, 'support@test-account.resend.app');
  assert.equal('inReplyTo' in h.sends[0].input, false);
  assert.equal('references' in h.sends[0].input, false);
});

test('sender, reply address, message identity, and payload stay immutable across config changes and retries', async () => {
  const original = message();
  const first = harness([original], liveConfig('old.example'));
  first.dependencies.send = async (input, config) => {
    first.events.push('send');
    first.sends.push({ input, config });
    throw new SupportMailError('PROVIDER_UNAVAILABLE', true);
  };
  await processSupportOutbox({}, first.dependencies);

  const retryJob = message({
    ...first.finishes[0].message,
    deliveryStatus: 'SENDING',
    lockToken: '4d391f17-f118-43ab-839b-d8a40ae358ca',
  });
  const changedConfig = liveConfig('new.example');
  changedConfig.fromName = 'A newly configured sender name';
  const second = harness([retryJob], changedConfig);
  await processSupportOutbox({}, second.dependencies);

  assert.deepEqual(second.sends[0].input, first.sends[0].input);
  assert.equal(second.sends[0].input.id, MESSAGE_ID, 'Stable transport idempotency must use the existing message ID.');
  assert.equal(second.sends[0].config.fromEmail, 'support@old.example');
  assert.equal(second.sends[0].config.fromName, 'DreamVault Support');
  assert.equal(second.sends[0].input.replyTo, `r+${original.replyToken}@old.example`);
  assert.equal(second.finishes[0].message.attempts, 2);
  assert.equal(second.finishes[0].message.lockToken, retryJob.lockToken);
  assert.equal(second.begins[0].replyTo, `r+${original.replyToken}@new.example`);
});

test('a live-mode retry of a previously attempted development sender is blocked, not silently changed', async () => {
  for (const fromEmail of ['onboarding@resend.dev', 'support@account.resend.app']) {
    const claimed = message({
      fromEmail, fromName: 'Original sender', replyToEmail: 'support@account.resend.app',
      attempts: 1, firstAttemptAt: new Date(NOW - 60_000),
    });
    const h = harness([claimed], liveConfig('live.example'));
    const result = await processSupportOutbox({}, h.dependencies);
    assert.equal(result.blocked, 1);
    assert.equal(h.sends.length, 0);
    assert.equal(h.finishes[0].message.fromEmail, fromEmail);
    assert.equal(h.finishes[0].message.lockToken, LOCK_TOKEN);
    assert.equal(h.finishes[0].result.status, 'BLOCKED');
    assert.match(h.finishes[0].result.error ?? '', /development sender/);
  }
});

test('retryable provider errors requeue with exponential backoff and stop the invocation before claiming another job', async () => {
  for (const [priorAttempts, retryAfterSeconds, expectedDelay] of [
    [0, null, 60],
    [1, null, 120],
    [2, null, 240],
    [0, 300, 300],
    [0, 7200, 3600],
  ] as const) {
    const h = harness([message({ attempts: priorAttempts }), message({ id: 'another-message-id' })]);
    h.dependencies.send = async () => {
      const error = new SupportMailError('PROVIDER_RATE_LIMITED', true, retryAfterSeconds);
      Object.assign(error, { cause: new Error('private provider response with customer data') });
      throw error;
    };
    const result = await processSupportOutbox({}, h.dependencies);
    assert.deepEqual(result, { processed: 1, sent: 0, failed: 0, blocked: 0, queued: 1 });
    assert.equal(h.claims.length, 1);
    assert.equal(h.finishes[0].result.status, 'QUEUED');
    assert.equal(h.finishes[0].result.delaySeconds, expectedDelay);
    assert.equal(h.finishes[0].message.attempts, priorAttempts + 1);
    assert.equal(h.finishes[0].message.lockToken, LOCK_TOKEN);
    assert.doesNotMatch(JSON.stringify(h.finishes[0].result), /private provider|customer data/);
  }
});

test('the fifth failed network attempt is terminal instead of scheduling a sixth attempt', async () => {
  const h = harness([message({ attempts: 4 })]);
  h.dependencies.send = async () => { throw new SupportMailError('PROVIDER_UNAVAILABLE', true); };
  const result = await processSupportOutbox({}, h.dependencies);
  assert.equal(result.failed, 1);
  assert.equal(result.queued, 0);
  assert.equal(h.finishes[0].message.attempts, 5);
  assert.equal(h.finishes[0].result.status, 'FAILED');
  assert.equal(h.finishes[0].result.delaySeconds, undefined);
});

test('jobs at the five-attempt limit or 23-hour retry-window boundary fail without another network attempt', async () => {
  for (const claimed of [
    message({ attempts: 5 }),
    message({ firstAttemptAt: new Date(NOW - 23 * 60 * 60 * 1000) }),
    message({ firstAttemptAt: new Date(NOW - 24 * 60 * 60 * 1000) }),
  ]) {
    const h = harness([claimed]);
    const result = await processSupportOutbox({}, h.dependencies);
    assert.equal(result.failed, 1);
    assert.equal(h.begins.length, 0);
    assert.equal(h.sends.length, 0);
    assert.equal(h.finishes[0].result.status, 'FAILED');
    assert.match(h.finishes[0].result.error ?? '', /safe retry window or attempt limit/);
    assert.equal(h.finishes[0].message.lockToken, LOCK_TOKEN);
  }
});

test('a job immediately before the 23-hour boundary can still make a stable retry', async () => {
  const h = harness([message({ attempts: 1, firstAttemptAt: new Date(NOW - 23 * 60 * 60 * 1000 + 1) })]);
  const result = await processSupportOutbox({}, h.dependencies);
  assert.equal(result.sent, 1);
  assert.equal(h.sends[0].input.id, MESSAGE_ID);
});

test('nonretryable provider rejection is a safe failed result, not an endlessly queued job', async () => {
  const h = harness([message()]);
  h.dependencies.send = async () => { throw new SupportMailError('PROVIDER_REJECTED'); };
  const result = await processSupportOutbox({}, h.dependencies);
  assert.equal(result.failed, 1);
  assert.equal(result.queued, 0);
  assert.equal(h.finishes[0].result.status, 'FAILED');
  assert.match(h.finishes[0].result.error ?? '', /provider rejected/);
});

test('transport configuration/recipient errors are blocked without inventing a replacement message', async () => {
  for (const code of ['CONFIGURATION', 'DEVELOPMENT_RECIPIENT_BLOCKED'] as const) {
    const h = harness([message()]);
    h.dependencies.send = async () => { throw new SupportMailError(code); };
    const result = await processSupportOutbox({}, h.dependencies);
    assert.equal(result.blocked, 1);
    assert.equal(result.failed, 0);
    assert.equal(h.finishes[0].result.status, 'BLOCKED');
    assert.equal(h.finishes[0].message.id, MESSAGE_ID);
    assert.equal(h.finishes[0].message.lockToken, LOCK_TOKEN);
  }
});

test('a failed attempt-persistence operation prevents network work and preserves its error for the API sanitizer', async () => {
  const h = harness([message()]);
  const failure = new SupportError(409, 'Another worker is handling this message.');
  h.dependencies.begin = async () => { throw failure; };
  await assert.rejects(processSupportOutbox({}, h.dependencies), (error: unknown) => error === failure);
  assert.equal(h.sends.length, 0);
  assert.equal(h.finishes.length, 0);
});

test('a database failure after provider acceptance leaves the claimed job recoverable with its existing ID', async () => {
  const h = harness([message()]);
  const failure = new Error('private database failure for outer API sanitization');
  h.dependencies.finish = async () => { throw failure; };
  await assert.rejects(processSupportOutbox({}, h.dependencies), (error: unknown) => error === failure);
  assert.equal(h.sends.length, 1);
  assert.equal(h.sends[0].input.id, MESSAGE_ID);
  assert.equal(h.begins.length, 1);
  assert.equal(h.claims.length, 1);
});

test('batch size is bounded and the clock budget prevents beginning another claimed message', async () => {
  const jobs = Array.from({ length: 12 }, (_, index) => message({ id: `message-${index}` }));
  const bounded = harness(jobs);
  assert.equal((await processSupportOutbox({ limit: 100 }, bounded.dependencies)).processed, 10);
  assert.equal(bounded.claims.length, 10);

  const minimum = harness(jobs);
  assert.equal((await processSupportOutbox({ limit: 0 }, minimum.dependencies)).processed, 1);

  const timed = harness(jobs);
  timed.dependencies.send = async (input, config) => {
    timed.sends.push({ input, config });
    timed.setClock(NOW + 1000);
    return { id: 'provider-email-id' };
  };
  assert.equal((await processSupportOutbox({ budgetMs: 500 }, timed.dependencies)).processed, 1);
  assert.equal(timed.claims.length, 1);
});
