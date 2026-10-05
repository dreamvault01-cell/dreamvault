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
      <section className="collection-hero">
        {category && (
          <>
            <div
              className="collection-hero-bg"
              style={{ backgroundImage: `url(${category.image})` }}
            />
            <div className="collection-hero-overlay" />
          </>
        )}

        <div className="container collection-hero-content">
          <div className="pdp-breadcrumb" style={{ justifyContent: 'center', marginBottom: '1.5rem' }}>
            <Link href="/">Home</Link>
            <span>/</span>
            <Link href="/collections">Collections</Link>
            <span>/</span>
            <span style={{ color: 'var(--text-secondary)' }}>{title}</span>
          </div>

          <h1 className="section-title" style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', marginBottom: '0.5rem' }}>
            {title}
          </h1>
          <p className="section-subtitle" style={{ margin: '0 auto', maxWidth: '600px' }}>{description}</p>
          <div className="section-eyebrow" style={{ marginTop: '1.5rem', opacity: 0.8 }}>
            {displayProducts.length} Product{displayProducts.length !== 1 ? 's' : ''}
          </div>
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
