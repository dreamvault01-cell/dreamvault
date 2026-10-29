import { after, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { validatePaymentVerification } from 'razorpay/dist/utils/razorpay-utils';
import { currentUser } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { processOrderOutbox } from '@/lib/order-notifications';
import { finalizeCapturedPayment, OrderStoreError } from '@/lib/order-store';

export const runtime = 'nodejs';
export const maxDuration = 60;

const RAZORPAY_ORDER = /^order_[A-Za-z0-9_]+$/;
const RAZORPAY_PAYMENT = /^pay_[A-Za-z0-9_]+$/;
const RAZORPAY_SIGNATURE = /^[a-f0-9]{64}$/i;

function stringField(body: Record<string, unknown>, field: string, pattern: RegExp) {
  const value = body[field];
  return typeof value === 'string' && pattern.test(value) ? value : null;
}

export async function POST(request: Request) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return NextResponse.json({ error: 'Please sign in to verify this payment.' }, { status: 401 });
    const customer = await prisma.user.findUnique({ where: { clerkId: clerkUser.id }, select: { id: true } });
    if (!customer) return NextResponse.json({ error: 'Your checkout session is no longer available. Please contact support with your payment details.' }, { status: 409 });
    if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
      return NextResponse.json({ error: 'Payment verification must be sent as JSON.' }, { status: 415 });
    }
    const raw: unknown = await request.json();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return NextResponse.json({ error: 'Invalid payment verification request.' }, { status: 400 });
    const body = raw as Record<string, unknown>;
    const razorpayOrderId = stringField(body, 'razorpay_order_id', RAZORPAY_ORDER);
    const razorpayPaymentId = stringField(body, 'razorpay_payment_id', RAZORPAY_PAYMENT);
    const signature = stringField(body, 'razorpay_signature', RAZORPAY_SIGNATURE);
    if (!razorpayOrderId || !razorpayPaymentId || !signature) {
      return NextResponse.json({ error: 'The payment response is incomplete. Please contact support if money was debited.' }, { status: 400 });
    }
    const order = await prisma.order.findFirst({
      where: { razorpayOrderId, userId: customer.id, paymentMethod: 'RAZORPAY' },
      select: { orderReference: true },
    });
    if (!order) return NextResponse.json({ error: 'This payment session does not belong to your account.' }, { status: 404 });

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
    if (!keyId || !keySecret) return NextResponse.json({ error: 'Online payments are not configured yet.' }, { status: 503 });
    const validSignature = validatePaymentVerification(
      { order_id: razorpayOrderId, payment_id: razorpayPaymentId },
      signature,
      keySecret,
    );
    if (!validSignature) return NextResponse.json({ error: 'Payment signature could not be verified.' }, { status: 400 });

    // The callback signature proves that Razorpay created this response. Fetch
    // the payment too, so the application only commits inventory after its API
    // reports the same payment as captured and for the expected order/amount.
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const payment = await razorpay.payments.fetch(razorpayPaymentId);
    if (payment.id !== razorpayPaymentId || payment.order_id !== razorpayOrderId) {
      return NextResponse.json({ error: 'The payment does not match this checkout.' }, { status: 400 });
    }
    if (payment.status !== 'captured' || !payment.captured) {
      return NextResponse.json({
        success: true,
        pending: true,
        orderReference: order.orderReference,
        message: 'Your payment is being confirmed. Do not pay again; we will update your order shortly.',
      }, { status: 202 });
    }
    const amount = typeof payment.amount === 'string' ? Number(payment.amount) : payment.amount;
    if (!Number.isSafeInteger(amount) || amount < 1) {
      return NextResponse.json({ error: 'The payment amount could not be verified.' }, { status: 400 });
    }
    const result = await finalizeCapturedPayment({
      razorpayOrderId,
      razorpayPaymentId,
      amountPaise: amount,
      currency: payment.currency,
      source: 'CHECKOUT_CALLBACK',
      expectedUserId: customer.id,
    });
    after(async () => { await processOrderOutbox({ orderId: result.orderId, limit: 1, budgetMs: 7_000 }).catch(() => undefined); });
    return NextResponse.json({ success: true, pending: result.outcome === 'REVIEW', orderReference: result.orderReference });
  } catch (error) {
    if (error instanceof OrderStoreError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Payment verification failed', error);
    return NextResponse.json({ error: 'We could not confirm this payment yet. Do not pay again; contact support if the status does not update.' }, { status: 503 });
  }
}
