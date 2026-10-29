import { after, NextResponse } from 'next/server';
import { processOrderOutbox } from '@/lib/order-notifications';
import { processRazorpayWebhook } from '@/lib/order-store';
import { RazorpayWebhookError, readVerifiedRazorpayWebhook } from '@/lib/razorpay-webhook';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const event = await readVerifiedRazorpayWebhook(request);
    const result = await processRazorpayWebhook(event);
    // Mail delivery is separately durable. A provider acknowledgement should
    // never fail merely because the email provider is having a short outage.
    if ('orderReference' in result && result.orderReference) {
      after(async () => { await processOrderOutbox({ limit: 2, budgetMs: 8_000 }).catch(() => undefined); });
    }
    return NextResponse.json({ received: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof RazorpayWebhookError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
    }
    console.error('Razorpay webhook processing failed', error);
    // A 5xx asks Razorpay to retry a verified event after a transient database
    // or platform failure. Details never leave the server.
    return NextResponse.json({ error: 'Webhook processing is temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
