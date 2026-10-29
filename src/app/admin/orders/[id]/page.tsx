import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import prisma from '@/lib/prisma';
import OrderFulfillmentEditor from '../OrderFulfillmentEditor';
import { formatOrderMoney, getOrderNotificationLabel, type OrderNotificationKind } from '@/lib/order-types';

function configurationLabel(configuration: unknown, fallback: string | null) {
  if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration)) return fallback || 'Legacy print';
  const label = (configuration as Record<string, unknown>).label;
  return typeof label === 'string' && label ? label : fallback || 'Legacy print';
}

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, firstName: true, lastName: true } },
      items: { include: { product: { select: { name: true, image: true } } } },
      reservations: { orderBy: { createdAt: 'asc' }, include: { variant: { select: { sku: true, size: true, configurationKey: true } } } },
      events: { orderBy: { createdAt: 'asc' } },
      notifications: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!order) notFound();
  return <>
    <div className="admin-page-header"><div><Link href="/admin/orders" className="admin-back-link"><ArrowLeft size={15} /> All orders</Link><h1 className="admin-page-title">{order.orderReference}</h1><p className="admin-page-subtitle">Placed {order.createdAt.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · {formatOrderMoney(order.totalAmount)}</p></div></div>
    <div className="admin-order-grid"><section className="admin-card"><h2>Fulfilment</h2><OrderFulfillmentEditor orderId={order.id} paymentStatus={order.paymentStatus} paymentMethod={order.paymentMethod} fulfillmentStatus={order.fulfillmentStatus} refundStatus={order.refundStatus} razorpayRefundId={order.razorpayRefundId} trackingCarrier={order.trackingCarrier} trackingNumber={order.trackingNumber} trackingUrl={order.trackingUrl} /></section>
      <section className="admin-card"><h2>Customer & delivery</h2><div className="admin-order-info"><p><strong>{order.shippingName}</strong><br />{order.shippingEmail || order.user?.email || 'No email on this legacy order'}<br />{order.shippingPhone}</p><p>{order.shippingAddress}<br />{order.shippingCity}, {order.shippingState} {order.shippingPin}</p>{order.trackingCarrier && <p><strong>{order.trackingCarrier}</strong><br />{order.trackingNumber}{order.trackingUrl && <><br /><a href={order.trackingUrl} target="_blank" rel="noreferrer">Open tracking <ExternalLink size={12} /></a></>}</p>}</div></section>
    </div>
    <div className="admin-order-grid" style={{ marginTop: '1rem' }}><section className="admin-card"><h2>Prints & inventory</h2><div className="admin-order-items">{order.items.map((item) => <div key={item.id}><Image src={item.product.image} alt={item.product.name} width={42} height={54} /><p><strong>{item.product.name}</strong><span>{configurationLabel(item.configuration, item.size)} · Qty {item.quantity}</span></p><b>{formatOrderMoney(item.price * item.quantity)}</b></div>)}</div>{order.reservations.length > 0 && <div className="admin-reservation-list"><h3>Inventory record</h3>{order.reservations.map((reservation) => <p key={reservation.id}><span>{reservation.variant.sku || reservation.variant.configurationKey}</span><strong>{reservation.quantity} · {reservation.status.toLowerCase()}</strong></p>)}</div>}</section>
      <section className="admin-card"><h2>Customer emails</h2>{order.notifications.length === 0 ? <p className="admin-muted">No order email is queued for this order.</p> : <div className="admin-notification-list">{order.notifications.map((notification) => <p key={notification.id}><strong>{getOrderNotificationLabel(notification.kind as OrderNotificationKind)}</strong><span>{notification.deliveryStatus.toLowerCase()} · {notification.attempts} attempt{notification.attempts === 1 ? '' : 's'}</span>{notification.lastError && <small>{notification.lastError}</small>}</p>)}</div>}</section></div>
    <section className="admin-card" style={{ marginTop: '1rem' }}><h2>Order audit trail</h2><div className="admin-event-list">{order.events.map((event) => <div key={event.id}><time>{event.createdAt.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</time><p><strong>{event.type.replaceAll('_', ' ')}</strong><span>{event.message || 'Recorded'}</span></p></div>)}</div></section>
  </>;
}
