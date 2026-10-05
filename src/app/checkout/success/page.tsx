'use client';

import Link from 'next/link';

export default function CheckoutSuccessPage() {
  return (
    <div className="container" style={{ paddingTop: '100px', paddingBottom: '100px', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: '600px', padding: '1rem', width: '100%' }}>
        <div style={{ fontSize: 'clamp(3rem, 10vw, 5rem)', marginBottom: '1rem', color: '#22c55e' }}>✨</div>
        <h1 style={{ fontSize: 'clamp(2rem, 6vw, 3rem)', fontFamily: 'var(--font-serif)', marginBottom: '1rem' }}>
          Payment <span className="accent">Successful!</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.95rem, 3vw, 1.1rem)', marginBottom: '2rem' }}>
          Thank you for your order! Your premium poster is being processed and will be shipped to you shortly. You will receive an email confirmation soon.
        </p>
        <Link href="/collections" className="btn btn-primary btn-lg" style={{ width: '100%', maxWidth: '300px' }}>
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
