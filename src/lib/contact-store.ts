import type { ContactSubmission } from './contact';
import { initializeSupportContact, inSupportTransaction, type SupportDatabase } from './support-store';

export class ContactRateLimitError extends Error {}
export class ContactConflictError extends Error {}

interface StoredMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
}

export async function saveContactMessage(data: ContactSubmission, db?: SupportDatabase): Promise<string> {
  // Parameterized SQL keeps this usable with the running Prisma client on Windows,
  // where regenerating the client can fail while its engine DLL is in use.
  return inSupportTransaction(async (tx) => {
    // Serialize submissions per email so concurrent requests cannot bypass the limit.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${data.email}))`;

    const existing = await tx.$queryRaw<StoredMessage[]>`
      SELECT "id", "name", "email", "subject", "message"
      FROM "ContactMessage" WHERE "id" = ${data.submissionId}
    `;
    if (existing[0]) {
      const previous = existing[0];
      if (previous.name !== data.name || previous.email !== data.email || previous.subject !== data.subject || previous.message !== data.message) {
        throw new ContactConflictError('This reference was already used for a different message. Please refresh and try again.');
      }
      return previous.id;
    }

    const since = new Date(Date.now() - 10 * 60 * 1000);
    const counts = await tx.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::integer AS "count" FROM "ContactMessage"
      WHERE "email" = ${data.email} AND "createdAt" > ${since}
    `;
    if (counts[0].count >= 3) {
      throw new ContactRateLimitError('You have sent several messages recently. Please wait 10 minutes before sending another.');
    }

    await tx.$executeRaw`
      INSERT INTO "ContactMessage" ("id", "name", "email", "subject", "message")
      VALUES (${data.submissionId}, ${data.name}, ${data.email}, ${data.subject}, ${data.message})
    `;
    await initializeSupportContact(tx, data);
    return data.submissionId;
  }, db);
}
