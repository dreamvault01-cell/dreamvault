import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackgroundJobsHandler, type BackgroundJobsReport } from './background-jobs';
import { assertSupportProcessorSecret } from './support-http';

const NOW = Date.parse('2026-10-30T00:00:00Z');
const RUN_ID = 'e13d1b59-4bb6-4dbe-8bad-baf054a634cf';
const SECRET = 'background_unit_test_not_a_real_secret_12345678';
const mail = { processed: 0, sent: 0, failed: 0, blocked: 0, queued: 0 };
const reservation = { checked: 0, released: 0, failed: 0, skipped: 0, hasMore: false };

function harness() {
  const calls: string[] = [];
  const reports: BackgroundJobsReport[] = [];
  const dependencies: Parameters<typeof createBackgroundJobsHandler>[0] = {
    authorize: assertSupportProcessorSecret,
    reservations: async (options) => {
      assert.deepEqual(options, { limit: 25, budgetMs: 8_000 }); calls.push('reservations'); return reservation;
    },
    orders: async (options) => {
      assert.deepEqual(options, { limit: 5, budgetMs: 12_000 }); calls.push('orders'); return mail;
    },
    support: async (options) => {
      assert.deepEqual(options, { limit: 5, budgetMs: 12_000 }); calls.push('support'); return mail;
    },
    now: () => NOW,
    runId: () => RUN_ID,
    log: (report) => { reports.push(report); },
  };
  return { calls, reports, dependencies };
}

function request(authorization?: string, query = '') {
  return new Request(`https://store.example.com/api/cron/fulfillment${query}`, {
    method: 'POST', headers: authorization ? { Authorization: authorization } : {},
  });
}

async function withSecret(work: () => Promise<void>) {
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = SECRET;
  try { await work(); }
  finally { if (previous === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previous; }
}

test('missing, wrong, or URL-only authentication performs zero jobs', async () => withSecret(async () => {
  for (const [header, query] of [[undefined, ''], ['Bearer wrong', ''], [SECRET, ''], [undefined, `?secret=${SECRET}`]] as const) {
    const h = harness();
    const response = await createBackgroundJobsHandler(h.dependencies)(request(header, query));
    assert.equal(response.status, 401);
    assert.deepEqual(h.calls, []);
    assert.deepEqual(h.reports, []);
    assert.doesNotMatch(await response.text(), new RegExp(SECRET));
    assert.equal(response.headers.get('cache-control'), 'no-store, private');
  }
}));

test('unconfigured and too-short secrets fail closed before jobs', async () => withSecret(async () => {
  for (const value of ['', 'short']) {
    process.env.CRON_SECRET = value;
    const h = harness();
    assert.equal((await createBackgroundJobsHandler(h.dependencies)(request(`Bearer ${SECRET}`))).status, 401);
    assert.equal(h.calls.length, 0);
  }
}));

test('authorized runs return bounded job results and metadata with no caching', async () => withSecret(async () => {
  const h = harness();
  const response = await createBackgroundJobsHandler(h.dependencies)(request(`Bearer ${SECRET}`));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('vary'), 'Authorization');
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.runId, RUN_ID);
  assert.equal(body.startedAt, new Date(NOW).toISOString());
  assert.equal(body.durationMs, 0);
  assert.deepEqual(h.calls.sort(), ['orders', 'reservations', 'support']);
  for (const name of ['reservations', 'orders', 'support']) assert.equal(body.jobs[name].status, 'completed');
  assert.equal(h.reports.length, 1);
  assert.doesNotMatch(JSON.stringify(body), new RegExp(SECRET));
}));

test('a failing job cannot prevent either independent queue from starting or completing', async () => withSecret(async () => {
  for (const name of ['reservations', 'orders', 'support'] as const) {
    const h = harness();
    h.dependencies[name] = async () => { h.calls.push(name); throw new Error('SQL customer@example.com password=private'); };
    const response = await createBackgroundJobsHandler(h.dependencies)(request(`Bearer ${SECRET}`));
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.ok, false);
    assert.equal(body.jobs[name].errorCode, 'JOB_FAILED');
    assert.equal(h.calls.length, 3);
    for (const other of ['reservations', 'orders', 'support']) {
      assert.equal(body.jobs[other].status, other === name ? 'failed' : 'completed');
    }
    assert.doesNotMatch(JSON.stringify([body, h.reports]), /SQL|customer@example|password|private/);
  }
}));

test('independent work starts even while the first job is still pending; no work is detached', async () => withSecret(async () => {
  const h = harness();
  let finish: (() => void) | undefined;
  h.dependencies.reservations = async () => {
    h.calls.push('reservations');
    await new Promise<void>((resolve) => { finish = resolve; });
    return reservation;
  };
  const pending = createBackgroundJobsHandler(h.dependencies)(request(`Bearer ${SECRET}`));
  await Promise.resolve();
  assert.deepEqual(h.calls, ['reservations', 'orders', 'support']);
  assert.equal(h.reports.length, 0);
  finish!();
  assert.equal((await pending).status, 200);
}));

test('a candidate needing inventory review fails the run without suppressing emails', async () => withSecret(async () => {
  const h = harness();
  h.dependencies.reservations = async () => ({ ...reservation, checked: 2, failed: 1, released: 1, hasMore: true });
  const response = await createBackgroundJobsHandler(h.dependencies)(request(`Bearer ${SECRET}`));
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.jobs.reservations.errorCode, 'RESERVATION_REVIEW_REQUIRED');
  assert.equal(body.jobs.reservations.result.released, 1);
  assert.equal(body.jobs.orders.status, 'completed');
  assert.equal(body.jobs.support.status, 'completed');
}));

test('only explicit counters are exposed, never accidental worker fields or provider errors', async () => withSecret(async () => {
  const h = harness();
  h.dependencies.orders = async () => ({ ...mail, privateEmail: 'customer@example.com', secret: SECRET });
  h.dependencies.support = async () => { throw { code: 'P2021', message: 'SELECT private_table' }; };
  const response = await createBackgroundJobsHandler(h.dependencies)(request(`Bearer ${SECRET}`));
  const body = await response.json();
  assert.deepEqual(body.jobs.orders.result, mail);
  assert.equal(body.jobs.support.errorCode, 'DATABASE_NOT_READY');
  assert.doesNotMatch(JSON.stringify([body, h.reports]), /customer@example|private_table|background_unit_test/);
}));

test('invalid worker counters fail safely and broken logging never repeats completed work', async () => withSecret(async () => {
  const h = harness();
  h.dependencies.orders = async () => ({ ...mail, sent: -1 });
  h.dependencies.log = () => { throw new Error('logging unavailable'); };
  const response = await createBackgroundJobsHandler(h.dependencies)(request(`Bearer ${SECRET}`));
  assert.equal(response.status, 503);
  assert.equal(h.calls.filter((value) => value === 'support').length, 1);
}));
