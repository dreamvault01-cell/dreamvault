import 'server-only';

import Razorpay from 'razorpay';

export class RazorpayRefundVerificationError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'RazorpayRefundVerificationError';
  }
}

export interface RazorpayRefundVerificationInput {
  refundId: string;
  expectedPaymentId: string;
  expectedAmountPaise: number;
  expectedCurrency: string;
}

export interface VerifiedRazorpayRefund {
  id: string;
  paymentId: string;
  amountPaise: number;
  currency: string;
}

type ProviderRefund = {
  id?: unknown;
  payment_id?: unknown;
  amount?: unknown;
  currency?: unknown;
  status?: unknown;
};

function providerText(value: unknown, maxLength = 191) {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength && !/[\u0000-\u001f\u007f]/.test(value)
    ? value
    : null;
}

function amountPaise(value: unknown) {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 1) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : null;
  }
  return null;
}

/**
 * Turn Razorpay's provider response into the small, exact fact that the order
 * store needs. This remains pure so its safety rules are covered without a
 * live payment account.
 */
export function normalizeVerifiedRazorpayRefund(
  response: ProviderRefund,
  expected: RazorpayRefundVerificationInput,
): VerifiedRazorpayRefund {
  const id = providerText(response.id);
  const paymentId = providerText(response.payment_id);
  const refundAmount = amountPaise(response.amount);
  const currency = providerText(response.currency, 10)?.toUpperCase();
  const status = providerText(response.status, 40)?.toLowerCase();
  const expectedCurrency = expected.expectedCurrency.toUpperCase();

  if (id !== expected.refundId || paymentId !== expected.expectedPaymentId) {
    throw new RazorpayRefundVerificationError(409, 'That refund does not belong to this order payment.');
  }
  if (refundAmount !== expected.expectedAmountPaise || currency !== expectedCurrency) {
    throw new RazorpayRefundVerificationError(409, 'That refund does not match this order amount and currency.');
  }
  if (status === 'pending') {
    throw new RazorpayRefundVerificationError(409, 'Razorpay is still processing this refund. Wait until it is processed before confirming it here.');
  }
  if (status !== 'processed') {
    throw new RazorpayRefundVerificationError(409, 'Razorpay has not completed this refund. Check its status in Razorpay before confirming it here.');
  }
  return { id, paymentId, amountPaise: refundAmount, currency };
}

function paymentConfig() {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    throw new RazorpayRefundVerificationError(503, 'Razorpay refund verification is not configured yet. Add the Razorpay server credentials and try again.');
  }
  return { keyId, keySecret };
}

/** Fetch the specific refund under the original payment, then prove it is a processed full refund. */
export async function verifyRazorpayRefund(input: RazorpayRefundVerificationInput) {
  const config = paymentConfig();
  try {
    const razorpay = new Razorpay({ key_id: config.keyId, key_secret: config.keySecret });
    const refund = await razorpay.payments.fetchRefund(input.expectedPaymentId, input.refundId);
    return normalizeVerifiedRazorpayRefund(refund, input);
  } catch (error) {
    if (error instanceof RazorpayRefundVerificationError) throw error;
    console.error('Razorpay refund verification failed', { refundId: input.refundId, paymentId: input.expectedPaymentId });
    throw new RazorpayRefundVerificationError(502, 'Razorpay could not verify this refund right now. Check Razorpay and try again.');
  }
}
