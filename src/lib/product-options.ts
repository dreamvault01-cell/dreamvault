import type { Product } from './data';

export const PRINT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  A4: { width: 21, height: 29.7 },
  A3: { width: 29.7, height: 42 },
  A2: { width: 42, height: 59.4 },
  A1: { width: 59.4, height: 84.1 },
};

export interface ProductOption {
  id: string;
  size: string;
  price: number;
  compareAtPrice: number | null;
  stock: number | null;
}

export function getPrintDimensions(size: string) {
  const key = size.trim().split(' ')[0].toUpperCase();
  return Object.hasOwn(PRINT_DIMENSIONS, key) ? PRINT_DIMENSIONS[key] : null;
}

export function formatPrintSize(size: string) {
  const dimensions = getPrintDimensions(size);
  return dimensions ? `${dimensions.width} × ${dimensions.height} cm` : size;
}

export function getProductOptions(product: Pick<Product, 'id' | 'price' | 'compareAtPrice' | 'variants'>): ProductOption[] {
  const sizeOrder = Object.keys(PRINT_DIMENSIONS);
  if (product.variants.length) {
    return [...product.variants].sort((a, b) => {
      const first = sizeOrder.indexOf(a.size.toUpperCase());
      const second = sizeOrder.indexOf(b.size.toUpperCase());
      return (first < 0 ? 99 : first) - (second < 0 ? 99 : second);
    }).map(({ id, size, price, compareAtPrice, stock }) => ({ id, size, price, compareAtPrice, stock }));
  }

  // Legacy products have one base-priced A4 print. Do not invent larger variants or stock.
  return [{ id: `base-${product.id}`, size: 'A4', price: product.price, compareAtPrice: product.compareAtPrice, stock: null }];
}

export function initialProductOption(options: ProductOption[]) {
  return options.find((option) => option.stock === null || option.stock > 0) ?? options[0];
}

export function formatProductPrice(price: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
  }).format(price);
}
