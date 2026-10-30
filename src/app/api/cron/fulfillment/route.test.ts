import test from 'node:test';
import assert from 'node:assert/strict';
import { GET, POST } from './route';

test('both scheduled HTTP methods reject unsigned calls before accessing any database or mail provider', async () => {
  assert.equal(GET, POST);
  for (const method of ['GET', 'POST']) {
    const response = await GET(new Request('https://store.example.com/api/cron/fulfillment', { method }));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('cache-control'), 'no-store, private');
    assert.deepEqual(await response.json(), { error: 'A valid processor secret is required.' });
  }
});
