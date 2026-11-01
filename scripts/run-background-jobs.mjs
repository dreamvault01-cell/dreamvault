import { appendFile } from 'node:fs/promises';
import { isIP } from 'node:net';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const MAX_RESPONSE_BYTES = 32 * 1024;
const JOB_NAMES = ['reservations', 'orders', 'support'];
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const RESERVATION_FAILURE_CODES = [
  'TRANSACTION_ERROR', 'DATABASE_TIMEOUT', 'DATABASE_CONFLICT', 'DATABASE_UNAVAILABLE',
  'DATABASE_NOT_READY', 'INVENTORY_INCONSISTENT', 'UNEXPECTED_ERROR',
];
const ERROR_CODES = ['JOB_FAILED', 'RESERVATION_REVIEW_REQUIRED', 'RESERVATION_RELEASE_FAILED', ...RESERVATION_FAILURE_CODES];
const MESSAGES = {
  CONFIGURATION: 'Set a valid BACKGROUND_APP_URL origin and private CRON_SECRET (at least 32 characters).',
  NETWORK: 'The background endpoint could not be reached within the request timeout.',
  AUTHENTICATION: 'The endpoint rejected authentication. Check the matching CRON_SECRET and redeploy Vercel.',
  HTTP: 'The background endpoint returned an unexpected HTTP status. Check deployment protection and runtime logs.',
  RESPONSE: 'The endpoint did not return a valid background-jobs report. Check the URL and deployed code.',
  JOB_FAILED: 'One or more background jobs failed. Check the safe summary and Vercel runtime logs.',
};

export class SchedulerError extends Error {
  constructor(code, { status, report } = {}) {
    super(MESSAGES[code]);
    this.name = 'SchedulerError';
    this.code = code;
    this.status = status;
    this.report = report;
  }
}

export function schedulerEndpoint(appUrl) {
  try {
    const url = new URL(appUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash
      || url.pathname !== '/' || url.port || url.hostname.endsWith('.') || isIP(url.hostname.replace(/^\[|\]$/g, ''))
      || !url.hostname.includes('.') || /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(url.hostname)) {
      throw new Error();
    }
    return `${url.origin}/api/cron/fulfillment`;
  } catch { throw new SchedulerError('CONFIGURATION'); }
}

const count = (value) => {
  if (!Number.isSafeInteger(value) || value < 0) throw new SchedulerError('RESPONSE');
  return value;
};

/** Keep only the documented aggregate fields. Never print arbitrary server data. */
export function validateReport(value) {
  if (!value || typeof value !== 'object' || !UUID.test(value.runId)
    || typeof value.ok !== 'boolean' || typeof value.startedAt !== 'string' || typeof value.finishedAt !== 'string'
    || !Number.isFinite(Date.parse(value.startedAt)) || !Number.isFinite(Date.parse(value.finishedAt)) || !value.jobs) throw new SchedulerError('RESPONSE');
  const report = {
    ok: value.ok, runId: value.runId, startedAt: new Date(value.startedAt).toISOString(),
    finishedAt: new Date(value.finishedAt).toISOString(), durationMs: count(value.durationMs), jobs: {},
  };
  for (const name of JOB_NAMES) {
    const raw = value.jobs[name];
    if (!raw || !['completed', 'failed'].includes(raw.status)) throw new SchedulerError('RESPONSE');
    const job = { status: raw.status, durationMs: count(raw.durationMs) };
    if (raw.status === 'failed') job.errorCode = ERROR_CODES.includes(raw.errorCode) ? raw.errorCode : 'JOB_FAILED';
    if (raw.result) {
      const keys = name === 'reservations' ? ['checked', 'released', 'failed', 'skipped'] : ['processed', 'sent', 'failed', 'blocked', 'queued'];
      job.result = Object.fromEntries(keys.map((key) => [key, count(raw.result[key])]));
      if (name === 'reservations') {
        if (typeof raw.result.hasMore !== 'boolean') throw new SchedulerError('RESPONSE');
        job.result.hasMore = raw.result.hasMore;
        if (raw.result.failures) {
          const failures = {};
          for (const code of RESERVATION_FAILURE_CODES) {
            if (raw.result.failures[code] !== undefined) {
              const value = count(raw.result.failures[code]);
              if (value > 0) failures[code] = value;
            }
          }
          if (Object.values(failures).reduce((sum, value) => sum + value, 0) > job.result.failed) throw new SchedulerError('RESPONSE');
          if (Object.keys(failures).length) job.result.failures = failures;
        }
      }
    } else if (raw.status === 'completed') throw new SchedulerError('RESPONSE');
    report.jobs[name] = job;
  }
  if (report.ok !== JOB_NAMES.every((name) => report.jobs[name].status === 'completed')) throw new SchedulerError('RESPONSE');
  return report;
}

async function readReport(response) {
  if (response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json'
    || Number(response.headers.get('content-length')) > MAX_RESPONSE_BYTES) {
    await response.body?.cancel();
    throw new SchedulerError('RESPONSE');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new SchedulerError('RESPONSE');
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0;
  let body = '';
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > MAX_RESPONSE_BYTES) { await reader.cancel(); throw new SchedulerError('RESPONSE'); }
      body += decoder.decode(part.value, { stream: true });
    }
    body += decoder.decode();
    return validateReport(JSON.parse(body));
  } catch { throw new SchedulerError('RESPONSE'); }
  finally { reader.releaseLock(); }
}

export async function invokeBackgroundJobs({ appUrl, secret }, overrides = {}) {
  const endpoint = schedulerEndpoint(appUrl);
  if (typeof secret !== 'string' || secret.length < 32 || secret.length > 512 || /[^\x21-\x7e]/.test(secret)) {
    throw new SchedulerError('CONFIGURATION');
  }
  const fetchRequest = overrides.fetch ?? fetch;
  const wait = overrides.sleep ?? sleep;
  for (let attempt = 0; attempt < 3; attempt++) {
    let failure;
    try {
      const response = await fetchRequest(endpoint, {
        method: 'POST', redirect: 'error',
        headers: { Authorization: `Bearer ${secret}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(70_000),
      });
      if (response.status === 401 || response.status === 403) {
        await response.body?.cancel();
        throw new SchedulerError('AUTHENTICATION', { status: response.status });
      }
      if (response.status !== 200 && response.status !== 503) {
        await response.body?.cancel();
        throw new SchedulerError('HTTP', { status: response.status });
      }
      let report;
      try { report = await readReport(response); }
      catch (error) {
        // A gateway may return HTML during an outage. Preserve a transient
        // status for bounded retries, but never log that response body.
        if (error instanceof SchedulerError) error.status = response.status;
        throw error;
      }
      if (response.status !== 200 || !report.ok) throw new SchedulerError('JOB_FAILED', { status: response.status, report });
      return report;
    } catch (error) {
      failure = error instanceof SchedulerError ? error : new SchedulerError('NETWORK');
    }
    const retryable = failure.code === 'NETWORK' || failure.status === 503
      || [408, 429, 500, 502, 504].includes(failure.status);
    if (!retryable || attempt === 2) throw failure;
    // Same idempotent endpoint, no replacement emails or new payment attempts.
    await wait(attempt === 0 ? 5_000 : 15_000);
  }
}

export function formatSummary(report) {
  const lines = ['## DreamVault background jobs', '', `Run: ${report.runId}`, '', `Result: ${report.ok ? 'Completed' : 'Needs attention'}`, ''];
  for (const name of JOB_NAMES) {
    const job = report.jobs[name];
    const counts = job.result ? Object.entries(job.result).filter(([key]) => key !== 'failures')
      .map(([key, value]) => `${key}=${value}`).join(', ') : 'no counts available';
    lines.push(`- ${name}: ${job.status}${job.errorCode ? ` (${job.errorCode})` : ''}; ${counts}; durationMs=${job.durationMs}`);
    if (job.result?.failures) {
      lines.push(`  - Failure categories: ${Object.entries(job.result.failures).map(([code, value]) => `${code}=${value}`).join(', ')}`);
    }
  }
  lines.push('', 'Completed processing does not mean every email was delivered. Review failed/blocked counters in Admin.', '');
  return lines.join('\n');
}

async function main() {
  let summary;
  try {
    const report = await invokeBackgroundJobs({ appUrl: process.env.BACKGROUND_APP_URL, secret: process.env.CRON_SECRET });
    summary = formatSummary(report);
    console.info(summary);
  } catch (error) {
    const safe = error instanceof SchedulerError ? error : new SchedulerError('NETWORK');
    console.error(`${safe.code}: ${safe.message}${safe.status ? ` (HTTP ${safe.status})` : ''}`);
    summary = safe.report ? formatSummary(safe.report) : '## DreamVault background jobs\n\nRun failed. See the safe error in the job log.\n';
    process.exitCode = 1;
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    try { await appendFile(process.env.GITHUB_STEP_SUMMARY, summary, 'utf8'); }
    catch { console.error('The safe job summary could not be written.'); process.exitCode = 1; }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
