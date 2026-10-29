import { after, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { currentUser } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { processOrderOutbox } from '@/lib/order-notifications';
import {
  attachRazorpayOrder,
  cancelUnstartedPayment,
  createCheckoutOrder,
  OrderStoreError,
} from '@/lib/order-store';
import { OrderValidationError, validateCheckoutPayload } from '@/lib/order-validation';

export const runtime = 'nodejs';
export const maxDuration = 60;

function paymentConfig() {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  return keyId && keySecret ? { keyId, keySecret } : null;
}

async function findOrCreateCustomer(clerkId: string, clerkUser: NonNullable<Awaited<ReturnType<typeof currentUser>>>) {
  const email = clerkUser.primaryEmailAddress?.emailAddress
    ?? clerkUser.emailAddresses[0]?.emailAddress
    ?? `${clerkId}@customer.invalid`;
  // Upsert closes the small race where two rapid checkout requests arrive
  // before the local customer row has been created.
  return prisma.user.upsert({
    where: { clerkId },
    update: {},
    create: {
      clerkId,
      email: email.toLowerCase(),
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      role: 'USER',
    },
  });
}

export async function POST(request: Request) {
  let createdOrderId: string | null = null;
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return NextResponse.json({ error: 'Please sign in before checking out.' }, { status: 401 });
    if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
      return NextResponse.json({ error: 'Checkout must be sent as JSON.' }, { status: 415 });
    }

    const input = validateCheckoutPayload(await request.json());
    const customer = await findOrCreateCustomer(clerkUser.id, clerkUser);
    const order = await createCheckoutOrder(input, customer.id);
    createdOrderId = order.id;

    if (order.paymentMethod === 'COD') {
      // Delivery is durable in the outbox; a temporary mail failure must never
      // undo a valid order or its committed inventory.
      after(async () => { await processOrderOutbox({ orderId: order.id, limit: 1, budgetMs: 7_000 }).catch(() => undefined); });
      return NextResponse.json({
        success: true,
        paymentMethod: 'COD',
        orderReference: order.orderReference,
      }, { status: 201 });
    }

    const config = paymentConfig();
    if (!config) {
      await cancelUnstartedPayment(order.id);
      return NextResponse.json({ error: 'Online payments are not configured yet. Please choose cash on delivery or try again later.' }, { status: 503 });
    }

    try {
      const razorpay = new Razorpay({ key_id: config.keyId, key_secret: config.keySecret });
      const gatewayOrder = await razorpay.orders.create({
        amount: Math.round(order.totalAmount * 100),
        currency: 'INR',
        receipt: order.orderReference,
        notes: { dreamvault_order_reference: order.orderReference },
      });
      if (!gatewayOrder.id || typeof gatewayOrder.amount !== 'number' || !gatewayOrder.currency) {
        throw new Error('The payment provider returned an incomplete payment session.');
      }
      if (gatewayOrder.amount !== Math.round(order.totalAmount * 100) || gatewayOrder.currency.toUpperCase() !== 'INR') {
        throw new Error('The payment provider returned an order with an unexpected amount.');
      }
      await attachRazorpayOrder(order.id, gatewayOrder.id);
      return NextResponse.json({
        success: true,
        paymentMethod: 'RAZORPAY',
        orderId: gatewayOrder.id,
        amount: gatewayOrder.amount,
        currency: gatewayOrder.currency,
        orderReference: order.orderReference,
        reservationExpiresAt: order.reservationExpiresAt?.toISOString() ?? null,
      }, { status: 201 });
    } catch (error) {
      await cancelUnstartedPayment(order.id).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    if (error instanceof OrderValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof OrderStoreError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Checkout order creation failed', { createdOrderId, error });
    return NextResponse.json({ error: 'We could not start checkout. No payment has been taken.' }, { status: 500 });
  }
}
