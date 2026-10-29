import assert from 'node:assert/strict';
import test from 'node:test';
import { getOrderEmailConfig, prepareOrderEmail } from './order-mail';

const credentials = { RESEND_API_KEY: 're_test_key_123456789' };

test('order email starts in safe development mode and is ready for one test recipient', () => {
  const config = getOrderEmailConfig({ ...credentials });
  assert.equal(config.mode, 'development');
  assert.equal(config.configured, true);
  assert.equal(config.testRecipient, 'dreamvault01@gmail.com');
  assert.equal(config.fromEmail, 'onboarding@resend.dev');
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
  assert.match(email.subject, /DV-20261028-A1B2C3D4/);
  assert.match(email.html, /&lt;Ada&gt;/);
  assert.equal(email.html.includes('<Ada>'), false);
  assert.match(email.text, /https:\/\/track\.example\.com\/DV-1/);
});
