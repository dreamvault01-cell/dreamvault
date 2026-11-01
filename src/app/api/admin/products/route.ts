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
    if (!hasSameOrigin(req)) return NextResponse.json({ error: 'Please perform this action from the RareDaze dashboard.' }, { status: 403 });
    const body = await req.json();
    const {
      name, slug, description, shortDescription,
      images,
      badge, status, categoryId, variants, tags,
    } = body;

    if (typeof name !== 'string' || !name.trim() || !slug || !description || !categoryId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const productImages = normalizeProductImages(images, name);
    if (productImages.length === 0) {
      return NextResponse.json({ error: 'At least one product image is required.' }, { status: 400 });
    }
    const sellableVariants = normalizeProductVariants(variants);
    const cataloguePricing = getLowestConfigurationPricing(sellableVariants);

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
        // Product cards show "From" the lowest genuinely sellable
        // configuration. Individual selections always use variant pricing.
        price: cataloguePricing.price,
        compareAtPrice: cataloguePricing.compareAtPrice,
        // The cover is always the first saved gallery image. Do not trust a
        // separate client-supplied URL that could bypass media validation.
        image: productImages[0].url,
        badge,
        status: status || 'ACTIVE',
        categoryId,
        variants: {
          create: sellableVariants.map((v) => ({
            size: v.size,
            format: v.format,
            paper: v.paper,
            frame: v.frame,
            configurationKey: v.configurationKey,
            price: v.price,
            compareAtPrice: v.compareAtPrice,
            sku: v.sku,
            stock: v.stock,
          })),
        },
        images: {
          create: productImages,
        },
        tags: {
          connect: tagConnections,
        },
      },
      include: { variants: true, images: { orderBy: { position: 'asc' } }, tags: true },
    });

    revalidatePath('/product/[slug]', 'page');
    revalidatePath('/collections');
    revalidatePath('/collections/[slug]', 'page');
    revalidatePath('/');

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (error instanceof ProductMediaValidationError || error instanceof ProductConfigurationValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Create product error:', error);
    const message = error instanceof Error ? error.message : 'Server error';
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
