
import Link from 'next/link';
import Image from 'next/image';
import ProductCard from '@/components/ProductCard';
import { getProducts, getCategories } from '@/lib/data';
import { Star, Mail } from 'lucide-react';

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
  {
    name: 'Sneha Patel',
    initials: 'SP',
    role: 'Verified Buyer',
    stars: 5,
    text: 'I was hesitant about ordering art online, but the packaging was incredibly secure. The prints arrived in pristine condition. The matte finish is gorgeous without any glare.',
  },
  {
    name: 'Vikram Singh',
    initials: 'VS',
    role: 'Verified Buyer',
    stars: 5,
    text: 'Excellent customer service. I made a mistake with my shipping address and they fixed it immediately. The anime prints I got are top tier — highly recommend!',
  },
  {
    name: 'Neha Gupta',
    initials: 'NG',
    role: 'Verified Buyer',
    stars: 5,
    text: 'The minimalist collection completely transformed my home office. Everyone on my Zoom calls keeps asking where I got them. Definitely buying more soon.',
  },
];

export default async function Home() {
  const allProducts = await getProducts();
  const bestsellers = allProducts.slice(0, 8);
  const categories = await getCategories();

  return (
    <>
      {/* ==================== HERO SECTION ==================== */}
      <section className="hero" id="hero">
        <div className="container hero-container">
          <div className="hero-content-wrapper">
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
                <div className="hero-stat-value">{allProducts.length}+</div>
                <div className="hero-stat-label">Art Prints</div>
              </div>
              <div>
                <div className="hero-stat-value">300 GSM</div>
                <div className="hero-stat-label">Museum Matte</div>
              </div>
              <div>
                <div className="hero-stat-value">100%</div>
                <div className="hero-stat-label">Quality Guaranteed</div>
              </div>
            </div>
          </div>
          
          <div className="hero-image-wrapper">
            <div className="hero-image-inner">
              <Image
                src="/images/banners/hero.jpg"
                alt="DreamVault Premium Art Prints and Posters"
                width={600}
                height={600}
                priority
              />
              <div className="hero-image-glow"></div>
            </div>
          </div>
        </div>
      </section>


      {/* ==================== CATEGORIES ==================== */}
      <section className="section" id="categories">
        <div className="container">
          <div className="section-header">
            <p className="section-eyebrow">✦ Browse Collections</p>
            <h2 className="section-title">
              Shop by <span className="accent">Category</span>
            </h2>
            <p className="section-subtitle">
              Explore our curated collections for every style and space
            </p>
          </div>

          <div className="category-grid">
            {categories.map((cat) => (
              <Link
                href={`/collections/${cat.slug}`}
                key={cat.slug}
                className="category-card"
              >
                <Image src={cat.image} alt={cat.name} width={400} height={400} loading="lazy" />
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
            <p className="section-eyebrow">★ Customer Favorites</p>
            <h2 className="section-title">
              <span className="accent">Bestsellers</span> & Trending
            </h2>
            <p className="section-subtitle">
              The most loved posters by our community
            </p>
          </div>

          <div className="product-grid">
            {bestsellers.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <Link href="/collections" className="btn btn-secondary btn-lg">
              View All Bestsellers
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== CUSTOM POSTER CTA ==================== */}
      <section className="section" id="custom-cta">
        <div className="container">
          <div className="custom-cta-wrapper">
            <div className="custom-cta-glow"></div>
            <div className="custom-cta-content">
              <div className="custom-cta-text-side">
                <div className="section-eyebrow" style={{ color: 'var(--bg-primary)' }}>✦ Your Photo, Printed</div>
                <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: '1rem', color: 'var(--bg-primary)' }}>
                  Create Your <br />
                  <span style={{ color: 'var(--accent-gold-light)' }}>Custom Poster</span>
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '2rem', maxWidth: '400px' }}>
                  Upload any photo and we&apos;ll print it on premium 300 GSM art paper. 
                  Perfect for personal memories, pet portraits, or unique gifts. 
                  Starting from just ₹149.
                </p>
                <Link href="/custom" className="btn btn-primary btn-lg" id="cta-custom-btn">
                  Start Creating →
                </Link>
              </div>
              <div className="custom-cta-image-side">
                {/* Visual representation of custom upload */}
                <div className="custom-frame">
                  <div className="custom-frame-inner">
                    <Image src="/images/banners/hero.jpg" alt="Custom Poster Example" width={400} height={400} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== WALL SETUP PACKS ==================== */}
      <section className="section" id="wall-packs" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div className="section-header">
            <p className="section-eyebrow">✦ Curated For You</p>
            <h2 className="section-title">
              Wall Setup <span className="accent">Packs</span>
            </h2>
            <p className="section-subtitle">
              Curated poster sets — everything you need for the perfect gallery wall
            </p>
          </div>

          <div className="product-grid">
            {allProducts
              .filter((p) => p.categorySlug === 'wall-setup-packs' || p.badge)
              .slice(0, 4)
              .map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
          </div>
        </div>
      </section>

      {/* ==================== TESTIMONIALS ==================== */}
      <section className="section testimonials-section" id="testimonials">
        <div className="container">
          <div className="section-header">
            <p className="section-eyebrow">★ Trusted by 50,000+ Art Lovers</p>
            <h2 className="section-title">
              What Our <span className="accent">Customers</span> Say
            </h2>
          </div>

          <div className="testimonial-marquee-wrapper">
            <div className="testimonial-track">
              {[...testimonials, ...testimonials].map((t, i) => (
                <div className="testimonial-card" key={`track-${i}`}>
                  <div className="testimonial-quote-icon">&ldquo;</div>
                  <p className="testimonial-text">{t.text}</p>
                  <div className="testimonial-stars" style={{ display: 'flex', gap: '2px' }}>
                    {[...Array(t.stars)].map((_, idx) => (
                      <Star key={idx} size={14} fill="currentColor" stroke="currentColor" />
                    ))}
                  </div>
                  <div className="testimonial-divider"></div>
                  <div className="testimonial-author">
                    <div className="testimonial-avatar">{t.initials}</div>
                    <div>
                      <div className="testimonial-name">{t.name}</div>
                      <div className="testimonial-role">✓ {t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== NEWSLETTER CTA ==================== */}
      <section className="section newsletter-section" id="newsletter">
        <div className="newsletter-wrapper">
          <div className="newsletter-ambient-glow"></div>
          <div className="container">
            <div className="newsletter-banner">
              <div className="newsletter-content">
                <h2 className="newsletter-title">
                  Stay in the <span className="accent">Loop</span>
                </h2>
                <p className="newsletter-desc">
                  Get exclusive drops, early access, and special offers delivered to your inbox.
                </p>
                <form action="#" className="newsletter-form">
                  <div className="newsletter-input-wrapper">
                    <Mail className="newsletter-icon" size={20} />
                    <input
                      type="email"
                      placeholder="Enter your email"
                      id="newsletter-email"
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" id="newsletter-submit">
                    Subscribe
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

