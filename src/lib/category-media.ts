export const CATEGORY_IMAGE_FALLBACK = '/images/category-placeholder.svg';

/** Category covers are optional; a missing cover must never become <Image src="" />. */
export function getCategoryImageSrc(image: string | null | undefined): string {
  return image?.trim() || CATEGORY_IMAGE_FALLBACK;
}
