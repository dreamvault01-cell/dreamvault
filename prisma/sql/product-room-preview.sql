-- Safe to run again. Adds only the room-preview image flag and its constraint.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'ProductImage'
      AND column_name = 'isRoomPreview'
  ) THEN
    ALTER TABLE "ProductImage"
      ADD COLUMN "isRoomPreview" BOOLEAN NOT NULL DEFAULT false;

    -- Preserve explicitly labelled artwork-only images from the earlier gallery.
    -- Run this only when adding the column, so reruns never undo an admin choice.
    WITH candidates AS (
      SELECT "id", ROW_NUMBER() OVER (
        PARTITION BY "productId" ORDER BY "position", "createdAt", "id"
      ) AS rank
      FROM "ProductImage"
      WHERE "url" <> ''
        AND COALESCE("alt", '') ~* '(artwork[[:space:]-]*only|flat[[:space:]-]*(artwork|print)|print[[:space:]-]*ready)'
    )
    UPDATE "ProductImage" SET "isRoomPreview" = true
    WHERE "id" IN (SELECT "id" FROM candidates WHERE rank = 1);
  END IF;
END $$;

-- Enforce one artwork-only preview image per product, including direct API writes.
CREATE UNIQUE INDEX IF NOT EXISTS "ProductImage_one_room_preview_per_product"
  ON "ProductImage" ("productId") WHERE "isRoomPreview" = true;

COMMIT;
