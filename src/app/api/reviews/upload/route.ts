import { NextResponse } from 'next/server';
import { getCurrentCustomer } from '@/lib/customer-auth';
import { hasSameOrigin } from '@/lib/request-origin';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return NextResponse.json({ error: 'Please perform this action from the store.' }, { status: 403 });
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: 'Please sign in before uploading a photo.' }, { status: 401 });
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return NextResponse.json({ error: 'Photo uploads are not configured yet.' }, { status: 503 });
  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: 'Choose a photo first.' }, { status: 400 });
  if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: 'Photos must be 5 MB or smaller.' }, { status: 413 });
  if (!ACCEPTED_IMAGE_TYPES.has(file.type.toLowerCase())) return NextResponse.json({ error: 'Use a JPG, PNG, or WebP photo.' }, { status: 415 });

  try {
    const timestamp = Math.round(Date.now() / 1000);
    const folder = 'dreamvault/reviews';
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-1', encoder.encode(`folder=${folder}&timestamp=${timestamp}${apiSecret}`));
    const signature = Array.from(new Uint8Array(hashBuffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
    const upload = new FormData();
    upload.append('file', file);
    upload.append('api_key', apiKey);
    upload.append('timestamp', String(timestamp));
    upload.append('signature', signature);
    upload.append('folder', folder);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: upload });
    const result: unknown = await response.json().catch(() => null);
    const url = result && typeof result === 'object' && typeof (result as { secure_url?: unknown }).secure_url === 'string'
      ? (result as { secure_url: string }).secure_url : null;
    if (!response.ok || !url || !/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/(?:[^/]+\/)*dreamvault\/reviews\//i.test(url)) return NextResponse.json({ error: 'Photo upload failed. Please try again.' }, { status: 502 });
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Review photo upload failed', error);
    return NextResponse.json({ error: 'Photo upload failed. Please try again.' }, { status: 502 });
  }
}
