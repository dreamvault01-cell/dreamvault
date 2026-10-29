import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizeCustomerEmail, normalizeOrderReference, OrderValidationError } from '@/lib/order-validation';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) return NextResponse.json({ error: 'Please send a JSON request.' }, { status: 415, headers: { 'Cache-Control': 'no-store' } });
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new OrderValidationError('Enter your order reference and checkout email.');
    const data = body as Record<string, unknown>;
    const orderReference = normalizeOrderReference(data.orderReference);
    const email = normalizeCustomerEmail(data.email);
    const order = await prisma.order.findFirst({
      where: { orderReference, shippingEmail: email },
      select: { orderReference: true, createdAt: true, paymentStatus: true, fulfillmentStatus: true, trackingCarrier: true, trackingNumber: true, trackingUrl: true, shippedAt: true, deliveredAt: true, cancelledAt: true },
    });
    // Do not reveal whether a reference exists under another customer's email.
    if (!order) return NextResponse.json({ error: 'We could not find an order with those details. Check the order reference and the email used at checkout.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    return NextResponse.json({ order }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof OrderValidationError) return NextResponse.json({ error: error.message }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    console.error('Public order tracking failed', error);
    return NextResponse.json({ error: 'Order tracking is temporarily unavailable. Please try again shortly.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
