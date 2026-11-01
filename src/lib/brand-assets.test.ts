import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('the transparent wordmark and browser icons are bundled with the website', async () => {
  const wordmark = await readFile(new URL('../../public/brand/raredaze-wordmark.png', import.meta.url));
  assert.equal(wordmark.subarray(1, 4).toString(), 'PNG');
  assert.ok(wordmark.readUInt32BE(16) > 1000);
  assert.ok(wordmark.readUInt32BE(20) > 0);
  assert.equal(wordmark[25], 6, 'wordmark must retain its transparent RGBA channel');
  const favicon = await readFile(new URL('../app/favicon.ico', import.meta.url));
  assert.equal(favicon.readUInt16LE(2), 1);
  assert.equal(favicon.readUInt16LE(4), 3);
  assert.deepEqual([favicon[6], favicon[22], favicon[38]], [16, 32, 48]);
  const appleIcon = await readFile(new URL('../../public/brand/raredaze-apple-icon.png', import.meta.url));
  assert.equal(appleIcon.readUInt32BE(16), 180);
  assert.equal(appleIcon.readUInt32BE(20), 180);
});
