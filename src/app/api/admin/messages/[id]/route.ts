import { getSupportTicket, updateSupportTicket } from '@/lib/support-store';
import { readSupportJson, supportAdmin, supportApiError, supportJson } from '@/lib/support-http';
import { SupportError, validateSupportId, validateSupportStatus } from '@/lib/support-validation';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    await supportAdmin(request);
    const id = validateSupportId((await context.params).id);
    return supportJson({ ticket: await getSupportTicket(id) });
  } catch (error) { return supportApiError(error); }
}

export async function PATCH(request: Request, context: Context) {
  try {
    await supportAdmin(request, true);
    const id = validateSupportId((await context.params).id);
    const body = await readSupportJson(request);
    if (body.status === undefined && body.markRead !== true) throw new SupportError(400, 'Choose a status or mark the conversation as read.');
    if (body.markRead !== undefined && body.markRead !== true) throw new SupportError(400, 'The read flag must be true.');
    await updateSupportTicket(id, { status: body.status === undefined ? undefined : validateSupportStatus(body.status), markRead: body.markRead === true });
    return supportJson({ ticket: await getSupportTicket(id) });
  } catch (error) { return supportApiError(error); }
}
