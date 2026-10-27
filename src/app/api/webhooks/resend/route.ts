import { handleSupportWebhookRequest } from '@/lib/support-inbound';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  return handleSupportWebhookRequest(request);
}
