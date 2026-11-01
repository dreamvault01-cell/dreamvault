/** Public brand identity. Operational IDs and service addresses stay unchanged. */
export const BRAND_NAME = 'RareDaze';
export const BRAND_WORDMARK = 'RAREDAZE';
export const BRAND_SUPPORT_NAME = `${BRAND_NAME} Support`;
export const BRAND_DESCRIPTION = 'Curated posters, premium art prints, and framed pieces for the rooms you live in.';
export const BRAND_WORDMARK_PATH = '/brand/raredaze-wordmark.png';

/** Upgrade the previous display names without overriding an intentional custom name. */
export function getBrandDisplayName(value: string | undefined, fallback = BRAND_NAME): string {
  const name = value?.trim();
  if (!name) return fallback;
  if (/^dreamvault$/i.test(name)) return BRAND_NAME;
  if (/^dreamvault\s+support$/i.test(name)) return BRAND_SUPPORT_NAME;
  return name;
}
