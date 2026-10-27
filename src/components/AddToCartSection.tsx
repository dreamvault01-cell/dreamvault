'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import type { Product } from '@/lib/data';

interface AddToCartSectionProps {
  product: Product;
}

export default function AddToCartSection({ product }: AddToCartSectionProps) {
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  // Use real variants if available, fallback to base product
  const hasVariants = product.variants && product.variants.length > 0;
  const variants = hasVariants
    ? product.variants
    : [
        { id: 'default-a4', size: 'A4', price: product.price, compareAtPrice: product.compareAtPrice, sku: null, stock: 99 },
        { id: 'default-a3', size: 'A3', price: product.price + 50, compareAtPrice: null, sku: null, stock: 99 },
        { id: 'default-a2', size: 'A2', price: product.price + 150, compareAtPrice: null, sku: null, stock: 99 },
      ];

  const current = variants[selectedVariant];
  const isOutOfStock = current.stock === 0;

  const sizeLabels: Record<string, string> = {
    A4: 'A4 (21×30 cm)',
    A3: 'A3 (30×42 cm)',
    A2: 'A2 (42×60 cm)',
    A1: 'A1 (60×84 cm)',
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart({
      id: product.id,
      name: product.name,
      price: current.price,
      compareAtPrice: current.compareAtPrice || product.compareAtPrice,
      image: product.image,
      size: sizeLabels[current.size] || current.size,
      quantity,
      slug: product.slug,
    });
  };

  return (
    <>
      <div className="pdp-option-group">
        <div className="pdp-option-label">Select Size</div>
        <div className="pdp-sizes">
          {variants.map((variant, i) => (
            <button
              key={variant.size}
              className={`pdp-size-btn ${i === selectedVariant ? 'selected' : ''} ${variant.stock === 0 ? 'out-of-stock' : ''}`}
              onClick={() => {
                setSelectedVariant(i);
                setQuantity(1);
              }}
              style={variant.stock === 0 ? { opacity: 0.5, textDecoration: 'line-through' } : {}}
            >
              {sizeLabels[variant.size] || variant.size}
              {variant.stock > 0 && variant.stock <= 5 && (
                <span style={{ fontSize: '0.65rem', color: 'var(--accent-gold)', display: 'block' }}>
                  Only {variant.stock} left
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="pdp-option-group">
        <div className="pdp-option-label">Paper Type</div>
        <div className="pdp-sizes">
          <button className="pdp-size-btn selected">300 GSM Premium Matte</button>
        </div>
      </div>

      <div className="pdp-add-row">
        <div className="pdp-qty">
          <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
          <span>{quantity}</span>
          <button onClick={() => setQuantity(Math.min(current.stock, quantity + 1))}>+</button>
        </div>
        <button
          className="btn btn-primary btn-lg"
          style={{ flex: 1, opacity: isOutOfStock ? 0.5 : 1 }}
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          id="pdp-add-to-cart"
        >
          {isOutOfStock ? 'Out of Stock' : `Add to Cart — ₹${current.price * quantity}`}
        </button>
      </div>
    </>
  );
}
