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
    const { items, shippingDetails, paymentMethod } = body;

    if (!items || !items.length || !shippingDetails) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // 🔒 PRODUCTION READY: Verify prices against the Database
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const dbProduct = await prisma.product.findUnique({
        where: { id: item.id },
        include: { variants: true },
      });

      if (!dbProduct) {
        return NextResponse.json({ error: `Product not found: ${item.name}` }, { status: 400 });
      }

      // 🔒 SECURITY: Prevent negative or fractional quantities
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        return NextResponse.json({ error: `Invalid quantity for product: ${dbProduct.name}` }, { status: 400 });
      }

      // Look up the correct variant price based on the selected size
      let unitPrice = dbProduct.price;
      if (item.size && dbProduct.variants.length > 0) {
        // Normalize: strip dimension labels like "A4 (21×30 cm)" → "A4"
        const sizeKey = item.size.split(' ')[0].toUpperCase();
        const variant = dbProduct.variants.find((v) => v.size.toUpperCase() === sizeKey);
        if (variant) {
          unitPrice = variant.price;
        }
      }

      totalAmount += unitPrice * item.quantity;
      validatedItems.push({
        productId: dbProduct.id,
        quantity: item.quantity,
        price: unitPrice,
        size: item.size || null,
      });
    }

    // Apply ₹50 discount if UPI
    if (paymentMethod === 'UPI (₹50 OFF)') {
      totalAmount = Math.max(1, totalAmount - 50);
    }

    // 🔒 SECURITY: Ensure total amount is at least 1 INR
    if (totalAmount < 1) {
      return NextResponse.json({ error: 'Order total must be at least ₹1' }, { status: 400 });
    }

    // Get internal user id from Clerk ID
    let internalUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!internalUser) {
      const email = clerkUser?.emailAddresses?.[0]?.emailAddress || `${userId}@placeholder.com`;
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

    const isCOD = paymentMethod === 'Cash on Delivery';

    // If it's Cash on Delivery, we don't need Razorpay
    if (isCOD) {
      const order = await prisma.order.create({
        data: {
          userId: internalUser.id,
          status: 'PENDING', // Will be updated to delivered later
          paymentMethod: 'COD',
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
        success: true,
        dbOrderId: order.id,
      });
    }

    // Create Razorpay Order for online payments
    const options = {
      amount: Math.round(totalAmount * 100), // paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // Save PENDING order to our DB
    const order = await prisma.order.create({
      data: {
        userId: internalUser.id,
        razorpayOrderId: razorpayOrder.id,
        status: 'PENDING',
        paymentMethod: paymentMethod || 'RAZORPAY',
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
