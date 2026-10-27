import { addSupportStaffMessage, getSupportTicket } from '@/lib/support-store';
import { processSupportOutbox } from '@/lib/support-outbox';
import { readSupportJson, supportAdmin, supportApiError, supportJson } from '@/lib/support-http';
import { validateSupportBody, validateSupportId } from '@/lib/support-validation';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await supportAdmin(request, true);
    const id = validateSupportId((await context.params).id);
    const message = validateSupportBody(await readSupportJson(request));
    await addSupportStaffMessage(id, message, admin.id);
    try { await processSupportOutbox({ ticketId: id, limit: 3, budgetMs: 15_000 }); } catch { /* saved; visible queue can be retried */ }
    return supportJson({ ticket: await getSupportTicket(id) }, 201);
  } catch (error) { return supportApiError(error); }
}
