import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { schedulerEndpoint, invokeBackgroundJobs, validateReport, formatSummary, SchedulerError } from './run-background-jobs.mjs';

const SECRET = 'test_only_background_processor_secret_1234567890';
const CONFIG = { appUrl: 'https://store.example.com', secret: SECRET };
const NOW = '2026-10-30T00:00:00.000Z';
function report() {
  const mail = () => ({ status: 'completed', durationMs: 5, result: { processed: 1, sent: 1, failed: 0, blocked: 0, queued: 0 } });
  return {
    ok: true, runId: 'e13d1b59-4bb6-4dbe-8bad-baf054a634cf', startedAt: NOW, finishedAt: NOW, durationMs: 10,
    jobs: { reservations: { status: 'completed', durationMs: 5, result: { checked: 1, released: 1, failed: 0, skipped: 0, hasMore: false } }, orders: mail(), support: mail() },
  };
}
const json = (body = report(), status = 200) => Response.json(body, { status });

test('the scheduler appends a fixed endpoint to an HTTPS origin only', () => {
  assert.equal(schedulerEndpoint('https://store.example.com/'), 'https://store.example.com/api/cron/fulfillment');
  assert.equal(schedulerEndpoint('https://dream-vault-rho.vercel.app'), 'https://dream-vault-rho.vercel.app/api/cron/fulfillment');
  for (const value of ['', undefined, 'http://example.com', 'file:///secret', 'https://user:password@example.com',
    'https://example.com/path', 'https://example.com/?secret=private', 'https://example.com/#fragment',
    'https://127.0.0.1', 'https://[::1]', 'https://localhost', 'https://localhost.', 'https://app.localhost', 'https://app.internal', 'https://example.com:8443']) {
    assert.throws(() => schedulerEndpoint(value), (error) => error instanceof SchedulerError && error.code === 'CONFIGURATION');
  }
});

test('missing, weak, newline, whitespace and oversized secrets never make a network request', async () => {
  for (const secret of [undefined, '', 'short', `${SECRET}\r\nInjected: value`, `${SECRET} `, 'a'.repeat(513)]) {
    let calls = 0;
    await assert.rejects(invokeBackgroundJobs({ ...CONFIG, secret }, { fetch: async () => { calls++; return json(); } }),
      (error) => error.code === 'CONFIGURATION');
    assert.equal(calls, 0);
  }
});

test('valid requests use an authorization header, POST, a timeout and no redirects', async () => {
  let calls = 0;
  const result = await invokeBackgroundJobs(CONFIG, { fetch: async (url, options) => {
    calls++;
    assert.equal(url, 'https://store.example.com/api/cron/fulfillment');
    assert.doesNotMatch(url, new RegExp(SECRET));
    assert.equal(options.method, 'POST');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, `Bearer ${SECRET}`);
    assert.equal(options.headers.Accept, 'application/json');
    assert.ok(options.signal instanceof AbortSignal);
    return json();
  } });
  assert.equal(calls, 1);
  assert.equal(result.ok, true);
});

test('authentication errors fail immediately and never expose response details', async () => {
  for (const status of [401, 403]) {
    let calls = 0;
    await assert.rejects(invokeBackgroundJobs(CONFIG, { fetch: async () => {
      calls++; return new Response(`private provider error ${SECRET}`, { status });
    }, sleep: async () => assert.fail('Do not retry authentication') }), (error) => {
      assert.equal(error.code, 'AUTHENTICATION');
      assert.equal(error.status, status);
      assert.doesNotMatch(error.message, /test_only|private provider/);
      return true;
    });
    assert.equal(calls, 1);
  }
});

test('a redirect or login HTML page cannot be mistaken for a successful processor run', async () => {
  for (const response of [new Response('', { status: 307, headers: { Location: 'https://attacker.example' } }),
    new Response('<html>Sign in</html>', { status: 200, headers: { 'Content-Type': 'text/html' } }),
    json({ received: true })]) {
    await assert.rejects(invokeBackgroundJobs(CONFIG, { fetch: async () => response, sleep: async () => assert.fail('Do not retry') }),
      (error) => ['HTTP', 'RESPONSE'].includes(error.code));
  }
});

test('network and transient HTTP failures retry with a bounded backoff', async () => {
  for (const first of ['network', 429, 500, 502, 504]) {
    let calls = 0;
    const waits = [];
    const result = await invokeBackgroundJobs(CONFIG, {
      fetch: async () => {
        calls++;
        if (calls === 1) {
          if (first === 'network') throw new Error(`private transport ${SECRET}`);
          return new Response('', { status: first });
        }
        return json();
      },
      sleep: async (ms) => { waits.push(ms); },
    });
    assert.equal(result.ok, true);
    assert.equal(calls, 2);
    assert.deepEqual(waits, [5_000]);
  }
});

test('a failed job is retried at most three times and retains only a safe summary', async () => {
  let calls = 0;
  const waits = [];
  const failed = report();
  failed.ok = false;
  failed.jobs.orders = { status: 'failed', durationMs: 3, errorCode: `private ${SECRET}` };
  await assert.rejects(invokeBackgroundJobs(CONFIG, {
    fetch: async () => { calls++; return json(failed, 503); },
    sleep: async (ms) => { waits.push(ms); },
  }), (error) => {
    assert.equal(error.code, 'JOB_FAILED');
    assert.equal(error.report.jobs.orders.errorCode, 'JOB_FAILED');
    assert.doesNotMatch(JSON.stringify(error), /test_only_background|private/);
    return true;
  });
  assert.equal(calls, 3);
  assert.deepEqual(waits, [5_000, 15_000]);
});

test('a temporary gateway HTML response is retried without printing its contents', async () => {
  let calls = 0;
  const result = await invokeBackgroundJobs(CONFIG, {
    fetch: async () => ++calls === 1
      ? new Response('private gateway diagnostics', { status: 503, headers: { 'Content-Type': 'text/html' } }) : json(),
    sleep: async () => {},
  });
  assert.equal(calls, 2);
  assert.equal(result.ok, true);
});

test('untrusted server extras are never copied into the report or job summary', () => {
  const raw = report();
  raw.secret = SECRET;
  raw.jobs.orders.result.customer = 'private@example.com';
  raw.jobs.support.rawError = 'private SQL';
  const normalized = validateReport(raw);
  const summary = formatSummary(normalized);
  assert.doesNotMatch(JSON.stringify(normalized) + summary, /test_only|private@example|private SQL/);
  assert.match(summary, /reservations: completed/);
  assert.match(summary, /released=1/);
  assert.match(summary, /orders: completed/);
});

test('invalid identifiers, dates, counts or inconsistent status fail report validation', () => {
  for (const change of [
    (value) => { value.runId = 'private injected text'; },
    (value) => { value.startedAt = 'bad date'; },
    (value) => { value.durationMs = -1; },
    (value) => { value.jobs.orders.result.sent = -1; },
    (value) => { value.jobs.support.result.processed = 1.5; },
    (value) => { delete value.jobs.reservations.result.hasMore; },
    (value) => { value.ok = false; },
    (value) => { delete value.jobs.orders.result; },
  ]) {
    const value = report();
    change(value);
    assert.throws(() => validateReport(value), (error) => error.code === 'RESPONSE');
  }
});

test('oversized responses are rejected even without Content-Length', async () => {
  let cancelled = false;
  const body = new ReadableStream({
    pull(controller) { controller.enqueue(new TextEncoder().encode('a'.repeat(33 * 1024))); },
    cancel() { cancelled = true; },
  });
  await assert.rejects(invokeBackgroundJobs(CONFIG, { fetch: async () => new Response(body, { headers: { 'Content-Type': 'application/json' } }) }),
    (error) => error.code === 'RESPONSE');
  assert.equal(cancelled, true);
});

test('workflow is opt-in, default-branch only, authenticated and never triggered by pull requests', async () => {
  const workflow = await readFile(new URL('../.github/workflows/background-jobs.yml', import.meta.url), 'utf8');
  assert.match(workflow, /cron: '2-59\/5 \* \* \* \*'/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /BACKGROUND_JOBS_ENABLED == 'true'/);
  assert.match(workflow, /github\.ref_name == github\.event\.repository\.default_branch/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /actions\/checkout@[a-f0-9]{40}/);
  assert.match(workflow, /CRON_SECRET: \$\{\{ secrets\.CRON_SECRET \}\}/);
  assert.doesNotMatch(workflow, /pull_request|NEXT_PUBLIC_CRON|Bearer [a-zA-Z0-9]{32}/);
});
