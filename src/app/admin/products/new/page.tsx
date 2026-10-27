import prisma from '@/lib/prisma';
import ProductForm from '../ProductForm';

export default async function NewProductPage() {
  const [categories, existingTags] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    }),
    prisma.tag.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    }),
  ]);

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Add New Product</h1>
          <p className="admin-page-subtitle">Create a new poster for your catalog</p>
        </div>
      </div>

      <ProductForm categories={categories} existingTags={existingTags} />
    </>
  );
}
