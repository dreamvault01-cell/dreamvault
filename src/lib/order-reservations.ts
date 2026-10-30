/** Small, testable batch policy; the database adapter owns each atomic release. */
export interface ReservationCleanupResult {
  checked: number;
  released: number;
  failed: number;
  skipped: number;
  hasMore: boolean;
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

interface CleanupDependencies {
  now: () => number;
  candidates: (take: number, before: Date) => Promise<Array<{ id: string }>>;
  release: (id: string, before: Date, timeoutMs: number) => Promise<'released' | 'skipped'>;
}

export async function runReservationCleanup(
  options: { limit?: number; budgetMs?: number },
  dependencies: CleanupDependencies,
): Promise<ReservationCleanupResult> {
  const bounded = (value: number | undefined, fallback: number, min: number, max: number) =>
    Number.isFinite(value) ? Math.max(min, Math.min(max, Math.floor(value!))) : fallback;
  const limit = bounded(options.limit, 25, 1, 100);
  const deadline = dependencies.now() + bounded(options.budgetMs, 5_000, 100, 10_000);
  const candidates = await dependencies.candidates(limit + 1, new Date(dependencies.now()));
  const batch = candidates.slice(0, limit);
  const result: ReservationCleanupResult = {
    checked: 0, released: 0, failed: 0, skipped: 0, hasMore: candidates.length > limit,
  };
  for (const candidate of batch) {
    const remaining = deadline - dependencies.now();
    // Never start a transaction that is unlikely to finish before the budget.
    if (remaining < 100) { result.hasMore = true; break; }
    result.checked++;
    try {
      const outcome = await dependencies.release(candidate.id, new Date(dependencies.now()), Math.min(2_500, remaining));
      if (outcome === 'released') result.released++;
      else { result.skipped++; result.hasMore = true; }
    } catch {
      // The transaction rolls back the whole candidate. Do not let one broken
      // reservation prevent unrelated expired checkouts from being released.
      result.failed++;
      result.hasMore = true;
    }
  }
  return result;
}
