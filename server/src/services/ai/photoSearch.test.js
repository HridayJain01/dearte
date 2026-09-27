// node --test server/src/services/ai/photoSearch.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankProducts, searchByPhoto } from './photoSearch.js';

const products = [
  { id: 'a', category: 'Earring', subCategory: 'Studs', metalColor: 'Yellow Gold' },
  { id: 'b', category: 'Earring', subCategory: 'Halo Earrings', metalColor: 'Rose Gold' },
  { id: 'c', category: 'Rings', subCategory: 'Halo Rings', metalColor: 'Rose Gold' },
];

test('ranks by category, sub category, metal and tags; drops non-matches', () => {
  const photo = { category: 'Earring', subCategory: 'Halo Earrings', metalColor: 'Rose Gold', tags: ['halo', 'stud'] };
  const tags = new Map([['b', ['halo', 'stud', 'round']], ['a', ['stud']], ['c', ['halo']]]);
  assert.deepEqual(rankProducts(photo, products, tags).map((product) => product.id), ['b', 'a', 'c']);
  assert.deepEqual(rankProducts({ category: 'Bangle', tags: [] }, products, tags), []);
});

test('rejects anything that is not a small image data URL', async () => {
  await assert.rejects(searchByPhoto('https://example.com/x.jpg', null), /JPEG, PNG or WebP/);
  await assert.rejects(searchByPhoto('data:text/html;base64,PHNjcmlwdD4=', null), /JPEG, PNG or WebP/);
  await assert.rejects(searchByPhoto(`data:image/jpeg;base64,${'A'.repeat(1_000_000)}`, null), /700 KB/);
});
