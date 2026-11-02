-- Additive, repeatable migration for customer wishlists and moderated reviews.
-- It does not delete or rewrite existing store data.
BEGIN;

CREATE TABLE IF NOT EXISTS "WishlistItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "WishlistItem_userId_productId_key"
  ON "WishlistItem"("userId", "productId");
CREATE INDEX IF NOT EXISTS "WishlistItem_userId_createdAt_idx"
  ON "WishlistItem"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "WishlistItem_productId_idx"
  ON "WishlistItem"("productId");

CREATE TABLE IF NOT EXISTS "ProductReview" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
  "rating" INTEGER NOT NULL CHECK ("rating" BETWEEN 1 AND 5),
  "title" VARCHAR(120),
  "body" TEXT NOT NULL CHECK (char_length("body") BETWEEN 10 AND 4000),
  "photoUrls" JSONB NOT NULL DEFAULT '[]',
  "status" VARCHAR(16) NOT NULL DEFAULT 'PENDING'
    CHECK ("status" IN ('PENDING','APPROVED','REJECTED')),
  "moderationNote" TEXT,
  "moderatedAt" TIMESTAMPTZ(3),
  "moderatedBy" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProductReview_userId_productId_key"
  ON "ProductReview"("userId", "productId");
CREATE INDEX IF NOT EXISTS "ProductReview_productId_status_createdAt_idx"
  ON "ProductReview"("productId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "ProductReview_orderId_idx"
  ON "ProductReview"("orderId");

COMMIT;
