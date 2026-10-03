'use server';

import prisma from '@/lib/prisma';

export async function searchProductsAction(query: string) {
  if (!query || query.length < 2) return [];
  
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { category: { name: { contains: query, mode: 'insensitive' } } },
      ],
    },
    include: {
      category: true,
    },
    take: 5,
  });

  return products.map(p => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.price,
    image: p.image,
    badge: p.badge,
    categorySlug: p.category.slug,
    category: p.category.name,
  }));
}
