import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeCustomerEmail,
  normalizeOrderReference,
  normalizeRazorpayRefundId,
  normalizeTrackingInput,
  OrderValidationError,
  validateCheckoutPayload,
  validateOrderAdminAction,
} from './order-validation';

const goodCheckout = {
  items: [{ id: 'product-123', variantId: 'variant-123', quantity: 2, expectedUnitPrice: 199 }],
  paymentMethod: 'RAZORPAY',
  shippingDetails: { name: 'Ada Lovelace', email: 'ADA@Example.com ', phone: '9876543210', address: '1 Print Lane', city: 'Mumbai', state: 'Maharashtra', pin: '400001' },
};

test('checkout input only accepts exact variants, safe addresses, and real payment methods', () => {
  const validated = validateCheckoutPayload(goodCheckout);
  assert.equal(validated.shipping.email, 'ada@example.com');
  assert.equal(validated.items[0].variantId, 'variant-123');
  assert.equal(validated.paymentMethod, 'RAZORPAY');
  for (const invalid of [
    { ...goodCheckout, items: [{ id: 'product', quantity: 1 }] },
    { ...goodCheckout, paymentMethod: 'UPI (discount)' },
    { ...goodCheckout, items: [{ ...goodCheckout.items[0], expectedUnitPrice: -1 }] },
    { ...goodCheckout, items: [{ ...goodCheckout.items[0], expectedUnitPrice: undefined }] },
    { ...goodCheckout, shippingDetails: { ...goodCheckout.shippingDetails, email: 'not-an-email' } },
    { ...goodCheckout, shippingDetails: { ...goodCheckout.shippingDetails, address: 'street\nBcc: attacker@example.com' } },
  ]) assert.throws(() => validateCheckoutPayload(invalid), OrderValidationError);
});

test('public tracking requires a normalized opaque reference and checkout email', () => {
  assert.equal(normalizeOrderReference(' dv-20261028-a1b2c3d4 '), 'DV-20261028-A1B2C3D4');
  assert.equal(normalizeCustomerEmail(' Customer@Example.com '), 'customer@example.com');
  for (const value of ['order_123', 'DV-abc', 'DV-2026<script>', '']) assert.throws(() => normalizeOrderReference(value), OrderValidationError);
});

test('tracking URLs are HTTPS and cannot carry credentials', () => {
  assert.deepEqual(normalizeTrackingInput({ carrier: 'Delhivery', trackingNumber: 'DV123', trackingUrl: 'https://track.example.com/DV123' }), {
    carrier: 'Delhivery', trackingNumber: 'DV123', trackingUrl: 'https://track.example.com/DV123',
  });
  for (const trackingUrl of ['http://track.example.com/a', 'https://user:password@track.example.com/a', 'javascript:alert(1)']) {
    assert.throws(() => normalizeTrackingInput({ carrier: 'Delhivery', trackingNumber: 'DV123', trackingUrl }), OrderValidationError);
  }
});

test('a manually completed refund must carry a valid Razorpay refund identifier', () => {
  assert.equal(normalizeRazorpayRefundId('rfnd_Example123'), 'rfnd_Example123');
  for (const refundId of ['pay_Example123', 'rfnd_short', 'rfnd_<script>']) {
    assert.throws(() => normalizeRazorpayRefundId(refundId), OrderValidationError);
  }
});

test('admin-only payment actions use an explicit allowlist', () => {
  assert.equal(validateOrderAdminAction('MARK_COD_COLLECTED'), 'MARK_COD_COLLECTED');
  assert.equal(validateOrderAdminAction('MARK_REFUNDED'), 'MARK_REFUNDED');
  assert.throws(() => validateOrderAdminAction('MARK_PAID'), OrderValidationError);
});
