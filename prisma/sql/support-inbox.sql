-- Additive, repeatable support-inbox setup. No resets, drops or changes to store data.
BEGIN;

CREATE TABLE IF NOT EXISTS "ContactMessage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" VARCHAR(100) NOT NULL,
  "email" VARCHAR(254) NOT NULL,
  "subject" VARCHAR(150) NOT NULL,
  "message" TEXT NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'NEW',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContactMessage_name_length" CHECK (char_length("name") BETWEEN 2 AND 100),
  CONSTRAINT "ContactMessage_subject_length" CHECK (char_length("subject") BETWEEN 3 AND 150),
  CONSTRAINT "ContactMessage_message_length" CHECK (char_length("message") BETWEEN 10 AND 5000)
);

ALTER TABLE "ContactMessage" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ContactMessage" ADD COLUMN IF NOT EXISTS "lastMessageAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ContactMessage" ADD COLUMN IF NOT EXISTS "lastInboundAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ContactMessage" ADD COLUMN IF NOT EXISTS "lastReadAt" TIMESTAMPTZ(3);
ALTER TABLE "ContactMessage" ADD COLUMN IF NOT EXISTS "replyToken" VARCHAR(48);
ALTER TABLE "ContactMessage" ADD COLUMN IF NOT EXISTS "source" VARCHAR(10) NOT NULL DEFAULT 'FORM';

CREATE UNIQUE INDEX IF NOT EXISTS "ContactMessage_replyToken_key" ON "ContactMessage"("replyToken");
CREATE INDEX IF NOT EXISTS "ContactMessage_email_createdAt_idx" ON "ContactMessage"("email", "createdAt");
CREATE INDEX IF NOT EXISTS "ContactMessage_status_createdAt_idx" ON "ContactMessage"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "ContactMessage_lastMessageAt_idx" ON "ContactMessage"("lastMessageAt");

CREATE TABLE IF NOT EXISTS "SupportMessage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ticketId" TEXT NOT NULL REFERENCES "ContactMessage"("id") ON DELETE CASCADE,
  "direction" VARCHAR(10) NOT NULL CHECK ("direction" IN ('INBOUND','OUTBOUND','NOTE')),
  "kind" VARCHAR(20) NOT NULL CHECK ("kind" IN ('CUSTOMER','REPLY','ACKNOWLEDGEMENT','NOTIFICATION','NOTE')),
  "body" TEXT NOT NULL CHECK (char_length("body") <= 20000),
  "fromEmail" VARCHAR(254),
  "fromName" VARCHAR(100),
  "toEmail" VARCHAR(254),
  "replyToEmail" VARCHAR(254),
  "subject" VARCHAR(200) NOT NULL,
  "authorId" TEXT,
  "attachments" JSONB NOT NULL DEFAULT '[]',
  "deliveryStatus" VARCHAR(16) NOT NULL DEFAULT 'RECEIVED'
    CHECK ("deliveryStatus" IN ('RECEIVED','QUEUED','SENDING','SENT','DELIVERED','FAILED','BLOCKED','BOUNCED')),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "firstAttemptAt" TIMESTAMPTZ(3),
  "lockedUntil" TIMESTAMPTZ(3),
  "lockToken" VARCHAR(36),
  "providerEmailId" TEXT,
  "internetMessageId" VARCHAR(998),
  "inReplyTo" VARCHAR(998),
  "sentAt" TIMESTAMPTZ(3),
  "providerEventAt" TIMESTAMPTZ(3),
  "lastError" VARCHAR(300),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "SupportMessage_providerEmailId_key" ON "SupportMessage"("providerEmailId");
CREATE INDEX IF NOT EXISTS "SupportMessage_ticketId_createdAt_idx" ON "SupportMessage"("ticketId","createdAt");
CREATE INDEX IF NOT EXISTS "SupportMessage_deliveryStatus_nextAttemptAt_idx" ON "SupportMessage"("deliveryStatus","nextAttemptAt");

CREATE TABLE IF NOT EXISTS "SupportWebhookEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "eventType" VARCHAR(80) NOT NULL,
  "providerEmailId" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "SupportWebhookEvent_createdAt_idx" ON "SupportWebhookEvent"("createdAt");

-- Keep existing contact requests visible, without sending retroactive emails.
INSERT INTO "SupportMessage" ("id","ticketId","direction","kind","body","fromEmail","subject","deliveryStatus","createdAt")
SELECT "id","id",'INBOUND','CUSTOMER',"message","email","subject",'RECEIVED',"createdAt"
FROM "ContactMessage"
ON CONFLICT ("id") DO NOTHING;

-- The previous contact-only system used READ; map it to the inbox status vocabulary.
UPDATE "ContactMessage" SET "status"='IN_PROGRESS', "lastReadAt"=COALESCE("lastReadAt",CURRENT_TIMESTAMP)
WHERE "status"='READ';

-- Preserve the contact form's database validation when upgrading an existing table.
-- NOT VALID leaves historic data untouched while enforcing every new or updated row.
LOCK TABLE "ContactMessage" IN ACCESS EXCLUSIVE MODE;
DO $contact_length_constraints$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = '"ContactMessage"'::regclass
      AND conname = 'ContactMessage_name_length'
  ) THEN
    ALTER TABLE "ContactMessage"
      ADD CONSTRAINT "ContactMessage_name_length"
      CHECK (char_length("name") BETWEEN 2 AND 100) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = '"ContactMessage"'::regclass
      AND conname = 'ContactMessage_subject_length'
  ) THEN
    ALTER TABLE "ContactMessage"
      ADD CONSTRAINT "ContactMessage_subject_length"
      CHECK (char_length("subject") BETWEEN 3 AND 150) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = '"ContactMessage"'::regclass
      AND conname = 'ContactMessage_message_length'
  ) THEN
    ALTER TABLE "ContactMessage"
      ADD CONSTRAINT "ContactMessage_message_length"
      CHECK (char_length("message") BETWEEN 10 AND 5000) NOT VALID;
  END IF;
END
$contact_length_constraints$;

COMMIT;
