import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

test('the additive order migration only backfills rows with the legacy payment default', () => {
  const sql = readFileSync(resolve(process.cwd(), 'prisma/sql/order-fulfillment.sql'), 'utf8');
  const start = sql.indexOf('UPDATE "Order"\nSET "paymentStatus" = CASE');
  const end = sql.indexOf('CREATE TABLE IF NOT EXISTS "InventoryReservation"', start);
  const legacyBackfill = sql.slice(start, end);

  assert.ok(start >= 0 && end > start, 'The legacy order-status backfill must remain present.');
  assert.match(legacyBackfill, /WHERE "paymentStatus" = 'PENDING'\s+AND \(/);
});
