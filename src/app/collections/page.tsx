'use client';

import Link from 'next/link';
import { categories, products } from '@/data/products';
import ProductCard from '@/components/ProductCard';

export default function CollectionsPage() {
  return (
    <div style={{ paddingTop: '10px' }}>
      {/* Header */}
      <section className="section" style={{ paddingBottom: '2rem' }}>
        <div className="container">
          <h1
            className="section-title"
            style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: '0.5rem' }}
          >
            All <span className="accent">Collections</span>
          </h1>
          <p className="section-subtitle">
            Explore {products.length}+ premium art prints across {categories.length}{' '}
            curated categories
          </p>
        </div>
      </section>

      {/* Category Grid */}
      <section style={{ paddingBottom: 'var(--section-padding)' }}>
        <div className="container">
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

      {/* All Products */}
      <section
        className="section"
        style={{ background: 'var(--bg-secondary)' }}
      >
        <div className="container">
          <div className="section-header">
            <div>
              <h2 className="section-title">
                All <span className="accent">Products</span>
              </h2>
              <p className="section-subtitle">
                Browse our entire collection
              </p>
            </div>
          </div>

          <div className="product-grid">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

