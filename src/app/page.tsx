'use client';

import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { products, categories, getFeaturedProducts } from '@/data/products';

const testimonials = [
  {
    name: 'Arjun Mehta',
    initials: 'AM',
    role: 'Verified Buyer',
    stars: 5,
    text: 'Absolutely blown away by the print quality! The colors are vivid and the 300 GSM paper feels incredibly premium. My living room has never looked this good.',
  },
  {
    name: 'Priya Sharma',
    initials: 'PS',
    role: 'Verified Buyer',
    stars: 5,
    text: 'Ordered the Gallery Wall Pack and it arrived in 3 days. The curation is perfect — everything works together beautifully. Already planning my next order!',
  },
  {
    name: 'Rahul Kumar',
    initials: 'RK',
    role: 'Verified Buyer',
    stars: 5,
    text: 'The custom poster feature is amazing. I uploaded a photo from my trip and it came out looking like a professional art print. Best gift I ever gave myself.',
  },
];

export default function Home() {
  const featured = getFeaturedProducts();
  const bestsellers = products.slice(0, 8);

  return (
    <>
      {/* ==================== HERO SECTION ==================== */}
      <section className="hero" id="hero">
        <div className="hero-bg">
          <img
            src="/images/banners/hero.jpg"
            alt="DreamVault Premium Art Prints and Posters"
          />
        </div>
        <div className="hero-overlay" />

        <div className="container hero-content">
          <div className="hero-tag">✦ Premium Art Prints & Posters</div>

          <h1 className="hero-title">
            <span className="line">Curate Your</span>
            <span className="line">
              <span className="accent">Dream Space</span>
            </span>
          </h1>

          <p className="hero-desc">
            Transform your walls into captivating canvases. Premium 300 GSM art prints
            starting from just ₹149. Free express shipping on every order.
          </p>

          <div className="hero-buttons">
            <Link href="/collections" className="btn btn-primary btn-lg" id="hero-shop-btn">
              Shop Collection →
            </Link>
            <Link href="/custom" className="btn btn-secondary btn-lg" id="hero-custom-btn">
              Create Custom Poster
            </Link>
          </div>

          <div className="hero-stats">
            <div>
              <div className="hero-stat-value">50K+</div>
              <div className="hero-stat-label">Happy Customers</div>
            </div>
            <div>
              <div className="hero-stat-value">500+</div>
              <div className="hero-stat-label">Unique Designs</div>
            </div>
            <div>
              <div className="hero-stat-value">4.9★</div>
              <div className="hero-stat-label">Avg. Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FEATURES BAR ==================== */}
      <section className="features-bar" id="features">
        <div className="container">
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-icon">🚀</div>
              <div className="feature-text">
                <strong>Free Express Shipping</strong>
                <span>Delivered in 3-5 days</span>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🎨</div>
              <div className="feature-text">
                <strong>Premium 300 GSM</strong>
                <span>Museum-quality art paper</span>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">💎</div>
              <div className="feature-text">
                <strong>Archival Inks</strong>
                <span>Vibrant colors that last</span>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🔒</div>
              <div className="feature-text">
                <strong>Secure Payments</strong>
                <span>UPI, Cards & Net Banking</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== CATEGORIES ==================== */}
      <section className="section" id="categories">
        <div className="container">
          <div className="section-header">
            <div>
              <h2 className="section-title">
                Shop by <span className="accent">Category</span>
              </h2>
              <p className="section-subtitle">
                Explore our curated collections for every style and space
              </p>
            </div>
            <Link href="/collections" className="section-link">
              View All →
            </Link>
          </div>

          <div className="category-grid">
            {categories.map((cat) => (
              <Link
                href={`/collections/${cat.slug}`}
                key={cat.slug}
                className="category-card"
              >
                <img src={cat.image} alt={cat.name} loading="lazy" />
                <div className="category-card-overlay">
                  <div className="category-card-name">{cat.name}</div>
                  <div className="category-card-count">
                    {cat.productCount} products
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FEATURED / BESTSELLERS ==================== */}
      <section className="section" id="bestsellers" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div className="section-header">
            <div>
              <h2 className="section-title">
                <span className="accent">Bestsellers</span> & Trending
              </h2>
              <p className="section-subtitle">
                The most loved posters by our community
              </p>
            </div>
            <Link href="/collections" className="section-link">
              Shop All →
            </Link>
          </div>

          <div className="product-grid">
            {bestsellers.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ==================== CUSTOM POSTER CTA ==================== */}
      <section className="section" id="custom-cta">
        <div className="container">
          <div className="cta-banner">
            <div className="cta-content">
              <div
                className="hero-tag"
                style={{ marginBottom: '1rem' }}
              >
                YOUR PHOTO, PRINTED
              </div>
              <h2>Create Your Custom Poster</h2>
              <p>
                Upload any photo and we&apos;ll print it on premium 300 GSM art paper.
                Perfect for personal memories, pet portraits, or unique gifts. Starting
                from just ₹99.
              </p>
              <Link href="/custom" className="btn btn-primary" id="cta-custom-btn">
                Start Creating →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== WALL SETUP PACKS ==================== */}
      <section className="section" id="wall-packs" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div className="section-header">
            <div>
              <h2 className="section-title">
                Wall Setup <span className="accent">Packs</span>
              </h2>
              <p className="section-subtitle">
                Curated poster sets — everything you need for the perfect gallery wall
              </p>
            </div>
            <Link href="/collections/wall-setup-packs" className="section-link">
              View All →
            </Link>
          </div>

          <div className="product-grid">
            {products
              .filter((p) => p.categorySlug === 'wall-setup-packs' || p.badge)
              .slice(0, 4)
              .map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
          </div>
        </div>
      </section>

      {/* ==================== TESTIMONIALS ==================== */}
      <section className="section" id="testimonials">
        <div className="container">
          <div className="section-header">
            <div>
              <h2 className="section-title">
                What Our <span className="accent">Customers</span> Say
              </h2>
              <p className="section-subtitle">
                50,000+ happy customers and counting
              </p>
            </div>
          </div>

          <div className="testimonial-grid">
            {testimonials.map((t, i) => (
              <div className="testimonial-card" key={i}>
                <div className="testimonial-stars">
                  {'★'.repeat(t.stars)}
                </div>
                <p className="testimonial-text">&ldquo;{t.text}&rdquo;</p>
                <div className="testimonial-author">
                  <div className="testimonial-avatar">{t.initials}</div>
                  <div>
                    <div className="testimonial-name">{t.name}</div>
                    <div className="testimonial-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== NEWSLETTER CTA ==================== */}
      <section className="section" id="newsletter" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: '600px' }}>
          <h2 className="section-title" style={{ marginBottom: '0.5rem' }}>
            Stay in the <span className="accent">Loop</span>
          </h2>
          <p className="section-subtitle" style={{ marginBottom: '2rem' }}>
            Get exclusive drops, early access, and special offers delivered to your inbox.
          </p>
          <form
            onSubmit={(e) => e.preventDefault()}
            style={{
              display: 'flex',
              gap: '0.75rem',
              maxWidth: '480px',
              margin: '0 auto',
            }}
          >
            <input
              type="email"
              placeholder="Enter your email"
              id="newsletter-email"
              style={{
                flex: 1,
                padding: '14px 20px',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--border-light)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
            <button type="submit" className="btn btn-primary" id="newsletter-submit">
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </>
  );
}

