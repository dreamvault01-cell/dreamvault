import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertSupportOrigin,
  assertSupportProcessorSecret,
  readSupportBody,
  readSupportJson,
  supportApiError,
  supportJson,
} from './support-http';
import { SupportError } from './support-validation';

const APP_ORIGIN = 'https://dream-vault-rho.vercel.app';

function request(body: BodyInit | null = '{}', headers: Record<string, string> = {}) {
  return new Request(`${APP_ORIGIN}/api/admin/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
  });
}

function streamedRequest(chunks: Uint8Array[], headers: Record<string, string> = {}, onCancel?: () => void) {
  let index = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index === chunks.length) controller.close();
      else controller.enqueue(chunks[index++]);
    },
    cancel: onCancel,
  });
  return new Request(`${APP_ORIGIN}/api/admin/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
    duplex: 'half',
  } as RequestInit & { duplex: 'half' });
}

function statusError(status: number) {
  return (error: unknown) => error instanceof SupportError && error.status === status;
}

test('support JSON responses are private and not cacheable', async () => {
  const response = supportJson({ success: true }, 201);
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('cache-control'), 'no-store, private');
  assert.equal(response.headers.get('vary'), 'Cookie, Authorization');
  assert.deepEqual(await response.json(), { success: true });
});

test('origin guard accepts the exact website origin', () => {
  assert.doesNotThrow(() => assertSupportOrigin(request('{}', {
    origin: APP_ORIGIN,
    'sec-fetch-site': 'same-origin',
  })));
  assert.doesNotThrow(() => assertSupportOrigin(request('{}', { origin: APP_ORIGIN })));
});

test('origin guard rejects missing, opaque, different, and deceptively similar origins', () => {
  for (const origin of [undefined, 'null', 'https://attacker.example', 'http://dream-vault-rho.vercel.app', `${APP_ORIGIN}.attacker.example`, `${APP_ORIGIN}/`, `${APP_ORIGIN}:8443`]) {
    assert.throws(
      () => assertSupportOrigin(request('{}', origin === undefined ? {} : { origin })),
      statusError(403),
      `Unexpectedly allowed origin ${String(origin)}`,
    );
  }
});

test('origin guard rejects explicitly cross-site requests even with an exact Origin header', () => {
  assert.throws(() => assertSupportOrigin(request('{}', {
    origin: APP_ORIGIN,
    'sec-fetch-site': 'cross-site',
  })), statusError(403));
});

test('body reader accepts an exact byte boundary and split UTF-8 code points', async () => {
  const chunks = [new Uint8Array([0xf0, 0x9f]), new Uint8Array([0x8c, 0x8d])];
  assert.equal(await readSupportBody(streamedRequest(chunks), 4), '🌍');
  assert.equal(await readSupportBody(request('abc'), 3), 'abc');
});

test('body reader counts bytes rather than JavaScript character length', async () => {
  assert.equal(await readSupportBody(request('€'), 3), '€');
  await assert.rejects(readSupportBody(request('€€'), 4), statusError(413));
});

test('streamed body limit is enforced without a Content-Length header', async () => {
  let cancelled = false;
  const incoming = streamedRequest([
    new TextEncoder().encode('123'),
    new TextEncoder().encode('456'),
    new TextEncoder().encode('remaining data must not be consumed'),
  ], {}, () => { cancelled = true; });
  await assert.rejects(readSupportBody(incoming, 5), statusError(413));
  assert.equal(cancelled, true);
  assert.equal(incoming.body?.locked, false);
});

test('a falsely small or malformed Content-Length cannot bypass the actual streamed byte limit', async () => {
  for (const contentLength of ['0', '1', '-1', 'not-a-number']) {
    const incoming = streamedRequest([
      new TextEncoder().encode('abcd'),
      new TextEncoder().encode('efgh'),
    ], { 'content-length': contentLength });
    await assert.rejects(readSupportBody(incoming, 7), statusError(413));
  }
});

test('a declared oversized body is rejected before reading it', async () => {
  await assert.rejects(readSupportBody(request('{}', { 'content-length': '32769' })), statusError(413));
});

test('missing body, invalid UTF-8, and incomplete UTF-8 fail with safe read errors', async () => {
  await assert.rejects(readSupportBody(request(null)), statusError(400));
  for (const bytes of [new Uint8Array([0xff]), new Uint8Array([0xe2, 0x82]), new Uint8Array([0xc0, 0xaf])]) {
    const incoming = streamedRequest([bytes]);
    await assert.rejects(readSupportBody(incoming), (error: unknown) => {
      assert.ok(error instanceof SupportError);
      assert.equal(error.status, 400);
      assert.equal(error.message, 'The request could not be read.');
      return true;
    });
    assert.equal(incoming.body?.locked, false);
  }
});

test('a failed incoming stream is converted to a safe client error', async () => {
  const body = new ReadableStream<Uint8Array>({
    start(controller) { controller.error(new Error('private upstream diagnostic')); },
  });
  const incoming = new Request(`${APP_ORIGIN}/api/admin/messages`, {
    method: 'POST', body, duplex: 'half',
  } as RequestInit & { duplex: 'half' });
  await assert.rejects(readSupportBody(incoming), (error: unknown) => {
    assert.ok(error instanceof SupportError);
    assert.equal(error.status, 400);
    assert.doesNotMatch(error.message, /private upstream/);
    return true;
  });
});

test('JSON reader accepts an object with a case-insensitive media type and charset', async () => {
  assert.deepEqual(await readSupportJson(request('{"body":"hello"}', {
    'content-type': 'Application/JSON; charset=utf-8',
  })), { body: 'hello' });
});

test('JSON reader rejects unsupported or missing content types', async () => {
  for (const contentType of ['text/plain', 'text/json', 'application/jsonp', 'application/x-www-form-urlencoded']) {
    await assert.rejects(readSupportJson(request('{}', { 'content-type': contentType })), statusError(415));
  }
  const incoming = new Request(`${APP_ORIGIN}/api/admin/messages`, { method: 'POST', body: new Uint8Array([123, 125]) });
  await assert.rejects(readSupportJson(incoming), statusError(415));
});

test('JSON reader rejects malformed JSON, arrays, null, and primitive values', async () => {
  for (const raw of ['', '{broken', '[]', 'null', '42', 'true', '"text"']) {
    await assert.rejects(readSupportJson(request(raw)), statusError(400), `Unexpectedly accepted ${raw}`);
  }
});

test('JSON reader preserves size and UTF-8 errors instead of changing them to generic JSON errors', async () => {
  await assert.rejects(readSupportJson(request('{"a":1}'), 6), statusError(413));
  await assert.rejects(readSupportJson(streamedRequest([new Uint8Array([0xff])])), (error: unknown) => {
    assert.ok(error instanceof SupportError);
    assert.equal(error.status, 400);
    assert.equal(error.message, 'The request could not be read.');
    return true;
  });
});

test('processor secret fails closed and requires an exact Bearer token with at least 32 secret characters', () => {
  const previousSecret = process.env.CRON_SECRET;
  const secret = '0123456789abcdef0123456789abcdef';
  const authenticated = (authorization?: string) => new Request(`${APP_ORIGIN}/api/support/process`, {
    headers: authorization === undefined ? {} : { authorization },
  });
  try {
    delete process.env.CRON_SECRET;
    assert.throws(() => assertSupportProcessorSecret(authenticated('Bearer ')), statusError(401));

    process.env.CRON_SECRET = secret.slice(0, 31);
    assert.throws(() => assertSupportProcessorSecret(authenticated(`Bearer ${secret.slice(0, 31)}`)), statusError(401));

    process.env.CRON_SECRET = secret;
    assert.doesNotThrow(() => assertSupportProcessorSecret(authenticated(`Bearer ${secret}`)));
    for (const authorization of [undefined, '', secret, `bearer ${secret}`, `Basic ${secret}`, `Bearer  ${secret}`, `Bearer\t${secret}`, `Bearer ${secret.slice(0, -1)}`, `Bearer ${secret}a`, `Bearer ${secret.slice(0, -1)}x`]) {
      assert.throws(() => assertSupportProcessorSecret(authenticated(authorization)), statusError(401));
    }

    process.env.CRON_SECRET = `${secret}abcdef`;
    assert.doesNotThrow(() => assertSupportProcessorSecret(authenticated(`Bearer ${secret}abcdef`)));
  } finally {
    if (previousSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previousSecret;
  }
});

test('API errors distinguish authentication and authorization without leaking the original details', async () => {
  for (const [input, expectedStatus, expectedMessage] of [
    [new Error('Unauthorized'), 401, 'Please sign in to continue.'],
    [new Error('Forbidden'), 403, 'This action is available to administrators only.'],
  ] as const) {
    const response = supportApiError(input);
    assert.equal(response.status, expectedStatus);
    assert.equal(response.headers.get('cache-control'), 'no-store, private');
    assert.deepEqual(await response.json(), { error: expectedMessage });
  }
});

test('API error mapper preserves intentionally safe validation errors', async () => {
  const response = supportApiError(new SupportError(409, 'This submission was already used.'));
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: 'This submission was already used.' });
});

test('unexpected API errors never reveal raw database, provider, or thrown string details', async () => {
  const sensitive = 'private SQL SELECT customer@example.com password=do-not-expose re_secret';
  for (const error of [new Error(sensitive), sensitive, null, { code: 'unexpected', message: sensitive },
    { code: 'P2010', message: sensitive }, { code: 'P2010', meta: { code: '40001', message: sensitive } }]) {
    const response = supportApiError(error);
    assert.equal(response.status, 503);
    const body = await response.json() as { error: string };
    assert.equal(body.error, 'Support is temporarily unavailable. Your draft has not been cleared. Please try again.');
    assert.doesNotMatch(JSON.stringify(body), /private SQL|customer@example|password=|re_secret/);
  }
});

test('missing database setup returns actionable guidance but no underlying SQL message', async () => {
  for (const input of [{ code: 'P2021' }, { code: 'P2022' }, { code: '42P01' }, { code: '42703' },
    { code: 'P2010', meta: { code: '42P01' } }, { code: 'P2010', meta: { code: '42703' } }]) {
    const response = supportApiError({ ...input, message: 'SELECT private_customer_column FROM hidden_table' });
    assert.equal(response.status, 503);
    const body = await response.json() as { error: string };
    assert.match(body.error, /npm run db:support/);
    assert.doesNotMatch(body.error, /private_customer_column|hidden_table/);
  }
});
