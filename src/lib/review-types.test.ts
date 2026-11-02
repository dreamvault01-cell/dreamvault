import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeReviewInput, ReviewValidationError } from './review-validation';

test('review validation accepts a moderated buyer review with secure wall photos', () => {
  assert.deepEqual(normalizeReviewInput({
    rating: 5,
    title: 'Beautiful above my desk',
    body: 'The colours are exactly as shown and the paper feels lovely.',
    photoUrls: ['https://res.cloudinary.com/demo/image/upload/v1/dreamvault/reviews/wall.jpg'],
  }), {
    rating: 5,
    title: 'Beautiful above my desk',
    body: 'The colours are exactly as shown and the paper feels lovely.',
    photoUrls: ['https://res.cloudinary.com/demo/image/upload/v1/dreamvault/reviews/wall.jpg'],
  });
});

test('review validation rejects unsafe photos, invalid ratings, and oversized submissions', () => {
  assert.throws(() => normalizeReviewInput({ rating: 6, body: 'This review is long enough.' }), ReviewValidationError);
  assert.throws(() => normalizeReviewInput({ rating: 4, body: 'This review is long enough.', photoUrls: ['https://images.example.com/wall.jpg'] }), ReviewValidationError);
  assert.throws(() => normalizeReviewInput({ rating: 4, body: 'Too short' }), ReviewValidationError);
  assert.throws(() => normalizeReviewInput({ rating: 4, body: 'This review is long enough.', photoUrls: Array.from({ length: 6 }, () => 'https://res.cloudinary.com/demo/image/upload/v1/dreamvault/reviews/wall.jpg') }), ReviewValidationError);
});
