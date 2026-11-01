import assert from 'node:assert/strict';
import test from 'node:test';
import { getOrderEmailConfig, prepareOrderEmail, sendOrderEmail } from './order-mail';

const credentials = { RESEND_API_KEY: 're_test_key_123456789' };

test('order email starts in safe development mode and is ready for one test recipient', () => {
  const config = getOrderEmailConfig({ ...credentials });
  assert.equal(config.mode, 'development');
  assert.equal(config.configured, true);
  assert.equal(config.testRecipient, 'dreamvault01@gmail.com');
  assert.equal(config.fromEmail, 'onboarding@resend.dev');
  assert.equal(config.fromName, 'RareDaze');
});

test('order sender names normalize legacy branding and preserve custom display names', () => {
  for (const [name, expected] of [
    ['', 'RareDaze'], ['   ', 'RareDaze'], ['DreamVault', 'RareDaze'],
    [' DreamVault Support ', 'RareDaze Support'], [' Custom Studio ', 'Custom Studio'],
    ['DreamVault Studio', 'DreamVault Studio'],
  ]) {
    const config = getOrderEmailConfig({ ...credentials, ORDER_FROM_NAME: name });
    assert.equal(config.fromName, expected);
    assert.equal(config.configured, true);
  }
});

test('order sender normalization retains display name header validation', () => {
  for (const name of ['DreamVault\r\n', '\nDreamVault', 'Custom Studio\r\nBcc: other@example.com', 'Custom <Studio>', 'a'.repeat(101)]) {
    const config = getOrderEmailConfig({ ...credentials, ORDER_FROM_NAME: name });
    assert.equal(config.configured, false);
    assert.ok(config.issues.some((issue) => issue.startsWith('ORDER_FROM_NAME')));
  }
});

test('saved legacy order content keeps its original default sender and exact payload when retried', async (t) => {
  const saved = {
    id: 'saved_order', to: 'dreamvault01@gmail.com',
    subject: 'DreamVault · Your order is confirmed · DV-123',
    text: 'DreamVault — Your order is confirmed\nHello Ada,\nDreamVault',
    html: '<!doctype html><html><body><p>DREAMVAULT</p><p>Hello Ada</p></body></html>',
  };
  let body: Record<string, unknown> = {};
  t.mock.method(globalThis, 'fetch', async (_url: Parameters<typeof fetch>[0], options?: RequestInit) => {
    body = JSON.parse(String(options?.body));
    assert.equal(new Headers(options?.headers).get('Idempotency-Key'), `order/${saved.id}`);
    return new Response(JSON.stringify({ id: 'historical_order_retry' }), { status: 200 });
  });
  for (const [name, expected] of [
    [undefined, 'DreamVault'], ['DreamVault', 'DreamVault'], ['RareDaze', 'DreamVault'],
    ['DreamVault Support', 'DreamVault Support'], ['Custom Studio', 'Custom Studio'],
  ]) {
    const config = getOrderEmailConfig({ ...credentials, ORDER_FROM_NAME: name });
    await sendOrderEmail(saved, config);
    assert.equal(body.from, `"${expected}" <onboarding@resend.dev>`);
    assert.equal(body.subject, saved.subject);
    assert.equal(body.text, saved.text);
    assert.equal(body.html, saved.html);
  }
});

test('new order content and isolated customer mentions of the old brand use the current sender', async (t) => {
  const config = getOrderEmailConfig(credentials);
  const input = { id: 'new_order', to: config.testRecipient, subject: 'RareDaze · Confirmed', text: 'RareDaze — Confirmed', html: '<p>RAREDAZE</p>' };
  t.mock.method(globalThis, 'fetch', async (_url: Parameters<typeof fetch>[0], options?: RequestInit) => {
    const body = JSON.parse(String(options?.body));
    assert.equal(body.from, '"RareDaze" <onboarding@resend.dev>');
    return new Response(JSON.stringify({ id: 'new_order_email' }), { status: 200 });
  });
  await sendOrderEmail(input, config);
  await sendOrderEmail({ ...input, text: 'Customer asks about DreamVault', html: '<p>DREAMVAULT</p>' }, config);
});

test('live order email fails closed until branded sender, reply mailbox, and public HTTPS exist', () => {
  assert.equal(getOrderEmailConfig({ ...credentials, ORDER_EMAIL_MODE: 'live' }).configured, false);
  const configured = getOrderEmailConfig({
    ...credentials, ORDER_EMAIL_MODE: 'live', ORDER_FROM_EMAIL: 'orders@example.com',
    ORDER_REPLY_TO_EMAIL: 'support@example.com', ORDER_APP_URL: 'https://dreamvault.example',
  });
  assert.equal(configured.configured, true);
  assert.equal(configured.appUrl, 'https://dreamvault.example');
});

test('order email content escapes customer-controlled values and links to the exact order', () => {
  const email = prepareOrderEmail({
    kind: 'ORDER_SHIPPED', orderReference: 'DV-20261028-A1B2C3D4', customerName: '<Ada>', totalAmount: 499,
    fulfillmentStatus: 'SHIPPED', paymentStatus: 'PAID', trackingCarrier: 'Courier & Co', trackingNumber: 'DV-1', trackingUrl: 'https://track.example.com/DV-1',
    items: [{ name: '<Poster>', quantity: 1, price: 499, configuration: 'A3 <Fine Art>' }],
  }, { appUrl: 'https://dreamvault.example' });
  assert.match(email.subject, /^RareDaze · Your print is on its way · /);
  assert.match(email.text, /^RareDaze — Your print is on its way/);
  assert.match(email.text, /\nRareDaze$/);
  assert.match(email.html, />RAREDAZE<\/p>/);
  assert.equal(/DreamVault|DREAMVAULT/.test(email.subject + email.text + email.html), false);
  assert.match(email.subject, /DV-20261028-A1B2C3D4/);
  assert.match(email.html, /&lt;Ada&gt;/);
  assert.equal(email.html.includes('<Ada>'), false);
  assert.match(email.text, /https:\/\/track\.example\.com\/DV-1/);
});
