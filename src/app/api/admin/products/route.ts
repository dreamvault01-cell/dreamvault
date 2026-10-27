import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin-auth';

// GET /api/admin/products — List all products
export async function GET() {
  try {
    await requireAdminApi();
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: { category: true, variants: true, images: { orderBy: { position: 'asc' } }, tags: true },
    });
    return NextResponse.json(products);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// POST /api/admin/products — Create a product with variants, images, and tags
export async function POST(req: Request) {
  try {
    await requireAdminApi();
    const body = await req.json();
    const {
      name, slug, description, shortDescription,
      price, compareAtPrice, image, images,
      badge, status, categoryId, variants, tags,
    } = body;

    if (!name || !slug || !description || !categoryId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Resolve tags: find existing or create new
    const tagConnections = [];
    if (tags && tags.length > 0) {
      for (const t of tags as { name: string; slug: string }[]) {
        const existing = await prisma.tag.findUnique({ where: { slug: t.slug } });
        if (existing) {
          tagConnections.push({ id: existing.id });
        } else {
          const newTag = await prisma.tag.create({ data: { name: t.name, slug: t.slug } });
          tagConnections.push({ id: newTag.id });
        }
      }
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        shortDescription: shortDescription || null,
        price,
        compareAtPrice: compareAtPrice || null,
        image: image || (images && images[0]?.url) || '',
        badge,
        status: status || 'ACTIVE',
        categoryId,
        variants: {
          create: (variants || []).map((v: { size: string; price: number; compareAtPrice?: number; sku?: string; stock: number }) => ({
            size: v.size,
            price: v.price,
            compareAtPrice: v.compareAtPrice || null,
            sku: v.sku || null,
            stock: v.stock,
          })),
        },
        images: {
          create: (images || []).map((img: { url: string; alt?: string; position: number }) => ({
            url: img.url,
            alt: img.alt || name,
            position: img.position,
          })),
        },
        tags: {
          connect: tagConnections,
        },
      },
      include: { variants: true, images: { orderBy: { position: 'asc' } }, tags: true },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Create product error:', error);
    const message = error instanceof Error ? error.message : 'Server error';
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
