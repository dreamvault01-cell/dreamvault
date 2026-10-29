import { processSupportOutbox } from '@/lib/support-outbox';
import { assertSupportProcessorSecret, supportApiError, supportJson } from '@/lib/support-http';
import { processOrderOutbox } from '@/lib/order-notifications';
import { releaseExpiredReservations } from '@/lib/order-store';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Protected scheduler endpoint. It does three bounded, idempotent jobs:
 * release expired checkout holds, retry transactional order emails, and retry
 * support emails. It is intentionally not publicly callable.
 */
export async function GET(request: Request) {
  try {
    assertSupportProcessorSecret(request);
    const reservations = await releaseExpiredReservations({ limit: 100 });
    const orders = await processOrderOutbox({ limit: 8, budgetMs: 15_000 });
    const support = await processSupportOutbox({ limit: 8, budgetMs: 20_000 });
    return supportJson({ reservations, orders, support });
  } catch (error) {
    return supportApiError(error);
  }
}

export const POST = GET;
