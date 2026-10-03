'use client';

import Link from 'next/link';
import { Product } from '@/lib/data';
import { useCart } from '@/context/CartContext';
import { Heart, Eye, Star, StarHalf } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { addToCart } = useCart();
  const discount = Math.round(
    ((product.originalPrice - product.price) / product.originalPrice) * 100
  );

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);
    
    return (
      <>
        {[...Array(full)].map((_, i) => <Star key={`full-${i}`} size={14} fill="currentColor" stroke="currentColor" />)}
        {half && <StarHalf size={14} fill="currentColor" stroke="currentColor" />}
        {[...Array(empty)].map((_, i) => <Star key={`empty-${i}`} size={14} stroke="currentColor" />)}
      </>
    );
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      size: product.sizes[0],
      quantity: 1,
      slug: product.slug,
    });
  };

  return (
    <Link
      href={`/product/${product.slug}`}
      className="product-card"
      style={{ animationDelay: `${index * 0.08}s` }}
      id={`product-card-${product.id}`}
    >
      <div className="product-card-image">
        <img src={product.image} alt={product.name} loading="lazy" />

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
          <button onClick={handleQuickAdd}>Add to Cart</button>
        </div>
      </div>

      <div className="product-card-info">
        <span className="product-card-category">{product.category}</span>
        <h3 className="product-card-name">{product.name}</h3>

        <div className="product-card-rating">
          <span className="stars">{renderStars(product.rating)}</span>
          <span>({product.reviews})</span>
        </div>

        <div className="product-card-price">
          <span className="current">₹{product.price}</span>
          <span className="original">₹{product.originalPrice}</span>
          <span className="discount">{discount}% OFF</span>
        </div>
      </div>
    </Link>
  );
}

