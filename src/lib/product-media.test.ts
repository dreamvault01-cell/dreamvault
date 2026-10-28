import assert from 'node:assert/strict';
import test from 'node:test';
import { getRoomPreviewImage, normalizeProductImages, ProductMediaValidationError } from './product-media';

test('legacy images remain valid without silently enabling a room preview', () => {
  assert.deepEqual(normalizeProductImages([{ url: '/poster.webp', alt: 'Artwork-only print' }], 'Product name'), [
    { url: '/poster.webp', alt: 'Artwork-only print', position: 0, isRoomPreview: false },
  ]);
  assert.deepEqual(normalizeProductImages(undefined, 'Product name'), []);
});

test('gallery ordering is normalized and image descriptions are retained independently of preview selection', () => {
  assert.deepEqual(normalizeProductImages([
    { url: ' https://res.cloudinary.com/dreamvault/image/upload/room.jpg ', alt: ' Room photo ', position: 8, isRoomPreview: false },
    { url: '/artwork.png', alt: ' ', position: 0, isRoomPreview: true },
  ], ' Cosmic Geometry '), [
    { url: 'https://res.cloudinary.com/dreamvault/image/upload/room.jpg', alt: 'Room photo', position: 0, isRoomPreview: false },
    { url: '/artwork.png', alt: 'Cosmic Geometry', position: 1, isRoomPreview: true },
  ]);
});

test('only one image can be selected for a room preview', () => {
  assert.throws(() => normalizeProductImages([
    { url: '/one.jpg', isRoomPreview: true },
    { url: '/two.jpg', isRoomPreview: true },
  ], 'Artwork'), ProductMediaValidationError);
});

test('the preview flag must be a boolean rather than a truthy string or number', () => {
  for (const flag of ['true', 'false', 1, 0, null, {}, []]) {
    assert.throws(() => normalizeProductImages([{ url: '/art.jpg', isRoomPreview: flag }], 'Artwork'), ProductMediaValidationError);
  }
});

test('invalid galleries and image URLs are rejected before persistence', () => {
  for (const gallery of [null, {}, 'image', [null], [[]], [{}], [{ url: 123 }]]) {
    assert.throws(() => normalizeProductImages(gallery, 'Artwork'), ProductMediaValidationError);
  }
  for (const url of [
    '', ' ', 'javascript:alert(1)', 'data:image/png;base64,a',
    '//images.example.com/a.jpg', '/\\images.example.com/a.jpg', '/some image.jpg',
    'https://', 'http://res.cloudinary.com/dreamvault/image/upload/art.jpg',
    'https://images.example.com/art.jpg', 'https://res.cloudinary.com.evil.example/art.jpg',
    'https://user:password@res.cloudinary.com/dreamvault/image/upload/art.jpg',
  ]) {
    assert.throws(() => normalizeProductImages([{ url }], 'Artwork'), ProductMediaValidationError);
  }
  assert.throws(() => normalizeProductImages([{ url: '/art.jpg', alt: 3 }], 'Artwork'), ProductMediaValidationError);
});

test('duplicate images and oversized galleries are rejected', () => {
  assert.throws(() => normalizeProductImages([{ url: '/art.jpg' }, { url: ' /art.jpg ' }], 'Artwork'), ProductMediaValidationError);
  assert.throws(() => normalizeProductImages(Array.from({ length: 51 }, (_, index) => ({ url: `/art-${index}.jpg` })), 'Artwork'), ProductMediaValidationError);
});

test('URL and description limits are enforced without truncating image information', () => {
  const url = `/${'a'.repeat(2047)}`;
  const alt = 'a'.repeat(500);
  assert.equal(normalizeProductImages([{ url, alt }], 'Artwork')[0].url.length, 2048);
  assert.equal(normalizeProductImages([{ url, alt }], 'Artwork')[0].alt.length, 500);
  assert.throws(() => normalizeProductImages([{ url: `${url}a` }], 'Artwork'), ProductMediaValidationError);
  assert.throws(() => normalizeProductImages([{ url: '/art.jpg', alt: `${alt}a` }], 'Artwork'), ProductMediaValidationError);
  assert.throws(() => normalizeProductImages([{ url: '/art.jpg' }], `${alt}a`), ProductMediaValidationError);
});

test('preview discovery uses only the explicit flag, with a stable position order', () => {
  const images = [
    { url: '/later.jpg', position: 3, isRoomPreview: true },
    { url: '/first.jpg', position: 1, isRoomPreview: true },
    { url: '/legacy.jpg', position: 0, alt: 'flat artwork print-ready artwork-only' },
  ];
  assert.equal(getRoomPreviewImage(images)?.url, '/first.jpg');
  assert.deepEqual(images.map(({ position }) => position), [3, 1, 0]);
  assert.equal(getRoomPreviewImage([images[2]]), undefined);
  assert.equal(getRoomPreviewImage([]), undefined);
  assert.equal(getRoomPreviewImage([{ url: ' ', position: 0, isRoomPreview: true }]), undefined);
});
