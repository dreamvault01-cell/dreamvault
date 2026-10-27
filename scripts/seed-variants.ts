/**
 * One-time script to create default size variants for all existing products.
 * Run with: npx tsx scripts/seed-variants.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    include: { variants: true },
  });

  console.log(`Found ${products.length} products.`);

  let created = 0;
  let skipped = 0;

  for (const product of products) {
    // Skip if product already has variants
    if (product.variants.length > 0) {
      console.log(`  ⏩ ${product.name} — already has ${product.variants.length} variants, skipping`);
      skipped++;
      continue;
    }

    const variants = [
      { size: 'A4', price: product.price, stock: 50 },
      { size: 'A3', price: product.price + 50, stock: 30 },
      { size: 'A2', price: product.price + 150, stock: 20 },
    ];

    await prisma.productVariant.createMany({
      data: variants.map((v) => ({
        productId: product.id,
        size: v.size,
        price: v.price,
        stock: v.stock,
      })),
    });

    console.log(`  ✅ ${product.name} — created ${variants.length} variants`);
    created++;
  }

  console.log(`\nDone! Created variants for ${created} products, skipped ${skipped}.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
