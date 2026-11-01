import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { getSupportConfig } from './support-config';
import { fetchReceivedEmail, htmlToSafeText, makeSupportReplyAddress, parseSupportReplyToken, sendSupportEmail, SupportMailError, verifySupportWebhook } from './support-mail';

const secrets = { RESEND_API_KEY: 're_test_key_123456789', RESEND_WEBHOOK_SECRET: `whsec_${Buffer.alloc(32, 7).toString('base64')}` };
const config = getSupportConfig(secrets);
const token = 'ab'.repeat(24);
const email = {
  id: 'message_123', to: config.testRecipient, subject: 'Your RareDaze enquiry', text: 'Hello!\nHow can we help?',
  replyTo: makeSupportReplyAddress(token, config),
};

test('development blocks unrelated customers instead of rewriting or forwarding recipients', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Network must not be called'); });
  await assert.rejects(sendSupportEmail({ ...email, to: 'real-customer@example.com' }, config), (error: unknown) => {
    assert.ok(error instanceof SupportMailError);
    assert.equal(error.code, 'DEVELOPMENT_RECIPIENT_BLOCKED');
    assert.equal(error.retryable, false);
    return true;
  });
  assert.equal(fetch.mock.callCount(), 0);
});

test('send uses exact recipient, reply address, stable provider idempotency, and escaped HTML', async (t) => {
  let body: Record<string, unknown> = {};
  let headers = new Headers();
  t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0], options?: RequestInit) => {
    assert.equal(String(url), 'https://api.resend.com/emails');
    body = JSON.parse(String(options?.body));
    headers = new Headers(options?.headers);
    assert.ok(options?.signal);
    return new Response(JSON.stringify({ id: 'provider_123' }), { status: 200 });
  });
  const text = '<script>alert("x")</script>\n<img src=x onerror=alert(1)> & customer text';
  assert.deepEqual(await sendSupportEmail({ ...email, text, inReplyTo: '<original@example.com>', references: ['<original@example.com>'] }, config), { id: 'provider_123' });
  assert.deepEqual(body.to, [config.testRecipient]);
  assert.equal(body.from, '"RareDaze Support" <onboarding@resend.dev>');
  assert.equal(body.reply_to, email.replyTo);
  assert.equal(body.subject, email.subject);
  assert.equal(body.text, text);
  assert.equal(headers.get('Idempotency-Key'), `support/${email.id}`);
  assert.equal(headers.get('Authorization'), `Bearer ${secrets.RESEND_API_KEY}`);
  assert.equal((body.headers as Record<string, string>)['In-Reply-To'], '<original@example.com>');
  assert.ok(String(body.html).includes('&lt;script&gt;'));
  assert.ok(String(body.html).includes('&lt;img'));
  assert.equal(String(body.html).includes('<script>'), false);
  assert.equal(String(body.html).includes('<img'), false);
  assert.match(String(body.html), />RAREDAZE<\/p>/);
  assert.match(String(body.html), />RareDaze Support<\/p>/);
  assert.equal(/DreamVault|DREAMVAULT/.test(String(body.html)), false);
});

test('legacy configured sender uses the new brand while saved subjects and message text remain exact', async (t) => {
  const legacy = getSupportConfig({ ...secrets, SUPPORT_FROM_NAME: 'DreamVault Support' });
  const saved = { ...email, subject: 'Re: DreamVault enquiry [DV-12345678]', text: 'Saved message\nDreamVault Support' };
  t.mock.method(globalThis, 'fetch', async (_url: Parameters<typeof fetch>[0], options?: RequestInit) => {
    const body = JSON.parse(String(options?.body));
    assert.equal(body.from, '"RareDaze Support" <onboarding@resend.dev>');
    assert.equal(body.subject, saved.subject);
    assert.equal(body.text, saved.text);
    assert.match(body.html, /Saved message<br>DreamVault Support/);
    return new Response(JSON.stringify({ id: 'legacy_sender' }), { status: 200 });
  });
  assert.deepEqual(await sendSupportEmail(saved, legacy), { id: 'legacy_sender' });
});

test('persisted legacy and custom senders retain the exact prior HTML wrapper on retries', async (t) => {
  const text = '<Saved> & message\r\nDreamVault Support';
  const previousHtml = '<!doctype html><html><body style="margin:0;background:#f8f7f4;color:#25241f;font-family:Arial,sans-serif"><div style="max-width:600px;margin:0 auto;padding:36px 24px"><p style="font-size:12px;letter-spacing:3px;color:#8b702f">DREAMVAULT</p><div style="padding:24px 0;border-top:1px solid #dedbd3;border-bottom:1px solid #dedbd3;font-size:15px;line-height:1.8;overflow-wrap:anywhere">&lt;Saved&gt; &amp; message<br>DreamVault Support</div><p style="font-size:12px;line-height:1.7;color:#67645c">DreamVault Support</p></div></body></html>';
  let body: Record<string, unknown> = {};
  t.mock.method(globalThis, 'fetch', async (_url: Parameters<typeof fetch>[0], options?: RequestInit) => {
    body = JSON.parse(String(options?.body));
    assert.equal(new Headers(options?.headers).get('Idempotency-Key'), `support/${email.id}`);
    return new Response(JSON.stringify({ id: 'historical_retry' }), { status: 200 });
  });
  for (const fromName of ['DreamVault Support', 'DreamVault', 'Custom Studio']) {
    await sendSupportEmail({ ...email, text }, { ...config, fromName });
    assert.equal(body.from, `"${fromName}" <onboarding@resend.dev>`);
    assert.equal(body.html, previousHtml);
    assert.equal(body.text, text);
    assert.equal(body.subject, email.subject);
  }
});

test('invalid headers, multi-recipient addresses and empty bodies are blocked before network', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected request'); });
  for (const override of [
    { subject: 'Hi\r\nBcc: someone@example.com' }, { to: `${config.testRecipient},other@example.com` },
    { replyTo: 'Fake <reply@example.com>' }, { inReplyTo: 'bad\r\nheader' }, { references: ['<x@example.com>', 'invalid'] },
    { text: '' }, { id: '../escape' },
  ]) await assert.rejects(sendSupportEmail({ ...email, ...override }, config), { code: 'INVALID_INPUT' });
  assert.equal(fetch.mock.callCount(), 0);
});

test('outgoing thread headers share the inclusive 998-character RFC message-ID boundary', async (t) => {
  const maximum = `<${'a'.repeat(984)}@example.com>`;
  assert.equal(maximum.length, 998);
  const fetch = t.mock.method(globalThis, 'fetch', async (_url: Parameters<typeof globalThis.fetch>[0], options?: RequestInit) => {
    const payload = JSON.parse(String(options?.body));
    assert.equal(payload.headers['In-Reply-To'], maximum);
    assert.equal(payload.headers.References, maximum);
    return new Response('{"id":"maximum-thread-header"}');
  });
  await sendSupportEmail({ ...email, inReplyTo: maximum, references: [maximum] }, config);
  assert.equal(fetch.mock.callCount(), 1);
  for (const bad of [`<${'a'.repeat(985)}@example.com>`, ` ${maximum}`, `${maximum} `, '<thread\u0001@example.com>', '<thread@example.com>\u007f']) {
    await assert.rejects(sendSupportEmail({ ...email, inReplyTo: bad }, config), { code: 'INVALID_INPUT' });
    await assert.rejects(sendSupportEmail({ ...email, references: [bad] }, config), { code: 'INVALID_INPUT' });
  }
  assert.equal(fetch.mock.callCount(), 1, 'Invalid or non-canonical message IDs must not reach the provider.');
});

test('missing API key never sends and live mode permits real recipient only after valid configuration', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return new Response('{"id":"live_123"}'); });
  await assert.rejects(sendSupportEmail(email, getSupportConfig({})), { code: 'CONFIGURATION' });
  assert.equal(calls, 0);
  const live = getSupportConfig({ ...secrets, SUPPORT_EMAIL_MODE: 'live', SUPPORT_FROM_EMAIL: 'support@example.com', SUPPORT_EMAIL_ADDRESS: 'support@example.com', SUPPORT_INBOUND_DOMAIN: 'reply.example.com', SUPPORT_APP_URL: 'https://example.com' });
  await sendSupportEmail({ ...email, to: 'customer@example.org', replyTo: makeSupportReplyAddress(token, live) }, live);
  assert.equal(calls, 1);
});

test('provider errors are safely classified without reading or logging sensitive error bodies', async (t) => {
  const errors = t.mock.method(console, 'error', () => undefined);
  for (const [status, code, retryable] of [[429, 'PROVIDER_RATE_LIMITED', true], [503, 'PROVIDER_UNAVAILABLE', true], [403, 'PROVIDER_REJECTED', false]] as const) {
    const fetch = t.mock.method(globalThis, 'fetch', async () => new Response('PRIVATE customer@example.com secret', { status, headers: { 'Retry-After': '120' } }));
    await assert.rejects(sendSupportEmail(email, config), (error: unknown) => {
      assert.ok(error instanceof SupportMailError);
      assert.equal(error.code, code);
      assert.equal(error.retryable, retryable);
      if (status === 429) assert.equal(error.retryAfterSeconds, 120);
      assert.equal(error.message.includes('PRIVATE'), false);
      assert.equal(error.message.includes('customer@example.com'), false);
      return true;
    });
    fetch.mock.restore();
  }
  assert.equal(errors.mock.callCount(), 0);
});

test('network failures receive a safe retryable error', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('PRIVATE provider response'); });
  await assert.rejects(sendSupportEmail(email, config), { code: 'PROVIDER_UNAVAILABLE', retryable: true });
});

test('retrieves inbound body, lowercase headers and attachment metadata without download URLs', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0]) => {
    calls++;
    assert.equal(String(url), 'https://api.resend.com/emails/receiving/received-123?html_format=cid');
    return new Response(JSON.stringify({
      id: 'received-123', from: 'Customer <customer@example.com>', to: [email.replyTo], subject: 'Re: Your enquiry', text: 'Here is my response.', html: '<p>Response</p>',
      headers: { 'In-Reply-To': '<original@example.com>', 'Auto-Submitted': 'no' }, message_id: '<reply@example.com>', received_for: [email.replyTo],
      authentication: { spf: 'pass', dkim: 'pass', dmarc: 'pass' },
      attachments: [{ id: 'attachment-1', filename: 'photo.jpg', content_type: 'image/jpeg', size: 4000, download_url: 'https://private.example.com/never-fetch' }],
    }));
  });
  const result = await fetchReceivedEmail('received-123', config);
  assert.equal(result.text, 'Here is my response.');
  assert.equal(result.headers['in-reply-to'], '<original@example.com>');
  assert.equal(result.message_id, '<reply@example.com>');
  assert.deepEqual(result.received_for, [email.replyTo]);
  assert.deepEqual(result.authentication, { spf: 'pass', dkim: 'pass', dmarc: 'pass' });
  assert.deepEqual(result.attachments, [{ id: 'attachment-1', filename: 'photo.jpg', content_type: 'image/jpeg', size: 4000 }]);
  assert.equal(JSON.stringify(result).includes('download_url'), false);
  assert.equal(calls, 1);
});

test('oversized responses are rejected without unbounded memory use', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(' '.repeat(2_000_001)));
  await assert.rejects(fetchReceivedEmail('received-123', config), { code: 'PROVIDER_REJECTED' });
});

function signed(raw: string, timestamp = Math.floor(Date.now() / 1000)): Headers {
  const id = 'msg_test_signature';
  const signature = createHmac('sha256', Buffer.from(secrets.RESEND_WEBHOOK_SECRET.slice(6), 'base64')).update(`${id}.${timestamp}.${raw}`).digest('base64');
  return new Headers({ 'svix-id': id, 'svix-timestamp': String(timestamp), 'svix-signature': `v1,${signature}` });
}

test('official SDK verifies the original raw webhook payload', () => {
  const event = { type: 'email.received', created_at: new Date().toISOString(), data: { email_id: 'received-123' } };
  const raw = JSON.stringify(event);
  assert.deepEqual(verifySupportWebhook(raw, signed(raw), config), event);
});

test('rejects changed payloads, invalid/missing signatures, stale/future signed timestamps and malformed events', () => {
  const raw = JSON.stringify({ type: 'email.received', created_at: new Date().toISOString(), data: { email_id: 'received-123' } });
  assert.throws(() => verifySupportWebhook(raw + ' ', signed(raw), config), { code: 'INVALID_WEBHOOK' });
  assert.throws(() => verifySupportWebhook(raw, new Headers(), config), { code: 'INVALID_WEBHOOK' });
  assert.throws(() => verifySupportWebhook(raw, signed(raw, Math.floor(Date.now() / 1000) - 600), config), { code: 'INVALID_WEBHOOK' });
  assert.throws(() => verifySupportWebhook(raw, signed(raw, Math.floor(Date.now() / 1000) + 600), config), { code: 'INVALID_WEBHOOK' });
  const malformed = '{"type":"email.received","data":[]}';
  assert.throws(() => verifySupportWebhook(malformed, signed(malformed), config), { code: 'INVALID_WEBHOOK' });
});

test('reply tokens require exact receiving domains and reject ambiguous recipients', () => {
  const address = makeSupportReplyAddress(token, config);
  assert.equal(address, `r+${token}@soliheleug.resend.app`);
  assert.equal(parseSupportReplyToken([address], config), token);
  assert.equal(parseSupportReplyToken([address, address], config), token);
  assert.equal(parseSupportReplyToken([address, `r+${'cd'.repeat(24)}@${config.inboundDomain}`], config), null);
  assert.equal(parseSupportReplyToken([`r+${token}@evil.example.com`], config), null);
  assert.equal(parseSupportReplyToken([address, 'other@example.com'], config), null);
  assert.equal(parseSupportReplyToken([`r+${token}@${config.inboundDomain}.evil.com`], config), null);
  assert.equal(parseSupportReplyToken([`r+short@${config.inboundDomain}`], config), null);
  assert.throws(() => makeSupportReplyAddress('../bad', config), { code: 'INVALID_INPUT' });
});

test('previous explicitly allowed receiving domains preserve replies after migration', () => {
  const migrated = getSupportConfig({ ...secrets, SUPPORT_INBOUND_DOMAIN: 'reply.example.com', SUPPORT_PREVIOUS_INBOUND_DOMAINS: config.inboundDomain });
  assert.equal(parseSupportReplyToken([makeSupportReplyAddress(token, config)], migrated), token);
  assert.equal(makeSupportReplyAddress(token, migrated), `r+${token}@reply.example.com`);
});

test('HTML-only email becomes readable inert text with active content removed', () => {
  const html = '<style>bad css</style><script>alert(1)</script><p>Hello &amp; welcome<br>Line two &#x1f44b;</p><img src=x onerror=alert(1)><p>&lt;literal tag&gt; &#169;</p><iframe src="evil">hidden</iframe>';
  assert.equal(htmlToSafeText(html), 'Hello & welcome\nLine two 👋\n<literal tag> ©');
  assert.equal(htmlToSafeText('<script>unclosed active content'), '');
  assert.equal(htmlToSafeText('A&#0;B&#xD800;C'), 'A�B�C');
});
