import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin-auth';
import { hasSameOrigin } from '@/lib/request-origin';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

// POST /api/admin/upload — Upload image to Cloudinary
export async function POST(req: Request) {
  try {
    await requireAdminApi();
    if (!hasSameOrigin(req)) return NextResponse.json({ error: 'Please perform this action from the DreamVault dashboard.' }, { status: 403 });

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        {
          error:
            'Cloudinary not configured. Please add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your .env file.',
        },
        { status: 500 }
      );
    }

    const declaredSize = Number(req.headers.get('content-length'));
    if (Number.isFinite(declaredSize) && declaredSize > MAX_IMAGE_BYTES + 64 * 1024) {
      return NextResponse.json({ error: 'Image files must be 10 MB or smaller.' }, { status: 413 });
    }
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: 'Image files must be 10 MB or smaller.' }, { status: 413 });
    if (!ACCEPTED_IMAGE_TYPES.has(file.type.toLowerCase())) {
      return NextResponse.json({ error: 'Use a JPG, PNG, WebP, or AVIF image.' }, { status: 415 });
    }

    // Create Cloudinary upload signature
    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = `folder=dreamvault&timestamp=${timestamp}`;

    // Use Web Crypto API to create SHA-1 signature
    const encoder = new TextEncoder();
    const data = encoder.encode(paramsToSign + apiSecret);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    // Upload to Cloudinary
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('api_key', apiKey);
    uploadFormData.append('timestamp', timestamp.toString());
    uploadFormData.append('signature', signature);
    uploadFormData.append('folder', 'dreamvault');

    const cloudinaryRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body: uploadFormData }
    );

    const result: unknown = await cloudinaryRes.json().catch(() => null);

    if (!cloudinaryRes.ok || !result || typeof result !== 'object' || typeof (result as { secure_url?: unknown }).secure_url !== 'string') {
      return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 502 });
    }
    return NextResponse.json({ url: (result as { secure_url: string }).secure_url });
  } catch (error) {
    console.error('Upload error:', error);
    const message = error instanceof Error ? error.message : '';
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: status === 500 ? 'Upload failed. Please try again.' : message }, { status });
  }
}
