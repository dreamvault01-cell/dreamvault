import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canApplyFulfillmentAction,
  canMarkCodCollected,
  canMarkOrderRefunded,
  getCustomerOrderStatus,
  getFulfillmentStatusLabel,
  getPaymentStatusLabel,
  getRecordedCaptureOutcome,
} from './order-types';

test('fulfilment has explicit legal state transitions', () => {
  assert.equal(canApplyFulfillmentAction('UNFULFILLED', 'PAID', 'PROCESS'), true);
  assert.equal(canApplyFulfillmentAction('UNFULFILLED', 'COD_PENDING', 'PROCESS'), true);
  assert.equal(canApplyFulfillmentAction('UNFULFILLED', 'PENDING', 'PROCESS'), false);
  assert.equal(canApplyFulfillmentAction('PROCESSING', 'PAID', 'SHIP'), true);
  assert.equal(canApplyFulfillmentAction('SHIPPED', 'PAID', 'DELIVER'), true);
  assert.equal(canApplyFulfillmentAction('SHIPPED', 'PAID', 'CANCEL'), false);
  assert.equal(canApplyFulfillmentAction('DELIVERED', 'PAID', 'CANCEL'), false);
  assert.equal(canApplyFulfillmentAction('UNFULFILLED', 'PAID', 'CANCEL'), true);
  assert.equal(canMarkOrderRefunded('PENDING', 'PAID', 'CANCELLED'), true);
  assert.equal(canMarkOrderRefunded('PENDING', 'COD_PENDING', 'CANCELLED'), false);
  assert.equal(canMarkOrderRefunded('REFUNDED', 'PAID', 'CANCELLED'), false);
  assert.equal(canMarkCodCollected('COD', 'COD_PENDING', 'DELIVERED'), true);
  assert.equal(canMarkCodCollected('COD', 'COD_PENDING', 'SHIPPED'), false);
  assert.equal(canMarkCodCollected('RAZORPAY', 'PAID', 'DELIVERED'), false);
});

test('customer status never presents unconfirmed payment as fulfilment', () => {
  assert.equal(getCustomerOrderStatus('UNFULFILLED', 'PENDING'), 'Payment pending');
  assert.equal(getCustomerOrderStatus('PROCESSING', 'PAID_REVIEW'), 'Payment received — reviewing');
  assert.equal(getCustomerOrderStatus('SHIPPED', 'PAID'), 'On the way');
  assert.equal(getCustomerOrderStatus('DELIVERED', 'PAID'), 'Delivered');
  assert.equal(getPaymentStatusLabel('COD_PENDING', 'COD'), 'Cash on delivery');
  assert.equal(getFulfillmentStatusLabel('PROCESSING'), 'Being prepared');
});

test('replayed captured payments preserve refunds and payment review decisions', () => {
  assert.equal(getRecordedCaptureOutcome('REFUNDED', 'REFUNDED', true), 'ALREADY_PAID');
  assert.equal(getRecordedCaptureOutcome('PAID', 'REFUNDED', false), 'ALREADY_PAID');
  assert.equal(getRecordedCaptureOutcome('PAID_REVIEW', 'NONE', false), 'REVIEW');
  assert.equal(getRecordedCaptureOutcome('PAID', 'NONE', true), 'ALREADY_PAID');
  assert.equal(getRecordedCaptureOutcome('PENDING', 'NONE', false), null);
  assert.equal(getRecordedCaptureOutcome('EXPIRED', 'NONE', false), null);
});
