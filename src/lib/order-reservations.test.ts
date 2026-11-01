import test from 'node:test';
import assert from 'node:assert/strict';
import { isExpiredUnpaidOrder, reservationFailureCode, ReservationInventoryError, runReservationCleanup } from './order-reservations';

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
      assert.deepEqual(timeout, { maxWait: 500, timeout: 4_250 });
      if (id === 'corrupt') throw new Error('private SQL customer@example.com');
      return id === 'busy' ? 'skipped' : 'released';
    },
  });
  assert.deepEqual(visited, ['corrupt', 'busy', 'healthy']);
  assert.deepEqual(result, { checked: 3, released: 1, failed: 1, skipped: 1, hasMore: true,
    failures: { UNEXPECTED_ERROR: 1 } });
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
  const result = await runReservationCleanup({ budgetMs: 3_000 }, {
    now: () => clock,
    candidates: async () => { clock += 1_400; return [{ id: 'a' }, { id: 'b' }]; },
    release: async (_id, _before, options) => {
      assert.deepEqual(options, { maxWait: 160, timeout: 1_190 });
      clock += 500; return 'released';
    },
  });
  assert.deepEqual(result, { checked: 1, released: 1, failed: 0, skipped: 0, hasMore: true });
});

test('a completely consumed lookup budget starts no transactions', async () => {
  let clock = NOW;
  const result = await runReservationCleanup({ budgetMs: 2_000 }, {
    now: () => clock,
    candidates: async () => { clock += 2_000; return [{ id: 'a' }]; },
    release: async () => { assert.fail('No time remains to release'); },
  });
  assert.equal(result.checked, 0);
  assert.equal(result.hasMore, true);
});

test('a healthy remote transaction can exceed the old 2.5-second ceiling', async () => {
  let clock = NOW;
  const result = await runReservationCleanup({ budgetMs: 20_000 }, {
    now: () => clock,
    candidates: async (_take, _before, options) => {
      assert.deepEqual(options, { maxWait: 1_000, timeout: 10_000 });
      clock += 1_000; return [{ id: 'remote' }];
    },
    release: async (_id, _before, options) => {
      assert.equal(options.timeout, 10_000);
      assert.ok(options.timeout + options.maxWait + 250 <= NOW + 20_000 - clock);
      clock += 4_500; return 'released';
    },
  });
  assert.equal(result.released, 1);
  assert.equal(result.failed, 0);
});

test('insufficient or nonfinite budgets stay bounded and never launch doomed transactions', async () => {
  for (const budgetMs of [0, -1, 100, 1_000]) {
    const result = await runReservationCleanup({ budgetMs }, {
      now: () => NOW,
      candidates: async () => assert.fail('No useful database budget'),
      release: async () => assert.fail('No useful release budget'),
    });
    assert.equal(result.checked, 0);
    assert.equal(result.hasMore, true);
  }
  for (const budgetMs of [Infinity, NaN, 1_000_000]) {
    await runReservationCleanup({ budgetMs }, {
      now: () => NOW,
      candidates: async (_take, _before, options) => {
        assert.ok(options.maxWait + options.timeout + 250 <= 30_000);
        assert.ok(options.timeout <= 10_000);
        return [];
      },
      release: async () => assert.fail(),
    });
  }
});

test('serialization rollback is retried once with the same absolute deadline', async () => {
  let clock = NOW;
  let attempts = 0;
  const result = await runReservationCleanup({ budgetMs: 5_000 }, {
    now: () => clock, candidates: async () => [{ id: 'conflict' }],
    release: async (_id, before, options) => {
      assert.equal(before.getTime(), clock);
      assert.ok(options.timeout + options.maxWait + 250 <= NOW + 5_000 - clock);
      clock += 1_000;
      if (++attempts === 1) throw { code: 'P2034', message: 'private SQL' };
      return 'released';
    },
  });
  assert.equal(attempts, 2);
  assert.deepEqual(result, { checked: 1, released: 1, failed: 0, skipped: 0, hasMore: false });
});

test('serialization retries stop when the deadline is spent or the retry also fails', async () => {
  for (const elapsed of [100, 4_000]) {
    let clock = NOW;
    let attempts = 0;
    const result = await runReservationCleanup({}, {
      now: () => clock, candidates: async () => [{ id: 'conflict' }],
      release: async () => { attempts++; clock += elapsed; throw { code: 'P2034' }; },
    });
    assert.equal(attempts, elapsed === 100 ? 2 : 1);
    assert.equal(result.checked, 1);
    assert.equal(result.failed, 1);
    assert.deepEqual(result.failures, { DATABASE_CONFLICT: 1 });
  }
});

test('non-serialization failures are not immediately replayed and expose no private details', async () => {
  for (const [error, category] of [
    [{ code: 'P2028', message: 'private SQL customer@example.com' }, 'TRANSACTION_ERROR'],
    [{ code: 'P2024', message: 'private URL' }, 'DATABASE_TIMEOUT'],
    [{ code: 'P1001', message: 'private hostname' }, 'DATABASE_UNAVAILABLE'],
    [new ReservationInventoryError(), 'INVENTORY_INCONSISTENT'],
  ] as const) {
    let attempts = 0;
    const result = await runReservationCleanup({}, {
      now: () => NOW, candidates: async () => [{ id: 'private-order' }],
      release: async () => { attempts++; throw error; },
    });
    assert.equal(attempts, 1);
    assert.deepEqual(result.failures, { [category]: 1 });
    assert.doesNotMatch(JSON.stringify(result), /private|customer@example|SQL/);
  }
});

test('error classification uses codes only, never substring guesses about error messages', () => {
  assert.equal(reservationFailureCode({ code: 'P2021' }), 'DATABASE_NOT_READY');
  assert.equal(reservationFailureCode({ code: 'P2010', meta: { code: '42703' } }), 'DATABASE_NOT_READY');
  assert.equal(reservationFailureCode({ code: 'attacker-controlled', message: 'P2028 timeout' }), 'UNEXPECTED_ERROR');
  assert.equal(reservationFailureCode(new Error('P2034 timeout')), 'UNEXPECTED_ERROR');
  assert.equal(reservationFailureCode(null), 'UNEXPECTED_ERROR');
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
