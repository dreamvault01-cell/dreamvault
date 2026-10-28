'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, ChevronDown, Ruler, ShieldCheck } from 'lucide-react';
import type { Product } from '@/lib/data';
import { useCart } from '@/context/CartContext';
import { formatPrintSize, formatProductPrice, getPrintDimensions, getProductOptions, initialProductOption } from '@/lib/product-options';
import AddToCartSection from './AddToCartSection';
import ProductGallery from './ProductGallery';
import ProductSizeGuide from './ProductSizeGuide';
import styles from './ProductExperience.module.css';

export default function ProductExperience({ product }: { product: Product }) {
  const options = getProductOptions(product);
  const [selectedId, setSelectedId] = useState(() => initialProductOption(options).id);
  const [quantity, setQuantity] = useState(1);
  const [guideOpen, setGuideOpen] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
  const pageRef = useRef<HTMLElement>(null);
  const purchaseRef = useRef<HTMLDivElement>(null);
  const { items, addToCart, isCartOpen } = useCart();
  const current = options.find((option) => option.id === selectedId) ?? initialProductOption(options);
  const cartSize = getPrintDimensions(current.size) ? `${current.size} (${formatPrintSize(current.size)})` : current.size;
  // Older cart entries used rounded dimensions. Match the size key, not its display label.
  const alreadyInCart = items.filter((item) => item.id === product.id && item.size.split(' ')[0].toUpperCase() === current.size.toUpperCase()).reduce((sum, item) => sum + item.quantity, 0);
  const remaining = current.stock === null ? 99 : Math.max(0, current.stock - alreadyInCart);
  const disabled = remaining === 0;
  const safeQuantity = Math.max(1, Math.min(quantity, remaining || 1));
  const compareAt = current.compareAtPrice && current.compareAtPrice > current.price ? current.compareAtPrice : null;
  const discount = compareAt ? Math.round((1 - current.price / compareAt) * 100) : null;

  useEffect(() => {
    const page = pageRef.current;
    const purchase = purchaseRef.current;
    if (!page || !purchase) return;
    let pageInView = false;
    let purchaseInView = false;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === page) pageInView = entry.isIntersecting;
        if (entry.target === purchase) purchaseInView = entry.isIntersecting;
      }
      setStickyVisible(pageInView && !purchaseInView);
    });
    observer.observe(page);
    observer.observe(purchase);
    return () => observer.disconnect();
  }, []);

  const selectSize = (size: string) => {
    const option = options.find((value) => value.size.toUpperCase() === size.toUpperCase());
    if (!option) return;
    setSelectedId(option.id);
    setQuantity(1);
  };

  const addSelectedPrint = () => {
    if (disabled) return;
    addToCart({
      id: product.id, name: product.name, price: current.price,
      compareAtPrice: compareAt, image: product.image, size: cartSize,
      quantity: safeQuantity, slug: product.slug,
    });
  };

  return (
    <section ref={pageRef} className={styles.page} aria-label="Product details">
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/">Home</Link><span aria-hidden="true">/</span>
        <Link href="/collections">Collections</Link><span aria-hidden="true">/</span>
        <Link href={`/collections/${product.categorySlug}`}>{product.category}</Link>
      </nav>

      <div className={styles.layout}>
        <ProductGallery key={product.id} mainImage={product.image} images={product.images} productName={product.name} selectedSize={current.size} />

        <div className={styles.info}>
          <Link className={styles.eyebrow} href={`/collections/${product.categorySlug}`}>{product.category}</Link>
          <h1 className={styles.title}>{product.name}</h1>
          {product.shortDescription && <p className={styles.subtitle}>{product.shortDescription}</p>}

          <div className={styles.priceBlock} aria-live="polite" aria-atomic="true">
            <div className={styles.priceLine}>
              <span className={styles.price} data-testid="product-price">{formatProductPrice(current.price)}</span>
              {compareAt && <del>{formatProductPrice(compareAt)}</del>}
              {discount !== null && discount > 0 && <span className={styles.saving}>Save {discount}%</span>}
            </div>
            <p>Price per print · Frame not included</p>
          </div>

          <div className={styles.sizeHeading}>
            <h2>Print size</h2>
            <button type="button" className={styles.guideButton} onClick={() => setGuideOpen(true)}><Ruler size={15} strokeWidth={1.5} /> Size guide</button>
          </div>
          <div className={styles.sizes} role="group" aria-label="Print size">
            {options.map((option) => (
              <button type="button" key={option.id} className={`${styles.sizeOption} ${option.id === current.id ? styles.selected : ''}`} aria-pressed={option.id === current.id} onClick={() => selectSize(option.size)}>
                <span>{option.size}{option.id === current.id && <Check size={13} aria-hidden="true" />}</span>
                <small>{formatPrintSize(option.size)}</small>
                {option.stock === 0 && <small className={styles.soldOut}>Sold out</small>}
              </button>
            ))}
          </div>
          <dl className={styles.specs}>
            <div><dt>Paper</dt><dd>300 GSM</dd></div>
            <div><dt>Finish</dt><dd>Matte</dd></div>
            <div><dt>Format</dt><dd>Unframed print</dd></div>
          </dl>

          {current.stock !== null && current.stock > 0 && current.stock <= 5 && <p className={styles.stockNote}>Only {current.stock} available in {current.size}.</p>}
          <div ref={purchaseRef}><AddToCartSection option={current} quantity={safeQuantity} maxQuantity={remaining} disabled={disabled} onQuantityChange={setQuantity} onAddToCart={addSelectedPrint} /></div>
          <p className={styles.purchaseNote}><ShieldCheck size={15} strokeWidth={1.5} /> Secure checkout</p>

          <div className={styles.details}>
            <details open>
              <summary>Product details <ChevronDown size={16} strokeWidth={1.5} /></summary>
              <div><p>{product.description}</p><p>Frame and mounting accessories are not included. Keep the print dry and out of prolonged direct sunlight.</p></div>
            </details>
            <details>
              <summary>Delivery & returns <ChevronDown size={16} strokeWidth={1.5} /></summary>
              <div><p>Delivery time and charges depend on your location and order. Review our delivery and returns information before purchasing.</p><Link href="/shipping-delivery">Shipping & delivery <ArrowUpRight size={14} /></Link><Link href="/returns-refunds">Returns & refunds <ArrowUpRight size={14} /></Link></div>
            </details>
          </div>
        </div>
      </div>

      <ProductSizeGuide open={guideOpen} onClose={() => setGuideOpen(false)} selectedSize={current.size} onSelectSize={selectSize} availableSizes={options.map((option) => option.size)} />

      {stickyVisible && !isCartOpen && <div className={styles.mobilePurchase}>
        <div><span>{current.size} · Unframed</span><strong>{formatProductPrice(current.price * safeQuantity)}{safeQuantity > 1 && <small> / {safeQuantity} prints</small>}</strong></div>
        <button type="button" className={styles.addButton} disabled={disabled} onClick={addSelectedPrint}><span>{disabled ? current.stock === 0 ? 'Sold out' : 'In your cart' : 'Add to cart'}</span><ArrowUpRight size={17} aria-hidden="true" /></button>
      </div>}
    </section>
  );
}
