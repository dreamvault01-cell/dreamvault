import Link from 'next/link';
import Image from 'next/image';
import { getCategories, getProducts } from '@/lib/data';
import ProductCard from '@/components/ProductCard';

export default async function CollectionsPage() {
  const categories = await getCategories();
  const products = await getProducts();

  return (
    <div style={{ paddingTop: '10px' }}>
      <section className="collection-hero" style={{ marginBottom: '3rem' }}>
        <div
          className="collection-hero-bg"
          style={{ backgroundImage: `url(https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=2070&auto=format&fit=crop)` }}
        />
        <div className="collection-hero-overlay" />
        
        <div className="container collection-hero-content">
          <div className="pdp-breadcrumb" style={{ justifyContent: 'center', marginBottom: '1.5rem' }}>
            <Link href="/">Home</Link>
            <span>/</span>
            <span style={{ color: 'var(--text-secondary)' }}>Collections</span>
          </div>

          <h1 className="section-title" style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', marginBottom: '0.5rem' }}>
            All Collections
          </h1>
          <p className="section-subtitle" style={{ margin: '0 auto', maxWidth: '600px' }}>
            Explore {products.length}+ premium art prints across {categories.length} curated categories
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
