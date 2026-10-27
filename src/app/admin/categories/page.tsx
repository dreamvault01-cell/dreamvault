import prisma from '@/lib/prisma';
import CategoryManager from './CategoryManager';

export default async function AdminCategories() {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Categories</h1>
          <p className="admin-page-subtitle">{categories.length} categories</p>
        </div>
      </div>

      <CategoryManager
        initialCategories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description,
          image: c.image,
          _count: c._count,
        }))}
      />
    </>
  );
}
