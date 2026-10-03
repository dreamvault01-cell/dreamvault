'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function CustomPosterPage() {
  const [uploaded, setUploaded] = useState(false);
  const [selectedSize, setSelectedSize] = useState(0);

  const sizes = [
    { name: 'A4 (8.3" × 11.7")', price: 99 },
    { name: 'A3 (11.7" × 16.5")', price: 149 },
    { name: 'A2 (16.5" × 23.4")', price: 249 },
    { name: 'A1 (23.4" × 33.1")', price: 399 },
  ];

  return (
    <div style={{ paddingTop: '10px' }}>
      {/* Header */}
      <section
        style={{
          padding: 'clamp(3rem, 6vw, 5rem) 0',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-subtle)',
          textAlign: 'center',
        }}
      >
        <div className="container">
          <div className="hero-tag" style={{ margin: '0 auto 1.5rem' }}>
            YOUR PHOTO, PRINTED
          </div>
          <h1
            className="section-title"
            style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: '0.75rem' }}
          >
            Create Your <span className="accent">Custom Poster</span>
          </h1>
          <p
            className="section-subtitle"
            style={{ maxWidth: '560px', margin: '0 auto' }}
          >
            Upload any photo and we&apos;ll turn it into a premium art print on 300 GSM
            paper. Perfect for memories, pet portraits, or unique gifts.
          </p>
        </div>
      </section>

      {/* Builder Section */}
      <section className="section">
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'var(--gap-2xl)',
              maxWidth: '1000px',
              margin: '0 auto',
            }}
          >
            {/* Upload Area */}
            <div>
              <div
                onClick={() => setUploaded(true)}
                style={{
                  aspectRatio: '3 / 4',
                  borderRadius: 'var(--radius-xl)',
                  border: `2px dashed ${uploaded ? 'var(--accent-gold)' : 'var(--border-light)'}`,
                  background: uploaded
                    ? 'rgba(212, 175, 55, 0.05)'
                    : 'var(--bg-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1rem',
                  cursor: 'pointer',
                  transition: 'all var(--transition-base)',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {uploaded ? (
                  <>
                    <img
                      src="/images/products/nature.jpg"
                      alt="Preview"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        position: 'absolute',
                        inset: 0,
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '16px',
                        left: '16px',
                        right: '16px',
                        background: 'var(--bg-glass)',
                        backdropFilter: 'blur(12px)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        my_photo.jpg
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploaded(false);
                        }}
                        style={{
                          color: 'var(--accent-rose)',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: 'rgba(212, 175, 55, 0.08)',
                        border: '1px solid rgba(212, 175, 55, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                      }}
                    >
                      📷
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '4px' }}>
                        Click to upload your photo
                      </p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        JPG, PNG, WEBP · Max 25MB
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Options */}
            <div>
              <h2
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  marginBottom: 'var(--gap-xl)',
                }}
              >
                Customize Your Print
              </h2>

              {/* Size */}
              <div className="pdp-option-group">
                <div className="pdp-option-label">Select Size</div>
                <div className="pdp-sizes">
                  {sizes.map((size, i) => (
                    <button
                      key={size.name}
                      className={`pdp-size-btn ${i === selectedSize ? 'selected' : ''}`}
                      onClick={() => setSelectedSize(i)}
                    >
                      {size.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paper Type */}
              <div className="pdp-option-group">
                <div className="pdp-option-label">Paper Type</div>
                <div className="pdp-sizes">
                  <button className="pdp-size-btn selected">300 GSM Matte Art Paper</button>
                  <button className="pdp-size-btn">Glossy Photo Paper</button>
                </div>
              </div>

              {/* Price */}
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--gap-lg)',
                  marginBottom: 'var(--gap-xl)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>Price</span>
                  <span style={{ fontWeight: 700, fontSize: '1.5rem' }}>
                    ₹{sizes[selectedSize].price}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--accent-gold)',
                    fontWeight: 600,
                  }}
                >
                  ⚡ FREE Express Shipping + ₹50 OFF on prepaid
                </div>
              </div>

              {/* Add to Cart */}
              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginBottom: 'var(--gap-md)' }}
                disabled={!uploaded}
                id="custom-add-to-cart"
              >
                {uploaded
                  ? `Add to Cart — ₹${sizes[selectedSize].price}`
                  : 'Upload a photo first'}
              </button>

              <p
                style={{
                  textAlign: 'center',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                }}
              >
                100% satisfaction guarantee · Easy returns
              </p>

              {/* Features */}
              <div className="pdp-features" style={{ marginTop: 'var(--gap-xl)' }}>
                <div className="pdp-feature">
                  <span className="icon">🎨</span>
                  <span>Premium Paper</span>
                </div>
                <div className="pdp-feature">
                  <span className="icon">💎</span>
                  <span>Archival Inks</span>
                </div>
                <div className="pdp-feature">
                  <span className="icon">🚀</span>
                  <span>Free Shipping</span>
                </div>
                <div className="pdp-feature">
                  <span className="icon">🎁</span>
                  <span>Gift Packaging</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 className="section-title" style={{ marginBottom: 'var(--gap-2xl)' }}>
            How It <span className="accent">Works</span>
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--gap-xl)',
              maxWidth: '800px',
              margin: '0 auto',
            }}
          >
            {[
              { step: '01', icon: '📤', title: 'Upload', desc: 'Choose any photo from your gallery' },
              { step: '02', icon: '🎨', title: 'Customize', desc: 'Pick your size and paper type' },
              { step: '03', icon: '🖨️', title: 'We Print', desc: 'Premium quality on 300 GSM paper' },
              { step: '04', icon: '📦', title: 'Delivered', desc: 'Free express shipping to your door' },
            ].map((item) => (
              <div
                key={item.step}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--gap-xl)',
                }}
              >
                <div
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    color: 'var(--accent-gold)',
                    letterSpacing: '0.15em',
                    marginBottom: '0.75rem',
                  }}
                >
                  STEP {item.step}
                </div>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{item.icon}</div>
                <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{item.title}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

