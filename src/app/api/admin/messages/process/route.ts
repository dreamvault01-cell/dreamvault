import { processSupportOutbox } from '@/lib/support-outbox';
import { readSupportJson, supportAdmin, supportApiError, supportJson } from '@/lib/support-http';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    await supportAdmin(request, true);
    await readSupportJson(request);
    return supportJson(await processSupportOutbox({ limit: 10, budgetMs: 25_000 }));
  } catch (error) { return supportApiError(error); }
}
