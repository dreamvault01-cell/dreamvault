import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentCustomer } from '@/lib/customer-auth';
import { hasSameOrigin } from '@/lib/request-origin';

function productIdFromBody(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const productId = (body as Record<string, unknown>).productId;
  return typeof productId === 'string' && productId.trim() ? productId.trim() : null;
}

export async function GET(request: Request) {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ items: [], authenticated: false }, { status: 200 });
  const productId = new URL(request.url).searchParams.get('productId')?.trim();
  const items = await prisma.wishlistItem.findMany({
    where: { userId: customer.id, ...(productId ? { productId } : {}) },
    orderBy: { createdAt: 'desc' },
    select: { productId: true },
  });
  return NextResponse.json({ items: items.map((item) => item.productId), authenticated: true });
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return NextResponse.json({ error: 'Please perform this action from the store.' }, { status: 403 });
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: 'Please sign in to save prints.' }, { status: 401 });
  const productId = productIdFromBody(await request.json().catch(() => null));
  if (!productId) return NextResponse.json({ error: 'A product is required.' }, { status: 400 });
  const product = await prisma.product.findFirst({ where: { id: productId, status: 'ACTIVE' }, select: { id: true } });
  if (!product) return NextResponse.json({ error: 'That print is not available.' }, { status: 404 });
  await prisma.wishlistItem.upsert({
    where: { userId_productId: { userId: customer.id, productId } },
    update: {},
    create: { userId: customer.id, productId },
  });
  return NextResponse.json({ saved: true, productId });
}

export async function DELETE(request: Request) {
  if (!hasSameOrigin(request)) return NextResponse.json({ error: 'Please perform this action from the store.' }, { status: 403 });
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: 'Please sign in to manage saved prints.' }, { status: 401 });
  const productId = productIdFromBody(await request.json().catch(() => null));
  if (!productId) return NextResponse.json({ error: 'A product is required.' }, { status: 400 });
  await prisma.wishlistItem.deleteMany({ where: { userId: customer.id, productId } });
  return NextResponse.json({ saved: false, productId });
}
