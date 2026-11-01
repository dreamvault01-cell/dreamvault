'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, ExternalLink, LifeBuoy, Package, Truck } from 'lucide-react';
import SupportPage from '@/components/SupportPage';
import OrderStatusTimeline from '@/components/OrderStatusTimeline';
import { getCustomerOrderStatus } from '@/lib/order-types';
import styles from './tracking.module.css';

interface TrackedOrder {
  orderReference: string;
  createdAt: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  trackingCarrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
}

export default function TrackOrderPage() {
  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTrack = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true); setError(null); setOrder(null);
    try {
      const response = await fetch('/api/orders/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderReference: reference, email }) });
      const result: { order?: TrackedOrder; error?: string } = await response.json();
      if (!response.ok || !result.order) throw new Error(result.error || 'We could not find that order.');
      setOrder(result.order);
    } catch (trackingError) {
      setError(trackingError instanceof Error ? trackingError.message : 'Order tracking is temporarily unavailable.');
    } finally { setLoading(false); }
  };

  return <SupportPage eyebrow="Order care" title={<>Every print.<br /><em>A journey home.</em></>} description="Enter the order reference and the email used at checkout to see a live delivery update." breadcrumb="Track your order">
    <div className={styles.layout}>
      <section className={styles.card} aria-labelledby="reference-heading">
        <div className={styles.cardTop}><span>Order tracking / RareDaze</span><Package size={22} strokeWidth={1.3} aria-hidden="true" /></div>
        <h2 id="reference-heading">Find your<br />order update.</h2>
        <p className={styles.intro}>For privacy, we match the reference with your checkout email before showing delivery details.</p>
        <form onSubmit={handleTrack}>
          <label htmlFor="order-reference">Order reference</label>
          <input id="order-reference" name="order-reference" placeholder="DV-20261028-AB12CD34" value={reference} maxLength={64} required autoComplete="off" onChange={(event) => setReference(event.target.value.toUpperCase())} />
          <label htmlFor="tracking-email" className={styles.secondLabel}>Checkout email</label>
          <input id="tracking-email" name="email" type="email" placeholder="you@example.com" value={email} maxLength={254} required autoComplete="email" onChange={(event) => setEmail(event.target.value)} />
          <button type="submit" className={styles.primary} disabled={loading}>{loading ? 'Finding your update…' : <>Track order <ArrowRight size={18} aria-hidden="true" /></>}</button>
        </form>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {order && <div className={styles.result} role="status" aria-live="polite"><span className={styles.resultEyebrow}>{order.orderReference}</span><h3>{getCustomerOrderStatus(order.fulfillmentStatus, order.paymentStatus)}</h3><OrderStatusTimeline paymentStatus={order.paymentStatus} fulfillmentStatus={order.fulfillmentStatus} createdAt={order.createdAt} shippedAt={order.shippedAt} deliveredAt={order.deliveredAt} cancelledAt={order.cancelledAt} />
          {order.trackingCarrier && order.trackingNumber && <p><strong>{order.trackingCarrier}</strong><br />Tracking number: {order.trackingNumber}</p>}
          {order.trackingUrl && <a href={order.trackingUrl} target="_blank" rel="noreferrer">Open courier tracking <ExternalLink size={15} /></a>}
        </div>}
      </section>
      <aside className={styles.guide} aria-labelledby="guide-heading"><div className={styles.packageIllustration} aria-hidden="true"><div><Package size={76} strokeWidth={.7} /><span>Handled with care.</span></div><span className={styles.illustrationIndex}>RD / From print to place</span></div><span className={styles.eyebrow}>Need a hand?</span><h2 id="guide-heading">A little care.<br /><em>All the way home.</em></h2><p>If an update needs a closer look, our support team can help with your reference.</p><div className={styles.guideLinks}><Link href="/shipping-delivery"><Truck size={19} strokeWidth={1.4} /><span>Shipping & delivery<small>Timeframes and delivery information</small></span><ArrowUpRight size={16} /></Link><Link href="/contact"><LifeBuoy size={19} strokeWidth={1.4} /><span>Talk to our team<small>Help with a specific order</small></span><ArrowUpRight size={16} /></Link></div></aside>
    </div>
  </SupportPage>;
}
