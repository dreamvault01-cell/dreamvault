'use client';

import Link from 'next/link';

export default function CheckoutSuccessPage() {
  return (
    <div style={{ paddingTop: '100px', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: '600px', padding: '2rem' }}>
        <div style={{ fontSize: '5rem', marginBottom: '1rem', color: '#22c55e' }}>✨</div>
        <h1 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-serif)', marginBottom: '1rem' }}>
          Payment <span className="accent">Successful!</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2rem' }}>
          Thank you for your order! Your premium poster is being processed and will be shipped to you shortly. You will receive an email confirmation soon.
        </p>
        <Link href="/collections" className="btn btn-primary btn-lg">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
