-- Additive setup for the contact form. Does not alter existing store tables.
CREATE TABLE IF NOT EXISTS "ContactMessage" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "email" VARCHAR(254) NOT NULL,
  "subject" VARCHAR(150) NOT NULL,
  "message" TEXT NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'NEW',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ContactMessage_name_length" CHECK (char_length("name") BETWEEN 2 AND 100),
  CONSTRAINT "ContactMessage_subject_length" CHECK (char_length("subject") BETWEEN 3 AND 150),
  CONSTRAINT "ContactMessage_message_length" CHECK (char_length("message") BETWEEN 10 AND 5000)
);

CREATE INDEX IF NOT EXISTS "ContactMessage_email_createdAt_idx"
  ON "ContactMessage"("email", "createdAt");
CREATE INDEX IF NOT EXISTS "ContactMessage_status_createdAt_idx"
  ON "ContactMessage"("status", "createdAt");
