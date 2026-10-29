import Link from 'next/link';
import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { PackageOpen } from 'lucide-react';
import prisma from '@/lib/prisma';
import { formatOrderMoney, getCustomerOrderStatus } from '@/lib/order-types';

export default async function OrdersPage() {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect('/sign-in?redirect_url=/orders');
  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id }, select: { id: true } });
  const orders = user ? await prisma.order.findMany({
    where: { userId: user.id }, orderBy: { createdAt: 'desc' },
    include: { items: { include: { product: { select: { name: true } } } } },
  }) : [];

  return <main className="container order-page"><header className="order-page-header"><span className="eyebrow">Your collection</span><h1>My <em>orders.</em></h1><p>Every selection, from confirmation to the moment it reaches your wall.</p></header>
    {orders.length === 0 ? <section className="order-empty"><PackageOpen size={38} strokeWidth={1.2} /><h2>No orders yet</h2><p>When you choose a print, its delivery journey will appear here.</p><Link href="/collections" className="btn btn-primary">Explore prints</Link></section> : <div className="order-list">{orders.map((order) => <article className="order-card" key={order.id}><div className="order-card-top"><div><span className="order-reference">{order.orderReference}</span><h2>{getCustomerOrderStatus(order.fulfillmentStatus, order.paymentStatus)}</h2><small>Placed {order.createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</small></div><strong>{formatOrderMoney(order.totalAmount)}</strong></div><p className="order-card-items">{order.items.map((item) => `${item.product.name} × ${item.quantity}`).join(' · ')}</p><Link className="order-card-link" href={`/orders/${encodeURIComponent(order.orderReference)}`}>View order details <span>→</span></Link></article>)}</div>}
  </main>;
}
