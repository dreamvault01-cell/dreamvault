import { NextResponse } from 'next/server';
import { validateContactSubmission } from '@/lib/contact';
import { ContactConflictError, ContactRateLimitError, saveContactMessage } from '@/lib/contact-store';

export const runtime = 'nodejs';
const MAX_BODY_BYTES = 32 * 1024;

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Please submit the form from this website.' }, { status: 403 });
  }
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return NextResponse.json({ error: 'Please send a JSON contact message.' }, { status: 415 });
  }
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Your message is too large.' }, { status: 413 });
  }

  let body: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error('Missing body');
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let size = 0;
    let text = '';
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > MAX_BODY_BYTES) {
          await reader.cancel();
          return NextResponse.json({ error: 'Your message is too large.' }, { status: 413 });
        }
        text += decoder.decode(chunk.value, { stream: true });
      }
      text += decoder.decode();
      body = JSON.parse(text);
    } finally {
      reader.releaseLock();
    }
  } catch {
    return NextResponse.json({ error: 'Your message could not be read. Please try again.' }, { status: 400 });
  }

  const result = validateContactSubmission(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error, fieldErrors: result.fieldErrors }, { status: 400 });
  }

  try {
    const reference = await saveContactMessage(result.data);
    return NextResponse.json({ success: true, reference }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof ContactRateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429, headers: { 'Retry-After': '600' } });
    }
    if (error instanceof ContactConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('Contact message could not be saved:', error instanceof Error ? error.name : 'Unknown error');
    return NextResponse.json({ error: 'We could not save your message right now. Your details are still in the form. Please try again shortly.' }, { status: 503 });
  }
}
