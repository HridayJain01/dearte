// node --test server/src/services/ai/embeddings.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { caption, cosine, nearest } from './embeddings.js';

test('ranks by cosine similarity and respects the visible set', () => {
  const entries = [
    { id: 'a', embedding: [1, 0, 0] },
    { id: 'b', embedding: [0.9, 0.1, 0] },
    { id: 'c', embedding: [0, 1, 0] },
  ];
  assert.equal(cosine([1, 0], [2, 0]), 1);
  assert.equal(cosine([0, 0], [1, 0]), 0);
  assert.deepEqual(nearest([1, 0, 0], entries).map((e) => e.id), ['a', 'b', 'c']);
  assert.deepEqual(nearest([1, 0, 0], entries, new Set(['b', 'c'])).map((e) => e.id), ['b', 'c']);
  assert.deepEqual(nearest([1, 0, 0], entries, null, 1).map((e) => e.id), ['a']);
});

test('caption reads metal, kind, then name', () => {
  assert.equal(caption({ metalColor: 'Rose Gold', category: 'Rings', subCategory: 'Halo Rings', name: 'Aster' }), 'Rose Gold Halo Rings Aster');
});
