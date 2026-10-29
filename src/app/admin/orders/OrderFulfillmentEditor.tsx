'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, PackageCheck, RotateCcw, Send, XCircle } from 'lucide-react';
import {
  canApplyFulfillmentAction,
  canMarkCodCollected,
  canMarkOrderRefunded,
  getFulfillmentStatusLabel,
  getPaymentStatusLabel,
  type FulfillmentAction,
} from '@/lib/order-types';

type AdminOrderAction = FulfillmentAction | 'MARK_COD_COLLECTED' | 'MARK_REFUNDED';

interface Props {
  orderId: string;
  paymentStatus: string;
  paymentMethod: string;
  fulfillmentStatus: string;
  refundStatus: string;
  razorpayRefundId: string | null;
  trackingCarrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
}

export default function OrderFulfillmentEditor(props: Props) {
  const router = useRouter();
  const [carrier, setCarrier] = useState(props.trackingCarrier || '');
  const [trackingNumber, setTrackingNumber] = useState(props.trackingNumber || '');
  const [trackingUrl, setTrackingUrl] = useState(props.trackingUrl || '');
  const [cancellationReason, setCancellationReason] = useState('');
  const [razorpayRefundId, setRazorpayRefundId] = useState(props.razorpayRefundId || '');
  const [busy, setBusy] = useState<AdminOrderAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (action: AdminOrderAction) => {
    setBusy(action);
    setError(null);
    try {
      const payload: Record<string, unknown> = { action };
      if (action === 'SHIP') Object.assign(payload, { carrier, trackingNumber, trackingUrl });
      if (action === 'CANCEL') payload.cancellationReason = cancellationReason;
      if (action === 'MARK_REFUNDED') payload.razorpayRefundId = razorpayRefundId;
      const response = await fetch(`/api/admin/orders/${props.orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error || 'The order could not be updated.');
      router.refresh();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'The order could not be updated.');
    } finally {
      setBusy(null);
    }
  };

  const can = (action: FulfillmentAction) => canApplyFulfillmentAction(props.fulfillmentStatus, props.paymentStatus, action);
  const canRefund = canMarkOrderRefunded(props.refundStatus, props.paymentStatus, props.fulfillmentStatus);
  const canCollectCod = canMarkCodCollected(props.paymentMethod, props.paymentStatus, props.fulfillmentStatus);

  return <section className="admin-order-editor">
    <div className="admin-order-state">
      <div><span>Payment</span><strong>{getPaymentStatusLabel(props.paymentStatus, props.paymentMethod)}</strong></div>
      <div><span>Fulfilment</span><strong>{getFulfillmentStatusLabel(props.fulfillmentStatus)}</strong></div>
      <div><span>Refund</span><strong>{props.refundStatus === 'NONE' ? 'Not required' : props.refundStatus.replaceAll('_', ' ').toLowerCase()}</strong></div>
    </div>
    {can('SHIP') && <div className="admin-order-action-fields">
      <label>Courier<input value={carrier} onChange={(event) => setCarrier(event.target.value)} placeholder="Delhivery, Blue Dart..." /></label>
      <label>Tracking number<input value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} placeholder="Courier tracking number" /></label>
      <label>Tracking link <small>(optional, HTTPS)</small><input value={trackingUrl} onChange={(event) => setTrackingUrl(event.target.value)} placeholder="https://..." inputMode="url" /></label>
    </div>}
    {can('CANCEL') && <label className="admin-order-cancel-note">Cancellation note <small>(optional)</small><input value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} maxLength={300} placeholder="Why this order is being cancelled" /></label>}
    {canRefund && <label className="admin-order-cancel-note">Razorpay refund ID <small>(issue the refund in Razorpay first)</small><input value={razorpayRefundId} onChange={(event) => setRazorpayRefundId(event.target.value)} maxLength={191} placeholder="rfnd_..." autoCapitalize="off" /></label>}
    {error && <p className="admin-order-error" role="alert">{error}</p>}
    <div className="admin-order-actions">
      {can('PROCESS') && <button className="admin-btn admin-btn-primary" disabled={busy !== null} onClick={() => act('PROCESS')}><PackageCheck size={15} /> {busy === 'PROCESS' ? 'Updating...' : 'Start preparation'}</button>}
      {can('SHIP') && <button className="admin-btn admin-btn-primary" disabled={busy !== null} onClick={() => act('SHIP')}><Send size={15} /> {busy === 'SHIP' ? 'Updating...' : 'Mark as shipped'}</button>}
      {can('DELIVER') && <button className="admin-btn admin-btn-primary" disabled={busy !== null} onClick={() => act('DELIVER')}><CheckCircle2 size={15} /> {busy === 'DELIVER' ? 'Updating...' : 'Mark delivered'}</button>}
      {can('CANCEL') && <button className="admin-btn admin-btn-danger" disabled={busy !== null} onClick={() => act('CANCEL')}><XCircle size={15} /> {busy === 'CANCEL' ? 'Cancelling...' : 'Cancel before dispatch'}</button>}
      {canCollectCod && <button className="admin-btn admin-btn-secondary" disabled={busy !== null} onClick={() => act('MARK_COD_COLLECTED')}><CheckCircle2 size={15} /> {busy === 'MARK_COD_COLLECTED' ? 'Saving...' : 'Confirm COD collection'}</button>}
      {canRefund && <button className="admin-btn admin-btn-secondary" disabled={busy !== null || !razorpayRefundId.trim()} onClick={() => act('MARK_REFUNDED')}><RotateCcw size={15} /> {busy === 'MARK_REFUNDED' ? 'Saving...' : 'Confirm Razorpay refund'}</button>}
    </div>
    {props.fulfillmentStatus === 'CANCELLED' && props.refundStatus === 'PENDING' && <p className="admin-order-helper">Stock has been returned. Issue the full refund in Razorpay, then paste its refund ID above. We verify the payment, amount, and processed status before confirming it.</p>}
    {canCollectCod && <p className="admin-order-helper">After the courier settlement is confirmed, record the cash-on-delivery payment here so this order is included in revenue.</p>}
    {props.refundStatus === 'REFUNDED' && <p className="admin-order-helper">Refund recorded{props.razorpayRefundId ? `: ${props.razorpayRefundId}` : ''}. A confirmation email has been queued; see its delivery status below.</p>}
  </section>;
}
