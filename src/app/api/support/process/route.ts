import { processSupportOutbox } from '@/lib/support-outbox';
import { assertSupportProcessorSecret, supportApiError, supportJson } from '@/lib/support-http';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    assertSupportProcessorSecret(request);
    return supportJson(await processSupportOutbox({ limit: 10, budgetMs: 25_000 }));
  } catch (error) { return supportApiError(error); }
}

export const POST = GET;
