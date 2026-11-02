const PHOTO_URL_PATTERN = /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/(?:[^/]+\/)*dreamvault\/reviews\//i;

export class ReviewValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReviewValidationError';
  }
}

export function normalizeReviewInput(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ReviewValidationError('Review details are invalid.');
  const value = input as Record<string, unknown>;
  const rating = typeof value.rating === 'number' ? value.rating : Number(value.rating);
  const title = typeof value.title === 'string' ? value.title.trim() : '';
  const body = typeof value.body === 'string' ? value.body.trim() : '';
  const photoUrls = value.photoUrls === undefined ? [] : value.photoUrls;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new ReviewValidationError('Choose a rating from 1 to 5.');
  if (title.length > 120) throw new ReviewValidationError('Review titles must be 120 characters or fewer.');
  if (body.length < 10 || body.length > 4000) throw new ReviewValidationError('Review text must be between 10 and 4,000 characters.');
  if (!Array.isArray(photoUrls) || photoUrls.length > 5) throw new ReviewValidationError('Add at most five customer photos.');
  const normalizedPhotos = photoUrls.map((photo) => {
    if (typeof photo !== 'string' || photo.length > 2048 || !PHOTO_URL_PATTERN.test(photo)) throw new ReviewValidationError('Customer photos must be uploaded through the secure image uploader.');
    return photo;
  });
  return { rating, title: title || null, body, photoUrls: normalizedPhotos };
}
