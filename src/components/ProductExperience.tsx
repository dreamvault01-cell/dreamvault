'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, ChevronDown, Ruler, ShieldCheck } from 'lucide-react';
import type { Product } from '@/lib/data';
import { getCartItemKey, useCart } from '@/context/CartContext';
import {
  formatPrintSize,
  formatProductPrice,
  getAvailableSizes,
  getOptionLabel,
  getOptionsForSize,
  getProductOptions,
  initialProductOption,
  isLegacyProductOption,
} from '@/lib/product-options';
import {
  PRODUCT_FORMATS,
  getConfigurationShortLabel,
  getFormatDescription,
  getFormatLabel,
  getFrameLabel,
  getPaperLabel,
  type FrameStyle,
  type ProductFormat,
} from '@/lib/product-configuration';
import AddToCartSection from './AddToCartSection';
import ProductGallery from './ProductGallery';
import ProductSizeGuide from './ProductSizeGuide';
import styles from './ProductExperience.module.css';

const FRAME_SWATCHES: Record<Exclude<FrameStyle, 'NONE'>, string> = {
  BLACK: '#2c2b2a',
  WHITE: '#f2efe8',
  NATURAL_OAK: '#bb8d61',
  WALNUT: '#654333',
};

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
  const availableSizes = getAvailableSizes(options);
  const sizeOptions = getOptionsForSize(options, current.size);
  const availableFormats = PRODUCT_FORMATS.filter((format) => sizeOptions.some((option) => option.format === format));
  const availableFrames = sizeOptions.filter((option) => option.format === 'FRAMED_ART_PRINT');
  const currentCartKey = getCartItemKey({
    id: product.id,
    size: current.size,
    variantId: isLegacyProductOption(current) ? undefined : current.id,
  });
  const alreadyInCart = items
    .filter((item) => {
      if (getCartItemKey(item) === currentCartKey) return true;
      // A cart saved before configurations existed has no variant ID. Treat it
      // as the default Classic Matte poster only, so it cannot affect framed
      // stock but still counts correctly if the customer adds that same print.
      return !item.variantId
        && current.format === 'POSTER'
        && current.paper === 'CLASSIC_MATTE'
        && current.frame === 'NONE'
        && item.id === product.id
        && item.size.split(' ')[0].toUpperCase() === current.size;
    })
    .reduce((sum, item) => sum + item.quantity, 0);
  const remaining = current.stock === null ? 99 : Math.max(0, current.stock - alreadyInCart);
  const disabled = remaining === 0;
  const safeQuantity = Math.max(1, Math.min(quantity, remaining || 1));
  const compareAt = current.compareAtPrice && current.compareAtPrice > current.price ? current.compareAtPrice : null;
  const discount = compareAt ? Math.round((1 - current.price / compareAt) * 100) : null;
  const configurationLabel = getOptionLabel(current);

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

  const selectOption = (nextId: string) => {
    if (nextId === current.id) return;
    setSelectedId(nextId);
    setQuantity(1);
  };

  const selectSize = (size: string) => {
    const candidates = getOptionsForSize(options, size);
    const next = candidates.find((option) => (
      option.format === current.format
      && option.paper === current.paper
      && option.frame === current.frame
    ))
      ?? candidates.find((option) => option.format === current.format && option.frame === current.frame)
      ?? candidates.find((option) => option.format === current.format)
      ?? initialProductOption(candidates);
    if (next) selectOption(next.id);
  };

  const selectFormat = (format: ProductFormat) => {
    const candidates = sizeOptions.filter((option) => option.format === format);
    const next = candidates.find((option) => option.frame === current.frame)
      ?? candidates.find((option) => format === 'FRAMED_ART_PRINT' && option.frame === 'BLACK')
      ?? initialProductOption(candidates);
    if (next) selectOption(next.id);
  };

  const selectFrame = (frame: FrameStyle) => {
    const next = availableFrames.find((option) => option.frame === frame);
    if (next) selectOption(next.id);
  };

  const addSelectedPrint = () => {
    if (disabled) return;
    addToCart({
      id: product.id,
      variantId: isLegacyProductOption(current) ? undefined : current.id,
      configurationKey: current.configurationKey,
      format: current.format,
      paper: current.paper,
      frame: current.frame,
      configurationLabel,
      name: product.name,
      price: current.price,
      compareAtPrice: compareAt,
      image: product.image,
      size: current.size,
      quantity: safeQuantity,
      slug: product.slug,
    });
  };

  const selectedDetails = current.frame === 'NONE'
    ? 'This is a print-only selection. Frame and mounting accessories are not included.'
    : `This selection includes a ${getFrameLabel(current.frame).toLowerCase()} frame around the Premium Fine-Art Matte print.`;

  return (
    <section ref={pageRef} className={styles.page} aria-label="Product details">
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/">Home</Link><span aria-hidden="true">/</span>
        <Link href="/collections">Collections</Link><span aria-hidden="true">/</span>
        <Link href={`/collections/${product.categorySlug}`}>{product.category}</Link>
      </nav>

      <div className={styles.layout}>
        <ProductGallery
          key={product.id}
          mainImage={product.image}
          images={product.images}
          productName={product.name}
          selectedSize={current.size}
          selectedFormat={current.format}
          selectedPaper={current.paper}
          selectedFrame={current.frame}
        />

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
            <p>{configurationLabel}</p>
          </div>

          <div className={styles.sizeHeading}>
            <h2>Print size</h2>
            <button type="button" className={styles.guideButton} onClick={() => setGuideOpen(true)}><Ruler size={15} strokeWidth={1.5} /> Size guide</button>
          </div>
          <div className={styles.sizes} role="group" aria-label="Print size">
            {availableSizes.map((size) => {
              const choices = getOptionsForSize(options, size);
              const soldOut = choices.every((option) => option.stock === 0);
              return (
                <button type="button" key={size} className={`${styles.sizeOption} ${size === current.size ? styles.selected : ''}`} aria-pressed={size === current.size} onClick={() => selectSize(size)}>
                  <span>{size}{size === current.size && <Check size={13} aria-hidden="true" />}</span>
                  <small>{formatPrintSize(size)}</small>
                  {soldOut && <small className={styles.soldOut}>Sold out</small>}
                </button>
              );
            })}
          </div>

          <div className={styles.configurationHeading}>
            <h2>Print & paper</h2>
            <p>Choose the finish that suits your space.</p>
          </div>
          <div className={styles.configurationOptions} role="group" aria-label="Print type and paper quality">
            {availableFormats.map((format) => (
              <button
                type="button"
                key={format}
                className={`${styles.configurationOption} ${format === current.format ? styles.selected : ''}`}
                aria-pressed={format === current.format}
                onClick={() => selectFormat(format)}
              >
                <span className={styles.formatName}>{getFormatLabel(format)}{format === current.format && <Check size={14} aria-hidden="true" />}</span>
                <small>{getFormatDescription(format)}</small>
              </button>
            ))}
          </div>

          {current.format === 'FRAMED_ART_PRINT' && availableFrames.length > 0 && (
            <div className={styles.frameSection}>
              <div className={styles.frameHeading}><h2>Frame finish</h2><p>Included with this print.</p></div>
              <div className={styles.frameOptions} role="group" aria-label="Frame finish">
                {availableFrames.map((option) => (
                  <button
                    type="button"
                    key={option.id}
                    className={`${styles.frameOption} ${option.id === current.id ? styles.selected : ''}`}
                    aria-pressed={option.id === current.id}
                    onClick={() => selectFrame(option.frame)}
                  >
                    <span className={styles.frameSwatch} style={{ background: FRAME_SWATCHES[option.frame as Exclude<FrameStyle, 'NONE'>] }} aria-hidden="true" />
                    <span>{getFrameLabel(option.frame)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <dl className={styles.specs}>
            <div><dt>Paper</dt><dd>{getPaperLabel(current.paper)}</dd></div>
            <div><dt>Finish</dt><dd>Matte</dd></div>
            <div><dt>Format</dt><dd>{getFormatLabel(current.format)}</dd></div>
            <div><dt>Frame</dt><dd>{current.frame === 'NONE' ? 'Unframed' : getFrameLabel(current.frame)}</dd></div>
          </dl>

          {current.stock !== null && current.stock > 0 && current.stock <= 5 && <p className={styles.stockNote}>Only {current.stock} available for this configuration.</p>}
          <div ref={purchaseRef}><AddToCartSection option={current} quantity={safeQuantity} maxQuantity={remaining} disabled={disabled} onQuantityChange={setQuantity} onAddToCart={addSelectedPrint} /></div>
          <p className={styles.purchaseNote}><ShieldCheck size={15} strokeWidth={1.5} /> Secure checkout</p>

          <div className={styles.details}>
            <details open>
              <summary>Product details <ChevronDown size={16} strokeWidth={1.5} /></summary>
              <div><p>{product.description}</p><p>{selectedDetails} Keep the print dry and out of prolonged direct sunlight.</p></div>
            </details>
            <details>
              <summary>Delivery & returns <ChevronDown size={16} strokeWidth={1.5} /></summary>
              <div><p>Delivery time and charges depend on your location and order. Review our delivery and returns information before purchasing.</p><Link href="/shipping-delivery">Shipping & delivery <ArrowUpRight size={14} /></Link><Link href="/returns-refunds">Returns & refunds <ArrowUpRight size={14} /></Link></div>
            </details>
          </div>
        </div>
      </div>

      <ProductSizeGuide open={guideOpen} onClose={() => setGuideOpen(false)} selectedSize={current.size} onSelectSize={selectSize} availableSizes={availableSizes} />

      {stickyVisible && !isCartOpen && <div className={styles.mobilePurchase}>
        <div><span>{current.size} · {getConfigurationShortLabel(current)}</span><strong>{formatProductPrice(current.price * safeQuantity)}{safeQuantity > 1 && <small> / {safeQuantity} prints</small>}</strong></div>
        <button type="button" className={styles.addButton} disabled={disabled} onClick={addSelectedPrint}><span>{disabled ? current.stock === 0 ? 'Sold out' : 'In your cart' : 'Add to cart'}</span><ArrowUpRight size={17} aria-hidden="true" /></button>
      </div>}
    </section>
  );
}
