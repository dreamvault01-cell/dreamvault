-- Safe, additive migration for checkout reservations, reliable fulfilment,
-- Razorpay webhook idempotency, and transactional order notifications.
-- It can be run more than once; no orders, products, or customer data are reset.
BEGIN;

ALTER TABLE "ProductVariant"
  ADD COLUMN IF NOT EXISTS "reservedStock" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "orderReference" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "razorpayRefundId" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "fulfillmentStatus" TEXT NOT NULL DEFAULT 'UNFULFILLED',
  ADD COLUMN IF NOT EXISTS "refundStatus" TEXT NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "reservationExpiresAt" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "stockCommittedAt" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "processingAt" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "shippedAt" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "refundCompletedAt" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT,
  ADD COLUMN IF NOT EXISTS "trackingCarrier" TEXT,
  ADD COLUMN IF NOT EXISTS "trackingNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "trackingUrl" TEXT;

-- Historic rows retain an opaque, unique reference. New orders receive a
-- shorter customer-facing reference in application code.
UPDATE "Order"
SET "orderReference" = 'DV-' || UPPER("id")
WHERE "orderReference" IS NULL OR BTRIM("orderReference") = '';

ALTER TABLE "Order"
  ALTER COLUMN "orderReference" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderReference_key" ON "Order" ("orderReference");
CREATE UNIQUE INDEX IF NOT EXISTS "Order_razorpayRefundId_key" ON "Order" ("razorpayRefundId");
CREATE INDEX IF NOT EXISTS "Order_userId_createdAt_idx" ON "Order" ("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Order_reservationExpiresAt_idx" ON "Order" ("reservationExpiresAt");

-- Map only legacy values. Rerunning this migration never changes a modern
-- paid/fulfilled order because its new status is no longer the default.
UPDATE "Order"
SET "paymentStatus" = CASE
  WHEN "status" IN ('PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED') THEN 'PAID'
  WHEN "status" = 'CANCELLED' THEN 'CANCELLED'
  WHEN "paymentMethod" = 'COD' THEN 'COD_PENDING'
  ELSE "paymentStatus"
END,
"fulfillmentStatus" = CASE
  WHEN "status" = 'PROCESSING' THEN 'PROCESSING'
  WHEN "status" = 'SHIPPED' THEN 'SHIPPED'
  WHEN "status" = 'DELIVERED' THEN 'DELIVERED'
  WHEN "status" = 'CANCELLED' THEN 'CANCELLED'
  ELSE "fulfillmentStatus"
END,
"refundStatus" = CASE
  WHEN "paymentMethod" = 'COD' AND "status" = 'CANCELLED' THEN 'NOT_REQUIRED'
  ELSE "refundStatus"
END
-- Only rows that still have the just-added legacy default may be backfilled.
-- This gate is essential: without it, rerunning this additive migration could
-- incorrectly turn a modern COD order that is PROCESSING or SHIPPED into PAID.
WHERE "paymentStatus" = 'PENDING'
  AND (
    "status" IN ('PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED')
    OR "paymentMethod" = 'COD'
  );

CREATE TABLE IF NOT EXISTS "InventoryReservation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
  "variantId" TEXT NOT NULL REFERENCES "ProductVariant"("id") ON DELETE RESTRICT,
  "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
  "status" VARCHAR(16) NOT NULL DEFAULT 'RESERVED'
    CHECK ("status" IN ('RESERVED','COMMITTED','RELEASED','RESTOCKED')),
  "expiresAt" TIMESTAMPTZ(3),
  "committedAt" TIMESTAMPTZ(3),
  "releasedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryReservation_orderId_variantId_key" UNIQUE ("orderId", "variantId")
);
CREATE INDEX IF NOT EXISTS "InventoryReservation_status_expiresAt_idx" ON "InventoryReservation" ("status", "expiresAt");
CREATE INDEX IF NOT EXISTS "InventoryReservation_variantId_status_idx" ON "InventoryReservation" ("variantId", "status");

CREATE TABLE IF NOT EXISTS "OrderEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
  "type" VARCHAR(80) NOT NULL,
  "message" TEXT,
  "data" JSONB NOT NULL DEFAULT '{}',
  "actorId" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "OrderEvent_orderId_createdAt_idx" ON "OrderEvent" ("orderId", "createdAt");

CREATE TABLE IF NOT EXISTS "OrderNotification" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
  "kind" VARCHAR(40) NOT NULL,
  "toEmail" VARCHAR(254) NOT NULL,
  "subject" VARCHAR(250) NOT NULL,
  "text" TEXT NOT NULL,
  "html" TEXT NOT NULL,
  "deliveryStatus" VARCHAR(16) NOT NULL DEFAULT 'QUEUED'
    CHECK ("deliveryStatus" IN ('QUEUED','SENDING','SENT','FAILED','BLOCKED')),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "firstAttemptAt" TIMESTAMPTZ(3),
  "lockedUntil" TIMESTAMPTZ(3),
  "lockToken" VARCHAR(36),
  "providerEmailId" TEXT,
  "lastError" VARCHAR(300),
  "sentAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderNotification_orderId_kind_key" UNIQUE ("orderId", "kind")
);
CREATE UNIQUE INDEX IF NOT EXISTS "OrderNotification_providerEmailId_key" ON "OrderNotification" ("providerEmailId");
CREATE INDEX IF NOT EXISTS "OrderNotification_deliveryStatus_nextAttemptAt_idx" ON "OrderNotification" ("deliveryStatus", "nextAttemptAt");

CREATE TABLE IF NOT EXISTS "PaymentWebhookEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "providerEventId" TEXT NOT NULL,
  "eventType" VARCHAR(100) NOT NULL,
  "orderId" TEXT REFERENCES "Order"("id") ON DELETE SET NULL,
  "paymentId" TEXT,
  "payloadHash" VARCHAR(128) NOT NULL,
  "occurredAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentWebhookEvent_providerEventId_key" UNIQUE ("providerEventId")
);
CREATE INDEX IF NOT EXISTS "PaymentWebhookEvent_orderId_createdAt_idx" ON "PaymentWebhookEvent" ("orderId", "createdAt");
CREATE INDEX IF NOT EXISTS "PaymentWebhookEvent_paymentId_idx" ON "PaymentWebhookEvent" ("paymentId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ProductVariant_reservedStock_check'
  ) THEN
    ALTER TABLE "ProductVariant"
      ADD CONSTRAINT "ProductVariant_reservedStock_check"
      CHECK ("reservedStock" >= 0 AND "reservedStock" <= "stock") NOT VALID;
  END IF;
END $$;

COMMIT;
