import { getSupportTicket, retrySupportMessage } from '@/lib/support-store';
import { processSupportOutbox } from '@/lib/support-outbox';
import { readSupportJson, supportAdmin, supportApiError, supportJson } from '@/lib/support-http';
import { SupportError, validateSupportId } from '@/lib/support-validation';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await supportAdmin(request, true);
    const id = validateSupportId((await context.params).id);
    const body = await readSupportJson(request);
    if (typeof body.messageId !== 'string') throw new SupportError(400, 'Choose a message to retry.');
    await retrySupportMessage(id, validateSupportId(body.messageId));
    try { await processSupportOutbox({ ticketId: id, limit: 3, budgetMs: 15_000 }); } catch { /* keep the durable retry job */ }
    return supportJson({ ticket: await getSupportTicket(id) });
  } catch (error) { return supportApiError(error); }
}
