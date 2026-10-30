import { processSupportOutbox } from '@/lib/support-outbox';
import { assertSupportProcessorSecret } from '@/lib/support-http';
import { createBackgroundJobsHandler } from '@/lib/background-jobs';
import { processOrderOutbox } from '@/lib/order-notifications';
import { releaseExpiredReservations } from '@/lib/order-store';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Protected scheduler endpoint. It does three bounded, idempotent jobs:
 * release expired checkout holds, retry transactional order emails, and retry
 * support emails. It is intentionally not publicly callable.
 */
export const GET = createBackgroundJobsHandler({
  authorize: assertSupportProcessorSecret,
  reservations: releaseExpiredReservations,
  orders: processOrderOutbox,
  support: processSupportOutbox,
});

export const POST = GET;
