import { NextResponse } from 'next/server';
import { validatePaymentVerification } from 'razorpay/dist/utils/razorpay-utils';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_secret) {
      console.error('Razorpay key secret not found');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Check if order exists in our database first
    const existingOrder = await prisma.order.findUnique({
      where: { razorpayOrderId: razorpay_order_id },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found in database' }, { status: 404 });
    }

    if (existingOrder.status === 'PAID') {
      return NextResponse.json({ success: true, message: 'Order already verified' });
    }

    // Use official Razorpay utility to verify signature
    const isValid = validatePaymentVerification(
      { order_id: razorpay_order_id, payment_id: razorpay_payment_id },
      razorpay_signature,
      key_secret
    );

    if (isValid) {
      // Payment is verified, update database securely
      await prisma.order.update({
        where: { razorpayOrderId: razorpay_order_id },
        data: {
          status: 'PAID',
          razorpayPaymentId: razorpay_payment_id,
        },
      });

      return NextResponse.json({ success: true, message: 'Payment verified successfully' });
    } else {
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
