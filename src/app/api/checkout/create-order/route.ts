import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import prisma from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'dummy_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
});

export async function POST(req: Request) {
  try {
    const clerkUser = await currentUser();
    const userId = clerkUser?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { items, shippingDetails } = body;

    if (!items || !items.length || !shippingDetails) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // 🔒 PRODUCTION READY: Verify prices against the Database
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const dbProduct = await prisma.product.findUnique({
        where: { id: item.id }
      });

      if (!dbProduct) {
        return NextResponse.json({ error: `Product not found: ${item.name}` }, { status: 400 });
      }

      // 🔒 SECURITY: Prevent negative or fractional quantities (e.g. user sends -10 to reduce cart total)
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        return NextResponse.json({ error: `Invalid quantity for product: ${dbProduct.name}` }, { status: 400 });
      }

      totalAmount += dbProduct.price * item.quantity;
      validatedItems.push({
        productId: dbProduct.id,
        quantity: item.quantity,
        price: dbProduct.price, // Store the price at checkout
      });
    }

    // 🔒 SECURITY: Ensure total amount is at least 1 INR (Razorpay minimum requirement)
    if (totalAmount < 1) {
      return NextResponse.json({ error: 'Order total must be at least ₹1' }, { status: 400 });
    }

    // Create Razorpay Order
    const options = {
      amount: Math.round(totalAmount * 100), // Razorpay amount is in paise (smallest currency unit), enforce integer
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // Get internal user id from Clerk ID
    let internalUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    // If user doesn't exist in our DB yet, this is a good place to sync them.
    // Assuming the webhook handles it, but just in case:
    if (!internalUser) {
      const email = clerkUser?.emailAddresses?.[0]?.emailAddress || `${userId}@placeholder.com`;
      // Create user fallback
      internalUser = await prisma.user.create({
        data: {
          clerkId: userId,
          email: email,
          firstName: clerkUser?.firstName,
          lastName: clerkUser?.lastName,
          role: 'USER',
        }
      });
    }

    // Save PENDING order to our DB
    const order = await prisma.order.create({
      data: {
        userId: internalUser.id,
        razorpayOrderId: razorpayOrder.id,
        status: 'PENDING',
        totalAmount,
        shippingName: shippingDetails.name,
        shippingPhone: shippingDetails.phone,
        shippingAddress: shippingDetails.address,
        shippingCity: shippingDetails.city,
        shippingState: shippingDetails.state,
        shippingPin: shippingDetails.pin,
        items: {
          create: validatedItems,
        },
      },
    });

    return NextResponse.json({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      dbOrderId: order.id,
    });
  } catch (error) {
    console.error('Error creating checkout order:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
