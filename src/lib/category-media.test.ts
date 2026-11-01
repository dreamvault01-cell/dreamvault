import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { getImageProps } from 'next/image';
import { CATEGORY_IMAGE_FALLBACK, getCategoryImageSrc } from './category-media';

test('optional, empty, and whitespace-only covers resolve to a nonempty local image', () => {
  for (const image of [undefined, null, '', ' ', '\t\r\n']) {
    assert.equal(getCategoryImageSrc(image), CATEGORY_IMAGE_FALLBACK);
    const { props } = getImageProps({ src: getCategoryImageSrc(image), alt: 'Art collection', width: 400, height: 400 });
    assert.equal(props.src, CATEGORY_IMAGE_FALLBACK);
  }
});

test('configured covers are preserved and surrounding whitespace is removed', () => {
  for (const image of ['/images/cover.jpg', 'https://res.cloudinary.com/example/image/upload/cover.jpg']) {
    assert.equal(getCategoryImageSrc(image), image);
    assert.equal(getCategoryImageSrc(`  ${image}\n`), image);
  }
});

test('the category fallback is a bundled image, not an external dependency', async () => {
  const svg = await readFile(new URL(`../../public${CATEGORY_IMAGE_FALLBACK}`, import.meta.url), 'utf8');
  assert.match(svg, /<svg\s/);
  assert.match(svg, /viewBox="0 0 400 400"/);
});
