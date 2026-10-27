import { addSupportStaffMessage, getSupportTicket } from '@/lib/support-store';
import { readSupportJson, supportAdmin, supportApiError, supportJson } from '@/lib/support-http';
import { validateSupportBody, validateSupportId } from '@/lib/support-validation';

export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await supportAdmin(request, true);
    const id = validateSupportId((await context.params).id);
    const input = validateSupportBody(await readSupportJson(request));
    await addSupportStaffMessage(id, input, admin.id, true);
    return supportJson({ ticket: await getSupportTicket(id) }, 201);
  } catch (error) { return supportApiError(error); }
}
