import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { getSupportConfig } from './support-config';
import { handleSupportWebhookRequest, processSupportWebhookEvent, type SupportInboundDependencies } from './support-inbound';
import { makeSupportReplyAddress, SupportMailError, type ReceivedSupportEmail, type SupportWebhookEvent } from './support-mail';
import type { SupportIncomingInput } from './support-store';

const secrets = { RESEND_API_KEY: 're_test_key_123456789', RESEND_WEBHOOK_SECRET: `whsec_${Buffer.alloc(32, 7).toString('base64')}` };
const config = getSupportConfig(secrets);
const token = 'ab'.repeat(24);
const event: SupportWebhookEvent = { type: 'email.received', created_at: new Date().toISOString(), data: { email_id: 'received-123' } };

function fixture(overrides: Partial<ReceivedSupportEmail> = {}): ReceivedSupportEmail {
  return {
    id: 'received-123', from: 'DreamVault Test Customer <dreamvault01@gmail.com>', to: [config.supportEmail], subject: 'A question about my order',
    text: 'Could you please help me with my order?', html: null, headers: {}, message_id: '<customer-123@mail.gmail.com>',
    authentication: { spf: 'pass', dkim: 'pass', dmarc: 'pass' }, received_for: [], attachments: [], ...overrides,
  };
}

function harness(email = fixture()) {
  const calls = { checked: [] as string[], fetched: [] as string[], incoming: [] as SupportIncomingInput[], delivered: [] as Parameters<SupportInboundDependencies['storeDelivery']>[0][] };
  const deps: SupportInboundDependencies = {
    wasProcessed: async (id) => { calls.checked.push(id); return false; },
    fetchEmail: async (id) => { calls.fetched.push(id); return email; },
    storeIncoming: async (input) => { calls.incoming.push(input); return { ticketId: 'private-ticket-id', duplicate: false }; },
    storeDelivery: async (input) => { calls.delivered.push(input); return true; },
  };
  return { deps, calls };
}

function requestFor(value: SupportWebhookEvent, id = 'msg_test_inbound'): Request {
  const raw = JSON.stringify(value);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac('sha256', Buffer.from(secrets.RESEND_WEBHOOK_SECRET.slice(6), 'base64')).update(`${id}.${timestamp}.${raw}`).digest('base64');
  return new Request('https://example.com/api/webhooks/resend', {
    method: 'POST', body: raw, headers: { 'content-type': 'application/json', 'svix-id': id, 'svix-timestamp': timestamp, 'svix-signature': `v1,${signature}` },
  });
}

test('trusted direct support email creates an inbox request without rejecting the development Gmail customer', async () => {
  const { deps, calls } = harness();
  assert.equal(await processSupportWebhookEvent(event, 'msg_direct', config, deps), 'accepted');
  assert.deepEqual(calls.checked, ['msg_direct']);
  assert.deepEqual(calls.fetched, ['received-123']);
  assert.equal(calls.incoming[0].from, config.testRecipient);
  assert.equal(calls.incoming[0].replyToken, null);
  assert.equal(calls.incoming[0].messageId, '<customer-123@mail.gmail.com>');
});

test('valid random reply address is handed to the store for exact original-customer validation', async () => {
  const { deps, calls } = harness(fixture({ to: [makeSupportReplyAddress(token, config)] }));
  assert.equal(await processSupportWebhookEvent(event, 'msg_reply', config, deps), 'accepted');
  assert.equal(calls.incoming[0].replyToken, token);
  assert.equal(calls.incoming[0].from, config.testRecipient);
});

test('unknown token or customer mismatch from store never falls back to creating a new request', async () => {
  const { deps, calls } = harness(fixture({ from: 'other-customer@example.com', to: [makeSupportReplyAddress(token, config)] }));
  deps.storeIncoming = async (input) => { calls.incoming.push(input); return { ticketId: null, duplicate: false }; };
  assert.equal(await processSupportWebhookEvent(event, 'msg_mismatch', config, deps), 'skipped');
  assert.equal(calls.incoming.length, 1);
  assert.equal(calls.incoming[0].replyToken, token);
  assert.equal(calls.incoming[0].from, 'other-customer@example.com');
});

test('provider event duplicate is checked before retrieving the message', async () => {
  const { deps, calls } = harness();
  deps.wasProcessed = async () => true;
  assert.equal(await processSupportWebhookEvent(event, 'msg_duplicate', config, deps), 'duplicate');
  assert.equal(calls.fetched.length, 0);
  assert.equal(calls.incoming.length, 0);
});

test('rejects failed/missing/unknown DMARC and SPF-only gray verdicts; forged authentication headers do not count', async () => {
  for (const authentication of [null, { spf: 'pass', dkim: 'pass', dmarc: 'fail' }, { spf: 'pass', dkim: 'pass', dmarc: 'unknown' }, { spf: 'pass', dkim: 'gray', dmarc: 'gray' }, { spf: 'pass', dkim: 'fail', dmarc: 'gray' }]) {
    const { deps, calls } = harness(fixture({ authentication, headers: { 'Authentication-Results': 'dmarc=pass; spf=pass; dkim=pass' } }));
    assert.equal(await processSupportWebhookEvent(event, 'msg_dmarc', config, deps), 'skipped');
    assert.equal(calls.incoming.length, 0);
  }
});

test('accepts gray DMARC only with trusted From-aligned DKIM pass', async () => {
  const { deps, calls } = harness(fixture({ authentication: { spf: 'gray', dkim: 'pass', dmarc: 'gray' } }));
  assert.equal(await processSupportWebhookEvent(event, 'msg_aligned_dkim', config, deps), 'accepted');
  assert.equal(calls.incoming.length, 1);
});

test('ignores exact support senders, private reply aliases, malformed senders and mailer daemons', async () => {
  for (const from of [config.fromEmail, config.supportEmail, makeSupportReplyAddress(token, config), 'postmaster@example.com', 'mailer-daemon+report@example.com', 'one@example.com, two@example.com', 'fake@example.com\r\nBcc: other@example.com']) {
    const { deps, calls } = harness(fixture({ from }));
    assert.equal(await processSupportWebhookEvent(event, 'msg_loop', config, deps), 'skipped');
    assert.equal(calls.incoming.length, 0);
  }
});

test('does not silently discard legitimate customer senders sharing the business domain', async () => {
  const business = getSupportConfig({ ...secrets, SUPPORT_FROM_EMAIL: 'support@example.com', SUPPORT_EMAIL_ADDRESS: 'support@example.com', SUPPORT_INBOUND_DOMAIN: 'example.com' });
  const { deps, calls } = harness(fixture({ from: 'owner@example.com', to: [business.supportEmail] }));
  assert.equal(await processSupportWebhookEvent(event, 'msg_same_domain', business, deps), 'accepted');
  assert.equal(calls.incoming[0].from, 'owner@example.com');
});

test('ignores automated responses, bulk/list mail, reports and explicit null reverse paths', async () => {
  const automatedHeaders: Record<string, string>[] = [
    { 'Auto-Submitted': 'auto-replied' }, { 'Auto-Submitted': 'auto-generated; owner-email=test@example.com' },
    { Precedence: 'bulk' }, { Precedence: 'list' }, { Precedence: 'junk' }, { 'Return-Path': '<>' }, { 'Return-Path': '' },
    { 'List-Id': '<newsletter.example.com>' }, { 'Content-Type': 'multipart/report; report-type=delivery-status' }, { 'X-Autoreply': 'yes' },
  ];
  for (const headers of automatedHeaders) {
    const { deps, calls } = harness(fixture({ headers }));
    assert.equal(await processSupportWebhookEvent(event, 'msg_automated', config, deps), 'skipped');
    assert.equal(calls.incoming.length, 0);
  }
  const { deps } = harness(fixture({ headers: { 'Auto-Submitted': 'no; x-test=true', 'Return-Path': '<customer@example.com>' } }));
  assert.equal(await processSupportWebhookEvent(event, 'msg_human', config, deps), 'accepted');
});

test('rejects unknown, malformed, mixed-domain and ambiguous reply recipients without creating tickets', async () => {
  const address = makeSupportReplyAddress(token, config);
  for (const to of [
    ['unrelated@example.com'], [`r+short@${config.inboundDomain}`], [`r+${token}@${config.inboundDomain}.evil.com`],
    [address, 'unrelated@example.com'], [address, config.supportEmail], [address, makeSupportReplyAddress('cd'.repeat(24), config)],
    ['unknown@' + config.inboundDomain], ['not-an-address'], [],
  ]) {
    const { deps, calls } = harness(fixture({ to }));
    assert.equal(await processSupportWebhookEvent(event, 'msg_target', config, deps), 'skipped');
    assert.equal(calls.incoming.length, 0);
  }
});

test('explicit previous domains accept both old token replies and old direct support address', async () => {
  const migrated = getSupportConfig({ ...secrets, SUPPORT_FROM_EMAIL: 'support@example.com', SUPPORT_EMAIL_ADDRESS: 'support@example.com', SUPPORT_INBOUND_DOMAIN: 'replies.example.com', SUPPORT_PREVIOUS_INBOUND_DOMAINS: config.inboundDomain });
  for (const to of [[makeSupportReplyAddress(token, config)], [config.supportEmail]]) {
    const { deps, calls } = harness(fixture({ to }));
    assert.equal(await processSupportWebhookEvent(event, 'msg_migrated', migrated, deps), 'accepted');
    assert.equal(calls.incoming.length, 1);
  }
});

test('HTML-only emails are stored as inert text; attachments remain metadata without fetching URLs', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('No HTML or attachment URL may be fetched'); });
  const { deps, calls } = harness(fixture({
    text: null, html: '<script>bad()</script><p>Hello &amp; thank you</p><img src="https://example.com/tracker"><p>Photo attached.</p>',
    attachments: Array.from({ length: 12 }, (_, index) => ({ id: `attachment-${index}`, filename: '../photo\u0000.jpg', content_type: 'image/jpeg', size: 500 })),
  }));
  await processSupportWebhookEvent(event, 'msg_html', config, deps);
  assert.equal(calls.incoming[0].body, 'Hello & thank you\nPhoto attached.');
  assert.equal(calls.incoming[0].attachments.length, 10);
  assert.deepEqual(calls.incoming[0].attachments[0], { name: '.._photo.jpg', contentType: 'image/jpeg', size: 500 });
  assert.equal(fetch.mock.callCount(), 0);
});

test('prefers plain text, strips controls, bounds stored body and drops invalid message-ID headers', async () => {
  const { deps, calls } = harness(fixture({ text: '\u0000' + 'a'.repeat(25_000), html: '<p>Do not use this alternative</p>', subject: 'Subject\r\nBcc: fake@example.com', message_id: '<bad@example.com>\r\nInjected: x' }));
  await processSupportWebhookEvent(event, 'msg_bounds', config, deps);
  assert.equal(calls.incoming[0].body.length, 20_000);
  assert.equal(calls.incoming[0].body.includes('\u0000'), false);
  assert.equal(calls.incoming[0].subject.includes('\n'), false);
  assert.equal(calls.incoming[0].messageId, null);
});

test('delivery events map to the store and preserve validated event occurrence time', async () => {
  const { deps, calls } = harness();
  const created_at = new Date(Date.now() - 10_000).toISOString();
  assert.equal(await processSupportWebhookEvent({ ...event, type: 'email.delivered', created_at }, 'msg_delivered', config, deps), 'accepted');
  assert.equal(calls.fetched.length, 0);
  assert.equal(calls.delivered[0].status, 'DELIVERED');
  assert.equal(calls.delivered[0].occurredAt.toISOString(), created_at);
});

test('unknown delivery provider IDs are retryable rather than acknowledged before send DB commit', async () => {
  const { deps } = harness();
  deps.storeDelivery = async () => false;
  const response = await handleSupportWebhookRequest(requestFor({ ...event, type: 'email.delivered' }), config, deps);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('Retry-After'), '60');
});

test('invalid, impossible and far-future delivery timestamps never reach the delivery store', async () => {
  for (const created_at of ['not-a-date', '2026-02-30T12:00:00Z', '2026-02-30T12:00:00.123456+00:00', '2024-02-22T23:41:11.1234567890Z', '2024-02-22T23:41:11.123+01:00', '2024-02-22T23:41:11.123-00:00', new Date(Date.now() + 86_400_000).toISOString()]) {
    const { deps, calls } = harness();
    await assert.rejects(processSupportWebhookEvent({ ...event, type: 'email.delivered', created_at }, 'msg_bad_date', config, deps), { status: 400 });
    assert.equal(calls.delivered.length, 0);
  }
});

test('UTC timestamps allow 1–9 fractional digits and truncate sub-millisecond precision', async () => {
  for (const [created_at, expected] of [
    ['2024-02-22T23:41:11Z', '2024-02-22T23:41:11.000Z'],
    ['2024-02-22T23:41:11.1Z', '2024-02-22T23:41:11.100Z'],
    ['2024-02-22T23:41:11.12+00:00', '2024-02-22T23:41:11.120Z'],
    ['2024-02-22T23:41:11.123456+00:00', '2024-02-22T23:41:11.123Z'],
    ['2024-02-22T23:41:11.123456789Z', '2024-02-22T23:41:11.123Z'],
  ]) {
    const { deps, calls } = harness();
    assert.equal(await processSupportWebhookEvent({ ...event, type: 'email.delivered', created_at }, 'msg_precise_time', config, deps), 'accepted');
    assert.equal(calls.delivered[0].occurredAt.toISOString(), expected);
  }
});

test('unknown event types are acknowledged without database or email requests', async () => {
  const { deps, calls } = harness();
  assert.equal(await processSupportWebhookEvent({ ...event, type: 'domain.created' }, 'msg_unknown', config, deps), 'skipped');
  assert.equal(calls.checked.length, 0);
  assert.equal(calls.fetched.length, 0);
});

test('signed handler acknowledges success without exposing private ticket IDs, addresses or tokens', async () => {
  const { deps } = harness(fixture({ to: [makeSupportReplyAddress(token, config)] }));
  const response = await handleSupportWebhookRequest(requestFor(event), config, deps);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { received: true });
  assert.ok(response.headers.get('Cache-Control')?.includes('no-store'));
});

test('invalid signatures are rejected before injected database/provider dependencies run', async () => {
  const { deps, calls } = harness();
  const request = requestFor(event);
  request.headers.set('svix-signature', 'v1,invalid');
  const response = await handleSupportWebhookRequest(request, config, deps);
  assert.equal(response.status, 400);
  assert.equal(calls.checked.length, 0);
  assert.equal(calls.fetched.length, 0);
});

test('missing webhook configuration and provider failures produce safe generic retryable responses', async () => {
  const { deps, calls } = harness();
  assert.equal((await handleSupportWebhookRequest(requestFor(event), getSupportConfig({}), deps)).status, 503);
  assert.equal(calls.checked.length, 0);
  deps.fetchEmail = async () => { throw new SupportMailError('PROVIDER_UNAVAILABLE', true, 60); };
  const response = await handleSupportWebhookRequest(requestFor(event), config, deps);
  assert.equal(response.status, 503);
  const body = await response.text();
  assert.equal(body.includes(config.testRecipient), false);
  assert.equal(body.includes(secrets.RESEND_API_KEY), false);
});

test('actual route rejects unsigned, malformed and oversized requests before any DB access', async (t) => {
  const envNames = ['RESEND_API_KEY', 'RESEND_WEBHOOK_SECRET', 'SUPPORT_EMAIL_MODE', 'SUPPORT_FROM_EMAIL', 'SUPPORT_EMAIL_ADDRESS', 'SUPPORT_INBOUND_DOMAIN', 'SUPPORT_PREVIOUS_INBOUND_DOMAINS', 'SUPPORT_FROM_NAME', 'SUPPORT_TEST_RECIPIENT', 'SUPPORT_NOTIFICATION_EMAIL', 'SUPPORT_APP_URL'] as const;
  const previous = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
  for (const name of envNames) delete process.env[name];
  Object.assign(process.env, secrets);
  t.after(() => { for (const name of envNames) { if (previous[name] === undefined) delete process.env[name]; else process.env[name] = previous[name]; } });
  const { POST } = await import('../app/api/webhooks/resend/route');
  assert.equal((await POST(new Request('https://example.com/api/webhooks/resend', { method: 'POST', body: '{}' }))).status, 400);
  const invalid = requestFor(event);
  invalid.headers.set('svix-signature', 'v1,invalid');
  assert.equal((await POST(invalid)).status, 400);
  const huge = requestFor({ ...event, data: { email_id: 'received-123', padding: 'é'.repeat(70_000) } });
  assert.equal((await POST(huge)).status, 413);
  assert.equal((await POST(requestFor({ ...event, type: 'domain.created', data: {} }))).status, 200);
});
