import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { SupportError } from './support-validation';
import { hasSameOrigin } from './request-origin';

export const SUPPORT_NO_CACHE = { 'Cache-Control': 'no-store, private', Vary: 'Cookie, Authorization' };

export function supportJson(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: SUPPORT_NO_CACHE });
}

export function supportApiError(error: unknown) {
  if (error instanceof SupportError) return supportJson({ error: error.message }, error.status);
  if (error instanceof Error && error.message === 'Unauthorized') return supportJson({ error: 'Please sign in to continue.' }, 401);
  if (error instanceof Error && error.message === 'Forbidden') return supportJson({ error: 'This action is available to administrators only.' }, 403);
  // No raw SQL errors, customer data, environment values or provider responses in logs/UI.
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const meta = error && typeof error === 'object' && 'meta' in error ? error.meta : null;
  const databaseCode = meta && typeof meta === 'object' && 'code' in meta ? String(meta.code) : '';
  const missingTable = ['P2021', 'P2022', '42P01', '42703'].includes(code)
    || (code === 'P2010' && ['42P01', '42703'].includes(databaseCode));
  return supportJson({ error: missingTable
    ? 'The support database is not ready. Run npm run db:support with the deployed database configured; see docs/SUPPORT_SETUP.md.'
    : 'Support is temporarily unavailable. Your draft has not been cleared. Please try again.' }, 503);
}

export function assertSupportOrigin(request: Request) {
  if (!hasSameOrigin(request)) {
    throw new SupportError(403, 'Please perform this action from your website dashboard.');
  }
}

export async function supportAdmin(request: Request, mutation = false) {
  const { requireAdminApi } = await import('./admin-auth');
  const user = await requireAdminApi();
  if (mutation) assertSupportOrigin(request);
  return user;
}

export async function readSupportBody(request: Request, maxBytes = 32 * 1024): Promise<string> {
  if (Number(request.headers.get('content-length')) > maxBytes) throw new SupportError(413, 'The request is too large.');
  const reader = request.body?.getReader();
  if (!reader) throw new SupportError(400, 'The request body is missing.');
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0;
  let text = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new SupportError(413, 'The request is too large.');
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return text + decoder.decode();
  } catch (error) {
    if (error instanceof SupportError) throw error;
    throw new SupportError(400, 'The request could not be read.');
  } finally {
    reader.releaseLock();
  }
}

export async function readSupportJson(request: Request, maxBytes?: number): Promise<Record<string, unknown>> {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new SupportError(415, 'Please send a JSON request.');
  }
  const raw = await readSupportBody(request, maxBytes);
  try {
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid object');
    return body as Record<string, unknown>;
  } catch {
    throw new SupportError(400, 'Please provide a valid JSON object.');
  }
}

export function assertSupportProcessorSecret(request: Request) {
  const secret = process.env.CRON_SECRET ?? '';
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get('authorization') ?? '');
  if (secret.length < 32 || expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new SupportError(401, 'A valid processor secret is required.');
  }
}
