import Image from 'next/image';
import Link from 'next/link';
import { currentUser } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, ExternalLink, MapPin, Package } from 'lucide-react';
import prisma from '@/lib/prisma';
import OrderStatusTimeline from '@/components/OrderStatusTimeline';
import { formatOrderMoney, getCustomerOrderStatus, getPaymentStatusLabel } from '@/lib/order-types';

function configurationLabel(configuration: unknown, fallback: string | null) {
  if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration)) return fallback || 'Selected print';
  const label = (configuration as Record<string, unknown>).label;
  return typeof label === 'string' && label.trim() ? label : fallback || 'Selected print';
}

export default async function OrderDetailPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference: rawReference } = await params;
  const reference = rawReference.toUpperCase();
  if (!/^DV-[A-Z0-9-]{8,64}$/.test(reference)) notFound();
  const clerkUser = await currentUser();
  if (!clerkUser) redirect(`/sign-in?redirect_url=/orders/${encodeURIComponent(reference)}`);
  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id }, select: { id: true } });
  if (!user) notFound();
  const order = await prisma.order.findFirst({
    where: { orderReference: reference, userId: user.id },
    include: { items: { include: { product: { select: { name: true, image: true } } } }, events: { orderBy: { createdAt: 'asc' } } },
  });
  if (!order) notFound();
  const customerEvents = order.events.filter((event) => ['ORDER_CREATED', 'PAYMENT_CAPTURED', 'FULFILLMENT_STARTED', 'ORDER_SHIPPED', 'ORDER_DELIVERED', 'ORDER_CANCELLED', 'PAYMENT_REVIEW', 'REFUND_COMPLETED', 'COD_PAYMENT_COLLECTED'].includes(event.type));

  return <main className="container order-page"><Link href="/orders" className="order-back"><ArrowLeft size={16} /> All orders</Link><header className="order-detail-header"><div><span className="eyebrow">Order {order.orderReference}</span><h1>{getCustomerOrderStatus(order.fulfillmentStatus, order.paymentStatus)}</h1><p>Placed {order.createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} · {getPaymentStatusLabel(order.paymentStatus, order.paymentMethod)}</p></div><strong>{formatOrderMoney(order.totalAmount)}</strong></header>
    <div className="order-detail-grid"><section className="order-detail-card"><h2>Order journey</h2><OrderStatusTimeline paymentStatus={order.paymentStatus} fulfillmentStatus={order.fulfillmentStatus} createdAt={order.createdAt} processingAt={order.processingAt} shippedAt={order.shippedAt} deliveredAt={order.deliveredAt} cancelledAt={order.cancelledAt} />
      {order.trackingCarrier && order.trackingNumber && <div className="tracking-box"><Package size={19} /><div><strong>{order.trackingCarrier}</strong><span>Tracking number: {order.trackingNumber}</span>{order.trackingUrl && <a href={order.trackingUrl} target="_blank" rel="noreferrer">Track with courier <ExternalLink size={13} /></a>}</div></div>}
      {order.cancellationReason && <p className="order-note"><strong>Cancellation note:</strong> {order.cancellationReason}</p>}
    </section><aside className="order-detail-card"><h2>Delivery address</h2><div className="address-block"><MapPin size={18} /><p><strong>{order.shippingName}</strong><br />{order.shippingAddress}<br />{order.shippingCity}, {order.shippingState} {order.shippingPin}<br />{order.shippingPhone}</p></div><h2 style={{ marginTop: 28 }}>Your selection</h2>{order.items.map((item) => <div className="order-item" key={item.id}><Image src={item.product.image} alt={item.product.name} width={46} height={58} /><div><strong>{item.product.name}</strong><small>{configurationLabel(item.configuration, item.size)} · Qty {item.quantity}</small></div><b>{formatOrderMoney(item.price * item.quantity)}</b></div>)}</aside></div>
    {customerEvents.length > 0 && <section className="order-detail-card order-event-list"><h2>Updates</h2>{customerEvents.map((event) => <div key={event.id}><span>{event.createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span><p>{event.message || event.type.replaceAll('_', ' ')}</p></div>)}</section>}
  </main>;
}
