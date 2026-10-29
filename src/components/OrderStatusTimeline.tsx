import { Check, Circle, Clock3, PackageCheck, Truck } from 'lucide-react';
import { getCustomerOrderStatus } from '@/lib/order-types';

interface OrderStatusTimelineProps {
  paymentStatus: string;
  fulfillmentStatus: string;
  createdAt?: Date | string;
  processingAt?: Date | string | null;
  shippedAt?: Date | string | null;
  deliveredAt?: Date | string | null;
  cancelledAt?: Date | string | null;
}

function formatDate(value?: Date | string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function OrderStatusTimeline({ paymentStatus, fulfillmentStatus, createdAt, processingAt, shippedAt, deliveredAt, cancelledAt }: OrderStatusTimelineProps) {
  if (fulfillmentStatus === 'CANCELLED') {
    return <div className="order-timeline order-timeline-cancelled"><div className="order-timeline-step is-complete"><span><Clock3 size={16} /></span><div><strong>Order cancelled</strong><small>{formatDate(cancelledAt) || 'This order will not be dispatched.'}</small></div></div></div>;
  }
  const paid = ['PAID', 'COD_PENDING', 'REFUNDED'].includes(paymentStatus);
  const processing = ['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(fulfillmentStatus);
  const shipped = ['SHIPPED', 'DELIVERED'].includes(fulfillmentStatus);
  const delivered = fulfillmentStatus === 'DELIVERED';
  const steps = [
    { label: paid ? 'Order confirmed' : getCustomerOrderStatus(fulfillmentStatus, paymentStatus), date: formatDate(createdAt), complete: paid, icon: Check },
    { label: 'Being prepared', date: formatDate(processingAt), complete: processing, icon: PackageCheck },
    { label: 'With courier', date: formatDate(shippedAt), complete: shipped, icon: Truck },
    { label: 'Delivered', date: formatDate(deliveredAt), complete: delivered, icon: Check },
  ];
  return <ol className="order-timeline">{steps.map((step, index) => {
    const Icon = step.icon;
    return <li className={`order-timeline-step ${step.complete ? 'is-complete' : ''}`} key={step.label}><span>{step.complete ? <Icon size={16} /> : <Circle size={14} />}</span><div><strong>{step.label}</strong><small>{step.date || (index === 0 ? 'We will update this shortly.' : 'Not yet')}</small></div></li>;
  })}</ol>;
}
