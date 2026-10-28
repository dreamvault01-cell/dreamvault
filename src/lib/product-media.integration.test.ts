import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { Prisma, PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { getRoomPreviewImage, normalizeProductImages } from './product-media';

config({ path: ['.env.local', '.env'], quiet: true });

const databaseTestsEnabled = process.env.PRODUCT_DATABASE_TESTS === '1';
const transactionOptions = { timeout: 20_000, maxWait: 15_000 };

async function assertTemporaryRecordsWereRolledBack(
  prisma: PrismaClient,
  productId: string,
  categoryId: string,
) {
  const [product, category, imageCount] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId }, select: { id: true } }),
    prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } }),
    prisma.productImage.count({ where: { productId } }),
  ]);
  assert.equal(product, null, 'Temporary draft product must not survive the transaction.');
  assert.equal(category, null, 'Temporary category must not survive the transaction.');
  assert.equal(imageCount, 0, 'Temporary images must not survive the transaction.');
}

// Explicit opt-in only. These tests use exclusively their own temporary records.
// Every transaction throws before completion, including if an assertion fails.
test('PostgreSQL room-preview image lifecycle persists selections and always rolls back its temporary draft', {
  skip: !databaseTestsEnabled,
}, async () => {
  const prisma = new PrismaClient();
  const productId = randomUUID();
  const categoryId = randomUUID();
  const rollback = new Error('ROLLBACK_PRODUCT_MEDIA_LIFECYCLE');
  const images = normalizeProductImages([
    { url: '/product-media-db-check-room.webp', alt: 'Temporary room photograph' },
    { url: '/product-media-db-check-artwork.webp', alt: 'Temporary artwork', isRoomPreview: true },
    { url: '/product-media-db-check-alternate.webp', alt: 'Temporary alternate artwork' },
  ], 'Temporary product');

  try {
    await assert.rejects(prisma.$transaction(async (tx) => {
      await tx.product.create({
        data: {
          id: productId,
          name: 'Temporary room preview database check',
          slug: `product-media-db-check-${productId}`,
          description: 'Rollback-only database verification. Never published.',
          status: 'DRAFT',
          price: 1,
          image: images[0].url,
          category: { create: { id: categoryId, name: 'Temporary database check', slug: `product-media-db-check-${categoryId}` } },
          images: { create: images },
        },
      });

      let persisted = await tx.productImage.findMany({ where: { productId }, orderBy: { position: 'asc' } });
      assert.equal(persisted.length, 3);
      assert.equal(getRoomPreviewImage(persisted)?.url, images[1].url);
      assert.deepEqual(persisted.map(({ alt, position, isRoomPreview }) => ({ alt, position, isRoomPreview })),
        images.map(({ alt, position, isRoomPreview }) => ({ alt, position, isRoomPreview })));

      // Switch selection safely without ever violating the one-preview index.
      await tx.productImage.updateMany({ where: { productId }, data: { isRoomPreview: false } });
      await tx.productImage.updateMany({ where: { productId, url: images[2].url }, data: { isRoomPreview: true } });
      persisted = await tx.productImage.findMany({ where: { productId }, orderBy: { position: 'asc' } });
      assert.equal(getRoomPreviewImage(persisted)?.url, images[2].url);

      // Reordering uses the same normalization/replacement path as the API.
      const reordered = normalizeProductImages([persisted[2], persisted[0], persisted[1]], 'Temporary product');
      await tx.productImage.deleteMany({ where: { productId } });
      await tx.productImage.createMany({ data: reordered.map((image) => ({ productId, ...image })) });
      persisted = await tx.productImage.findMany({ where: { productId }, orderBy: { position: 'asc' } });
      assert.deepEqual(persisted.map(({ url }) => url), reordered.map(({ url }) => url));
      assert.equal(getRoomPreviewImage(persisted)?.url, images[2].url);
      assert.equal(getRoomPreviewImage(persisted)?.position, 0);

      // Removing an unrelated photograph preserves the chosen artwork.
      await tx.productImage.deleteMany({ where: { productId, url: images[0].url } });
      persisted = await tx.productImage.findMany({ where: { productId }, orderBy: { position: 'asc' } });
      assert.equal(persisted.length, 2);
      assert.equal(getRoomPreviewImage(persisted)?.url, images[2].url);

      // Disabling preview persists false without removing any gallery images.
      await tx.productImage.updateMany({ where: { productId }, data: { isRoomPreview: false } });
      persisted = await tx.productImage.findMany({ where: { productId }, orderBy: { position: 'asc' } });
      assert.equal(persisted.length, 2);
      assert(persisted.every(({ isRoomPreview }) => isRoomPreview === false));
      assert.equal(getRoomPreviewImage(persisted), undefined);

      // Selecting again and deleting that image must leave no implicit fallback.
      await tx.productImage.updateMany({ where: { productId, url: images[2].url }, data: { isRoomPreview: true } });
      await tx.productImage.deleteMany({ where: { productId, url: images[2].url } });
      persisted = await tx.productImage.findMany({ where: { productId }, orderBy: { position: 'asc' } });
      assert.equal(persisted.length, 1);
      assert.equal(getRoomPreviewImage(persisted), undefined);

      throw rollback;
    }, transactionOptions), (error: unknown) => error === rollback);
  } finally {
    try {
      await assertTemporaryRecordsWereRolledBack(prisma, productId, categoryId);
    } finally {
      await prisma.$disconnect();
    }
  }
});

test('PostgreSQL rejects two room-preview images for one temporary draft and rolls back all its records', {
  skip: !databaseTestsEnabled,
}, async () => {
  const prisma = new PrismaClient();
  const productId = randomUUID();
  const categoryId = randomUUID();

  try {
    // Do not catch a constraint failure inside the transaction: PostgreSQL has
    // already aborted it. The rejection outside proves the database constraint.
    await assert.rejects(prisma.$transaction(async (tx) => {
      await tx.product.create({
        data: {
          id: productId,
          name: 'Temporary duplicate preview database check',
          slug: `product-media-db-check-${productId}`,
          description: 'Rollback-only constraint verification. Never published.',
          status: 'DRAFT',
          price: 1,
          image: '/product-media-db-check-one.webp',
          category: { create: { id: categoryId, name: 'Temporary database check', slug: `product-media-db-check-${categoryId}` } },
          images: {
            create: [
              { url: '/product-media-db-check-one.webp', alt: 'Temporary artwork one', position: 0, isRoomPreview: true },
              { url: '/product-media-db-check-two.webp', alt: 'Temporary artwork two', position: 1, isRoomPreview: true },
            ],
          },
        },
      });
      // If the index is missing, fail and still roll back instead of committing.
      throw new Error('The database did not reject duplicate room-preview selections.');
    }, transactionOptions), (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002');
  } finally {
    try {
      await assertTemporaryRecordsWereRolledBack(prisma, productId, categoryId);
    } finally {
      await prisma.$disconnect();
    }
  }
});
