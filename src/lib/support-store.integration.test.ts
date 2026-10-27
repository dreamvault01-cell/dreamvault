import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prisma from './prisma';
import { getSupportConfig } from './support-config';
import { saveContactMessage, ContactConflictError, ContactRateLimitError } from './contact-store';
import { addSupportStaffMessage, beginSupportDelivery, claimSupportMessage, finishSupportDelivery, getSupportTicket, initializeSupportContact, listSupportTickets, retrySupportMessage, storeSupportDeliveryEvent, storeSupportIncoming, updateSupportTicket } from './support-store';
import { processSupportOutbox } from './support-outbox';
import type { SupportIncomingInput, SupportTicketRow } from './support-store';

// Explicit opt-in. Every business record is created within a transaction that is
// rolled back, including on assertion failures. No real provider calls are made.
test('PostgreSQL support lifecycle, idempotency, safe sending and reply threading', { skip: process.env.SUPPORT_DATABASE_TESTS !== '1' }, async () => {
  const rollback = new Error('ROLLBACK_SUPPORT_TEST');
  const config = getSupportConfig({
    SUPPORT_APP_URL: 'https://dream-vault-rho.vercel.app',
    RESEND_API_KEY: 're_integration_test_private_not_a_real_key',
    RESEND_WEBHOOK_SECRET: 'whsec_aW50ZWdyYXRpb24tdGVzdC1zZWNyZXQ=',
  });
  assert(config.configured && config.webhookConfigured);
  try {
    await prisma.$transaction(async (tx) => {
      const ticketId = randomUUID();
      const data = { submissionId: ticketId, name: 'Support integration test', email: config.testRecipient, subject: 'Rollback-only support test', message: 'Please help with this test print. No real mail should be sent.' };
      await tx.$executeRaw`INSERT INTO "ContactMessage" ("id","name","email","subject","message") VALUES (${ticketId},${data.name},${data.email},${data.subject},${data.message})`;
      await initializeSupportContact(tx, data, config);

      let detail = await getSupportTicket(ticketId, tx);
      assert.equal(detail.status, 'NEW');
      assert.equal(detail.unread, true);
      assert.equal(detail.messages[0].id, ticketId);
      assert.equal(detail.messages.length, 2); // customer + receipt; staff notification is private
      assert.equal(detail.messages[1].kind, 'ACKNOWLEDGEMENT');
      assert.equal(detail.messages[1].deliveryStatus, 'QUEUED');
      assert(!JSON.stringify(detail).includes('replyToken'));

      const jobs = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "SupportMessage" WHERE "ticketId"=${ticketId}`;
      assert.equal(jobs.length, 3);
      assert.equal(await saveContactMessage(data, tx), ticketId);
      const duplicateJobs = await tx.$queryRaw<{ count: number }[]>`SELECT COUNT(*)::integer AS count FROM "SupportMessage" WHERE "ticketId"=${ticketId}`;
      assert.equal(duplicateJobs[0].count, 3, 'duplicate form retries must not send another receipt/alert');
      await assert.rejects(saveContactMessage({ ...data, message: 'Different message with the same submission reference.' }, tx), ContactConflictError);

      const filtered = await listSupportTickets({ q: ticketId }, tx);
      assert.equal(filtered.tickets.length, 1);
      assert.equal(filtered.tickets[0].id, ticketId);
      await updateSupportTicket(ticketId, { status: 'IN_PROGRESS', markRead: true }, tx);
      assert.equal((await getSupportTicket(ticketId, tx)).unread, false);

      const note = { submissionId: randomUUID(), body: 'Internal-only test note. Never email this.' };
      await addSupportStaffMessage(ticketId, note, 'integration-admin', true, tx, config);
      await addSupportStaffMessage(ticketId, note, 'integration-admin', true, tx, config);
      assert.equal((await getSupportTicket(ticketId, tx)).messages.filter((message) => message.kind === 'NOTE').length, 1);

      const reply = { submissionId: randomUUID(), body: 'We are reviewing your test print. Please reply with more details.' };
      await addSupportStaffMessage(ticketId, reply, 'integration-admin', false, tx, config);
      await addSupportStaffMessage(ticketId, reply, 'integration-admin', false, tx, config);
      assert.equal((await getSupportTicket(ticketId, tx)).replyCount, 1);

      const providerIds = new Map<string, string>();
      const sentMessages: { id: string; to: string; replyTo: string }[] = [];
      const processed = await processSupportOutbox({ ticketId, limit: 5 }, {
        config,
        claim: (id) => claimSupportMessage(id, tx),
        begin: (message, address, settings) => beginSupportDelivery(message, address, settings, tx),
        finish: (message, result) => finishSupportDelivery(message, result, tx),
        send: async (input) => {
          assert.equal(input.to, config.testRecipient);
          assert(input.replyTo.endsWith(`@${config.inboundDomain}`));
          sentMessages.push({ id: input.id, to: input.to, replyTo: input.replyTo });
          const id = randomUUID();
          providerIds.set(input.id, id);
          return { id };
        },
      });
      assert.equal(processed.sent, 3);
      assert.equal(sentMessages.length, 3);
      detail = await getSupportTicket(ticketId, tx);
      assert.equal(detail.status, 'WAITING_ON_CUSTOMER');
      assert.equal(detail.messages.find((message) => message.id === reply.submissionId)?.deliveryStatus, 'SENT');
      assert.equal((await processSupportOutbox({ ticketId }, { config, claim: (id) => claimSupportMessage(id, tx) })).processed, 0);

      const tokenRow = await tx.$queryRaw<SupportTicketRow[]>`SELECT * FROM "ContactMessage" WHERE "id"=${ticketId}`;
      assert.match(tokenRow[0].replyToken!, /^[a-f0-9]{48}$/);
      const incoming: SupportIncomingInput = {
        eventId: `evt_${randomUUID()}`, emailId: randomUUID(), from: config.testRecipient,
        to: [`r+${tokenRow[0].replyToken}@${config.inboundDomain}`], subject: 'Re: support test',
        body: 'Here are the extra details for the same request.', messageId: `<${randomUUID()}@gmail.com>`,
        replyToken: tokenRow[0].replyToken, attachments: [],
      };
      // Mark read immediately before the new incoming message. Mutation timestamps
      // must use wall-clock time, not the transaction's fixed CURRENT_TIMESTAMP,
      // so a message arriving after this read cannot accidentally remain read.
      await updateSupportTicket(ticketId, { markRead: true }, tx);
      assert.equal((await getSupportTicket(ticketId, tx)).unread, false);
      assert.equal((await storeSupportIncoming(incoming, tx)).ticketId, ticketId);
      assert.equal((await storeSupportIncoming(incoming, tx)).duplicate, true);
      assert.equal((await storeSupportIncoming({ ...incoming, eventId: `evt_${randomUUID()}` }, tx)).duplicate, true);
      detail = await getSupportTicket(ticketId, tx);
      assert.equal(detail.status, 'IN_PROGRESS');
      assert.equal(detail.unread, true);
      assert.equal(detail.messages.filter((message) => message.body === incoming.body).length, 1);

      const forged = { ...incoming, eventId: `evt_${randomUUID()}`, emailId: randomUUID(), from: 'not-the-customer@example.com' };
      assert.equal((await storeSupportIncoming(forged, tx)).ticketId, null);
      assert.equal((await getSupportTicket(ticketId, tx)).messages.filter((message) => message.body === incoming.body).length, 1);

      await updateSupportTicket(ticketId, { status: 'RESOLVED' }, tx);
      await storeSupportIncoming({ ...incoming, eventId: `evt_${randomUUID()}`, emailId: randomUUID(), body: 'One last question: reopen my request.' }, tx);
      assert.equal((await getSupportTicket(ticketId, tx)).status, 'IN_PROGRESS');

      const providerId = providerIds.get(reply.submissionId)!;
      const deliveredAt = new Date();
      assert.equal(await storeSupportDeliveryEvent({ eventId: `evt_${randomUUID()}`, type: 'email.delivered', emailId: providerId, status: 'DELIVERED', occurredAt: deliveredAt }, tx), true);
      await storeSupportDeliveryEvent({ eventId: `evt_${randomUUID()}`, type: 'email.sent', emailId: providerId, status: 'SENT', occurredAt: new Date(deliveredAt.getTime() - 1000) }, tx);
      detail = await getSupportTicket(ticketId, tx);
      assert.equal(detail.messages.find((message) => message.id === reply.submissionId)?.deliveryStatus, 'DELIVERED');
      assert.equal(await storeSupportDeliveryEvent({ eventId: `evt_${randomUUID()}`, type: 'email.sent', emailId: randomUUID(), status: 'SENT', occurredAt: deliveredAt }, tx), false, 'unknown provider IDs must remain retryable');

      const newDirect = await storeSupportIncoming({ ...incoming, eventId: `evt_${randomUUID()}`, emailId: randomUUID(), replyToken: null, to: [config.supportEmail], body: 'A new email enquiry, not a reply.' }, tx);
      assert(newDirect.ticketId && newDirect.ticketId !== ticketId);
      const direct = await getSupportTicket(newDirect.ticketId, tx);
      assert.equal(direct.source, 'EMAIL');
      assert.equal(direct.messages.length, 1, 'direct incoming email must not duplicate its initial body or auto-reply');
      await updateSupportTicket(newDirect.ticketId, { markRead: true }, tx);
      assert.equal((await getSupportTicket(newDirect.ticketId, tx)).messages.length, 1);

      const otherId = randomUUID();
      const other = { ...data, submissionId: otherId, email: `support-${randomUUID()}@example.com` };
      await tx.$executeRaw`INSERT INTO "ContactMessage" ("id","name","email","subject","message") VALUES (${otherId},${other.name},${other.email},${other.subject},${other.message})`;
      await initializeSupportContact(tx, other, config);
      const blocked = await getSupportTicket(otherId, tx);
      assert.equal(blocked.messages.find((message) => message.kind === 'ACKNOWLEDGEMENT')?.deliveryStatus, 'BLOCKED');
      await assert.rejects(addSupportStaffMessage(otherId, { submissionId: randomUUID(), body: 'Must not send to this recipient.' }, 'integration-admin', false, tx, config), /Development mode/);
      const blockedReceipt = blocked.messages.find((message) => message.kind === 'ACKNOWLEDGEMENT')!;
      await assert.rejects(retrySupportMessage(otherId, blockedReceipt.id, tx, config), /Development mode/);

      // Rate-limit checks are per customer, independent from existing real messages.
      const rateEmail = `support-${randomUUID()}@example.com`;
      for (let index = 0; index < 3; index++) await saveContactMessage({ ...data, submissionId: randomUUID(), email: rateEmail }, tx);
      await assert.rejects(saveContactMessage({ ...data, submissionId: randomUUID(), email: rateEmail }, tx), ContactRateLimitError);
      throw rollback;
    }, { timeout: 120_000, maxWait: 15_000 });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    await prisma.$disconnect();
  }
});
