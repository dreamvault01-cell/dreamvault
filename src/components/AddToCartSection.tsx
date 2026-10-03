'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import type { Product } from '@/lib/data';

interface AddToCartSectionProps {
  product: Product;
}

export default function AddToCartSection({ product }: AddToCartSectionProps) {
  const [selectedSize, setSelectedSize] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  
  // Hardcoded sizes for now since we didn't add them to the Prisma schema
  const sizes = ["A4 (21x30 cm)", "A3 (30x42 cm)", "A2 (42x60 cm)"];

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      size: sizes[selectedSize],
      quantity,
      slug: product.slug,
    });
  };

  return (
    <>
      <div className="pdp-option-group">
        <div className="pdp-option-label">Select Size</div>
        <div className="pdp-sizes">
          {sizes.map((size, i) => (
            <button
              key={size}
              className={`pdp-size-btn ${i === selectedSize ? 'selected' : ''}`}
              onClick={() => setSelectedSize(i)}
            >
              {size}
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
          <button onClick={() => setQuantity(quantity + 1)}>+</button>
        </div>
        <button
          className="btn btn-primary btn-lg"
          style={{ flex: 1 }}
          onClick={handleAddToCart}
          id="pdp-add-to-cart"
        >
          Add to Cart — ₹{product.price * quantity}
        </button>
      </div>
    </>
  );
}
