'use client';

import { ArrowUpRight, Minus, Plus } from 'lucide-react';
import type { ProductOption } from '@/lib/product-options';
import { formatProductPrice } from '@/lib/product-options';
import styles from './ProductExperience.module.css';

interface AddToCartSectionProps {
  option: ProductOption;
  quantity: number;
  maxQuantity: number;
  disabled: boolean;
  onQuantityChange: (quantity: number) => void;
  onAddToCart: () => void;
}

export default function AddToCartSection({ option, quantity, maxQuantity, disabled, onQuantityChange, onAddToCart }: AddToCartSectionProps) {
  return (
    <div className={styles.purchaseRow}>
      <div className={styles.quantity} role="group" aria-label="Print quantity">
        <button type="button" aria-label="Decrease quantity" disabled={disabled || quantity <= 1} onClick={() => onQuantityChange(quantity - 1)}><Minus size={15} /></button>
        <output aria-live="polite" aria-label="Quantity">{quantity}</output>
        <button type="button" aria-label="Increase quantity" disabled={disabled || quantity >= maxQuantity} onClick={() => onQuantityChange(quantity + 1)}><Plus size={15} /></button>
      </div>
      <button type="button" id="pdp-add-to-cart" className={styles.addButton} disabled={disabled} onClick={onAddToCart}>
        <span>{disabled ? option.stock === 0 ? 'Sold out' : 'In your cart' : 'Add to cart'}</span>
        {!disabled && <span>{formatProductPrice(option.price * quantity)} <ArrowUpRight size={17} strokeWidth={1.6} aria-hidden="true" /></span>}
      </button>
    </div>
  );
}
