import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config({ path: ['.env.local', '.env'], quiet: true });

const databaseTestsEnabled = process.env.PRODUCT_DATABASE_TESTS === '1';

test('PostgreSQL stores separate same-size sellable configurations and rolls back its temporary records', {
  skip: !databaseTestsEnabled,
}, async () => {
  const prisma = new PrismaClient();
  const productId = randomUUID();
  const categoryId = randomUUID();
  const rollback = new Error('ROLLBACK_PRODUCT_CONFIGURATION_LIFECYCLE');

  try {
    await assert.rejects(prisma.$transaction(async (tx) => {
      await tx.product.create({
        data: {
          id: productId,
          name: 'Temporary configuration database check',
          slug: `product-configuration-db-check-${productId}`,
          description: 'Rollback-only database verification. Never published.',
          status: 'DRAFT',
          price: 199,
          image: '/product-configuration-db-check.webp',
          category: { create: { id: categoryId, name: 'Temporary configuration check', slug: `product-configuration-db-check-${categoryId}` } },
          variants: {
            create: [
              {
                size: 'A3',
                format: 'POSTER',
                paper: 'CLASSIC_MATTE',
                frame: 'NONE',
                configurationKey: 'A3:POSTER:CLASSIC_MATTE:NONE',
                price: 199,
                stock: 8,
              },
              {
                size: 'A3',
                format: 'FRAMED_ART_PRINT',
                paper: 'PREMIUM_FINE_ART',
                frame: 'WALNUT',
                configurationKey: 'A3:FRAMED_ART_PRINT:PREMIUM_FINE_ART:WALNUT',
                price: 699,
                stock: 3,
              },
            ],
          },
        },
      });

      const configurations = await tx.productVariant.findMany({
        where: { productId },
        orderBy: { price: 'asc' },
      });
      assert.equal(configurations.length, 2);
      assert.deepEqual(configurations.map(({ size, format, paper, frame, price }) => ({ size, format, paper, frame, price })), [
        { size: 'A3', format: 'POSTER', paper: 'CLASSIC_MATTE', frame: 'NONE', price: 199 },
        { size: 'A3', format: 'FRAMED_ART_PRINT', paper: 'PREMIUM_FINE_ART', frame: 'WALNUT', price: 699 },
      ]);

      throw rollback;
    }, { timeout: 20_000, maxWait: 15_000 }), (error: unknown) => error === rollback);
  } finally {
    try {
      const [product, category, variants] = await Promise.all([
        prisma.product.findUnique({ where: { id: productId }, select: { id: true } }),
        prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } }),
        prisma.productVariant.count({ where: { productId } }),
      ]);
      assert.equal(product, null, 'Temporary product must not survive the transaction.');
      assert.equal(category, null, 'Temporary category must not survive the transaction.');
      assert.equal(variants, 0, 'Temporary configurations must not survive the transaction.');
    } finally {
      await prisma.$disconnect();
    }
  }
});
