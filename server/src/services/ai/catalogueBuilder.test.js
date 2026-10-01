// node --test server/src/services/ai/catalogueBuilder.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { closestFirst, diversify, missingKinds, preferenceOrder, sanitizeCopy } from './catalogueBuilder.js';

test('picks take turns across sub-categories, best first', () => {
  const items = [
    { id: 'stud-1', group: 'Studs' },
    { id: 'stud-2', group: 'Studs' },
    { id: 'stud-3', group: 'Studs' },
    { id: 'hoop-1', group: 'Hoops' },
    { id: 'drop-1', group: 'Drops' },
  ];
  const ids = (list) => list.map((item) => item.id);
  assert.deepEqual(ids(diversify(items, 4, (item) => item.group)), ['stud-1', 'hoop-1', 'drop-1', 'stud-2']);
  assert.deepEqual(ids(diversify(items, 10, (item) => item.group)).length, 5);
  assert.deepEqual(diversify([], 5, (item) => item.group), []);
});

test('a loosened search only tops up the exact matches, never pushes them out', () => {
  // Five rose gold earrings asked for; metal colour loosened to fill the book.
  const ranked = [
    { id: 'white-halo', group: 'Halo', round: 1 },
    { id: 'white-stud', group: 'Studs', round: 1 },
    { id: 'white-hoop', group: 'Hoops', round: 1 },
    { id: 'rose-halo-1', group: 'Halo', round: 0 },
    { id: 'rose-halo-2', group: 'Halo', round: 0 },
    { id: 'rose-halo-3', group: 'Halo', round: 0 },
    { id: 'rose-stud', group: 'Studs', round: 0 },
    { id: 'rose-hoop', group: 'Hoops', round: 0 },
  ];
  const ids = closestFirst(ranked, 6, (item) => item.group).map((item) => item.id);
  assert.deepEqual(ids, ['rose-halo-1', 'rose-stud', 'rose-hoop', 'rose-halo-2', 'rose-halo-3', 'white-halo']);
  assert.deepEqual(closestFirst(ranked, 2, (item) => item.group).map((item) => item.id), ['rose-halo-1', 'rose-stud']);
});

test('shared style tags outrank best-seller flags', () => {
  const ranked = preferenceOrder(
    [
      { styleCode: 'A', tags: [], isBestSeller: true },
      { styleCode: 'B', tags: ['halo', 'oval'] },
      { styleCode: 'C', tags: ['halo'], isNewArrival: true, orderCount: 3 },
      { styleCode: 'D', tags: ['halo'], isNewArrival: true, orderCount: 9 },
    ],
    ['halo', 'oval'],
  );
  assert.deepEqual(ranked.map((entry) => entry.styleCode), ['B', 'D', 'C', 'A']);
});

test('the title and introduction may not claim what the brief did not say', () => {
  const brief = '24 rose gold bridal pieces under 6 g';
  assert.deepEqual(sanitizeCopy({ title: 'Rose Gold Bridal Edit', intro: 'Twenty-four pieces under 6 g for the bridal counter.' }, brief), {
    title: 'Rose Gold Bridal Edit',
    intro: 'Twenty-four pieces under 6 g for the bridal counter.',
  });
  assert.equal(sanitizeCopy({ title: 'Bridal', intro: 'Certified stones at 20% off.' }, brief).intro, '');
  assert.equal(sanitizeCopy({ title: 'Guaranteed best prices', intro: '' }, brief).title, 'A DeArte selection');
});

test('kinds of piece outside the buyer\'s catalogue are named, whole words only', () => {
  const earringsOnly = { categories: ['Earring'] };
  assert.deepEqual(missingKinds('12 diamond rings for anniversary gifting', earringsOnly), ['Rings']);
  assert.deepEqual(missingKinds('halo earrings for a festive window', earringsOnly), []);
  assert.deepEqual(missingKinds('rings and bangles', { categories: ['Rings', 'Earring'] }), ['Bangle']);
});
