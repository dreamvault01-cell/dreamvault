import test from 'node:test';
import assert from 'node:assert/strict';
import { OrderMailError, type OrderEmailConfig } from './order-mail';
import { processOrderOutbox } from './order-notifications';

const NOW = Date.parse('2026-10-29T12:00:00Z');
const NOTIFICATION_ID = 'order-notification-123';
const ORDER_ID = 'order-123';
const LOCK_TOKEN = 'worker-lease-123';

type Dependencies = NonNullable<Parameters<typeof processOrderOutbox>[1]>;
type Notification = NonNullable<Awaited<ReturnType<NonNullable<Dependencies['claim']>>>>;
type FinishResult = Parameters<NonNullable<Dependencies['finish']>>[1];
type SendInput = Parameters<NonNullable<Dependencies['send']>>[0];

function config(overrides: Partial<OrderEmailConfig> = {}): OrderEmailConfig {
  return {
    mode: 'development',
    apiKey: 're_fake_test_key_never_used',
    fromEmail: 'onboarding@resend.dev',
    fromName: 'DreamVault',
    replyTo: 'support@example.com',
    testRecipient: 'owner@example.com',
    appUrl: 'https://store.example.com',
    configured: true,
    issues: [],
    ...overrides,
  };
}

function notification(overrides: Partial<Notification> = {}): Notification {
  return Object.freeze({
    id: NOTIFICATION_ID,
    orderId: ORDER_ID,
    kind: 'ORDER_CONFIRMED',
    toEmail: 'owner@example.com',
    subject: 'Your order is confirmed',
    text: 'Your selected print is confirmed.',
    html: '<p>Your selected print is confirmed.</p>',
    deliveryStatus: 'SENDING',
    attempts: 0,
    nextAttemptAt: new Date(NOW),
    firstAttemptAt: null,
    lockedUntil: new Date(NOW + 90_000),
    lockToken: LOCK_TOKEN,
    providerEmailId: null,
    lastError: null,
    createdAt: new Date(NOW - 60_000),
    ...overrides,
  });
}

function harness(jobs: Notification[], emailConfig = config()) {
  let position = 0;
  const claims: Array<string | undefined> = [];
  const begins: Notification[] = [];
  const finishes: Array<{ notification: Notification; result: FinishResult }> = [];
  const sends: SendInput[] = [];
  const dependencies: Required<Dependencies> = {
    config: emailConfig,
    now: () => NOW,
    claim: async (orderId) => {
      claims.push(orderId);
      return jobs[position++] ?? null;
    },
    begin: async (claimed) => {
      begins.push(claimed);
      return { ...claimed, attempts: claimed.attempts + 1, firstAttemptAt: claimed.firstAttemptAt ?? new Date(NOW) };
    },
    finish: async (claimed, result) => { finishes.push({ notification: claimed, result }); },
    send: async (input) => {
      sends.push(input);
      return { id: 'provider-email-123' };
    },
  };
  return { dependencies, claims, begins, finishes, sends };
}

test('missing setup and development recipient restrictions preserve the network-attempt budget', async () => {
  for (const [claimed, emailConfig] of [
    [notification(), config({ configured: false, issues: ['Missing private configuration.'] })],
    [notification({ toEmail: 'customer@example.net' }), config()],
  ] as const) {
    const h = harness([claimed, notification({ id: 'next-notification' })], emailConfig);
    const result = await processOrderOutbox({}, h.dependencies);
    assert.deepEqual(result, { processed: 1, sent: 0, failed: 0, blocked: 0, queued: 1 });
    assert.equal(h.begins.length, 0);
    assert.equal(h.sends.length, 0);
    assert.equal(h.claims.length, 1);
    assert.equal(h.finishes.length, 1);
    assert.equal(h.finishes[0].notification.attempts, 0);
    assert.equal(h.finishes[0].result.status, 'QUEUED');
    assert.equal(h.finishes[0].result.delaySeconds, 15 * 60);
    assert.equal(h.finishes[0].notification.toEmail, claimed.toEmail);
  }
});

test('a provider outage retries using the persisted attempt count and stops the current batch', async () => {
  for (const [priorAttempts, expectedDelay] of [[0, 60], [3, 480]] as const) {
    const h = harness([notification({ attempts: priorAttempts }), notification({ id: 'next-notification' })]);
    h.dependencies.send = async (input) => {
      h.sends.push(input);
      throw new OrderMailError('PROVIDER_UNAVAILABLE', true);
    };
    const result = await processOrderOutbox({}, h.dependencies);
    assert.deepEqual(result, { processed: 1, sent: 0, failed: 0, blocked: 0, queued: 1 });
    assert.equal(h.sends.length, 1);
    assert.equal(h.claims.length, 1);
    assert.equal(h.begins.length, 1);
    assert.equal(h.finishes[0].result.status, 'QUEUED');
    assert.equal(h.finishes[0].result.delaySeconds, expectedDelay);
  }
});

test('the fifth failed provider attempt is terminal rather than scheduling a sixth send', async () => {
  const h = harness([notification({ attempts: 4 })]);
  h.dependencies.send = async (input) => {
    h.sends.push(input);
    throw new OrderMailError('PROVIDER_UNAVAILABLE', true);
  };
  const result = await processOrderOutbox({}, h.dependencies);
  assert.equal(result.failed, 1);
  assert.equal(result.queued, 0);
  assert.equal(h.begins.length, 1);
  assert.equal(h.sends.length, 1);
  assert.equal(h.finishes.length, 1);
  assert.equal(h.finishes[0].result.status, 'FAILED');
  assert.equal(h.finishes[0].result.delaySeconds, undefined);
});

test('exhausted attempts and the 23-hour boundary prevent any further provider request', async () => {
  for (const claimed of [
    notification({ attempts: 5 }),
    notification({ attempts: 8 }),
    notification({ firstAttemptAt: new Date(NOW - 23 * 60 * 60_000) }),
    notification({ firstAttemptAt: new Date(NOW - 24 * 60 * 60_000) }),
  ]) {
    const h = harness([claimed]);
    const result = await processOrderOutbox({}, h.dependencies);
    assert.equal(result.failed, 1);
    assert.equal(result.sent, 0);
    assert.equal(h.begins.length, 0);
    assert.equal(h.sends.length, 0);
    assert.equal(h.finishes[0].result.status, 'FAILED');
    assert.match(h.finishes[0].result.error ?? '', /safe automatic retry window/);
  }
});

test('success immediately before the retry boundary sends the immutable notification ID and content', async () => {
  const claimed = notification({ attempts: 1, firstAttemptAt: new Date(NOW - 23 * 60 * 60_000 + 1) });
  const h = harness([claimed]);
  const result = await processOrderOutbox({ orderId: ORDER_ID }, h.dependencies);
  assert.deepEqual(result, { processed: 1, sent: 1, failed: 0, blocked: 0, queued: 0 });
  assert.equal(h.claims[0], ORDER_ID);
  assert.deepEqual(h.sends, [{
    id: NOTIFICATION_ID,
    to: claimed.toEmail,
    subject: claimed.subject,
    text: claimed.text,
    html: claimed.html,
  }]);
  assert.equal(h.finishes.length, 1);
  assert.equal(h.finishes[0].notification.lockToken, LOCK_TOKEN);
  assert.deepEqual(h.finishes[0].result, { status: 'SENT', providerId: 'provider-email-123' });
});

test('provider acceptance followed by a database error preserves the lease for retry with the same ID', async () => {
  const claimed = notification();
  const h = harness([claimed]);
  const failure = new Error('Database completion failed.');
  h.dependencies.finish = async (current, result) => {
    h.finishes.push({ notification: current, result });
    throw failure;
  };
  await assert.rejects(processOrderOutbox({}, h.dependencies), (error: unknown) => error === failure);
  assert.equal(h.claims.length, 1);
  assert.equal(h.begins.length, 1);
  assert.equal(h.sends.length, 1);
  assert.equal(h.finishes.length, 1);
  assert.equal(h.finishes[0].result.status, 'SENT');
  assert.equal(h.finishes[0].notification.lockToken, LOCK_TOKEN);
  assert.equal(claimed.deliveryStatus, 'SENDING');

  // A new lease retains the persisted network attempt and original message.
  const recovered = harness([notification({ attempts: 1, firstAttemptAt: new Date(NOW), lockToken: 'recovered-lease' })]);
  const result = await processOrderOutbox({}, recovered.dependencies);
  assert.equal(result.sent, 1);
  assert.deepEqual(recovered.sends[0], h.sends[0]);
  assert.equal(recovered.finishes[0].notification.lockToken, 'recovered-lease');
});

test('failure to persist the attempt prevents delivery and does not invent a failed completion', async () => {
  const h = harness([notification()]);
  const failure = new Error('The delivery lease was lost.');
  h.dependencies.begin = async () => { throw failure; };
  await assert.rejects(processOrderOutbox({}, h.dependencies), (error: unknown) => error === failure);
  assert.equal(h.sends.length, 0);
  assert.equal(h.finishes.length, 0);
});
