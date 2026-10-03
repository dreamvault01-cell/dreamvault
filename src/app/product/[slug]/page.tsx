import Link from 'next/link';
import { getProductBySlug, getProductsByCategory } from '@/lib/data';
import ProductCard from '@/components/ProductCard';
import AddToCartSection from '@/components/AddToCartSection';
import { Package, Home, Zap, Palette, Gem, Rocket, RefreshCw, Ruler, Gift } from 'lucide-react';

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return (
      <div className="container" style={{ paddingTop: '50px', textAlign: 'center', minHeight: '60vh' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Product Not Found</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          The poster you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link href="/collections" className="btn btn-primary">
          Browse Collections
        </Link>
      </div>
    );
  }

  const categoryProducts = await getProductsByCategory(product.categorySlug);
  const relatedProducts = categoryProducts
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  const discount = Math.round(
    ((product.originalPrice - product.price) / product.originalPrice) * 100
  );

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - (half ? 1 : 0));
  };

  // Delivery date calculation
  const now = new Date();
  const deliveryDate = new Date(now);
  if (now.getHours() >= 14) deliveryDate.setDate(deliveryDate.getDate() + 1);
  deliveryDate.setDate(deliveryDate.getDate() + 4);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const deliveryStr = `${days[deliveryDate.getDay()]}, ${deliveryDate.getDate()} ${months[deliveryDate.getMonth()]}`;

  return (
    <>
      <div className="container">
        <div className="pdp-container">
          {/* Gallery */}
          <div className="pdp-gallery">
            <div className="pdp-main-image">
              <img src={product.image} alt={product.name} />
            </div>
          </div>

          {/* Product Info */}
          <div className="pdp-info">
            <div className="pdp-breadcrumb">
              <Link href="/">Home</Link>
              <span>/</span>
              <Link href="/collections">Collections</Link>
              <span>/</span>
              <Link href={`/collections/${product.categorySlug}`}>{product.category}</Link>
              <span>/</span>
              <span style={{ color: 'var(--text-secondary)' }}>{product.name}</span>
            </div>

            <h1 className="pdp-title">{product.name}</h1>

            <div className="pdp-rating">
              <span className="stars">{renderStars(product.rating)}</span>
              <span>{product.rating}</span>
              <span className="count">({product.reviews} reviews)</span>
            </div>

            <div className="pdp-price">
              <span className="current">₹{product.price}</span>
              <span className="original">₹{product.originalPrice}</span>
              <span className="discount-tag">{discount}% OFF</span>
            </div>

            <p className="pdp-description">{product.description}</p>

            <AddToCartSection product={product} />

            {/* Delivery Tracker */}
            <div className="delivery-tracker">
              <div className="delivery-route">
                <div className="delivery-end">
                  <span className="emoji"><Package size={20} /></span>
                  <span className="label">Order today</span>
                </div>
                <div className="delivery-track">
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      height: 3,
                      marginTop: -1.5,
                      background: 'var(--accent-gold)',
                      borderRadius: 2,
                      width: '100%',
                    }}
                  />
                </div>
                <div className="delivery-end">
                  <span className="emoji"><Home size={20} /></span>
                  <span className="delivery-date">{deliveryStr}</span>
                </div>
              </div>
              <div className="delivery-sub">
                <Zap size={16} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> <b>FREE Express + ₹50 OFF</b> — pay online (UPI / Card)
              </div>
            </div>

            {/* Product Features */}
            <div className="pdp-features">
              <div className="pdp-feature">
                <span className="icon"><Palette size={20} /></span>
                <span>Premium 300 GSM Paper</span>
              </div>
              <div className="pdp-feature">
                <span className="icon"><Gem size={20} /></span>
                <span>Archival Quality Inks</span>
              </div>
              <div className="pdp-feature">
                <span className="icon"><Rocket size={20} /></span>
                <span>Free Express Shipping</span>
              </div>
              <div className="pdp-feature">
                <span className="icon"><RefreshCw size={20} /></span>
                <span>Easy Returns</span>
              </div>
              <div className="pdp-feature">
                <span className="icon"><Ruler size={20} /></span>
                <span>Hand-Inspected Quality</span>
              </div>
              <div className="pdp-feature">
                <span className="icon"><Gift size={20} /></span>
                <span>Gift-Ready Packaging</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="section" style={{ background: 'var(--bg-secondary)' }}>
          <div className="container">
            <div className="section-header">
              <div>
                <h2 className="section-title">
                  You May Also <span className="accent">Like</span>
                </h2>
              </div>
            </div>
            <div className="product-grid">
              {relatedProducts.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
