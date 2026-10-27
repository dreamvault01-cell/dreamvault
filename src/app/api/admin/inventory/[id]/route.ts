import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin-auth';

// PUT /api/admin/inventory/[id] — Update a product variant's stock/price
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminApi();
    const { id } = await params;
    const body = await req.json();
    const { stock, price, compareAtPrice, sku } = body;

    const variant = await prisma.productVariant.update({
      where: { id },
      data: {
        ...(stock !== undefined && { stock: Number(stock) }),
        ...(price !== undefined && { price: Number(price) }),
        ...(compareAtPrice !== undefined && { compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null }),
        ...(sku !== undefined && { sku: sku || null }),
      },
    });

    return NextResponse.json(variant);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
