import Link from 'next/link';
import { currentUser } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { CheckCircle2, Clock3, PackageCheck } from 'lucide-react';
import prisma from '@/lib/prisma';
import { formatOrderMoney, getCustomerOrderStatus } from '@/lib/order-types';

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string | string[] }>;
}) {
  const params = await searchParams;
  const reference = typeof params.order === 'string' && /^DV-[A-Z0-9-]{8,64}$/i.test(params.order)
    ? params.order.toUpperCase()
    : null;
  if (!reference) redirect('/orders');
  const customer = await currentUser();
  if (!customer) redirect(`/sign-in?redirect_url=${encodeURIComponent(`/checkout/success?order=${reference}`)}`);
  const order = await prisma.order.findFirst({
    where: { orderReference: reference, user: { clerkId: customer.id } },
    select: { paymentStatus: true, paymentMethod: true, fulfillmentStatus: true, totalAmount: true },
  });
  if (!order) notFound();

  // A saved order owned by the signed-in customer is the source of truth.
  // URL flags must never manufacture a paid or cash-on-delivery confirmation.
  const confirmed = ['PAID', 'COD_PENDING'].includes(order.paymentStatus)
    && order.fulfillmentStatus !== 'CANCELLED';
  const pending = !confirmed && !['REFUNDED', 'FAILED', 'EXPIRED', 'CANCELLED'].includes(order.paymentStatus);
  const cod = order.paymentMethod === 'COD';
  const title = confirmed && order.fulfillmentStatus === 'UNFULFILLED'
    ? cod ? 'Order received' : 'Payment confirmed'
    : getCustomerOrderStatus(order.fulfillmentStatus, order.paymentStatus);
  const message = order.paymentStatus === 'PAID_REVIEW'
    ? 'Your payment needs a final review. Please do not pay again; your order page will show the next update.'
    : pending
      ? 'Payment has not been confirmed yet. Check your order status before starting another payment.'
      : confirmed
        ? cod
          ? 'Your cash-on-delivery order is saved. Follow its preparation and delivery on your order page.'
          : 'Your payment is confirmed. Follow preparation and delivery on your order page.'
        : 'View your order for the current payment, refund, and delivery details.';
  const Icon = pending ? Clock3 : confirmed ? cod ? PackageCheck : CheckCircle2 : Clock3;

  return (
    <main className="container" style={{ minHeight: '75vh', display: 'grid', placeItems: 'center', paddingTop: 64, paddingBottom: 64 }}>
      <section style={{ maxWidth: 600, width: '100%', textAlign: 'center', padding: 'clamp(1.5rem, 5vw, 3rem)', border: '1px solid var(--border-light)', borderRadius: 10, background: 'var(--bg-card)' }}>
        <Icon size={48} strokeWidth={1.35} color="var(--accent-gold)" aria-hidden="true" />
        <p className="eyebrow" style={{ marginTop: 20 }}>RareDaze order</p>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2rem, 6vw, 3.25rem)', fontWeight: 400, marginTop: 8 }}>{title}</h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.75, margin: '16px auto 0', maxWidth: 440 }}>{message}</p>
        {reference && <div style={{ margin: '24px auto', padding: '14px 18px', maxWidth: 360, borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' }}><span style={{ display: 'block', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em' }}>Order reference</span><strong style={{ display: 'block', marginTop: 6, letterSpacing: '.05em' }}>{reference}</strong></div>}
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginTop: 16 }}>Order total: <strong>{formatOrderMoney(order.totalAmount)}</strong></p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.65, marginTop: 12 }}>Your order page has the latest details. Keep your order reference for any support request.</p>
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 12, marginTop: 24 }}>
          {reference && <Link href={`/orders/${encodeURIComponent(reference)}`} className="btn btn-primary">View order</Link>}
          <Link href="/collections" className="btn btn-secondary">Continue browsing</Link>
        </div>
      </section>
    </main>
  );
}
