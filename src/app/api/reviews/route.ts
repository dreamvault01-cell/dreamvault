import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { getCurrentCustomer } from '@/lib/customer-auth';
import { hasSameOrigin } from '@/lib/request-origin';
import { findEligibleReviewOrder, getApprovedProductReviews } from '@/lib/review-types';
import { normalizeReviewInput, ReviewValidationError } from '@/lib/review-validation';

function productIdFromRequest(request: Request) {
  return new URL(request.url).searchParams.get('productId')?.trim() || null;
}

export async function GET(request: Request) {
  const productId = productIdFromRequest(request);
  if (!productId) return NextResponse.json({ error: 'A product is required.' }, { status: 400 });
  const product = await prisma.product.findFirst({ where: { id: productId, status: 'ACTIVE' }, select: { id: true } });
  if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
  const publicData = await getApprovedProductReviews(productId);
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ ...publicData, authenticated: false, canReview: false, existingReview: null });
  const [existingReview, eligibleOrder] = await Promise.all([
    prisma.productReview.findUnique({ where: { userId_productId: { userId: customer.id, productId } }, select: { status: true } }),
    findEligibleReviewOrder(customer.id, productId),
  ]);
  return NextResponse.json({
    ...publicData,
    authenticated: true,
    canReview: Boolean(eligibleOrder && !existingReview),
    existingReview: existingReview ? { status: existingReview.status } : null,
  });
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return NextResponse.json({ error: 'Please perform this action from the store.' }, { status: 403 });
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: 'Please sign in to leave a review.' }, { status: 401 });
  try {
    const body = await request.json();
    const productId = typeof body?.productId === 'string' ? body.productId.trim() : '';
    if (!productId) return NextResponse.json({ error: 'A product is required.' }, { status: 400 });
    const product = await prisma.product.findFirst({ where: { id: productId, status: 'ACTIVE' }, select: { id: true, slug: true } });
    if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    const order = await findEligibleReviewOrder(customer.id, productId);
    if (!order) return NextResponse.json({ error: 'Only customers with a completed purchase can review this print.' }, { status: 403 });
    const existing = await prisma.productReview.findUnique({ where: { userId_productId: { userId: customer.id, productId } }, select: { id: true } });
    if (existing) return NextResponse.json({ error: 'You have already reviewed this print.' }, { status: 409 });
    const review = normalizeReviewInput(body);
    await prisma.productReview.create({ data: { ...review, productId, userId: customer.id, orderId: order.id } });
    revalidatePath(`/product/${product.slug}`);
    return NextResponse.json({ submitted: true, status: 'PENDING' }, { status: 201 });
  } catch (error) {
    if (error instanceof ReviewValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error('Create review failed', error);
    return NextResponse.json({ error: 'We could not submit your review. Please try again.' }, { status: 500 });
  }
}
