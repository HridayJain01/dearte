// node --test server/src/utils/categoryTiles.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeCategoryTiles } from './categoryTiles.js';

const photo = { secureUrl: 'https://res.cloudinary.com/x/image/upload/a.jpg' };

test('keeps internal links, rewrites outside or blank ones, drops incomplete tiles', () => {
  const tiles = sanitizeCategoryTiles([
    { label: ' Rings ', link: '/products?category=Rings', image: photo },
    { label: 'Studs', link: 'https://evil.example', image: photo },
    { label: 'Bands', link: '//evil.example', image: photo },
    { label: 'No photo', link: '/x', image: {} },
    { label: '', link: '/x', image: photo },
  ]);
  assert.deepEqual(tiles.map((tile) => [tile.label, tile.link]), [
    ['Rings', '/products?category=Rings'],
    ['Studs', '/products?category=Studs'],
    ['Bands', '/products?category=Bands'],
  ]);
});

test('unset stays unset and an empty list stays empty', () => {
  assert.equal(sanitizeCategoryTiles(undefined), undefined);
  assert.deepEqual(sanitizeCategoryTiles([]), []);
});
