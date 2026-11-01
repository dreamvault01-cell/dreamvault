/** Small, testable batch policy; the database adapter owns each atomic release. */
export interface ReservationCleanupResult {
  checked: number;
  released: number;
  failed: number;
  skipped: number;
  hasMore: boolean;
  failures?: Partial<Record<ReservationFailureCode, number>>;
}

// Fixed categories only: never return error messages, SQL, order IDs or PII.
export const RESERVATION_FAILURE_CODES = [
  'TRANSACTION_ERROR', 'DATABASE_TIMEOUT', 'DATABASE_CONFLICT',
  'DATABASE_UNAVAILABLE', 'DATABASE_NOT_READY', 'INVENTORY_INCONSISTENT', 'UNEXPECTED_ERROR',
] as const;
export type ReservationFailureCode = typeof RESERVATION_FAILURE_CODES[number];

export class ReservationInventoryError extends Error {
  readonly code = 'INVENTORY_INCONSISTENT';
  constructor() {
    super('Inventory needs review before this order can be released.');
    this.name = 'ReservationInventoryError';
  }
}

function databaseCode(error: unknown) {
  return error && typeof error === 'object' && 'code' in error ? error.code : undefined;
}

export function reservationFailureCode(error: unknown): ReservationFailureCode {
  const code = databaseCode(error);
  const meta = error && typeof error === 'object' && 'meta' in error ? error.meta : undefined;
  const sqlCode = meta && typeof meta === 'object' && 'code' in meta ? meta.code : undefined;
  if (code === 'INVENTORY_INCONSISTENT') return 'INVENTORY_INCONSISTENT';
  // P2028 describes any transaction API error, not just a proven timeout.
  if (code === 'P2028') return 'TRANSACTION_ERROR';
  if (['P1002', 'P1008', 'P2024'].includes(String(code))) return 'DATABASE_TIMEOUT';
  if (code === 'P2034') return 'DATABASE_CONFLICT';
  if (['P1000', 'P1001', 'P1017'].includes(String(code))) return 'DATABASE_UNAVAILABLE';
  if (['P2021', 'P2022', '42P01', '42703'].includes(String(code))
    || (code === 'P2010' && ['42P01', '42703'].includes(String(sqlCode)))) return 'DATABASE_NOT_READY';
  return 'UNEXPECTED_ERROR';
}

export interface ReservationTransactionOptions {
  maxWait: number;
  timeout: number;
}

export interface ExpirableOrder {
  paymentStatus: string;
  stockCommittedAt: Date | null;
  reservationExpiresAt: Date | null;
}

export function isExpiredUnpaidOrder(order: ExpirableOrder | null, now: Date) {
  return Boolean(order && order.paymentStatus === 'PENDING' && !order.stockCommittedAt
    && order.reservationExpiresAt && order.reservationExpiresAt < now);
}

export interface CleanupDependencies {
  now: () => number;
  candidates: (take: number, before: Date, options: ReservationTransactionOptions) => Promise<Array<{ id: string }>>;
  release: (id: string, before: Date, options: ReservationTransactionOptions) => Promise<'released' | 'skipped'>;
}

const COMPLETION_MARGIN_MS = 250;
const MIN_TRANSACTION_MS = 1_000;

function transactionOptions(remaining: number): ReservationTransactionOptions | null {
  const maxWait = Math.min(1_000, Math.floor(remaining / 10));
  const timeout = Math.min(10_000, remaining - maxWait - COMPLETION_MARGIN_MS);
  return timeout >= MIN_TRANSACTION_MS ? { maxWait, timeout } : null;
}

export async function runReservationCleanup(
  options: { limit?: number; budgetMs?: number },
  dependencies: CleanupDependencies,
): Promise<ReservationCleanupResult> {
  const bounded = (value: number | undefined, fallback: number, min: number, max: number) =>
    Number.isFinite(value) ? Math.max(min, Math.min(max, Math.floor(value!))) : fallback;
  const limit = bounded(options.limit, 25, 1, 100);
  // Checkout-triggered sweeps stay small; the scheduled worker supplies a
  // larger budget. Acquisition, execution and a completion margin all count.
  const deadline = dependencies.now() + bounded(options.budgetMs, 5_000, 100, 30_000);
  const lookupOptions = transactionOptions(deadline - dependencies.now());
  if (!lookupOptions) return { checked: 0, released: 0, failed: 0, skipped: 0, hasMore: true };
  const candidates = await dependencies.candidates(limit + 1, new Date(dependencies.now()), lookupOptions);
  const batch = candidates.slice(0, limit);
  const result: ReservationCleanupResult = {
    checked: 0, released: 0, failed: 0, skipped: 0, hasMore: candidates.length > limit,
  };
  for (const candidate of batch) {
    let budget = transactionOptions(deadline - dependencies.now());
    // Do not launch a nearly expired transaction, or detach work with a timer.
    if (!budget) { result.hasMore = true; break; }
    result.checked++;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const outcome = await dependencies.release(candidate.id, new Date(dependencies.now()), budget);
        if (outcome === 'released') result.released++;
        else { result.skipped++; result.hasMore = true; }
        break;
      } catch (error) {
        // Only P2034 guarantees a serialization/deadlock rollback. Retry that
        // whole transaction once, with fresh eligibility checks and a deadline.
        // Do not immediately replay timeouts or ambiguous connection failures.
        const retryBudget = transactionOptions(deadline - dependencies.now());
        if (databaseCode(error) === 'P2034' && attempt === 0 && retryBudget) {
          budget = retryBudget;
          continue;
        }
        const code = reservationFailureCode(error);
        result.failures ??= {};
        result.failures[code] = (result.failures[code] ?? 0) + 1;
        result.failed++;
        result.hasMore = true;
        break;
      }
    }
  }
  return result;
}
