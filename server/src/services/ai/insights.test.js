// node --test server/src/services/ai/insights.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REPORTS, finishAnswer, istDay, monthsBetween, periodLabel, rowsForModel, sanitizePlan } from './insights.js';

const NOW = new Date('2026-09-30T06:00:00Z'); // 30 Sep 2026, 11:30 IST

const product = (id, category, extra = {}) => ({
  id,
  styleCode: id.toUpperCase(),
  name: `${category} ${id}`,
  category,
  collection: '',
  status: 'Active',
  createdAt: new Date('2026-01-10T00:00:00Z'),
  views: 0,
  ...extra,
});

const order = (id, user, status, createdAt, items) => ({ id, user, status, createdAt: new Date(createdAt), items });
const line = (productId, quantity, customization = {}) => ({ product: productId, quantity, customization });

function context(extra = {}) {
  const products = [
    product('er1', 'Earrings', { collection: 'Bridal' }),
    product('er2', 'Earrings'),
    product('rg1', 'Rings', { collection: 'Bridal', createdAt: new Date('2025-11-01T00:00:00Z'), views: 40 }),
    product('rg2', 'Rings', { views: 5 }),
  ];
  return {
    now: NOW,
    orders: [
      order('o1', 'u1', 'Fulfilled', '2026-07-05T08:00:00Z', [line('er1', 10, { goldColor: 'Rose Gold', goldCarat: '18K' }), line('rg1', 2)]),
      order('o2', 'u2', 'Approved', '2026-08-31T20:00:00Z', [line('er1', 5, { goldColor: 'Rose Gold', goldCarat: '18K' })]),
      order('o3', 'u1', 'Cancelled', '2026-09-02T08:00:00Z', [line('er2', 50)]),
      order('o4', 'u2', 'Pending', '2026-09-10T08:00:00Z', [line('er2', 3, { goldColor: 'White Gold', goldCarat: '14K' })]),
    ],
    products: new Map(products.map((item) => [item.id, item])),
    buyers: new Map([
      ['u1', { name: 'Shree Jewellers', active: true }],
      ['u2', { name: 'Mehta & Sons', active: true }],
    ]),
    catalogue: products,
    ...extra,
  };
}

const plan = (overrides = {}) => ({ report: '', from: '2026-07-01', to: '2026-09-30', limit: 10, category: '', inactiveDays: 60, ...overrides });

test('a plan is always a known report over a sane period', () => {
  const defaults = sanitizePlan({ report: 'drop_tables' }, { now: NOW });
  assert.equal(defaults.report, '');
  assert.equal(defaults.to, '2026-09-30');
  assert.equal(defaults.from, '2026-07-03'); // 90 days, both ends included
  assert.equal(defaults.limit, 10);

  const swapped = sanitizePlan({ report: 'top_products', from: '2026-09-01', to: '2026-06-01', limit: '500' }, { now: NOW });
  assert.deepEqual([swapped.from, swapped.to, swapped.limit], ['2026-06-01', '2026-09-01', 50]);

  const future = sanitizePlan({ report: 'top_products', from: '2026-12-01', to: '2027-01-31' }, { now: NOW });
  assert.equal(future.to, '2026-09-30');
  assert.ok(future.from <= future.to);

  assert.equal(sanitizePlan({ report: 'top_products', from: '2026-02-31' }, { now: NOW }).from, '2026-07-03');
  assert.equal(sanitizePlan({ report: 'top_products', category: 'earrings' }, { now: NOW, categories: ['Earrings'] }).category, 'Earrings');
  assert.equal(sanitizePlan({ report: 'lapsed_buyers', category: 'Earrings' }, { now: NOW, categories: ['Earrings'] }).category, '');
});

test('India time decides the day and the month', () => {
  assert.equal(istDay('2026-08-31T20:00:00Z'), '2026-09-01');
  assert.deepEqual(monthsBetween('2025-11-15', '2026-02-01'), ['2025-11', '2025-12', '2026-01', '2026-02']);
  assert.equal(periodLabel(plan()), '1 Jul 2026 to 30 Sep 2026');
});

test('top styles leave out cancelled orders and honour the category', () => {
  const all = REPORTS.top_products.run(context(), plan());
  assert.deepEqual(all.rows.map((row) => [row.style, row.pieces]), [['ER1', 15], ['ER2', 3], ['RG1', 2]]);
  assert.deepEqual(all.totals, { orders: 3, pieces: 20 });

  const rings = REPORTS.top_products.run(context(), plan({ category: 'Rings', limit: 1 }));
  assert.deepEqual(rings.rows.map((row) => row.style), ['RG1']);
});

test('category trend buckets by month in India time', () => {
  const result = REPORTS.category_trend.run(context(), plan());
  assert.deepEqual(result.columns.map((column) => column.label), ['Month', 'Earrings', 'Rings', 'Total pieces']);
  assert.deepEqual(result.rows.map((row) => [row.month, row.total]), [['Jul 2026', 12], ['Aug 2026', 0], ['Sep 2026', 8]]);
});

test('collections, buyers and the metal mix add up', () => {
  const collections = REPORTS.collection_performance.run(context(), plan());
  assert.deepEqual(collections.rows.map((row) => [row.collection, row.pieces]), [['Bridal', 17], ['No collection', 3]]);

  const buyers = REPORTS.buyer_activity.run(context(), plan());
  assert.deepEqual(buyers.rows.map((row) => [row.buyer, row.pieces, row.orders]), [['Shree Jewellers', 12, 1], ['Mehta & Sons', 8, 2]]);

  const mix = REPORTS.metal_karat_mix.run(context(), plan());
  assert.deepEqual(mix.rows.map((row) => [row.mix, row.pieces, row.share]), [
    ['Rose Gold 18K', 15, 75],
    ['White Gold 14K', 3, 15],
    ['Not specified Not specified', 2, 10],
  ]);
});

test('lapsed buyers are active buyers quiet for longer than the window', () => {
  const ctx = context({
    orders: [
      order('o1', 'u1', 'Fulfilled', '2026-05-01T08:00:00Z', [line('er1', 4)]),
      order('o2', 'u2', 'Fulfilled', '2026-09-20T08:00:00Z', [line('er1', 4)]),
      order('o3', 'u3', 'Fulfilled', '2026-01-01T08:00:00Z', [line('er1', 9)]),
    ],
    buyers: new Map([
      ['u1', { name: 'Shree Jewellers', active: true }],
      ['u2', { name: 'Mehta & Sons', active: true }],
      ['u3', { name: 'Closed Account', active: false }],
    ]),
  });
  const result = REPORTS.lapsed_buyers.run(ctx, plan({ report: 'lapsed_buyers' }));
  assert.deepEqual(result.rows.map((row) => [row.buyer, row.daysSince]), [['Shree Jewellers', 152]]);
});

test('slow movers put unsold, longest-listed styles first', () => {
  const result = REPORTS.slow_movers.run(context(), plan());
  assert.deepEqual(result.rows.map((row) => [row.style, row.pieces]), [['RG2', 0], ['RG1', 2], ['ER2', 3], ['ER1', 15]]);
  assert.deepEqual(result.totals, { activeStyles: 4, unsoldStyles: 1 });
});

test('the status summary counts every order, cancelled ones included', () => {
  const result = REPORTS.order_status_summary.run(context(), plan());
  assert.deepEqual(result.rows.map((row) => [row.status, row.orders]), [['Pending', 1], ['Approved', 1], ['Fulfilled', 1], ['Cancelled', 1]]);
  assert.equal(result.rows[0].share, 25);
});

test('buyer names go out as aliases and come back in the answer', () => {
  const result = REPORTS.buyer_activity.run(context(), plan());
  const { rows, names } = rowsForModel(result);
  assert.equal(rows[0].Buyer, 'Buyer 1');
  assert.ok(!JSON.stringify(rows).includes('Shree'));

  const sources = [JSON.stringify(rows)];
  assert.equal(finishAnswer('Buyer 1 ordered 12 pieces, ahead of Buyer 2 with 8.', { sources, names }), 'Shree Jewellers ordered 12 pieces, ahead of Mehta & Sons with 8.');
  // A figure that is not in the rows withholds the whole answer.
  assert.equal(finishAnswer('Buyer 1 ordered 57 pieces.', { sources, names }), '');
});
