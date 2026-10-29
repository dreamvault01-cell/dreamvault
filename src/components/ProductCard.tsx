'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { Product } from '@/lib/data';
import { Heart, Eye } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const router = useRouter();

  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
  const discount = hasDiscount
    ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100)
    : 0;

  const handleChooseOptions = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/product/${product.slug}`);
  };

  return (
    <Link
      href={`/product/${product.slug}`}
      className="product-card"
      style={{ animationDelay: `${index * 0.08}s` }}
      id={`product-card-${product.id}`}
    >
      <div className="product-card-image">
        <Image src={product.image} alt={product.name} width={400} height={400} loading="lazy" />

        {product.badge && (
          <span className="product-card-badge">{product.badge}</span>
        )}

        <div className="product-card-actions">
          <button
            className="product-card-action-btn"
            title="Add to wishlist"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <Heart size={18} />
          </button>
          <button
            className="product-card-action-btn"
            title="Quick view"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <Eye size={18} />
          </button>
        </div>

        <div className="product-card-quick-add">
          <button onClick={handleChooseOptions}>Choose options</button>
        </div>
      </div>

      <div className="product-card-info">
        <span className="product-card-category">{product.category}</span>
        <h3 className="product-card-name">{product.name}</h3>
        {product.shortDescription && (
          <p className="product-card-desc">{product.shortDescription}</p>
        )}

        <div className="product-card-price">
          {product.variants.length > 1 && <span className="product-card-from">From</span>}
          <span className="current">₹{product.price}</span>
          {hasDiscount && (
            <>
              <span className="original">₹{product.compareAtPrice}</span>
              <span className="discount">{discount}% OFF</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
