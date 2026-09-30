// node --test server/src/services/ai/reorder.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { reorderSuggestions } from './reorder.js';

const now = new Date('2026-09-28T00:00:00Z');
const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
const order = (days, items, status = 'Fulfilled') => ({ status, createdAt: daysAgo(days), items });

test('cycle is the median gap; suggested a week before it is due', () => {
  const orders = [
    order(95, [{ product: 'ring', quantity: 10, customization: { goldColor: 'Rose Gold', goldCarat: '14K', size: '12' } }]),
    order(65, [{ product: 'ring', quantity: 8 }]),
    order(35, [{ product: 'ring', quantity: 12, customization: { goldColor: 'Rose Gold', goldCarat: '14K', size: '12', note: 'rush' } }]),
  ];
  const [suggestion] = reorderSuggestions(orders, { now });
  assert.equal(suggestion.productId, 'ring');
  assert.equal(suggestion.cycleDays, 30);
  assert.equal(suggestion.timesOrdered, 3);
  assert.deepEqual(suggestion.lines, [{ quantity: 12, goldColor: 'Rose Gold', goldCarat: '14K', size: '12' }]);
});

test('not yet due, cancelled, or long abandoned styles are left out', () => {
  const orders = [
    order(10, [{ product: 'fresh', quantity: 1 }]),
    order(90, [{ product: 'cancelled', quantity: 1 }], 'Cancelled'),
    order(90, [{ product: 'pending', quantity: 1 }], 'Pending'),
    order(700, [{ product: 'abandoned', quantity: 1 }]),
  ];
  assert.deepEqual(reorderSuggestions(orders, { now }), []);
});

test('a single order uses the default cycle; most overdue comes first', () => {
  const orders = [
    order(56, [{ product: 'studs', quantity: 5 }]),
    order(100, [{ product: 'bangle', quantity: 2 }]),
  ];
  const suggestions = reorderSuggestions(orders, { now });
  assert.deepEqual(suggestions.map((item) => item.productId), ['bangle', 'studs']);
  assert.equal(suggestions[1].cycleDays, 60);
});

test('two lines of one style in one order count as one purchase', () => {
  const orders = [
    order(70, [{ product: 'ring', quantity: 2, customization: { size: '10' } }, { product: 'ring', quantity: 3, customization: { size: '12' } }]),
  ];
  const [suggestion] = reorderSuggestions(orders, { now });
  assert.equal(suggestion.timesOrdered, 1);
  assert.equal(suggestion.lines.length, 2);
});

test('real ObjectIds come back as their hex id (not the raw 12-byte buffer)', () => {
  const productId = new mongoose.Types.ObjectId();
  const at = (daysAgo) => new Date(Date.UTC(2026, 8, 30) - daysAgo * 86400000);
  const orders = [45, 90].map((daysAgo) => ({ status: 'Fulfilled', createdAt: at(daysAgo), items: [{ product: productId, quantity: 4 }] }));
  const [suggestion] = reorderSuggestions(orders, { now: new Date(Date.UTC(2026, 8, 30)) });
  assert.equal(suggestion.productId, productId.toHexString());
});
