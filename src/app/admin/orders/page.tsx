import Link from 'next/link';
import Image from 'next/image';
import prisma from '@/lib/prisma';
import { formatOrderMoney, getFulfillmentStatusLabel, getPaymentStatusLabel } from '@/lib/order-types';

export default async function AdminOrders() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: { items: { include: { product: { select: { name: true, image: true } } } }, user: { select: { email: true } } },
  });
  return <>
    <div className="admin-page-header"><div><h1 className="admin-page-title">Orders</h1><p className="admin-page-subtitle">{orders.length} total orders · every status change is recorded</p></div></div>
    <div className="admin-table-wrap">{orders.length === 0 ? <div className="admin-empty"><p>No orders yet.</p></div> : <div style={{ overflowX: 'auto' }}><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Fulfilment</th><th>Placed</th><th /></tr></thead><tbody>{orders.map((order) => <tr key={order.id}>
      <td><strong style={{ fontFamily: 'monospace', fontSize: '.82rem' }}>{order.orderReference}</strong></td>
      <td><div className="admin-table-product-name">{order.shippingName}</div><div className="admin-table-product-sub">{order.shippingEmail || order.user?.email || order.shippingPhone}</div></td>
      <td><div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>{order.items.slice(0, 3).map((item) => <Image key={item.id} src={item.product.image} alt={item.product.name} width={32} height={40} className="admin-table-thumb" style={{ width: 32, height: 40 }} />)}{order.items.length > 3 && <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>+{order.items.length - 3}</span>}</div><small style={{ color: 'var(--text-muted)' }}>{order.items.reduce((sum, item) => sum + item.quantity, 0)} print{order.items.reduce((sum, item) => sum + item.quantity, 0) === 1 ? '' : 's'}</small></td>
      <td style={{ fontWeight: 700 }}>{formatOrderMoney(order.totalAmount)}</td><td><span className="admin-order-pill">{getPaymentStatusLabel(order.paymentStatus, order.paymentMethod)}</span></td><td><span className="admin-order-pill">{getFulfillmentStatusLabel(order.fulfillmentStatus)}</span></td>
      <td style={{ color: 'var(--text-muted)', fontSize: '.8rem', whiteSpace: 'nowrap' }}>{order.createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td><td><Link href={`/admin/orders/${order.id}`} className="admin-btn admin-btn-secondary admin-btn-sm">Manage</Link></td>
    </tr>)}</tbody></table></div>}</div>
  </>;
}
