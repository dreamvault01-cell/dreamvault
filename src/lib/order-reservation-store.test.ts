import test from 'node:test';
import assert from 'node:assert/strict';
import { createReservationCleanupDependencies } from './order-reservation-store';
import { ReservationInventoryError, runReservationCleanup } from './order-reservations';

const NOW = Date.parse('2026-11-01T09:00:00Z');
const BEFORE = new Date(NOW);
const OPTIONS = { maxWait: 1_000, timeout: 10_000 };

function harness() {
  const initial = {
    order: { paymentStatus: 'PENDING', stockCommittedAt: null as Date | null,
      reservationExpiresAt: new Date(NOW - 1), status: 'PENDING', fulfillmentStatus: 'UNFULFILLED' },
    reservations: [{ id: 'reservation', variantId: 'variant', quantity: 1, status: 'RESERVED' }],
    variants: { variant: { stock: 20, reservedStock: 1 } } as Record<string, { stock: number; reservedStock: number }>,
    events: [] as Array<Record<string, unknown>>,
  };
  let state = structuredClone(initial);
  const calls: string[] = [];
  const options: unknown[] = [];
  const busy = new Set<string>();
  let failure: { step: string; error: unknown } | undefined;
  let afterRollback: (() => void) | undefined;
  const step = (name: string) => {
    calls.push(name);
    if (failure?.step === name) { const error = failure.error; failure = undefined; throw error; }
  };
  // A deterministic transactional fake: only a resolved callback commits the
  // working copy. It exercises the production adapter, not a fake release().
  const db = {
    $transaction: async (work: (tx: unknown) => Promise<unknown>, config: unknown) => {
      options.push(config);
      const working = structuredClone(state);
      const tx = {
        $queryRaw: async (strings: TemplateStringsArray, key: string) => {
          assert.match(strings.join('?'), /pg_try_advisory_xact_lock/);
          step(`lock:${key}`);
          return [{ locked: !busy.has(key) }];
        },
        order: {
          findMany: async (query: { take: number; where: { paymentStatus: string; stockCommittedAt: null; reservationExpiresAt: { lt: Date } } }) => {
            step('candidates');
            assert.equal(query.where.paymentStatus, 'PENDING');
            assert.equal(query.where.stockCommittedAt, null);
            assert.ok(query.take > 0);
            return working.order.paymentStatus === 'PENDING' && !working.order.stockCommittedAt
              && working.order.reservationExpiresAt < query.where.reservationExpiresAt.lt ? [{ id: 'order' }] : [];
          },
          findUnique: async (query: { select: Record<string, unknown> }) => {
            step('read');
            assert.deepEqual(Object.keys(query.select).sort(), ['paymentStatus', 'reservationExpiresAt', 'reservations', 'stockCommittedAt']);
            return { ...working.order, reservations: working.reservations };
          },
          update: async ({ data }: { data: Record<string, unknown> }) => {
            step('expire'); Object.assign(working.order, data);
          },
        },
        productVariant: {
          updateMany: async (query: { where: { id: string; reservedStock: { gte: number } }; data: { reservedStock: { decrement: number } } }) => {
            step(`decrement:${query.where.id}`);
            assert.deepEqual(Object.keys(query.data), ['reservedStock'], 'Never increment or decrement physical stock');
            assert.equal(query.where.reservedStock.gte, query.data.reservedStock.decrement);
            const variant = working.variants[query.where.id];
            if (!variant || variant.reservedStock < query.where.reservedStock.gte) return { count: 0 };
            variant.reservedStock -= query.data.reservedStock.decrement;
            return { count: 1 };
          },
        },
        inventoryReservation: {
          update: async ({ where, data }: { where: { id: string }; data: { status: string } }) => {
            step('release'); Object.assign(working.reservations.find((row) => row.id === where.id)!, data);
          },
        },
        orderEvent: { create: async ({ data }: { data: Record<string, unknown> }) => { step('audit'); working.events.push(data); } },
      };
      try {
        const result = await work(tx);
        state = working;
        return result;
      } catch (error) {
        afterRollback?.();
        throw error;
      }
    },
  };
  const dependencies = createReservationCleanupDependencies(db as unknown as Parameters<typeof createReservationCleanupDependencies>[0], () => NOW);
  return {
    dependencies, calls, options, busy, initial,
    get state() { return state; },
    failOnce(step: string, error: unknown, onRollback?: () => void) { failure = { step, error }; afterRollback = onRollback; },
  };
}

test('the real adapter expires an order, releases held stock and writes one audit event atomically', async () => {
  const h = harness();
  const result = await runReservationCleanup({ budgetMs: 20_000 }, h.dependencies);
  assert.equal(result.released, 1);
  assert.deepEqual(h.state.variants.variant, { stock: 20, reservedStock: 0 });
  assert.equal(h.state.reservations[0].status, 'RELEASED');
  assert.equal(h.state.order.paymentStatus, 'EXPIRED');
  assert.equal(h.state.order.fulfillmentStatus, 'CANCELLED');
  assert.equal(h.state.order.reservationExpiresAt, null);
  assert.equal(h.state.events[0].type, 'RESERVATION_EXPIRED');
  assert.deepEqual(h.calls, ['candidates', 'lock:order/order', 'read', 'lock:inventory/variant', 'decrement:variant', 'release', 'expire', 'audit']);
  assert.deepEqual(h.options[1], { ...OPTIONS, isolationLevel: 'Serializable' });
  assert.equal((await runReservationCleanup({ budgetMs: 20_000 }, h.dependencies)).released, 0);
  assert.equal(await h.dependencies.release('order', BEFORE, OPTIONS), 'skipped');
  assert.deepEqual(h.state.variants.variant, { stock: 20, reservedStock: 0 });
  assert.equal(h.state.events.length, 1);
});

test('failed release, expiry or audit writes roll back every earlier mutation', async () => {
  for (const step of ['release', 'expire', 'audit']) {
    const h = harness();
    h.failOnce(step, { code: 'P2028', message: 'private database detail' });
    const result = await runReservationCleanup({ budgetMs: 20_000 }, h.dependencies);
    assert.deepEqual(h.state, h.initial);
    assert.equal(result.released, 0);
    assert.equal(result.failed, 1);
    assert.deepEqual(result.failures, { TRANSACTION_ERROR: 1 });
  }
});

test('an inconsistent held counter is guarded, never made negative or silently repaired', async () => {
  const h = harness();
  h.state.variants.variant.reservedStock = 0;
  await assert.rejects(h.dependencies.release('order', BEFORE, OPTIONS), ReservationInventoryError);
  assert.deepEqual(h.state.variants.variant, { stock: 20, reservedStock: 0 });
  assert.equal(h.state.reservations[0].status, 'RESERVED');
  assert.equal(h.state.order.paymentStatus, 'PENDING');
  assert.equal(h.state.events.length, 0);
});

test('busy order or variant locks skip before any stock or order mutation', async () => {
  for (const key of ['order/order', 'inventory/variant']) {
    const h = harness(); h.busy.add(key);
    assert.equal(await h.dependencies.release('order', BEFORE, OPTIONS), 'skipped');
    assert.deepEqual(h.state, h.initial);
    assert.ok(!h.calls.some((call) => /decrement|release|expire|audit/.test(call)));
  }
});

test('variant locks are unique, sorted, and all acquired before any stock update', async () => {
  const h = harness();
  h.state.reservations = [
    { id: 'z', variantId: 'z', quantity: 1, status: 'RESERVED' },
    { id: 'a', variantId: 'a', quantity: 2, status: 'RESERVED' },
  ];
  h.state.variants = { a: { stock: 10, reservedStock: 2 }, z: { stock: 10, reservedStock: 1 } };
  assert.equal(await h.dependencies.release('order', BEFORE, OPTIONS), 'released');
  assert.deepEqual(h.calls.slice(0, 4), ['lock:order/order', 'read', 'lock:inventory/a', 'lock:inventory/z']);
  assert.equal(h.calls.filter((call) => call.startsWith('lock:inventory')).length, 2);
  assert.equal(h.state.variants.a.stock, 10);
  assert.equal(h.state.variants.a.reservedStock, 0);
});

test('a later variant failure rolls back stock already released for an earlier line', async () => {
  const h = harness();
  h.state.reservations = [
    { id: 'a', variantId: 'a', quantity: 1, status: 'RESERVED' },
    { id: 'z', variantId: 'z', quantity: 2, status: 'RESERVED' },
  ];
  h.state.variants = { a: { stock: 10, reservedStock: 1 }, z: { stock: 10, reservedStock: 1 } };
  const before = structuredClone(h.state);
  const result = await runReservationCleanup({ budgetMs: 20_000 }, h.dependencies);
  assert.equal(result.released, 0);
  assert.deepEqual(result.failures, { INVENTORY_INCONSISTENT: 1 });
  assert.deepEqual(h.state, before);
});

test('current paid, committed or not-yet-expired state wins over stale candidate selection', async () => {
  for (const change of [
    { paymentStatus: 'PAID' }, { paymentStatus: 'PAID_REVIEW' },
    { stockCommittedAt: new Date(NOW - 5) }, { reservationExpiresAt: new Date(NOW + 1) },
  ]) {
    const h = harness(); Object.assign(h.state.order, change);
    const before = structuredClone(h.state);
    assert.equal(await h.dependencies.release('order', BEFORE, OPTIONS), 'skipped');
    assert.deepEqual(h.state, before);
    assert.deepEqual(h.calls, ['lock:order/order', 'read']);
  }
});

test('serialization rollback then success releases stock only once', async () => {
  const h = harness(); h.failOnce('audit', { code: 'P2034' });
  const result = await runReservationCleanup({ budgetMs: 20_000 }, h.dependencies);
  assert.equal(result.checked, 1);
  assert.equal(result.released, 1);
  assert.equal(result.failed, 0);
  assert.deepEqual(h.state.variants.variant, { stock: 20, reservedStock: 0 });
  assert.equal(h.state.events.length, 1);
  assert.equal(h.calls.filter((call) => call === 'read').length, 2);
});

test('a payment committed between serialization attempts is never expired or restocked', async () => {
  const h = harness();
  h.failOnce('audit', { code: 'P2034' }, () => {
    h.state.order.paymentStatus = 'PAID'; h.state.order.stockCommittedAt = BEFORE;
    h.state.reservations[0].status = 'COMMITTED';
    h.state.variants.variant = { stock: 19, reservedStock: 0 };
  });
  const result = await runReservationCleanup({ budgetMs: 20_000 }, h.dependencies);
  assert.equal(result.skipped, 1);
  assert.equal(result.released, 0);
  assert.equal(h.state.order.paymentStatus, 'PAID');
  assert.deepEqual(h.state.variants.variant, { stock: 19, reservedStock: 0 });
  assert.equal(h.state.events.length, 0);
});
