import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { RazorpayWebhookError, readVerifiedRazorpayWebhook } from './razorpay-webhook';

const secret = 'this-is-a-safe-test-webhook-secret-123';
const payload = JSON.stringify({
  event: 'payment.captured', created_at: 1_790_000_000,
  payload: { payment: { entity: { id: 'pay_Example123', order_id: 'order_Example123', amount: 49900, currency: 'INR', status: 'captured' } } },
});

function signedRequest(body = payload, signature = createHmac('sha256', secret).update(body).digest('hex')) {
  return new Request('https://dreamvault.example/api/webhooks/razorpay', {
    method: 'POST', body,
    headers: { 'x-razorpay-signature': signature, 'x-razorpay-event-id': 'evt_example_123', 'content-type': 'application/json' },
  });
}

test('Razorpay webhook verifies the original body and extracts captured payment details', async () => {
  const previous = process.env.RAZORPAY_WEBHOOK_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = secret;
  try {
    const event = await readVerifiedRazorpayWebhook(signedRequest());
    assert.equal(event.captured, true);
    assert.equal(event.razorpayOrderId, 'order_Example123');
    assert.equal(event.razorpayPaymentId, 'pay_Example123');
    assert.equal(event.amountPaise, 49900);
    assert.equal(event.currency, 'INR');
  } finally {
    if (previous === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET;
    else process.env.RAZORPAY_WEBHOOK_SECRET = previous;
  }
});

test('Razorpay webhook rejects a bad HMAC before it trusts JSON fields', async () => {
  const previous = process.env.RAZORPAY_WEBHOOK_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = secret;
  try {
    await assert.rejects(readVerifiedRazorpayWebhook(signedRequest(payload, '0'.repeat(64))), (error: unknown) => error instanceof RazorpayWebhookError && error.status === 401);
  } finally {
    if (previous === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET;
    else process.env.RAZORPAY_WEBHOOK_SECRET = previous;
  }
});
