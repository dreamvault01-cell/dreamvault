import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import ProductForm from '../../ProductForm';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [product, categories, existingTags] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        variants: { orderBy: { size: 'asc' } },
        images: { orderBy: { position: 'asc' } },
        tags: true,
      },
    }),
    prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    }),
    prisma.tag.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    }),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Edit Product</h1>
          <p className="admin-page-subtitle">Editing: {product.name}</p>
        </div>
      </div>

      <ProductForm
        categories={categories}
        existingTags={existingTags}
        initialData={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          shortDescription: product.shortDescription || '',
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          image: product.image,
          images: product.images.map((img) => ({
            id: img.id,
            url: img.url,
            alt: img.alt || '',
            position: img.position,
            isRoomPreview: img.isRoomPreview,
          })),
          badge: product.badge,
          status: product.status,
          categoryId: product.categoryId,
          variants: product.variants.map((v) => ({
            size: v.size,
            price: v.price,
            compareAtPrice: v.compareAtPrice,
            sku: v.sku || '',
            stock: v.stock,
          })),
          tags: product.tags.map((t) => ({
            id: t.id,
            name: t.name,
            slug: t.slug,
          })),
        }}
      />
    </>
  );
}
