'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Check, Copy, FileText, LifeBuoy, Package, Truck } from 'lucide-react';
import SupportPage from '@/components/SupportPage';
import styles from './tracking.module.css';

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState('');
  const [searched, setSearched] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  const handleTrack = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!orderId.trim()) return;
    setOrderId(orderId.trim());
    setSearched(true);
    setCopyState('idle');
  };

  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(orderId);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  };

  return (
    <SupportPage
      eyebrow="A little help with your delivery"
      title={<>Every print.<br /><em>A journey home.</em></>}
      description="A question about your delivery? Have your order reference ready and we’ll help you find your next update."
      breadcrumb="Track your order"
    >
      <div className={styles.layout}>
        <section className={styles.card} aria-labelledby="reference-heading">
          <div className={styles.cardTop}><span>Order care / DreamVault</span><Package size={22} strokeWidth={1.3} aria-hidden="true" /></div>
          <h2 id="reference-heading">Let’s start with<br />your order reference.</h2>
          <p className={styles.intro}>Keep the details together. Add your reference below, then share it with our support team for an update.</p>
          <form onSubmit={handleTrack}>
            <label htmlFor="order-reference">Order reference</label>
            <input
              id="order-reference"
              name="order-reference"
              placeholder="Enter your order reference"
              value={orderId}
              maxLength={120}
              required
              autoComplete="off"
              aria-describedby="reference-hint"
              onChange={(event) => { setOrderId(event.target.value); setSearched(false); setCopyState('idle'); }}
            />
            <p id="reference-hint" className={styles.hint}>Use the reference associated with your order.</p>
            <button type="submit" className={styles.primary}>Get order help <ArrowRight size={18} aria-hidden="true" /></button>
          </form>
          {searched ? (
            <div className={styles.result} role="status" aria-live="polite">
              <span className={styles.resultEyebrow}>Your reference is ready</span>
              <div className={styles.reference}><code>{orderId}</code><button type="button" onClick={copyReference} aria-label={copyState === 'copied' ? 'Reference copied' : 'Copy order reference'}>{copyState === 'copied' ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}</button></div>
              {copyState === 'copied' && <p className={styles.copyFeedback}>Copied. You’re ready to share it.</p>}
              {copyState === 'error' && <p className={styles.copyFeedback}>Please select and copy the reference above.</p>}
              <p>Our team can help with the latest order update. Include this reference when you send your message.</p>
              <Link href="/contact">Ask about this order <ArrowUpRight size={16} aria-hidden="true" /></Link>
            </div>
          ) : (
            <div className={styles.note}><FileText size={18} aria-hidden="true" /><p>Not sure where to find it? Check the order details you saved, or contact us with the email used at checkout.</p></div>
          )}
        </section>
        <aside className={styles.guide} aria-labelledby="guide-heading">
          <div className={styles.packageIllustration} aria-hidden="true"><div><Package size={76} strokeWidth={0.7} /><span>Handled with care.</span></div><span className={styles.illustrationIndex}>DV / From print to place</span></div>
          <span className={styles.eyebrow}>A personal touch</span>
          <h2 id="guide-heading">A little care.<br /><em>All the way home.</em></h2>
          <p>For delivery questions, a missing reference, or something that needs a second look, our team is a message away.</p>
          <div className={styles.guideLinks}>
            <Link href="/shipping-delivery"><Truck size={19} strokeWidth={1.4} aria-hidden="true" /><span>Shipping & delivery<small>Timeframes and the journey to your door</small></span><ArrowUpRight size={16} aria-hidden="true" /></Link>
            <Link href="/contact"><LifeBuoy size={19} strokeWidth={1.4} aria-hidden="true" /><span>Talk to our team<small>A little help with your specific order</small></span><ArrowUpRight size={16} aria-hidden="true" /></Link>
          </div>
        </aside>
      </div>
    </SupportPage>
  );
}
