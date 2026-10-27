import 'server-only';
import { randomBytes, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import prisma from './prisma';
import { getSupportConfig, type SupportConfig } from './support-config';
import type { ContactSubmission } from './contact';
import type { SupportAttachment, SupportDeliveryStatus, SupportDirection, SupportInboxResponse, SupportMessageKind, SupportMessageView, SupportSettings, SupportStatus, SupportTicketDetail, SupportTicketSummary } from './support-types';
import { SUPPORT_STATUSES } from './support-types';
import { canAdvanceSupportDelivery, SupportError, supportEmailSubject } from './support-validation';

type DB = Prisma.TransactionClient;
export type SupportDatabase = DB | typeof prisma;
export async function inSupportTransaction<T>(work: (tx: DB) => Promise<T>, db: SupportDatabase = prisma): Promise<T> {
  return '$transaction' in db ? db.$transaction(work, { timeout: 15_000 }) : work(db);
}
export interface SupportTicketRow {
  id: string; name: string; email: string; subject: string; message: string;
  status: SupportStatus; source: 'FORM' | 'EMAIL'; replyToken: string | null;
  createdAt: Date; updatedAt: Date; lastMessageAt: Date; lastInboundAt: Date; lastReadAt: Date | null;
}
interface SummaryRow extends SupportTicketRow { unread: boolean; preview: string; replyCount: number; hasDeliveryIssue: boolean }
export interface SupportMessageRow {
  id: string; ticketId: string; direction: SupportDirection; kind: SupportMessageKind; body: string;
  fromEmail: string | null; fromName: string | null; toEmail: string | null; replyToEmail: string | null;
  subject: string; authorId: string | null; attachments: SupportAttachment[];
  deliveryStatus: SupportDeliveryStatus; attempts: number; nextAttemptAt: Date; firstAttemptAt: Date | null;
  lockedUntil: Date | null; lockToken: string | null; providerEmailId: string | null;
  internetMessageId: string | null; inReplyTo: string | null; sentAt: Date | null; providerEventAt: Date | null;
  lastError: string | null; createdAt: Date;
}

const SUMMARY = Prisma.sql`t.*,
  (t."lastReadAt" IS NULL OR t."lastInboundAt" > t."lastReadAt") AS "unread",
  COALESCE((SELECT m."body" FROM "SupportMessage" m WHERE m."ticketId"=t."id" AND m."kind" IN ('CUSTOMER','REPLY','NOTE') ORDER BY m."createdAt" DESC,m."id" DESC LIMIT 1),t."message") AS "preview",
  (SELECT COUNT(*)::integer FROM "SupportMessage" m WHERE m."ticketId"=t."id" AND m."kind"='REPLY') AS "replyCount",
  EXISTS(SELECT 1 FROM "SupportMessage" m WHERE m."ticketId"=t."id" AND m."direction"='OUTBOUND' AND m."deliveryStatus" IN ('FAILED','BLOCKED','BOUNCED')) AS "hasDeliveryIssue"`;

function summary(row: SummaryRow): SupportTicketSummary {
  return {
    id: row.id, name: row.name, email: row.email, subject: row.subject, status: row.status,
    source: row.source, unread: row.unread, preview: row.preview.slice(0, 240), replyCount: row.replyCount,
    hasDeliveryIssue: row.hasDeliveryIssue, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), lastMessageAt: row.lastMessageAt.toISOString(),
  };
}

export function getSupportSettings(config = getSupportConfig()): SupportSettings {
  return {
    mode: config.mode, fromEmail: config.fromEmail, supportEmail: config.supportEmail,
    inboundDomain: config.inboundDomain, testRecipient: config.testRecipient, notificationEmail: config.notificationEmail,
    configured: config.configured && config.webhookConfigured, webhookConfigured: config.webhookConfigured, issues: [...config.issues],
  };
}

export function supportDeliveryBlock(to: string, config: SupportConfig): string | null {
  if (config.mode === 'development' && to.toLowerCase() !== config.testRecipient) {
    return 'Development mode only allows the configured test recipient. This message was not sent or redirected.';
  }
  if (!config.configured || !config.webhookConfigured) return 'Connect the Resend API key and receiving webhook before sending support emails.';
  return null;
}

async function lockTicket(tx: DB, id: string): Promise<SupportTicketRow> {
  const rows = await tx.$queryRaw<SupportTicketRow[]>`SELECT * FROM "ContactMessage" WHERE "id"=${id} FOR UPDATE`;
  if (!rows[0]) throw new SupportError(404, 'That conversation was not found.');
  let ticket = rows[0];
  if (!ticket.replyToken) {
    const token = randomBytes(24).toString('hex');
    const updated = await tx.$queryRaw<SupportTicketRow[]>`UPDATE "ContactMessage" SET "replyToken"=${token} WHERE "id"=${id} RETURNING *`;
    ticket = updated[0];
  }
  // Also supports records submitted by the older contact-only deployment after migration.
  await tx.$executeRaw`INSERT INTO "SupportMessage" ("id","ticketId","direction","kind","body","fromEmail","subject","deliveryStatus","createdAt")
    VALUES (${ticket.id},${ticket.id},'INBOUND','CUSTOMER',${ticket.message},${ticket.email},${ticket.subject},'RECEIVED',${ticket.createdAt})
    ON CONFLICT ("id") DO NOTHING`;
  return ticket;
}

export async function insertSupportOutgoing(tx: DB, input: { id?: string; ticketId: string; kind: 'REPLY' | 'ACKNOWLEDGEMENT' | 'NOTIFICATION'; body: string; to: string; subject: string; authorId?: string; inReplyTo?: string | null }, config = getSupportConfig()) {
  const id = input.id ?? randomUUID();
  const blocked = supportDeliveryBlock(input.to, config);
  await tx.$executeRaw`INSERT INTO "SupportMessage" ("id","ticketId","direction","kind","body","toEmail","subject","authorId","deliveryStatus","lastError","inReplyTo","createdAt")
    VALUES (${id},${input.ticketId},'OUTBOUND',${input.kind},${input.body},${input.to},${input.subject},${input.authorId ?? null},${blocked ? 'BLOCKED' : 'QUEUED'},${blocked},${input.inReplyTo ?? null},clock_timestamp())`;
  return id;
}

/** Called inside the original contact transaction: ticket + history + outbox commit together. */
export async function initializeSupportContact(tx: DB, data: ContactSubmission, config = getSupportConfig()) {
  await lockTicket(tx, data.submissionId);
  await insertSupportOutgoing(tx, {
    ticketId: data.submissionId, kind: 'ACKNOWLEDGEMENT', to: data.email,
    subject: supportEmailSubject(data.subject, data.submissionId),
    body: `Hello ${data.name},\n\nWe have received your message about “${data.subject}”.\n\nYour reference: ${data.submissionId}\n\nOur team will review your message. You can reply to this email to add more information.\n\nDreamVault Support`,
  }, config);
  if (config.notificationEmail) await insertSupportOutgoing(tx, {
    ticketId: data.submissionId, kind: 'NOTIFICATION', to: config.notificationEmail,
    subject: `New support request [DV-${data.submissionId.slice(0, 8).toUpperCase()}]`,
    // Deliberately omit customer content/PII from development notifications.
    body: `A new support request has been saved.\n\nOpen the protected Messages dashboard to read and respond:\n${config.appUrl}/admin/messages?ticket=${data.submissionId}\n\nReply from the dashboard, not to this notification.\n\nDreamVault Support`,
  }, config);
}

export async function listSupportTickets(input: { q?: string; status?: SupportStatus; page?: number }, db: DB = prisma): Promise<SupportInboxResponse> {
  const page = Math.max(1, Math.min(100000, Math.floor(input.page ?? 1)));
  const pageSize = 20;
  const term = (input.q ?? '').trim().slice(0, 150);
  const pattern = `%${term.replace(/[\\%_]/g, '\\$&')}%`;
  const filter = Prisma.sql`WHERE (${input.status ?? null}::text IS NULL OR t."status"=${input.status ?? null})
    AND (${term}='' OR t."name" ILIKE ${pattern} OR t."email" ILIKE ${pattern} OR t."subject" ILIKE ${pattern} OR t."id" ILIKE ${pattern})`;
  const [rows, totals, statusRows] = await Promise.all([
    db.$queryRaw<SummaryRow[]>(Prisma.sql`SELECT ${SUMMARY} FROM "ContactMessage" t ${filter} ORDER BY t."lastMessageAt" DESC,t."id" DESC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`),
    db.$queryRaw<{ total: number }[]>(Prisma.sql`SELECT COUNT(*)::integer AS total FROM "ContactMessage" t ${filter}`),
    db.$queryRaw<{ status: SupportStatus; count: number }[]>`SELECT "status",COUNT(*)::integer AS count FROM "ContactMessage" GROUP BY "status"`,
  ]);
  const counts = Object.fromEntries(SUPPORT_STATUSES.map((status) => [status, 0])) as Record<SupportStatus, number>;
  for (const row of statusRows) if (row.status in counts) counts[row.status] = row.count;
  return { tickets: rows.map(summary), total: totals[0]?.total ?? 0, page, pageSize, counts, settings: getSupportSettings() };
}

export async function getSupportTicket(id: string, db: DB = prisma): Promise<SupportTicketDetail> {
  const rows = await db.$queryRaw<SummaryRow[]>(Prisma.sql`SELECT ${SUMMARY} FROM "ContactMessage" t WHERE t."id"=${id}`);
  if (!rows[0]) throw new SupportError(404, 'That conversation was not found.');
  const messages = await db.$queryRaw<SupportMessageRow[]>`SELECT * FROM "SupportMessage" WHERE "ticketId"=${id} AND "kind"<>'NOTIFICATION'
    ORDER BY CASE WHEN "id"="ticketId" THEN 0 ELSE 1 END,"createdAt","id"`;
  const mapped: SupportMessageView[] = messages.map((message) => ({
    id: message.id, direction: message.direction, kind: message.kind, body: message.body,
    fromEmail: message.fromEmail, toEmail: message.toEmail, createdAt: message.createdAt.toISOString(),
    deliveryStatus: message.deliveryStatus, attempts: message.attempts, lastError: message.lastError,
    attachments: Array.isArray(message.attachments) ? message.attachments : [],
  }));
  if (!mapped.some((message) => message.id === id)) mapped.unshift({
    id, direction: 'INBOUND', kind: 'CUSTOMER', body: rows[0].message, fromEmail: rows[0].email,
    toEmail: null, createdAt: rows[0].createdAt.toISOString(), deliveryStatus: 'RECEIVED', attempts: 0, lastError: null, attachments: [],
  });
  return { ...summary(rows[0]), messages: mapped };
}

export async function updateSupportTicket(id: string, input: { status?: SupportStatus; markRead?: boolean }, db: SupportDatabase = prisma) {
  await inSupportTransaction(async (tx) => {
    await lockTicket(tx, id);
    await tx.$executeRaw`UPDATE "ContactMessage" SET "status"=COALESCE(${input.status ?? null},"status"),
      "lastReadAt"=CASE WHEN ${input.markRead === true} THEN clock_timestamp() ELSE "lastReadAt" END,
      "updatedAt"=clock_timestamp() WHERE "id"=${id}`;
  }, db);
}

export async function addSupportStaffMessage(ticketId: string, input: { submissionId: string; body: string }, authorId: string, note = false, db: SupportDatabase = prisma, config = getSupportConfig()) {
  return inSupportTransaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'support-message/' + input.submissionId}))`;
    const ticket = await lockTicket(tx, ticketId);
    const existing = await tx.$queryRaw<SupportMessageRow[]>`SELECT * FROM "SupportMessage" WHERE "id"=${input.submissionId}`;
    if (existing[0]) {
      if (existing[0].ticketId !== ticketId || existing[0].body !== input.body || existing[0].authorId !== authorId || existing[0].kind !== (note ? 'NOTE' : 'REPLY')) {
        throw new SupportError(409, 'This submission reference was already used. Start a new reply or note.');
      }
      return input.submissionId;
    }
    if (note) {
      await tx.$executeRaw`INSERT INTO "SupportMessage" ("id","ticketId","direction","kind","body","subject","authorId","deliveryStatus","createdAt")
        VALUES (${input.submissionId},${ticketId},'NOTE','NOTE',${input.body},${ticket.subject},${authorId},'RECEIVED',clock_timestamp())`;
    } else {
      const blocked = supportDeliveryBlock(ticket.email, config);
      if (blocked) throw new SupportError(config.mode === 'development' && ticket.email !== config.testRecipient ? 422 : 503, blocked);
      const headers = await tx.$queryRaw<{ internetMessageId: string | null }[]>`SELECT "internetMessageId" FROM "SupportMessage"
        WHERE "ticketId"=${ticketId} AND "direction"='INBOUND' AND "internetMessageId" IS NOT NULL ORDER BY "createdAt" DESC LIMIT 1`;
      await insertSupportOutgoing(tx, { id: input.submissionId, ticketId, kind: 'REPLY', to: ticket.email,
        body: input.body, subject: supportEmailSubject(ticket.subject, ticket.id), authorId, inReplyTo: headers[0]?.internetMessageId }, config);
    }
    await tx.$executeRaw`UPDATE "ContactMessage" SET "status"=CASE WHEN ${!note} THEN 'IN_PROGRESS' ELSE "status" END,
      "lastMessageAt"=clock_timestamp(),"updatedAt"=clock_timestamp(),"lastReadAt"=clock_timestamp() WHERE "id"=${ticketId}`;
    return input.submissionId;
  }, db);
}

/** Requeue only an explicit staff choice; never create a new provider idempotency key. */
export async function retrySupportMessage(ticketId: string, messageId: string, db: SupportDatabase = prisma, config = getSupportConfig()) {
  await inSupportTransaction(async (tx) => {
    await lockTicket(tx, ticketId);
    const rows = await tx.$queryRaw<SupportMessageRow[]>`SELECT * FROM "SupportMessage" WHERE "id"=${messageId} AND "ticketId"=${ticketId} FOR UPDATE`;
    const message = rows[0];
    if (!message || message.direction !== 'OUTBOUND') throw new SupportError(404, 'That outgoing message was not found.');
    if (!['FAILED', 'BLOCKED'].includes(message.deliveryStatus) || message.providerEmailId) throw new SupportError(409, 'This message cannot be retried. Check its existing delivery status.');
    if (message.firstAttemptAt && Date.now() - message.firstAttemptAt.getTime() > 23 * 60 * 60 * 1000) {
      throw new SupportError(409, 'The safe retry window has expired. Check Resend for delivery before writing a new reply.');
    }
    const blocked = supportDeliveryBlock(message.toEmail ?? '', config);
    if (blocked) throw new SupportError(422, blocked);
    await tx.$executeRaw`UPDATE "SupportMessage" SET "deliveryStatus"='QUEUED',"lastError"=NULL,"nextAttemptAt"=clock_timestamp(),
      "lockedUntil"=NULL,"lockToken"=NULL WHERE "id"=${messageId}`;
  }, db);
}

export interface ClaimedSupportMessage extends SupportMessageRow { replyToken: string; customerEmail: string }
export async function claimSupportMessage(ticketId?: string, db: SupportDatabase = prisma): Promise<ClaimedSupportMessage | null> {
  return inSupportTransaction(async (tx) => {
    const rows = await tx.$queryRaw<SupportMessageRow[]>(Prisma.sql`SELECT m.* FROM "SupportMessage" m
      WHERE m."direction"='OUTBOUND' AND (${ticketId ?? null}::text IS NULL OR m."ticketId"=${ticketId ?? null})
      AND ((m."deliveryStatus"='QUEUED' AND m."nextAttemptAt"<=CURRENT_TIMESTAMP)
        OR (m."deliveryStatus"='SENDING' AND m."lockedUntil"<CURRENT_TIMESTAMP))
      ORDER BY m."nextAttemptAt",m."createdAt",m."id" FOR UPDATE OF m SKIP LOCKED LIMIT 1`);
    if (!rows[0]) return null;
    const message = rows[0];
    // Outbox rows are locked independently of tickets. Do not invert the staff
    // mutation lock order (ticket -> message), which could deadlock with retries.
    const tickets = await tx.$queryRaw<SupportTicketRow[]>`SELECT * FROM "ContactMessage" WHERE "id"=${message.ticketId}`;
    const ticket = tickets[0];
    if (!ticket?.replyToken) throw new SupportError(503, 'This conversation needs a reply reference before sending.');
    const lockToken = randomUUID();
    const lockedUntil = new Date(Date.now() + 90_000);
    await tx.$executeRaw`UPDATE "SupportMessage" SET "deliveryStatus"='SENDING',"lockedUntil"=${lockedUntil},"lockToken"=${lockToken}
      WHERE "id"=${message.id}`;
    return { ...message, lockToken, lockedUntil, replyToken: ticket.replyToken!, customerEmail: ticket.email };
  }, db);
}

export async function beginSupportDelivery(message: ClaimedSupportMessage, replyTo: string, config: SupportConfig, db: DB = prisma): Promise<ClaimedSupportMessage> {
  const rows = await db.$queryRaw<SupportMessageRow[]>`UPDATE "SupportMessage" SET
    "attempts"="attempts"+1,"firstAttemptAt"=COALESCE("firstAttemptAt",clock_timestamp()),
    "fromEmail"=COALESCE("fromEmail",${config.fromEmail}),"fromName"=COALESCE("fromName",${config.fromName}),
    "replyToEmail"=COALESCE("replyToEmail",${replyTo}),"lastError"=NULL
    WHERE "id"=${message.id} AND "lockToken"=${message.lockToken} RETURNING *`;
  if (!rows[0]) throw new SupportError(409, 'Another worker is handling this message.');
  return { ...message, ...rows[0] };
}

export async function finishSupportDelivery(message: ClaimedSupportMessage, result: { providerId?: string; status: 'SENT' | 'QUEUED' | 'FAILED' | 'BLOCKED'; error?: string; delaySeconds?: number }, db: SupportDatabase = prisma) {
  await inSupportTransaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "ContactMessage" WHERE "id"=${message.ticketId} FOR UPDATE`;
    const nextAttemptAt = new Date(Date.now() + (result.delaySeconds ?? 60) * 1000);
    const rows = await tx.$queryRaw<{ id: string }[]>`UPDATE "SupportMessage" SET
      "deliveryStatus"=${result.status},"providerEmailId"=COALESCE(${result.providerId ?? null},"providerEmailId"),
      "lastError"=${result.error ?? null},"nextAttemptAt"=${nextAttemptAt},"lockedUntil"=NULL,"lockToken"=NULL,
      "sentAt"=CASE WHEN ${result.status === 'SENT'} THEN COALESCE("sentAt",clock_timestamp()) ELSE "sentAt" END
      WHERE "id"=${message.id} AND "lockToken"=${message.lockToken} RETURNING "id"`;
    if (rows.length && result.status === 'SENT' && message.kind === 'REPLY') {
      await tx.$executeRaw`UPDATE "ContactMessage" SET "status"='WAITING_ON_CUSTOMER',"updatedAt"=clock_timestamp()
        WHERE "id"=${message.ticketId} AND "status"='IN_PROGRESS' AND "lastInboundAt"<=${message.createdAt}`;
    }
  }, db);
}

export async function supportWebhookWasProcessed(eventId: string, db: DB = prisma): Promise<boolean> {
  const rows = await db.$queryRaw<{ id: string }[]>`SELECT "id" FROM "SupportWebhookEvent" WHERE "id"=${eventId}`;
  return rows.length > 0;
}

async function registerEvent(tx: DB, eventId: string, type: string, emailId: string): Promise<boolean> {
  const rows = await tx.$queryRaw<{ id: string }[]>`INSERT INTO "SupportWebhookEvent" ("id","eventType","providerEmailId")
    VALUES (${eventId},${type},${emailId}) ON CONFLICT ("id") DO NOTHING RETURNING "id"`;
  return rows.length > 0;
}

export interface SupportIncomingInput {
  eventId: string; emailId: string; from: string; to: string[]; subject: string; body: string;
  messageId: string | null; replyToken: string | null; attachments: SupportAttachment[];
}

export async function storeSupportIncoming(input: SupportIncomingInput, db: SupportDatabase = prisma): Promise<{ ticketId: string | null; duplicate: boolean }> {
  return inSupportTransaction(async (tx) => {
    if (!await registerEvent(tx, input.eventId, 'email.received', input.emailId)) return { ticketId: null, duplicate: true };
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'support-inbound/' + input.emailId}))`;
    const existing = await tx.$queryRaw<{ ticketId: string }[]>`SELECT "ticketId" FROM "SupportMessage" WHERE "providerEmailId"=${input.emailId}`;
    if (existing[0]) return { ticketId: existing[0].ticketId, duplicate: true };
    let ticket: SupportTicketRow;
    const body = input.body.slice(0, 20000) || '[Email received without a text body.]';
    const subject = input.subject.replace(/[\r\n\x00]/g, ' ').trim().slice(0, 150) || 'Support enquiry';
    if (input.replyToken) {
      const tickets = await tx.$queryRaw<SupportTicketRow[]>`SELECT * FROM "ContactMessage" WHERE "replyToken"=${input.replyToken} FOR UPDATE`;
      if (!tickets[0] || tickets[0].email.toLowerCase() !== input.from) return { ticketId: null, duplicate: false };
      ticket = tickets[0];
    } else {
      const id = randomUUID();
      const name = input.from.split('@')[0].slice(0, 100).padEnd(2, '.');
      const originalBody = body.length < 10 ? `Email message: ${body}` : body.slice(0, 5000);
      const tickets = await tx.$queryRaw<SupportTicketRow[]>`INSERT INTO "ContactMessage"
        ("id","name","email","subject","message","replyToken","source","createdAt") VALUES
        (${id},${name},${input.from},${subject.length < 3 ? 'Email: ' + subject : subject},${originalBody},${randomBytes(24).toString('hex')},'EMAIL',clock_timestamp()) RETURNING *`;
      ticket = tickets[0];
    }
    await tx.$executeRaw`INSERT INTO "SupportMessage"
      ("id","ticketId","direction","kind","body","fromEmail","toEmail","subject","providerEmailId","internetMessageId","attachments","deliveryStatus","createdAt")
      VALUES (${input.replyToken ? randomUUID() : ticket.id},${ticket.id},'INBOUND','CUSTOMER',${body},${input.from},${input.to[0] ?? null},${subject},${input.emailId},${input.messageId},${JSON.stringify(input.attachments)}::jsonb,'RECEIVED',clock_timestamp())`;
    await tx.$executeRaw`UPDATE "ContactMessage" SET "status"=CASE WHEN "status"='NEW' THEN 'NEW' ELSE 'IN_PROGRESS' END,
      "updatedAt"=clock_timestamp(),"lastMessageAt"=clock_timestamp(),"lastInboundAt"=clock_timestamp() WHERE "id"=${ticket.id}`;
    return { ticketId: ticket.id, duplicate: false };
  }, db);
}

export async function storeSupportDeliveryEvent(input: { eventId: string; type: string; emailId: string; status: SupportDeliveryStatus; occurredAt: Date }, db: SupportDatabase = prisma): Promise<boolean> {
  return inSupportTransaction(async (tx) => {
    // A delivery event may race the send API response. Return retryable until its provider ID is committed.
    const messages = await tx.$queryRaw<SupportMessageRow[]>`SELECT * FROM "SupportMessage" WHERE "providerEmailId"=${input.emailId} FOR UPDATE`;
    if (!messages[0]) return false;
    if (!await registerEvent(tx, input.eventId, input.type, input.emailId)) return true;
    const message = messages[0];
    if (!canAdvanceSupportDelivery(message.deliveryStatus, input.status, message.providerEventAt, input.occurredAt)) return true;
    const lastError = input.status === 'BOUNCED' ? 'The recipient mail server rejected or suppressed this email. Check the address and Resend delivery details.'
      : input.status === 'FAILED' ? 'The email provider reported a delivery failure. Review the delivery details before retrying.' : null;
    await tx.$executeRaw`UPDATE "SupportMessage" SET "deliveryStatus"=${input.status},"providerEventAt"=${input.occurredAt},"lastError"=${lastError} WHERE "id"=${message.id}`;
    return true;
  }, db);
}
