import type { Product, ProductVariantData } from './data';
import {
  FRAME_STYLES,
  PRODUCT_FORMATS,
  PRODUCT_SIZES,
  getConfigurationKey,
  getConfigurationLabel,
  normalizeProductConfiguration,
  type FrameStyle,
  type PaperQuality,
  type ProductConfiguration,
  type ProductFormat,
} from './product-configuration';

export const PRINT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  A4: { width: 21, height: 29.7 },
  A3: { width: 29.7, height: 42 },
  A2: { width: 42, height: 59.4 },
  A1: { width: 59.4, height: 84.1 },
};

export interface ProductOption extends ProductConfiguration {
  id: string;
  price: number;
  compareAtPrice: number | null;
  stock: number | null;
  sku: string | null;
}

type ProductOptionSource = Pick<Product, 'id' | 'price' | 'compareAtPrice'> & {
  variants: Array<
    Pick<ProductVariantData, 'id' | 'size' | 'price' | 'compareAtPrice' | 'stock' | 'sku'>
    & Partial<Pick<ProductVariantData, 'format' | 'paper' | 'frame' | 'configurationKey'>>
  >;
};

export function getPrintDimensions(size: string) {
  const key = size.trim().split(' ')[0].toUpperCase();
  return Object.hasOwn(PRINT_DIMENSIONS, key) ? PRINT_DIMENSIONS[key] : null;
}

export function formatPrintSize(size: string) {
  const dimensions = getPrintDimensions(size);
  return dimensions ? `${dimensions.width} × ${dimensions.height} cm` : size;
}

function optionSort(a: ProductOption, b: ProductOption) {
  const sizeDifference = PRODUCT_SIZES.indexOf(a.size) - PRODUCT_SIZES.indexOf(b.size);
  if (sizeDifference !== 0) return sizeDifference;
  const formatDifference = PRODUCT_FORMATS.indexOf(a.format) - PRODUCT_FORMATS.indexOf(b.format);
  if (formatDifference !== 0) return formatDifference;
  return FRAME_STYLES.indexOf(a.frame) - FRAME_STYLES.indexOf(b.frame);
}

export function getProductOptions(product: ProductOptionSource): ProductOption[] {
  if (product.variants.length) {
    return product.variants.map((variant) => {
      const configuration = normalizeProductConfiguration({
        size: variant.size,
        format: variant.format,
        paper: variant.paper,
        frame: variant.frame,
      });
      return {
        id: variant.id,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        stock: variant.stock,
        sku: variant.sku,
        ...configuration,
        configurationKey: variant.configurationKey || getConfigurationKey(configuration),
      };
    }).sort(optionSort);
  }

  // A product created before configurations existed remains a single A4,
  // Classic Matte, unframed poster. We do not invent larger sizes or stock.
  const configuration = normalizeProductConfiguration({ size: 'A4' });
  return [{
    id: `base-${product.id}`,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    stock: null,
    sku: null,
    ...configuration,
  }];
}

export function getAvailableSizes(options: ProductOption[]) {
  return PRODUCT_SIZES.filter((size) => options.some((option) => option.size === size));
}

export function getOptionsForSize(options: ProductOption[], size: string) {
  return options.filter((option) => option.size === size.toUpperCase());
}

export function getOptionByConfiguration(
  options: ProductOption[],
  configuration: Pick<ProductConfiguration, 'size' | 'format' | 'paper' | 'frame'>
) {
  const key = getConfigurationKey(configuration);
  return options.find((option) => option.configurationKey === key);
}

export function getOptionLabel(option: Pick<ProductOption, 'format' | 'paper' | 'frame'>) {
  return getConfigurationLabel(option);
}

export function isLegacyProductOption(option: ProductOption) {
  return option.id.startsWith('base-');
}

export function initialProductOption(options: ProductOption[]) {
  return options.find((option) => option.stock === null || option.stock > 0) ?? options[0];
}

export function formatProductPrice(price: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
  }).format(price);
}

export type { FrameStyle, PaperQuality, ProductFormat };
