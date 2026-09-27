// node --test server/src/services/ai/search.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeParams, parseSearch, sanitizeParsed } from './search.js';

const facets = {
  categories: ['Earring', 'Rings'],
  subCategories: ['Halo Earrings', 'Studs', 'Solitaire Rings'],
  collections: ['Celestial Dreams'],
  metalColors: ['Rose Gold', 'Yellow Gold'],
  occasions: ['Engagement', 'Festive'],
};

test('only real names and sane numbers survive', () => {
  const params = sanitizeParsed(
    {
      category: ['earrings', 'Necklaces'],
      subCategory: 'halo earrings',
      metalColor: ['rose gold'],
      occasion: ['Wedding'],
      goldMax: '8g',
      diamondMin: 5,
      diamondMax: 1,
      sort: 'cheapest',
      keywords: ['floral'],
    },
    facets,
  );
  assert.deepEqual(params.category, ['Earring']);
  assert.deepEqual(params.subCategory, ['Halo Earrings']);
  assert.deepEqual(params.metalColor, ['Rose Gold']);
  assert.deepEqual(params.occasion, []);
  assert.equal(params.goldMax, 8);
  assert.equal(params.diamondMin, 1, 'min and max are swapped when reversed');
  assert.equal(params.diamondMax, 5);
  assert.equal(params.sort, '');
  assert.equal(params.search, '', 'keywords are dropped once a filter applies');
});

test('with nothing mapped, the words become a keyword search', () => {
  const params = sanitizeParsed({ keywords: ['floral', 'vintage'] }, facets);
  assert.equal(params.search, 'floral vintage');
  assert.deepEqual(describeParams(params), ['“floral vintage”']);
});

test('chips read back what was applied', () => {
  const params = sanitizeParsed({ category: ['Rings'], occasion: ['engagement'], goldMax: 8, sort: 'best-sellers' }, facets);
  assert.deepEqual(describeParams(params), ['Rings', 'Engagement', 'gold up to 8 g', 'best sellers']);
});

test('style codes and short searches never call the model', async () => {
  const code = await parseSearch('ABR00382', null);
  assert.equal(code.usedAi, false);
  assert.equal(code.params.search, 'ABR00382');
  const short = await parseSearch('rose studs', null);
  assert.equal(short.usedAi, false);
  assert.equal(short.params.search, 'rose studs');
  await assert.rejects(parseSearch('   ', null), /Type what you are looking for/);
});
