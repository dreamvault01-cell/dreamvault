/**
 * Shared, client-safe vocabulary for the order journey. Keeping these values
 * outside routes prevents an admin screen, customer screen, and database job
 * from describing the same order differently.
 */

export const PAYMENT_STATUSES = [
  'PENDING', 'PAID', 'COD_PENDING', 'FAILED', 'EXPIRED', 'CANCELLED', 'PAID_REVIEW', 'REFUNDED',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const FULFILLMENT_STATUSES = [
  'UNFULFILLED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED',
] as const;
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

export const REFUND_STATUSES = ['NONE', 'NOT_REQUIRED', 'PENDING', 'REFUNDED'] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export const ORDER_NOTIFICATION_KINDS = [
  'ORDER_RECEIVED', 'ORDER_CONFIRMED', 'ORDER_SHIPPED', 'ORDER_DELIVERED', 'ORDER_CANCELLED', 'PAYMENT_REVIEW', 'REFUND_COMPLETED',
] as const;
export type OrderNotificationKind = (typeof ORDER_NOTIFICATION_KINDS)[number];

export const FULFILLMENT_ACTIONS = ['PROCESS', 'SHIP', 'DELIVER', 'CANCEL'] as const;
export type FulfillmentAction = (typeof FULFILLMENT_ACTIONS)[number];

// A refund is deliberately separate from fulfilment. Staff first cancel an
// undispatched order, complete the monetary refund in Razorpay, then record
// the provider refund ID here. This keeps the dashboard truthful without
// pretending that changing an order status moves money.
export const ORDER_ADMIN_ACTIONS = [...FULFILLMENT_ACTIONS, 'MARK_COD_COLLECTED', 'MARK_REFUNDED'] as const;
export type OrderAdminAction = (typeof ORDER_ADMIN_ACTIONS)[number];

export function isPaymentStatus(value: string): value is PaymentStatus {
  return (PAYMENT_STATUSES as readonly string[]).includes(value);
}

export function isFulfillmentStatus(value: string): value is FulfillmentStatus {
  return (FULFILLMENT_STATUSES as readonly string[]).includes(value);
}

export function getPaymentStatusLabel(status: string, paymentMethod?: string) {
  const labels: Record<PaymentStatus, string> = {
    PENDING: 'Awaiting payment',
    PAID: 'Paid',
    COD_PENDING: 'Cash on delivery',
    FAILED: 'Payment failed',
    EXPIRED: 'Payment window expired',
    CANCELLED: 'Payment cancelled',
    PAID_REVIEW: 'Payment needs review',
    REFUNDED: 'Refunded',
  };
  if (paymentMethod === 'COD' && status === 'PENDING') return 'Cash on delivery';
  return isPaymentStatus(status) ? labels[status] : 'Awaiting payment';
}

export function getFulfillmentStatusLabel(status: string) {
  const labels: Record<FulfillmentStatus, string> = {
    UNFULFILLED: 'Waiting to be prepared',
    PROCESSING: 'Being prepared',
    SHIPPED: 'On the way',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
  };
  return isFulfillmentStatus(status) ? labels[status] : 'Waiting to be prepared';
}

export function getOrderNotificationLabel(kind: OrderNotificationKind) {
  const labels: Record<OrderNotificationKind, string> = {
    ORDER_RECEIVED: 'Order received',
    ORDER_CONFIRMED: 'Order confirmed',
    ORDER_SHIPPED: 'Order shipped',
    ORDER_DELIVERED: 'Order delivered',
    ORDER_CANCELLED: 'Order cancelled',
    PAYMENT_REVIEW: 'Payment under review',
    REFUND_COMPLETED: 'Refund completed',
  };
  return labels[kind];
}

export function canApplyFulfillmentAction(
  fulfillmentStatus: string,
  paymentStatus: string,
  action: FulfillmentAction,
) {
  if (action === 'PROCESS') {
    return fulfillmentStatus === 'UNFULFILLED' && ['PAID', 'COD_PENDING'].includes(paymentStatus);
  }
  if (action === 'SHIP') return fulfillmentStatus === 'PROCESSING';
  if (action === 'DELIVER') return fulfillmentStatus === 'SHIPPED';
  if (action === 'CANCEL') return ['UNFULFILLED', 'PROCESSING'].includes(fulfillmentStatus);
  return false;
}

export function canMarkOrderRefunded(refundStatus: string, paymentStatus: string, fulfillmentStatus: string) {
  return refundStatus === 'PENDING'
    && fulfillmentStatus === 'CANCELLED'
    && ['PAID', 'PAID_REVIEW'].includes(paymentStatus);
}

export function canMarkCodCollected(paymentMethod: string, paymentStatus: string, fulfillmentStatus: string) {
  return paymentMethod === 'COD'
    && paymentStatus === 'COD_PENDING'
    && fulfillmentStatus === 'DELIVERED';
}

/** A provider replay must never reopen a refund or repeat a payment review. */
export function getRecordedCaptureOutcome(paymentStatus: string, refundStatus: string, stockCommitted: boolean) {
  if (paymentStatus === 'REFUNDED' || refundStatus === 'REFUNDED') return 'ALREADY_PAID' as const;
  if (paymentStatus === 'PAID_REVIEW') return 'REVIEW' as const;
  if (paymentStatus === 'PAID' && stockCommitted) return 'ALREADY_PAID' as const;
  return null;
}

export function getCustomerOrderStatus(fulfillmentStatus: string, paymentStatus: string) {
  if (paymentStatus === 'REFUNDED') return 'Refunded';
  if (paymentStatus === 'PAID_REVIEW') return 'Payment received — reviewing';
  if (paymentStatus === 'PENDING') return 'Payment pending';
  if (paymentStatus === 'EXPIRED' || paymentStatus === 'FAILED') return 'Payment incomplete';
  return getFulfillmentStatusLabel(fulfillmentStatus);
}

export function formatOrderMoney(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}
