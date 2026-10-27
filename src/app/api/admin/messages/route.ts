import { listSupportTickets } from '@/lib/support-store';
import { supportAdmin, supportApiError, supportJson } from '@/lib/support-http';
import { SupportError, validateSupportStatus } from '@/lib/support-validation';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    await supportAdmin(request);
    const params = new URL(request.url).searchParams;
    const page = params.get('page') || '1';
    if (!/^\d{1,6}$/.test(page) || Number(page) < 1) throw new SupportError(400, 'Please choose a valid page number.');
    const status = params.get('status');
    return supportJson(await listSupportTickets({ q: params.get('q') ?? '', page: Number(page),
      status: status && status !== 'ALL' ? validateSupportStatus(status) : undefined }));
  } catch (error) { return supportApiError(error); }
}
