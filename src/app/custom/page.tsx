import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Clock3, MessageCircle, Palette } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Custom Prints | DreamVault',
  description: 'DreamVault custom photo and quote prints are being prepared. Explore ready-to-order wall art today.',
};

export default function CustomPosterPage() {
  return <main>
    <section className="section" style={{ paddingTop: 'clamp(4rem, 8vw, 7rem)', background: 'var(--bg-secondary)' }}>
      <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'clamp(2rem, 6vw, 5rem)', alignItems: 'center', maxWidth: 1120 }}>
        <div>
          <span className="eyebrow">Custom prints / coming later</span>
          <h1 className="section-title" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', marginTop: 12, lineHeight: 1.02 }}>Made personal.<br /><span className="accent">Built properly.</span></h1>
          <p className="section-subtitle" style={{ maxWidth: 560, margin: '1.35rem 0 0' }}>Custom photo and quote printing is not open for checkout yet. We are preparing the upload, proofing, and production workflow so that it is dependable before we ask you to trust us with a personal image.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 28 }}>
            <Link href="/collections" className="btn btn-primary btn-lg">Explore ready-to-order art <ArrowRight size={17} /></Link>
            <Link href="/contact" className="btn btn-secondary btn-lg">Ask about custom prints <MessageCircle size={17} /></Link>
          </div>
          <p style={{ marginTop: 18, color: 'var(--text-muted)', fontSize: '.86rem' }}>No upload or payment is collected on this page while the service is being prepared.</p>
        </div>
        <figure style={{ margin: 0, position: 'relative', minHeight: 380, overflow: 'hidden', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
          <Image src="/images/banners/hero.jpg" alt="A styled DreamVault art print in a home" fill sizes="(max-width: 800px) 92vw, 480px" style={{ objectFit: 'cover' }} />
          <figcaption style={{ position: 'absolute', inset: 'auto 16px 16px', padding: '14px 16px', borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--bg-primary) 88%, transparent)', border: '1px solid var(--border-subtle)', backdropFilter: 'blur(12px)' }}><strong style={{ display: 'block' }}>The next chapter is personal.</strong><span style={{ color: 'var(--text-secondary)', fontSize: '.84rem' }}>For now, shop the curated collection with confidence.</span></figcaption>
        </figure>
      </div>
    </section>

    <section className="section">
      <div className="container" style={{ maxWidth: 1120 }}>
        <div className="section-header"><p className="section-eyebrow">What is available now</p><h2 className="section-title">Everything needed for a<br /><span className="accent">great wall today.</span></h2></div>
        <div className="features-grid">
          <div className="feature-item"><div className="feature-icon"><Palette size={29} /></div><div className="feature-text"><strong>Curated artwork</strong><span>Shop ready-to-order posters and art prints across the collection.</span></div></div>
          <div className="feature-item"><div className="feature-icon"><Clock3 size={29} /></div><div className="feature-text"><strong>Clear options</strong><span>Choose the available size, paper, and frame finish before you buy.</span></div></div>
          <div className="feature-item"><div className="feature-icon"><MessageCircle size={29} /></div><div className="feature-text"><strong>Helpful support</strong><span>Ask our team if you need help choosing a piece for your space.</span></div></div>
        </div>
      </div>
    </section>
  </main>;
}
