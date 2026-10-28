import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProductBySlug, getProductsByCategory } from '@/lib/data';
import ProductCard from '@/components/ProductCard';
import ProductExperience from '@/components/ProductExperience';

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.status !== 'ACTIVE') notFound();

  const categoryProducts = await getProductsByCategory(product.categorySlug);
  const relatedProducts = categoryProducts.filter((item) => item.id !== product.id).slice(0, 4);

  return (
    <>
      <ProductExperience key={product.id} product={product} />
      {relatedProducts.length > 0 && (
        <section className="section" style={{ background: 'var(--bg-secondary)' }} aria-labelledby="related-art-heading">
          <div className="container">
            <div className="section-header">
              <h2 id="related-art-heading" className="section-title">You may also like</h2>
              <Link href={`/collections/${product.categorySlug}`} className="btn btn-secondary">View collection</Link>
            </div>
            <div className="product-grid">{relatedProducts.map((item, index) => <ProductCard key={item.id} product={item} index={index} />)}</div>
          </div>
        </section>
      )}
    </>
  );
}
