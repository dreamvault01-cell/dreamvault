import { after, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdminApi } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';
import { processOrderOutbox } from '@/lib/order-notifications';
import { markCodPaymentCollected, markOrderRefunded, OrderStoreError, transitionOrderFulfillment } from '@/lib/order-store';
import { normalizeCancellationReason, normalizeRazorpayRefundId, normalizeTrackingInput, OrderValidationError, validateOrderAdminAction } from '@/lib/order-validation';
import { RazorpayRefundVerificationError, verifyRazorpayRefund } from '@/lib/razorpay-refund';
import { hasSameOrigin } from '@/lib/request-origin';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdminApi();
    if (!hasSameOrigin(request)) return NextResponse.json({ error: 'Please perform this action from the DreamVault dashboard.' }, { status: 403 });
    if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) return NextResponse.json({ error: 'Please send a JSON request.' }, { status: 415 });
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new OrderValidationError('Invalid fulfilment request.');
    const action = validateOrderAdminAction((body as Record<string, unknown>).action);
    const values = body as Record<string, unknown>;
    const tracking = action === 'SHIP' ? normalizeTrackingInput(values) : undefined;
    const cancellationReason = action === 'CANCEL' ? normalizeCancellationReason(values.cancellationReason) : undefined;
    const razorpayRefundId = action === 'MARK_REFUNDED' ? normalizeRazorpayRefundId(values.razorpayRefundId) : undefined;
    const { id } = await params;
    let order: Awaited<ReturnType<typeof transitionOrderFulfillment>>;
    if (action === 'MARK_REFUNDED') {
      const refundTarget = await prisma.order.findUnique({
        where: { id },
        select: { paymentMethod: true, razorpayPaymentId: true, totalAmount: true },
      });
      if (!refundTarget) throw new OrderStoreError(404, 'Order not found.');
      if (refundTarget.paymentMethod !== 'RAZORPAY' || !refundTarget.razorpayPaymentId) {
        throw new OrderStoreError(409, 'Only an online Razorpay payment can be confirmed as a Razorpay refund.');
      }
      const verifiedRefund = await verifyRazorpayRefund({
        refundId: razorpayRefundId!,
        expectedPaymentId: refundTarget.razorpayPaymentId,
        expectedAmountPaise: Math.round(refundTarget.totalAmount * 100),
        expectedCurrency: 'INR',
      });
      order = await markOrderRefunded(id, {
        actorId: admin.id,
        razorpayRefundId: verifiedRefund.id,
        verifiedPaymentId: verifiedRefund.paymentId,
        verifiedAmountPaise: verifiedRefund.amountPaise,
        verifiedCurrency: verifiedRefund.currency,
      });
    } else if (action === 'MARK_COD_COLLECTED') {
      order = await markCodPaymentCollected(id, { actorId: admin.id });
    } else {
      order = await transitionOrderFulfillment(id, {
        action,
        actorId: admin.id,
        carrier: tracking?.carrier,
        trackingNumber: tracking?.trackingNumber,
        trackingUrl: tracking?.trackingUrl,
        cancellationReason,
      });
    }
    if (!order) throw new OrderStoreError(404, 'Order not found.');
    const orderId = order.id;
    after(async () => { await processOrderOutbox({ orderId, limit: 2, budgetMs: 8_000 }).catch(() => undefined); });
    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${id}`);
    revalidatePath('/orders');
    revalidatePath(`/orders/${order.orderReference}`);
    return NextResponse.json({ success: true, orderReference: order.orderReference });
  } catch (error) {
    if (error instanceof OrderValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof OrderStoreError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof RazorpayRefundVerificationError) return NextResponse.json({ error: error.message }, { status: error.status });
    const message = error instanceof Error ? error.message : 'Order update failed.';
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500;
    console.error('Admin fulfilment transition failed', error);
    return NextResponse.json({ error: status === 500 ? 'The order could not be updated. Please try again.' : message }, { status });
  }
}
