import assert from 'node:assert/strict';
import test from 'node:test';
import { BRAND_NAME, BRAND_SUPPORT_NAME, BRAND_WORDMARK, getBrandDisplayName } from './brand';

test('the public identity consistently uses RareDaze', () => {
  assert.equal(BRAND_NAME, 'RareDaze');
  assert.equal(BRAND_WORDMARK, 'RAREDAZE');
  assert.equal(BRAND_SUPPORT_NAME, 'RareDaze Support');
});

test('legacy sender names adopt the rebrand without changing custom names', () => {
  assert.equal(getBrandDisplayName('DreamVault'), BRAND_NAME);
  assert.equal(getBrandDisplayName(' DreamVault Support '), BRAND_SUPPORT_NAME);
  assert.equal(getBrandDisplayName(undefined), BRAND_NAME);
  assert.equal(getBrandDisplayName('', BRAND_SUPPORT_NAME), BRAND_SUPPORT_NAME);
  assert.equal(getBrandDisplayName('RareDaze Studio'), 'RareDaze Studio');
});
