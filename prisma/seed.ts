import { PrismaClient } from '@prisma/client';
import { products, categories } from '../src/data/products';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Seed Categories
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: {
        name: cat.name,
        slug: cat.slug,
        image: cat.image,
      },
    });
  }
  console.log('Categories seeded.');

  // 2. Fetch created categories to get their IDs
  const dbCategories = await prisma.category.findMany();
  const categoryMap = dbCategories.reduce((acc, cat) => {
    acc[cat.slug] = cat.id;
    return acc;
  }, {} as Record<string, string>);

  // 3. Seed Products
  for (const product of products) {
    const categoryId = categoryMap[product.categorySlug];
    if (!categoryId) {
      console.warn(`Category ${product.categorySlug} not found for product ${product.slug}`);
      continue;
    }

    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: {
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        image: product.image,
        badge: product.badge,
        categoryId: categoryId,
      },
    });
  }
  console.log('Products seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
