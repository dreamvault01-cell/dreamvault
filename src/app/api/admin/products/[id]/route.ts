import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin-auth';
import { hasSameOrigin } from '@/lib/request-origin';
import { normalizeProductImages, ProductMediaValidationError } from '@/lib/product-media';
import {
  getLowestConfigurationPricing,
  normalizeProductVariants,
  ProductConfigurationValidationError,
} from '@/lib/product-configuration';

class ProductStockConflictError extends Error {
  constructor() {
    super('Stock changed while this product was open. Refresh the page to load the latest stock, then apply your changes again.');
    this.name = 'ProductStockConflictError';
  }
}

// GET /api/admin/products/[id]
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminApi();
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        variants: true,
        images: { orderBy: { position: 'asc' } },
        tags: true,
      },
    });
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(product);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// PUT /api/admin/products/[id] — Update product with variants, images, and tags
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminApi();
    if (!hasSameOrigin(req)) return NextResponse.json({ error: 'Please perform this action from the DreamVault dashboard.' }, { status: 403 });
    const { id } = await params;
    const body = await req.json();
    const {
      name, slug, description, shortDescription,
      images,
      badge, status, categoryId, variants, expectedStocks, tags,
    } = body;

    // Validate the complete gallery before any product data can be changed.
    const productImages = images === undefined
      ? undefined
      : normalizeProductImages(images, typeof name === 'string' ? name : 'Product image');
    if (productImages !== undefined && productImages.length === 0) {
      return NextResponse.json({ error: 'At least one product image is required.' }, { status: 400 });
    }
    const sellableVariants = variants === undefined ? undefined : normalizeProductVariants(variants);
    const cataloguePricing = sellableVariants ? getLowestConfigurationPricing(sellableVariants) : undefined;
    const stockSnapshot = expectedStocks && typeof expectedStocks === 'object' && !Array.isArray(expectedStocks)
      ? expectedStocks as Record<string, unknown>
      : null;

    // Replacing related records must be atomic: a failed save must not leave a
    // product without its previous images, variants, or tag connections.
    const updated = await prisma.$transaction(async (tx) => {
      // Use the same lock order as the inventory editor. Checkout holds and
      // payment capture lock inventory rows too, so read stock and order
      // history only after those operations have finished.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`product/${id}`}))`;
      if (sellableVariants) {
        const variantIds = await tx.productVariant.findMany({
          where: { productId: id },
          select: { id: true },
        });
        for (const variantId of variantIds.map((variant) => variant.id).sort()) {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`inventory/${variantId}`}))`;
        }
      }

      const existingVariants = sellableVariants ? await tx.productVariant.findMany({
        where: { productId: id },
        select: { id: true, configurationKey: true, stock: true, reservedStock: true },
      }) : [];
      // A sale may have completed while staff were editing. Reject the stale
      // form before any writes instead of putting sold units back in stock.
      for (const variant of existingVariants) {
        const expectedStock = stockSnapshot?.[variant.id];
        if (!Number.isInteger(expectedStock) || expectedStock !== variant.stock) {
          throw new ProductStockConflictError();
        }
      }

      await tx.product.update({
        where: { id },
        data: {
          name,
          slug,
          description,
          shortDescription: shortDescription !== undefined ? (shortDescription || null) : undefined,
          // The product-level price is a catalogue "From" price. It is always
          // derived from the exact sellable configurations instead of trusting
          // a second client-supplied price field.
          price: cataloguePricing?.price,
          compareAtPrice: cataloguePricing?.compareAtPrice,
          // When a gallery is updated, its first image is the cover. When it
          // is omitted, retain the existing cover instead of accepting an
          // unvalidated standalone image URL.
          image: productImages?.[0]?.url,
          badge,
          // Preserve the current publication status on partial updates.
          status: status === undefined ? undefined : status,
          categoryId,
        },
      });

      // Preserve IDs for unchanged configurations so saved carts remain valid.
      // If an admin changes the actual configuration (for example A3 Classic
      // Matte to A3 Walnut), deliberately retire that old variant and create a
      // new one rather than silently changing what an existing cart means.
      if (sellableVariants) {
        const existingById = new Map(existingVariants.map((variant) => [variant.id, variant]));
        const preserved = sellableVariants.filter((variant) => {
          if (!variant.id) return false;
          const existing = existingById.get(variant.id);
          if (!existing) {
            throw new ProductConfigurationValidationError('A sellable configuration belongs to a different product or no longer exists. Refresh the page and try again.');
          }
          return existing.configurationKey === variant.configurationKey;
        });
        const preservedIds = new Set(preserved.map((variant) => variant.id!));
        const retiredIds = existingVariants
          .filter((variant) => !preservedIds.has(variant.id))
          .map((variant) => variant.id);

        // Variants referenced by a reservation form part of an order audit
        // trail. Removing or silently reconfiguring them would make an old
        // order impossible to reconcile, so staff must retain the row and
        // mark the product as Draft instead.
        if (retiredIds.length > 0) {
          const [reservationCount, orderItemCount] = await Promise.all([
            tx.inventoryReservation.count({ where: { variantId: { in: retiredIds } } }),
            tx.orderItem.count({ where: { variantId: { in: retiredIds } } }),
          ]);
          if (reservationCount > 0 || orderItemCount > 0) {
            throw new ProductConfigurationValidationError('A configuration with order history cannot be removed or changed. Keep it for the audit trail and set the product to Draft if it should no longer be sold.');
          }
        }

        for (const variant of preserved) {
          const existing = existingById.get(variant.id!);
          if (existing && variant.stock < existing.reservedStock) {
            throw new ProductConfigurationValidationError(`On-hand stock cannot be lower than the ${existing.reservedStock} unit(s) currently held for checkout.`);
          }
        }

        await tx.productVariant.deleteMany({
          where: {
            productId: id,
            id: { notIn: [...preservedIds] },
          },
        });

        for (const variant of preserved) {
          await tx.productVariant.update({
            where: { id: variant.id! },
            data: {
              price: variant.price,
              compareAtPrice: variant.compareAtPrice,
              sku: variant.sku,
              stock: variant.stock,
            },
          });
        }

        const replacements = sellableVariants.filter((variant) => !variant.id || !preservedIds.has(variant.id));
        if (replacements.length > 0) {
          await tx.productVariant.createMany({
            data: replacements.map((variant) => ({
              productId: id,
              size: variant.size,
              format: variant.format,
              paper: variant.paper,
              frame: variant.frame,
              configurationKey: variant.configurationKey,
              price: variant.price,
              compareAtPrice: variant.compareAtPrice,
              sku: variant.sku,
              stock: variant.stock,
            })),
          });
        }
      }

      // Replace images: delete existing then create new
      if (productImages !== undefined) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (productImages.length > 0) {
          await tx.productImage.createMany({
            data: productImages.map((img) => ({
              productId: id,
              ...img,
            })),
          });
        }
      }

      // Replace tags: disconnect all, then connect/create new
      if (tags) {
        // Disconnect existing tags
        const existingProduct = await tx.product.findUnique({
          where: { id },
          include: { tags: true },
        });
        if (existingProduct?.tags.length) {
          await tx.product.update({
            where: { id },
            data: {
              tags: { disconnect: existingProduct.tags.map((t) => ({ id: t.id })) },
            },
          });
        }

        // Connect/create new tags
        const tagConnections = [];
        for (const t of tags as { name: string; slug: string }[]) {
          const existing = await tx.tag.findUnique({ where: { slug: t.slug } });
          if (existing) {
            tagConnections.push({ id: existing.id });
          } else {
            const newTag = await tx.tag.create({ data: { name: t.name, slug: t.slug } });
            tagConnections.push({ id: newTag.id });
          }
        }

        if (tagConnections.length > 0) {
          await tx.product.update({
            where: { id },
            data: { tags: { connect: tagConnections } },
          });
        }
      }

      return tx.product.findUnique({
        where: { id },
        include: {
          variants: true,
          images: { orderBy: { position: 'asc' } },
          tags: true,
        },
      });
    }, { maxWait: 10_000, timeout: 20_000 });

    revalidatePath('/product/[slug]', 'page');
    revalidatePath('/collections');
    revalidatePath('/collections/[slug]', 'page');
    revalidatePath('/');

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof ProductStockConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof ProductMediaValidationError || error instanceof ProductConfigurationValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Update product error:', error);
    const message = error instanceof Error ? error.message : 'Server error';
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// DELETE /api/admin/products/[id]
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminApi();
    if (!hasSameOrigin(req)) return NextResponse.json({ error: 'Please perform this action from the DreamVault dashboard.' }, { status: 403 });
    const { id } = await params;
    const orderItemCount = await prisma.orderItem.count({ where: { productId: id } });
    if (orderItemCount > 0) {
      return NextResponse.json({ error: 'This product has order history and cannot be deleted. Set it to Draft instead so past orders remain auditable.' }, { status: 409 });
    }
    await prisma.product.delete({ where: { id } });
    revalidatePath('/product/[slug]', 'page');
    revalidatePath('/collections');
    revalidatePath('/collections/[slug]', 'page');
    revalidatePath('/');
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
