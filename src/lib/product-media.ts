export interface ProductImageInput {
  url: string;
  alt: string;
  position: number;
  isRoomPreview: boolean;
}

export class ProductMediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProductMediaValidationError';
  }
}

function isImageUrl(value: string): boolean {
  // Root-relative media is supported, but protocol-relative URLs, backslashes,
  // whitespace, and control characters must not bypass URL validation.
  if (/[\\\s]/.test(value) || [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  })) return false;
  if (value.startsWith('/')) return !value.startsWith('//');

  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:'
      && url.hostname === 'res.cloudinary.com'
      && !url.username
      && !url.password
    );
  } catch {
    return false;
  }
}

/** Normalize the complete gallery in its submitted order before saving it. */
export function normalizeProductImages(input: unknown, fallbackAlt: string): ProductImageInput[] {
  if (input === undefined) return [];
  if (!Array.isArray(input)) {
    throw new ProductMediaValidationError('Product images must be an array.');
  }
  if (input.length > 50) {
    throw new ProductMediaValidationError('A product can have at most 50 images.');
  }

  const urls = new Set<string>();
  let roomPreviewCount = 0;

  return input.map((value: unknown, position) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new ProductMediaValidationError(`Image ${position + 1} is invalid.`);
    }

    const image = value as Record<string, unknown>;
    const url = typeof image.url === 'string' ? image.url.trim() : '';
    if (url.length > 2048) {
      throw new ProductMediaValidationError(`Image ${position + 1} URL must be 2,048 characters or fewer.`);
    }
    if (!url || !isImageUrl(url)) {
      throw new ProductMediaValidationError(`Image ${position + 1} needs a valid Cloudinary or root-relative URL.`);
    }
    if (urls.has(url)) {
      throw new ProductMediaValidationError('Each product image must have a different URL.');
    }
    urls.add(url);

    if (image.isRoomPreview !== undefined && typeof image.isRoomPreview !== 'boolean') {
      throw new ProductMediaValidationError('The room preview selection must be true or false.');
    }
    if (image.alt !== undefined && image.alt !== null && typeof image.alt !== 'string') {
      throw new ProductMediaValidationError('Image descriptions must be text.');
    }
    const alt = (typeof image.alt === 'string' ? image.alt.trim() : '') || fallbackAlt.trim();
    if (alt.length > 500) {
      throw new ProductMediaValidationError('Image descriptions must be 500 characters or fewer.');
    }

    const isRoomPreview = image.isRoomPreview === true;
    if (isRoomPreview && ++roomPreviewCount > 1) {
      throw new ProductMediaValidationError('Choose only one artwork-only image for the room preview.');
    }

    return {
      url,
      alt,
      position,
      isRoomPreview,
    };
  });
}

/** Only an explicit admin selection enables a room preview, never alt text. */
export function getRoomPreviewImage<T extends { url: string; position: number; isRoomPreview?: boolean }>(
  images: readonly T[],
): T | undefined {
  return images
    .filter((image) => image.isRoomPreview === true && !!image.url.trim())
    .sort((first, second) => first.position - second.position)[0];
}
