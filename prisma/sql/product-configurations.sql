-- Safe, additive migration for sellable poster / art-print configurations.
--
-- A product remains the artwork. Each ProductVariant becomes one exact item
-- customers can buy: size + format + paper + frame. Legacy size-only variants
-- become Classic Matte Poster Prints with no frame.
BEGIN;

ALTER TABLE "ProductVariant"
  ADD COLUMN IF NOT EXISTS "format" TEXT NOT NULL DEFAULT 'POSTER',
  ADD COLUMN IF NOT EXISTS "paper" TEXT NOT NULL DEFAULT 'CLASSIC_MATTE',
  ADD COLUMN IF NOT EXISTS "frame" TEXT NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "configurationKey" TEXT;

-- Normalize old or hand-edited values before applying the catalogue check.
UPDATE "ProductVariant"
SET
  "size" = UPPER(TRIM("size")),
  "format" = UPPER(TRIM("format")),
  "paper" = UPPER(TRIM("paper")),
  "frame" = UPPER(TRIM("frame"));

UPDATE "ProductVariant"
SET
  "format" = 'POSTER',
  "paper" = 'CLASSIC_MATTE',
  "frame" = 'NONE'
WHERE NOT (
  ("format" = 'POSTER' AND "paper" = 'CLASSIC_MATTE' AND "frame" = 'NONE')
  OR ("format" = 'ART_PRINT' AND "paper" = 'PREMIUM_FINE_ART' AND "frame" = 'NONE')
  OR ("format" = 'FRAMED_ART_PRINT' AND "paper" = 'PREMIUM_FINE_ART' AND "frame" IN ('BLACK', 'WHITE', 'NATURAL_OAK', 'WALNUT'))
);

UPDATE "ProductVariant"
SET "configurationKey" = "size" || ':' || "format" || ':' || "paper" || ':' || "frame"
WHERE "configurationKey" IS NULL
   OR "configurationKey" <> "size" || ':' || "format" || ':' || "paper" || ':' || "frame";

ALTER TABLE "ProductVariant"
  ALTER COLUMN "configurationKey" SET NOT NULL;

-- Prisma's previous size-only uniqueness may be either a constraint or index,
-- depending on how the database was originally created.
ALTER TABLE "ProductVariant"
  DROP CONSTRAINT IF EXISTS "ProductVariant_productId_size_key";
DROP INDEX IF EXISTS "ProductVariant_productId_size_key";

CREATE UNIQUE INDEX IF NOT EXISTS "ProductVariant_productId_configurationKey_key"
  ON "ProductVariant" ("productId", "configurationKey");
CREATE INDEX IF NOT EXISTS "ProductVariant_productId_size_idx"
  ON "ProductVariant" ("productId", "size");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ProductVariant_configuration_values_check'
  ) THEN
    ALTER TABLE "ProductVariant"
      ADD CONSTRAINT "ProductVariant_configuration_values_check"
      CHECK (
        ("format" = 'POSTER' AND "paper" = 'CLASSIC_MATTE' AND "frame" = 'NONE')
        OR ("format" = 'ART_PRINT' AND "paper" = 'PREMIUM_FINE_ART' AND "frame" = 'NONE')
        OR ("format" = 'FRAMED_ART_PRINT' AND "paper" = 'PREMIUM_FINE_ART' AND "frame" IN ('BLACK', 'WHITE', 'NATURAL_OAK', 'WALNUT'))
      );
  END IF;
END $$;

ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "variantId" TEXT,
  ADD COLUMN IF NOT EXISTS "variantSku" TEXT,
  ADD COLUMN IF NOT EXISTS "configuration" JSONB;
CREATE INDEX IF NOT EXISTS "OrderItem_variantId_idx" ON "OrderItem" ("variantId");

-- Keep product-card "From" pricing accurate for existing products. The
-- compare-at price belongs to that same lowest-priced configuration.
WITH ranked_variants AS (
  SELECT
    "productId",
    "price",
    "compareAtPrice",
    ROW_NUMBER() OVER (
      PARTITION BY "productId"
      ORDER BY "price" ASC, "createdAt" ASC, "id" ASC
    ) AS rank
  FROM "ProductVariant"
)
UPDATE "Product" AS product
SET
  "price" = variant."price",
  "compareAtPrice" = CASE
    WHEN variant."compareAtPrice" > variant."price" THEN variant."compareAtPrice"
    ELSE NULL
  END
FROM ranked_variants AS variant
WHERE product."id" = variant."productId"
  AND variant.rank = 1;

COMMIT;
