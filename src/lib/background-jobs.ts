import 'server-only';

import { randomUUID } from 'node:crypto';
import { RESERVATION_FAILURE_CODES, reservationFailureCode, type ReservationCleanupResult } from './order-reservations';
import type { OrderOutboxResult } from './order-notifications';
import type { SupportProcessResult } from './support-outbox';

type JobResult<T> = { status: 'completed' | 'failed'; durationMs: number; result?: T; errorCode?: string };
export interface BackgroundJobsReport {
  ok: boolean;
  runId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  jobs: {
    reservations: JobResult<ReservationCleanupResult>;
    orders: JobResult<OrderOutboxResult>;
    support: JobResult<SupportProcessResult>;
  };
}

interface BackgroundJobDependencies {
  authorize: (request: Request) => void;
  reservations: (options: { limit: number; budgetMs: number }) => Promise<ReservationCleanupResult>;
  orders: (options: { limit: number; budgetMs: number }) => Promise<OrderOutboxResult>;
  support: (options: { limit: number; budgetMs: number }) => Promise<SupportProcessResult>;
  now?: () => number;
  runId?: () => string;
  log?: (report: BackgroundJobsReport) => void;
}

const HEADERS = { 'Cache-Control': 'no-store, private', Vary: 'Authorization' };
const MAIL_COUNTERS = ['processed', 'sent', 'failed', 'blocked', 'queued'] as const;
const RESERVATION_COUNTERS = ['checked', 'released', 'failed', 'skipped'] as const;

function counters<T extends string>(source: Record<T, number>, keys: readonly T[]) {
  const result = {} as Record<T, number>;
  for (const key of keys) {
    if (!Number.isSafeInteger(source[key]) || source[key] < 0) throw new Error('Invalid job counters.');
    result[key] = source[key];
  }
  return result;
}

function errorCode(error: unknown) {
  const code = reservationFailureCode(error);
  return code === 'UNEXPECTED_ERROR' ? 'JOB_FAILED' : code;
}

function reservationCounters(result: ReservationCleanupResult): ReservationCleanupResult {
  const safe: ReservationCleanupResult = { ...counters(result, RESERVATION_COUNTERS), hasMore: result.hasMore === true };
  if (result.failures) {
    const failures: NonNullable<ReservationCleanupResult['failures']> = {};
    for (const code of RESERVATION_FAILURE_CODES) {
      const count = result.failures[code];
      if (count === undefined) continue;
      if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid reservation diagnostics.');
      if (count > 0) failures[code] = count;
    }
    if (Object.values(failures).reduce((sum, count) => sum + count, 0) > safe.failed) throw new Error('Invalid reservation diagnostics.');
    if (Object.keys(failures).length) safe.failures = failures;
  }
  return safe;
}

/** Authenticate before doing any work. Jobs are independently awaited, never
 * fire-and-forget: a slow or broken queue cannot prevent the others starting.
 * Existing per-record leases/transactions make overlapping calls safe. */
export function createBackgroundJobsHandler(dependencies: BackgroundJobDependencies) {
  const now = dependencies.now ?? Date.now;
  return async (request: Request): Promise<Response> => {
    try { dependencies.authorize(request); }
    catch { return Response.json({ error: 'A valid processor secret is required.' }, { status: 401, headers: HEADERS }); }

    const started = now();
    const run = async <T>(work: () => Promise<T>): Promise<JobResult<T>> => {
      const start = now();
      try {
        const result = await work();
        return { status: 'completed', durationMs: Math.max(0, now() - start), result };
      } catch (error) {
        return { status: 'failed', durationMs: Math.max(0, now() - start), errorCode: errorCode(error) };
      }
    };

    const [reservations, orders, support] = await Promise.all([
      run(async () => {
        // Remote DB work needs a meaningful transaction window, still well
        // inside the route's 60-second maximum. Email workers remain parallel.
        return reservationCounters(await dependencies.reservations({ limit: 25, budgetMs: 20_000 }));
      }),
      run(async () => counters(await dependencies.orders({ limit: 5, budgetMs: 12_000 }), MAIL_COUNTERS)),
      run(async () => counters(await dependencies.support({ limit: 5, budgetMs: 12_000 }), MAIL_COUNTERS)),
    ]);
    if (reservations.result && reservations.result.failed > 0) {
      reservations.status = 'failed';
      reservations.errorCode = reservations.result.failures?.INVENTORY_INCONSISTENT
        ? 'RESERVATION_REVIEW_REQUIRED' : 'RESERVATION_RELEASE_FAILED';
    }
    const finished = now();
    const report: BackgroundJobsReport = {
      ok: [reservations, orders, support].every((job) => job.status === 'completed'),
      runId: (dependencies.runId ?? randomUUID)(),
      startedAt: new Date(started).toISOString(),
      finishedAt: new Date(finished).toISOString(),
      durationMs: Math.max(0, finished - started),
      jobs: { reservations, orders, support },
    };
    // Only counts, timings and fixed error codes, never raw exceptions or mail.
    try { (dependencies.log ?? ((value) => console.info('background_jobs', JSON.stringify(value))))(report); }
    catch { /* Observability must not undo completed work. */ }
    return Response.json(report, { status: report.ok ? 200 : 503, headers: HEADERS });
  };
}
