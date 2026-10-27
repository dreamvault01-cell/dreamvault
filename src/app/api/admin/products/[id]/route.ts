import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin-auth';

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
      price, compareAtPrice, image, images,
      badge, status, categoryId, variants, tags,
    } = body;

    // Update core product fields
    await prisma.product.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        shortDescription: shortDescription !== undefined ? (shortDescription || null) : undefined,
        price,
        compareAtPrice: compareAtPrice !== undefined ? (compareAtPrice || null) : undefined,
        image: image || (images && images[0]?.url) || undefined,
        badge,
        status: status || 'ACTIVE',
        categoryId,
      },
    });

    // Replace variants: delete existing then create new
    if (variants) {
      await prisma.productVariant.deleteMany({ where: { productId: id } });
      await prisma.productVariant.createMany({
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
    if (images) {
      await prisma.productImage.deleteMany({ where: { productId: id } });
      if (images.length > 0) {
        await prisma.productImage.createMany({
          data: images.map((img: { url: string; alt?: string; position: number }) => ({
            productId: id,
            url: img.url,
            alt: img.alt || name,
            position: img.position,
          })),
        });
      }
    }

    // Replace tags: disconnect all, then connect/create new
    if (tags) {
      // Disconnect existing tags
      const existingProduct = await prisma.product.findUnique({
        where: { id },
        include: { tags: true },
      });
      if (existingProduct?.tags.length) {
        await prisma.product.update({
          where: { id },
          data: {
            tags: { disconnect: existingProduct.tags.map((t) => ({ id: t.id })) },
          },
        });
      }

      // Connect/create new tags
      const tagConnections = [];
      for (const t of tags as { name: string; slug: string }[]) {
        const existing = await prisma.tag.findUnique({ where: { slug: t.slug } });
        if (existing) {
          tagConnections.push({ id: existing.id });
        } else {
          const newTag = await prisma.tag.create({ data: { name: t.name, slug: t.slug } });
          tagConnections.push({ id: newTag.id });
        }
      }

      if (tagConnections.length > 0) {
        await prisma.product.update({
          where: { id },
          data: { tags: { connect: tagConnections } },
        });
      }
    }

    const updated = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        images: { orderBy: { position: 'asc' } },
        tags: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
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
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
