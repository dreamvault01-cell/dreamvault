import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin-auth';
import { hasSameOrigin } from '@/lib/request-origin';
import {
  getLowestConfigurationPricing,
  normalizeProductVariants,
  ProductConfigurationValidationError,
} from '@/lib/product-configuration';

class InventoryUpdateError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'InventoryUpdateError';
  }
}

// PUT /api/admin/inventory/[id] — Update a product variant's stock/price
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminApi();
    if (!hasSameOrigin(req)) return NextResponse.json({ error: 'Please perform this action from the DreamVault dashboard.' }, { status: 403 });
    const { id } = await params;
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Provide a valid inventory update.' }, { status: 400 });
    }
    const { stock, expectedStock, price, compareAtPrice, sku } = body;

    const variant = await prisma.$transaction(async (tx) => {
      const identity = await tx.productVariant.findUnique({ where: { id }, select: { productId: true } });
      if (!identity) throw new InventoryUpdateError(404, 'Configuration not found.');

      // Match product editing's lock order, and checkout's inventory lock, so
      // validation uses the latest stock and catalogue prices after any wait.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`product/${identity.productId}`}))`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`inventory/${id}`}))`;
      const existing = await tx.productVariant.findUnique({ where: { id } });
      if (!existing) throw new InventoryUpdateError(404, 'Configuration not found.');
      if (stock !== undefined && (!Number.isInteger(expectedStock) || expectedStock !== existing.stock)) {
        throw new InventoryUpdateError(409, 'Stock changed while this page was open. Refresh and review the latest quantities before saving.');
      }

      const [next] = normalizeProductVariants([{
        id: existing.id,
        size: existing.size,
        format: existing.format,
        paper: existing.paper,
        frame: existing.frame,
        price: price === undefined ? existing.price : price,
        compareAtPrice: compareAtPrice === undefined ? existing.compareAtPrice : compareAtPrice,
        sku: sku === undefined ? existing.sku : sku,
        stock: stock === undefined ? existing.stock : stock,
      }]);
      if (next.stock < existing.reservedStock) {
        throw new InventoryUpdateError(409, `On-hand stock cannot be lower than the ${existing.reservedStock} unit(s) currently held for checkout.`);
      }
      if (next.sku) {
        const duplicateSku = await tx.productVariant.findFirst({
          where: {
            productId: existing.productId,
            id: { not: id },
            sku: { equals: next.sku, mode: 'insensitive' },
          },
          select: { id: true },
        });
        if (duplicateSku) {
          throw new InventoryUpdateError(409, 'SKU is already used by another configuration of this product.');
        }
      }

      const updated = await tx.productVariant.update({
        where: { id },
        data: {
          price: next.price,
          compareAtPrice: next.compareAtPrice,
          sku: next.sku,
          stock: next.stock,
        },
      });
      const productVariants = await tx.productVariant.findMany({
        where: { productId: existing.productId },
        select: { price: true, compareAtPrice: true },
      });
      const cataloguePricing = getLowestConfigurationPricing(productVariants);
      await tx.product.update({
        where: { id: existing.productId },
        data: cataloguePricing,
      });
      return updated;
    }, { maxWait: 10_000, timeout: 20_000 });

    revalidatePath('/product/[slug]', 'page');
    revalidatePath('/collections');
    revalidatePath('/collections/[slug]', 'page');
    revalidatePath('/');

    return NextResponse.json(variant);
  } catch (error) {
    if (error instanceof InventoryUpdateError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ProductConfigurationValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Provide a valid inventory update.' }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : '';
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500;
    if (status === 500) console.error('Update inventory error:', error);
    return NextResponse.json({ error: status === 500 ? 'Unable to update this configuration. Refresh the page and try again.' : message }, { status });
  }
}
