import assert from 'node:assert/strict';
import test from 'node:test';
import { formatProductPrice, getPrintDimensions, getProductOptions, initialProductOption } from './product-options';

const base = { id: 'artwork', price: 149, compareAtPrice: 199, variants: [] };

test('base-priced products do not invent larger sizes, prices, or inventory', () => {
  const options = getProductOptions(base);
  assert.equal(options.length, 1);
  assert.equal(options[0].size, 'A4');
  assert.equal(options[0].price, 149);
  assert.equal(options[0].stock, null);
});

test('size options retain their own price and discount without borrowing from another size', () => {
  const variants = [
    { id: 'a2', size: 'A2', price: 349, compareAtPrice: null, stock: 8, sku: null },
    { id: 'a4', size: 'A4', price: 149, compareAtPrice: 199, stock: 0, sku: null },
    { id: 'a3', size: 'A3', price: 249, compareAtPrice: 299, stock: 2, sku: null },
  ];
  const options = getProductOptions({ ...base, variants });
  assert.deepEqual(options.map(({ size }) => size), ['A4', 'A3', 'A2']);
  assert.equal(options.find(({ size }) => size === 'A2')?.compareAtPrice, null);
  assert.equal(options.find(({ size }) => size === 'A3')?.price, 249);
  assert.deepEqual(variants.map(({ size }) => size), ['A2', 'A4', 'A3']);
  assert.equal(initialProductOption(options).size, 'A3');
});

test('fully sold-out prints still have a visible option instead of becoming unrenderable', () => {
  const options = getProductOptions({ ...base, variants: [{ id: 'a4', size: 'A4', price: 149, compareAtPrice: null, stock: 0, sku: null }] });
  assert.equal(initialProductOption(options).stock, 0);
});

test('one size can offer different real configurations without their prices or identities colliding', () => {
  const options = getProductOptions({
    ...base,
    variants: [
      { id: 'a3-walnut', size: 'A3', format: 'FRAMED_ART_PRINT', paper: 'PREMIUM_FINE_ART', frame: 'WALNUT', configurationKey: 'A3:FRAMED_ART_PRINT:PREMIUM_FINE_ART:WALNUT', price: 699, compareAtPrice: null, stock: 2, sku: 'DV-A3-WALNUT' },
      { id: 'a3-poster', size: 'A3', format: 'POSTER', paper: 'CLASSIC_MATTE', frame: 'NONE', configurationKey: 'A3:POSTER:CLASSIC_MATTE:NONE', price: 199, compareAtPrice: null, stock: 8, sku: 'DV-A3-POSTER' },
    ],
  });
  assert.equal(options.length, 2);
  assert.deepEqual(options.map((option) => option.id), ['a3-poster', 'a3-walnut']);
  assert.notEqual(options[0].configurationKey, options[1].configurationKey);
  assert.equal(options[1].frame, 'WALNUT');
  assert.equal(options[1].price, 699);
});

test('size comparisons use ISO paper dimensions and unknown sizes have no guessed dimensions', () => {
  assert.deepEqual(getPrintDimensions('A4 (21x30 cm)'), { width: 21, height: 29.7 });
  assert.deepEqual(getPrintDimensions('a1'), { width: 59.4, height: 84.1 });
  assert.equal(getPrintDimensions('CUSTOM'), null);
});

test('prices preserve paise rather than silently rounding the amount shown to customers', () => {
  assert.equal(formatProductPrice(249.5), '₹249.50');
  assert.equal(formatProductPrice(149), '₹149');
});
