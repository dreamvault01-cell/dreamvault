import Link from 'next/link';
import { getCategories, getProductsByCategory, getProducts } from '@/lib/data';
import ProductCard from '@/components/ProductCard';

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const categories = await getCategories();
  const category = categories.find((c) => c.slug === slug);
  const categoryProducts = await getProductsByCategory(slug);
  const allProducts = await getProducts();

  // If category not found, show all products as fallback
  const displayProducts = categoryProducts.length > 0 ? categoryProducts : allProducts;
  const title = category?.name || 'All Posters';
  const description = category?.description || 'Browse our complete collection';

  return (
    <div style={{ paddingTop: '10px' }}>
      {/* Hero Banner */}
      <section
        style={{
          position: 'relative',
          padding: 'clamp(3rem, 6vw, 5rem) 0',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-subtle)',
          overflow: 'hidden',
        }}
      >
        {category && (
          <>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0.15,
                backgroundImage: `url(${category.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(40px)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(180deg, var(--bg-secondary) 0%, transparent 40%, var(--bg-secondary) 100%)',
              }}
            />
          </>
        )}

        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="pdp-breadcrumb" style={{ marginBottom: '1.5rem' }}>
            <Link href="/">Home</Link>
            <span>/</span>
            <Link href="/collections">Collections</Link>
            <span>/</span>
            <span style={{ color: 'var(--text-secondary)' }}>{title}</span>
          </div>

          <h1
            className="section-title"
            style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: '0.5rem' }}
          >
            {title}
          </h1>
          <p className="section-subtitle">{description}</p>
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              marginTop: '0.5rem',
            }}
          >
            {displayProducts.length} product{displayProducts.length !== 1 ? 's' : ''}
          </p>
        </div>
      </section>

      {/* Products Grid */}
      <section className="section">
        <div className="container">
          <div className="product-grid">
            {displayProducts.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>

          {displayProducts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                No products found in this category yet.
              </p>
              <Link href="/collections" className="btn btn-primary">
                Browse All Collections
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
