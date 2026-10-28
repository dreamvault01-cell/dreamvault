import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin-auth';
import { normalizeProductImages, ProductMediaValidationError } from '@/lib/product-media';

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
    const { id } = await params;
    const body = await req.json();
    const {
      name, slug, description, shortDescription,
      price, compareAtPrice, images,
      badge, status, categoryId, variants, tags,
    } = body;

    // Validate the complete gallery before any product data can be changed.
    const productImages = images === undefined
      ? undefined
      : normalizeProductImages(images, typeof name === 'string' ? name : 'Product image');
    if (productImages !== undefined && productImages.length === 0) {
      return NextResponse.json({ error: 'At least one product image is required.' }, { status: 400 });
    }

    // Replacing related records must be atomic: a failed save must not leave a
    // product without its previous images, variants, or tag connections.
    const updated = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          name,
          slug,
          description,
          shortDescription: shortDescription !== undefined ? (shortDescription || null) : undefined,
          price,
          compareAtPrice: compareAtPrice !== undefined ? (compareAtPrice || null) : undefined,
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

      // Replace variants: delete existing then create new
      if (variants) {
        await tx.productVariant.deleteMany({ where: { productId: id } });
        await tx.productVariant.createMany({
          data: variants.map((v: { size: string; price: number; compareAtPrice?: number; sku?: string; stock: number }) => ({
            productId: id,
            size: v.size,
            price: v.price,
            compareAtPrice: v.compareAtPrice || null,
            sku: v.sku || null,
            stock: v.stock,
          })),
        });
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
    if (error instanceof ProductMediaValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Update product error:', error);
    const message = error instanceof Error ? error.message : 'Server error';
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// DELETE /api/admin/products/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminApi();
    const { id } = await params;
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
