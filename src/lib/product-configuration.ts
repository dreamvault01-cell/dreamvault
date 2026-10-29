/**
 * The sellable choices for a single artwork.
 *
 * A Product is the artwork itself. A ProductVariant is one exact item a
 * customer can buy: its size, print format, paper, and (when applicable)
 * frame. Keeping this vocabulary in one place prevents the storefront,
 * admin, cart, and checkout from disagreeing about what was purchased.
 */

export const PRODUCT_SIZES = ['A4', 'A3', 'A2', 'A1'] as const;
export type ProductSize = (typeof PRODUCT_SIZES)[number];

export const PRODUCT_FORMATS = ['POSTER', 'ART_PRINT', 'FRAMED_ART_PRINT'] as const;
export type ProductFormat = (typeof PRODUCT_FORMATS)[number];

export const PAPER_QUALITIES = ['CLASSIC_MATTE', 'PREMIUM_FINE_ART'] as const;
export type PaperQuality = (typeof PAPER_QUALITIES)[number];

export const FRAME_STYLES = ['NONE', 'BLACK', 'WHITE', 'NATURAL_OAK', 'WALNUT'] as const;
export type FrameStyle = (typeof FRAME_STYLES)[number];

export interface ProductConfiguration {
  size: ProductSize;
  format: ProductFormat;
  paper: PaperQuality;
  frame: FrameStyle;
  configurationKey: string;
}

export interface ProductConfigurationInput {
  size?: unknown;
  format?: unknown;
  paper?: unknown;
  frame?: unknown;
}

export interface ProductVariantInput extends ProductConfigurationInput {
  id?: unknown;
  price?: unknown;
  compareAtPrice?: unknown;
  sku?: unknown;
  stock?: unknown;
}

export interface NormalizedProductVariant extends ProductConfiguration {
  id?: string;
  price: number;
  compareAtPrice: number | null;
  sku: string | null;
  stock: number;
}

export class ProductConfigurationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProductConfigurationValidationError';
  }
}

const defaultConfiguration = {
  format: 'POSTER' as const,
  paper: 'CLASSIC_MATTE' as const,
  frame: 'NONE' as const,
};

export const PRODUCT_OFFERINGS: Omit<ProductConfiguration, 'size' | 'configurationKey'>[] = [
  defaultConfiguration,
  { format: 'ART_PRINT', paper: 'PREMIUM_FINE_ART', frame: 'NONE' },
  { format: 'FRAMED_ART_PRINT', paper: 'PREMIUM_FINE_ART', frame: 'BLACK' },
  { format: 'FRAMED_ART_PRINT', paper: 'PREMIUM_FINE_ART', frame: 'WHITE' },
  { format: 'FRAMED_ART_PRINT', paper: 'PREMIUM_FINE_ART', frame: 'NATURAL_OAK' },
  { format: 'FRAMED_ART_PRINT', paper: 'PREMIUM_FINE_ART', frame: 'WALNUT' },
];

function readString(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ProductConfigurationValidationError(`${field} is required.`);
  }
  return value.trim();
}

function inList<T extends readonly string[]>(value: string, values: T, field: string): T[number] {
  const normalized = value.trim().toUpperCase();
  if (!values.includes(normalized as T[number])) {
    throw new ProductConfigurationValidationError(`Unsupported ${field}.`);
  }
  return normalized as T[number];
}

function parseNumber(value: unknown, field: string) {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) {
    throw new ProductConfigurationValidationError(`${field} must be a valid number.`);
  }
  return parsed;
}

export function getConfigurationKey({ size, format, paper, frame }: Omit<ProductConfiguration, 'configurationKey'>) {
  return `${size}:${format}:${paper}:${frame}`;
}

/**
 * Converts an input into one of the deliberately small launch catalogue
 * combinations. If all three configuration properties are omitted, the
 * input is treated as a legacy Classic Matte poster instead of inventing a
 * premium selection for an old product.
 */
export function normalizeProductConfiguration(input: ProductConfigurationInput): ProductConfiguration {
  const size = inList(readString(input.size, 'Size'), PRODUCT_SIZES, 'size');
  const hasFormat = input.format !== undefined && input.format !== null && input.format !== '';
  const hasPaper = input.paper !== undefined && input.paper !== null && input.paper !== '';
  const hasFrame = input.frame !== undefined && input.frame !== null && input.frame !== '';

  if (!hasFormat && !hasPaper && !hasFrame) {
    return {
      size,
      ...defaultConfiguration,
      configurationKey: getConfigurationKey({ size, ...defaultConfiguration }),
    };
  }

  const format = inList(readString(input.format, 'Format'), PRODUCT_FORMATS, 'format');
  const paper = inList(readString(input.paper, 'Paper quality'), PAPER_QUALITIES, 'paper quality');
  const frame = inList(readString(input.frame, 'Frame style'), FRAME_STYLES, 'frame style');

  const isPoster = format === 'POSTER' && paper === 'CLASSIC_MATTE' && frame === 'NONE';
  const isFineArt = format === 'ART_PRINT' && paper === 'PREMIUM_FINE_ART' && frame === 'NONE';
  const isFramed = format === 'FRAMED_ART_PRINT' && paper === 'PREMIUM_FINE_ART' && frame !== 'NONE';

  if (!isPoster && !isFineArt && !isFramed) {
    throw new ProductConfigurationValidationError(
      'Use Classic Matte for poster prints, Premium Fine-Art Matte for art prints, and a premium paper with a selected frame for framed art prints.'
    );
  }

  return {
    size,
    format,
    paper,
    frame,
    configurationKey: getConfigurationKey({ size, format, paper, frame }),
  };
}

export function normalizeProductVariants(value: unknown): NormalizedProductVariant[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ProductConfigurationValidationError('Add at least one sellable configuration.');
  }
  if (value.length > PRODUCT_SIZES.length * PRODUCT_OFFERINGS.length) {
    throw new ProductConfigurationValidationError('Too many sellable configurations.');
  }

  const configurationKeys = new Set<string>();
  const skus = new Set<string>();

  return value.map((candidate, index) => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      throw new ProductConfigurationValidationError(`Configuration ${index + 1} is invalid.`);
    }

    const input = candidate as ProductVariantInput;
    const configuration = normalizeProductConfiguration(input);
    if (configurationKeys.has(configuration.configurationKey)) {
      throw new ProductConfigurationValidationError('Each size, print type, paper, and frame combination can appear only once.');
    }
    configurationKeys.add(configuration.configurationKey);

    const price = parseNumber(input.price, 'Price');
    if (price <= 0 || price > 1_000_000) {
      throw new ProductConfigurationValidationError('Price must be greater than zero.');
    }

    const compareAtPrice = input.compareAtPrice === undefined || input.compareAtPrice === null || input.compareAtPrice === ''
      ? null
      : parseNumber(input.compareAtPrice, 'Compare-at price');
    if (compareAtPrice !== null && (compareAtPrice <= price || compareAtPrice > 1_000_000)) {
      throw new ProductConfigurationValidationError('Compare-at price must be higher than the selling price.');
    }

    const stock = parseNumber(input.stock, 'Stock');
    if (!Number.isInteger(stock) || stock < 0 || stock > 1_000_000) {
      throw new ProductConfigurationValidationError('Stock must be a whole number of zero or more.');
    }

    const sku = input.sku === undefined || input.sku === null || input.sku === '' ? null : readString(input.sku, 'SKU');
    if (sku && sku.length > 100) {
      throw new ProductConfigurationValidationError('SKU must be 100 characters or fewer.');
    }
    if (sku) {
      const skuKey = sku.toUpperCase();
      if (skus.has(skuKey)) {
        throw new ProductConfigurationValidationError('Each SKU must be unique within this product.');
      }
      skus.add(skuKey);
    }

    const id = input.id === undefined || input.id === null || input.id === '' ? undefined : readString(input.id, 'Variant id');
    if (id && id.length > 191) {
      throw new ProductConfigurationValidationError('Variant id is invalid.');
    }

    return { ...configuration, id, price, compareAtPrice, sku, stock };
  });
}

export function getLowestConfigurationPricing(variants: Array<Pick<NormalizedProductVariant, 'price' | 'compareAtPrice'>>) {
  const lowest = [...variants].sort((first, second) => first.price - second.price)[0];
  if (!lowest) {
    throw new ProductConfigurationValidationError('Add at least one sellable configuration.');
  }
  return {
    price: lowest.price,
    compareAtPrice: lowest.compareAtPrice && lowest.compareAtPrice > lowest.price ? lowest.compareAtPrice : null,
  };
}

export function getFormatLabel(format: ProductFormat) {
  if (format === 'POSTER') return 'Poster Print';
  if (format === 'ART_PRINT') return 'Premium Art Print';
  return 'Framed Art Print';
}

export function getPaperLabel(paper: PaperQuality) {
  return paper === 'CLASSIC_MATTE' ? 'Classic Matte Poster' : 'Premium Fine-Art Matte';
}

export function getFrameLabel(frame: FrameStyle) {
  const labels: Record<FrameStyle, string> = {
    NONE: 'No frame',
    BLACK: 'Black',
    WHITE: 'White',
    NATURAL_OAK: 'Natural Oak',
    WALNUT: 'Walnut',
  };
  return labels[frame];
}

export function getConfigurationLabel(configuration: Pick<ProductConfiguration, 'format' | 'paper' | 'frame'>) {
  const parts = [getFormatLabel(configuration.format), getPaperLabel(configuration.paper)];
  if (configuration.frame !== 'NONE') parts.push(`${getFrameLabel(configuration.frame)} frame`);
  return parts.join(' · ');
}

export function getConfigurationShortLabel(configuration: Pick<ProductConfiguration, 'format' | 'frame'>) {
  if (configuration.frame !== 'NONE') return `${getFrameLabel(configuration.frame)} frame`;
  return getFormatLabel(configuration.format);
}

export function getFormatDescription(format: ProductFormat) {
  if (format === 'POSTER') return 'Classic Matte Poster · print only';
  if (format === 'ART_PRINT') return 'Premium Fine-Art Matte · print only';
  return 'Premium Fine-Art Matte · ready-framed';
}
