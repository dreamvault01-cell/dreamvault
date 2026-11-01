import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Layers, PackageCheck, Palette } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import { getCategories, getProducts } from '@/lib/data';

export default async function Home() {
  const allProducts = await getProducts();
  const featuredProducts = allProducts.slice(0, 8);
  const categories = await getCategories();
  const wallSets = allProducts
    .filter((product) => product.categorySlug === 'wall-setup-packs')
    .slice(0, 4);

  return <>
    <section className="hero" id="hero">
      <div className="container hero-container">
        <div className="hero-content-wrapper">
          <div className="hero-tag">Curated art prints and posters</div>
          <h1 className="hero-title"><span className="line">Curate your</span><span className="line"><span className="accent">dream space.</span></span></h1>
          <p className="hero-desc">Choose the artwork that speaks to you, then make it yours as a Poster Print, Premium Art Print, or Framed Art Print. Your exact paper, frame, price, and availability are clear before checkout.</p>
          <div className="hero-buttons">
            <Link href="/collections" className="btn btn-primary btn-lg" id="hero-shop-btn">Shop the collection <ArrowRight size={17} /></Link>
            <Link href="#print-options" className="btn btn-secondary btn-lg" id="hero-options-btn">Explore print options</Link>
          </div>
          <div className="hero-stats" aria-label="RareDaze print options">
            <div><div className="hero-stat-value">{allProducts.length}</div><div className="hero-stat-label">Curated artworks</div></div>
            <div><div className="hero-stat-value">3</div><div className="hero-stat-label">Print formats</div></div>
            <div><div className="hero-stat-value">4</div><div className="hero-stat-label">Frame finishes</div></div>
          </div>
        </div>
        <div className="hero-image-wrapper"><div className="hero-image-inner"><Image src="/images/banners/hero.jpg" alt="A RareDaze art print in a styled interior" width={600} height={600} priority /><div className="hero-image-glow" /></div></div>
      </div>
    </section>

    <section className="section" id="categories">
      <div className="container">
        <div className="section-header"><p className="section-eyebrow">Browse collections</p><h2 className="section-title">Shop by <span className="accent">category</span></h2><p className="section-subtitle">Find art for the mood, room, or story you want to create.</p></div>
        <div className="category-grid">
          {categories.map((category) => <Link href={`/collections/${category.slug}`} key={category.slug} className="category-card"><Image src={category.image} alt={category.name} width={400} height={400} loading="lazy" /><div className="category-card-overlay"><div className="category-card-name">{category.name}</div><div className="category-card-count">{category.productCount} pieces</div></div></Link>)}
        </div>
      </div>
    </section>

    <section className="section" id="featured" style={{ background: 'var(--bg-secondary)' }}>
      <div className="container">
        <div className="section-header"><p className="section-eyebrow">A considered starting point</p><h2 className="section-title"><span className="accent">Featured</span> prints</h2><p className="section-subtitle">A few pieces selected to make choosing easier.</p></div>
        <div className="product-grid">{featuredProducts.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div>
        <div style={{ textAlign: 'center', marginTop: '3rem' }}><Link href="/collections" className="btn btn-secondary btn-lg">View all prints</Link></div>
      </div>
    </section>

    <section className="section" id="print-options">
      <div className="container">
        <div className="custom-cta-wrapper">
          <div className="custom-cta-glow" />
          <div className="custom-cta-content">
            <div className="custom-cta-text-side">
              <div className="section-eyebrow" style={{ color: 'var(--bg-primary)' }}>Your artwork, your finish</div>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: '1rem', color: 'var(--bg-primary)' }}>One piece.<br /><span style={{ color: 'var(--accent-gold-light)' }}>Three ways to own it.</span></h2>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '2rem', maxWidth: '440px' }}>Keep it simple with a Classic Matte Poster Print, step up to a Premium Fine-Art Matte print, or choose a ready-to-hang framed piece in a finish that suits your room.</p>
              <Link href="/collections" className="btn btn-primary btn-lg" id="cta-print-options-btn">Choose your finish <ArrowRight size={17} /></Link>
            </div>
            <div className="custom-cta-image-side"><div className="custom-frame"><div className="custom-frame-inner"><Image src="/images/banners/hero.jpg" alt="A framed RareDaze artwork in a room" width={400} height={400} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div></div></div>
          </div>
        </div>
      </div>
    </section>

    {wallSets.length > 0 && <section className="section" id="wall-packs" style={{ background: 'var(--bg-secondary)' }}>
      <div className="container">
        <div className="section-header"><p className="section-eyebrow">Curated for you</p><h2 className="section-title">Wall setup <span className="accent">packs</span></h2><p className="section-subtitle">Coordinated pieces for an easy, confident gallery wall.</p></div>
        <div className="product-grid">{wallSets.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div>
      </div>
    </section>}

    <section className="section" aria-labelledby="dreamvault-standard">
      <div className="container">
        <div className="section-header"><p className="section-eyebrow">The RareDaze standard</p><h2 id="dreamvault-standard" className="section-title">Clear choices.<br /><span className="accent">Better walls.</span></h2></div>
        <div className="features-grid">
          <div className="feature-item"><div className="feature-icon"><Palette size={30} /></div><div className="feature-text"><strong>Choose your finish</strong><span>Paper and frame details are shown for each option.</span></div></div>
          <div className="feature-item"><div className="feature-icon"><Layers size={30} /></div><div className="feature-text"><strong>Preview the look</strong><span>See available prints in a styled room with your selected frame finish.</span></div></div>
          <div className="feature-item"><div className="feature-icon"><PackageCheck size={30} /></div><div className="feature-text"><strong>Track every order</strong><span>Order history, courier tracking, and secure checkout in one place.</span></div></div>
        </div>
      </div>
    </section>

    <section className="section newsletter-section" id="help">
      <div className="newsletter-wrapper"><div className="newsletter-ambient-glow" /><div className="container"><div className="newsletter-banner"><div className="newsletter-content"><h2 className="newsletter-title">Need a hand<br /><span className="accent">choosing?</span></h2><p className="newsletter-desc">Tell us about your room, artwork, or finish. We will help you find a print that feels right.</p><Link href="/contact" className="btn btn-primary" id="home-contact-btn">Talk to our team <ArrowRight size={17} /></Link></div></div></div></div>
    </section>
  </>;
}
