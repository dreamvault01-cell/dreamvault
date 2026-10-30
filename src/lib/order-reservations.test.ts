import test from 'node:test';
import assert from 'node:assert/strict';
import { isExpiredUnpaidOrder, runReservationCleanup } from './order-reservations';

const NOW = Date.parse('2026-10-30T00:00:00Z');
const pending = { paymentStatus: 'PENDING', stockCommittedAt: null, reservationExpiresAt: new Date(NOW - 1) };

test('only expired unpaid, uncommitted orders are eligible, including after candidate selection', () => {
  assert.equal(isExpiredUnpaidOrder(pending, new Date(NOW)), true);
  for (const order of [null, { ...pending, paymentStatus: 'PAID' }, { ...pending, paymentStatus: 'PAID_REVIEW' },
    { ...pending, paymentStatus: 'EXPIRED' }, { ...pending, paymentStatus: 'REFUNDED' },
    { ...pending, stockCommittedAt: new Date(NOW - 10) }, { ...pending, reservationExpiresAt: null },
    { ...pending, reservationExpiresAt: new Date(NOW) }, { ...pending, reservationExpiresAt: new Date(NOW + 1) }]) {
    assert.equal(isExpiredUnpaidOrder(order, new Date(NOW)), false);
  }
});

test('empty cleanup does no release work and uses the expected cutoff', async () => {
  const result = await runReservationCleanup({}, {
    now: () => NOW,
    candidates: async (take, before) => { assert.equal(take, 26); assert.equal(before.getTime(), NOW); return []; },
    release: async () => { throw new Error('Unexpected release'); },
  });
  assert.deepEqual(result, { checked: 0, released: 0, failed: 0, skipped: 0, hasMore: false });
});

test('a broken candidate does not poison later candidates and only aggregate results are returned', async () => {
  const visited: string[] = [];
  const result = await runReservationCleanup({}, {
    now: () => NOW,
    candidates: async () => [{ id: 'corrupt' }, { id: 'busy' }, { id: 'healthy' }],
    release: async (id, before, timeout) => {
      visited.push(id);
      assert.equal(before.getTime(), NOW);
      assert.equal(timeout, 2_500);
      if (id === 'corrupt') throw new Error('private SQL customer@example.com');
      return id === 'busy' ? 'skipped' : 'released';
    },
  });
  assert.deepEqual(visited, ['corrupt', 'busy', 'healthy']);
  assert.deepEqual(result, { checked: 3, released: 1, failed: 1, skipped: 1, hasMore: true });
  assert.doesNotMatch(JSON.stringify(result), /corrupt|healthy|private|customer/);
});

test('cleanup observes the batch limit and reports work left for a later run', async () => {
  const visited: string[] = [];
  const result = await runReservationCleanup({ limit: 2 }, {
    now: () => NOW,
    candidates: async (take) => { assert.equal(take, 3); return [{ id: 'a' }, { id: 'b' }, { id: 'c' }]; },
    release: async (id) => { visited.push(id); return 'released'; },
  });
  assert.deepEqual(visited, ['a', 'b']);
  assert.equal(result.released, 2);
  assert.equal(result.hasMore, true);
});

test('the shared budget includes candidate lookup and prevents starting new work after expiry', async () => {
  let clock = NOW;
  const result = await runReservationCleanup({ budgetMs: 1_000 }, {
    now: () => clock,
    candidates: async () => { clock += 800; return [{ id: 'a' }, { id: 'b' }]; },
    release: async (_id, _before, timeout) => { assert.equal(timeout, 200); clock += 150; return 'released'; },
  });
  assert.deepEqual(result, { checked: 1, released: 1, failed: 0, skipped: 0, hasMore: true });
});

test('a completely consumed lookup budget starts no transactions', async () => {
  let clock = NOW;
  const result = await runReservationCleanup({ budgetMs: 100 }, {
    now: () => clock,
    candidates: async () => { clock += 100; return [{ id: 'a' }]; },
    release: async () => { assert.fail('No time remains to release'); },
  });
  assert.equal(result.checked, 0);
  assert.equal(result.hasMore, true);
});

test('repeated sweeps recheck eligibility instead of releasing the same order twice', async () => {
  let state = { ...pending };
  let releases = 0;
  const dependencies = {
    now: () => NOW,
    candidates: async () => [{ id: 'same-order' }],
    release: async (_id: string, before: Date): Promise<'released' | 'skipped'> => {
      if (!isExpiredUnpaidOrder(state, before)) return 'skipped';
      releases++;
      state = { ...state, paymentStatus: 'EXPIRED' };
      return 'released';
    },
  };
  assert.equal((await runReservationCleanup({}, dependencies)).released, 1);
  assert.equal((await runReservationCleanup({}, dependencies)).released, 0);
  assert.equal(releases, 1);
});

test('initial database failure remains visible to the scheduler', async () => {
  await assert.rejects(runReservationCleanup({}, {
    now: () => NOW,
    candidates: async () => { throw new Error('unavailable'); },
    release: async () => 'released',
  }));
});
