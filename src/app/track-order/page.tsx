'use client';

import { useState } from 'react';

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState('');
  const [searched, setSearched] = useState(false);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
  };

  return (
    <div style={{ paddingTop: '10px' }}>
      {/* Hero */}
      <section
        style={{
          padding: 'clamp(3rem, 8vw, 6rem) 0',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-subtle)',
          textAlign: 'center',
        }}
      >
        <div className="container" style={{ maxWidth: '700px' }}>
          <div className="hero-tag" style={{ margin: '0 auto 1.5rem' }}>ORDER STATUS</div>
          <h1 className="section-title" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', marginBottom: '1rem' }}>
            Track Your <span className="accent">Order</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', lineHeight: 1.8 }}>
            Enter your order ID to check the current status and estimated delivery date.
          </p>
        </div>
      </section>

      {/* Track Form */}
      <section className="section">
        <div className="container" style={{ maxWidth: '600px' }}>
          <form onSubmit={handleTrack} style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
            <input
              type="text"
              placeholder="Enter your Order ID (e.g. DV-20261005-XXXX)"
              value={orderId}
              onChange={(e) => { setOrderId(e.target.value); setSearched(false); }}
              required
              style={{
                flex: 1, padding: '0.9rem 1.25rem', borderRadius: '12px',
                border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)',
                color: 'var(--text-primary)', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none',
              }}
            />
            <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
              Track Order
            </button>
          </form>

          {searched && orderId && (
            <div style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
              borderRadius: '16px', padding: '2rem', textAlign: 'center',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📦</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                No order found
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.7 }}>
                We couldn&apos;t find an order with ID &quot;{orderId}&quot;. Please double-check the ID from your
                confirmation email or contact us at{' '}
                <a href="mailto:hello@dreamvault.in" style={{ color: 'var(--accent-gold)' }}>hello@dreamvault.in</a>.
              </p>
            </div>
          )}

          {!searched && (
            <div style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
              borderRadius: '16px', padding: '2.5rem', textAlign: 'center',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔍</div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                Where to find your Order ID?
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.7 }}>
                Your Order ID was sent to your email after placing the order. It starts with &quot;DV-&quot; followed by the date and a unique code.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
