'use client';

import Link from 'next/link';

export default function AboutPage() {
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
          <div className="hero-tag" style={{ margin: '0 auto 1.5rem' }}>
            OUR STORY
          </div>
          <h1
            className="section-title"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', marginBottom: '1rem' }}
          >
            About <span className="accent">DreamVault</span>
          </h1>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: 'clamp(1rem, 1.5vw, 1.15rem)',
              lineHeight: 1.8,
            }}
          >
            We believe every wall tells a story. DreamVault was born from a simple idea:
            make premium art accessible to everyone. We curate and create stunning posters
            and art prints that transform ordinary spaces into extraordinary experiences.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="section">
        <div className="container">
          <h2
            className="section-title"
            style={{ textAlign: 'center', marginBottom: 'var(--gap-2xl)' }}
          >
            What Sets Us <span className="accent">Apart</span>
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 'var(--gap-xl)',
            }}
          >
            {[
              {
                icon: '🎨',
                title: 'Premium Quality',
                desc: 'Every poster is printed on thick 300 GSM matte art paper with archival-quality inks that stay vibrant for decades.',
              },
              {
                icon: '✨',
                title: 'Curated Collections',
                desc: "We don't just sell posters — we curate experiences. Each collection is thoughtfully designed to work together beautifully.",
              },
              {
                icon: '🚀',
                title: 'Lightning-Fast Delivery',
                desc: 'Free express shipping on every order. We dispatch same-day before 2 PM and deliver in 3-5 business days across India.',
              },
              {
                icon: '💎',
                title: 'Affordable Luxury',
                desc: 'Premium quality at prices that make sense. Starting from just ₹99, we make art accessible to every budget.',
              },
              {
                icon: '🎁',
                title: 'Gift-Ready Packaging',
                desc: 'Every order arrives in protective packaging with a premium unboxing experience. Perfect for gifting.',
              },
              {
                icon: '🔄',
                title: '100% Satisfaction',
                desc: "Not happy? We'll make it right. Our hassle-free return policy means you can shop with complete confidence.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="testimonial-card"
                style={{ textAlign: 'center' }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
                  {item.icon}
                </div>
                <h3
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    marginBottom: '0.75rem',
                  }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.9rem',
                    lineHeight: 1.7,
                  }}
                >
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section
        className="section"
        style={{ background: 'var(--bg-secondary)' }}
      >
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 'var(--gap-xl)',
              textAlign: 'center',
            }}
          >
            {[
              { value: '50,000+', label: 'Happy Customers' },
              { value: '500+', label: 'Unique Designs' },
              { value: '4.9 / 5', label: 'Average Rating' },
              { value: '99%', label: 'Satisfaction Rate' },
            ].map((stat, i) => (
              <div key={i}>
                <div className="hero-stat-value" style={{ fontSize: '2.5rem' }}>
                  {stat.value}
                </div>
                <div className="hero-stat-label" style={{ fontSize: '0.9rem' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container">
          <div className="cta-banner" style={{ textAlign: 'center' }}>
            <div className="cta-content" style={{ maxWidth: '500px', margin: '0 auto' }}>
              <h2>Ready to Transform Your Space?</h2>
              <p>
                Browse our curated collections and find the perfect art for your walls.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/collections" className="btn btn-primary btn-lg">
                  Shop Now →
                </Link>
                <Link href="/custom" className="btn btn-secondary btn-lg">
                  Create Custom Poster
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

