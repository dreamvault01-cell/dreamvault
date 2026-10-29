import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeVerifiedRazorpayRefund,
  RazorpayRefundVerificationError,
} from './razorpay-refund';

const expected = {
  refundId: 'rfnd_Example123',
  expectedPaymentId: 'pay_Example123',
  expectedAmountPaise: 49900,
  expectedCurrency: 'INR',
};

const completedRefund = {
  id: expected.refundId,
  payment_id: expected.expectedPaymentId,
  amount: expected.expectedAmountPaise,
  currency: 'inr',
  status: 'processed',
};

test('only an exact, processed Razorpay full refund can be recorded', () => {
  assert.deepEqual(normalizeVerifiedRazorpayRefund(completedRefund, expected), {
    id: 'rfnd_Example123', paymentId: 'pay_Example123', amountPaise: 49900, currency: 'INR',
  });
});

test('Razorpay refund confirmation fails closed for the wrong payment, amount, or status', () => {
  for (const refund of [
    { ...completedRefund, payment_id: 'pay_Other' },
    { ...completedRefund, amount: 49899 },
    { ...completedRefund, currency: 'USD' },
    { ...completedRefund, status: 'pending' },
    { ...completedRefund, status: 'failed' },
    { ...completedRefund, id: 'rfnd_Other' },
  ]) {
    assert.throws(
      () => normalizeVerifiedRazorpayRefund(refund, expected),
      (error: unknown) => error instanceof RazorpayRefundVerificationError && error.status === 409,
    );
  }
});
