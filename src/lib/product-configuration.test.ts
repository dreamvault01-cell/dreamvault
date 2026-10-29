import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ProductConfigurationValidationError,
  getConfigurationLabel,
  normalizeProductConfiguration,
  normalizeProductVariants,
} from './product-configuration';

test('legacy size-only variants become classic matte, unframed poster prints', () => {
  const configuration = normalizeProductConfiguration({ size: 'a3' });
  assert.deepEqual(configuration, {
    size: 'A3',
    format: 'POSTER',
    paper: 'CLASSIC_MATTE',
    frame: 'NONE',
    configurationKey: 'A3:POSTER:CLASSIC_MATTE:NONE',
  });
});

test('the launch catalogue permits poster, premium art print, and framed art print combinations only', () => {
  const poster = normalizeProductConfiguration({ size: 'A4', format: 'POSTER', paper: 'CLASSIC_MATTE', frame: 'NONE' });
  const premium = normalizeProductConfiguration({ size: 'A4', format: 'ART_PRINT', paper: 'PREMIUM_FINE_ART', frame: 'NONE' });
  const framed = normalizeProductConfiguration({ size: 'A4', format: 'FRAMED_ART_PRINT', paper: 'PREMIUM_FINE_ART', frame: 'WALNUT' });
  assert.equal(getConfigurationLabel(poster), 'Poster Print · Classic Matte Poster');
  assert.equal(getConfigurationLabel(premium), 'Premium Art Print · Premium Fine-Art Matte');
  assert.equal(getConfigurationLabel(framed), 'Framed Art Print · Premium Fine-Art Matte · Walnut frame');

  assert.throws(
    () => normalizeProductConfiguration({ size: 'A4', format: 'POSTER', paper: 'PREMIUM_FINE_ART', frame: 'NONE' }),
    ProductConfigurationValidationError
  );
  assert.throws(
    () => normalizeProductConfiguration({ size: 'A4', format: 'FRAMED_ART_PRINT', paper: 'PREMIUM_FINE_ART', frame: 'NONE' }),
    ProductConfigurationValidationError
  );
});

test('admin variant validation accepts different A3 configurations but rejects duplicates and bad stock', () => {
  const configurations = normalizeProductVariants([
    { size: 'A3', format: 'POSTER', paper: 'CLASSIC_MATTE', frame: 'NONE', price: 199, stock: 8, sku: 'DV-A3-POSTER' },
    { size: 'A3', format: 'FRAMED_ART_PRINT', paper: 'PREMIUM_FINE_ART', frame: 'WALNUT', price: 699, stock: 3, sku: 'DV-A3-WALNUT' },
  ]);
  assert.equal(configurations.length, 2);
  assert.throws(
    () => normalizeProductVariants([
      { size: 'A3', format: 'POSTER', paper: 'CLASSIC_MATTE', frame: 'NONE', price: 199, stock: 8 },
      { size: 'A3', format: 'POSTER', paper: 'CLASSIC_MATTE', frame: 'NONE', price: 199, stock: 8 },
    ]),
    ProductConfigurationValidationError
  );
  assert.throws(
    () => normalizeProductVariants([
      { size: 'A3', format: 'POSTER', paper: 'CLASSIC_MATTE', frame: 'NONE', price: 199, stock: 0.5 },
    ]),
    ProductConfigurationValidationError
  );
});
