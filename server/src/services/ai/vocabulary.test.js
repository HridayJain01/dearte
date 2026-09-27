// node --test server/src/services/ai/vocabulary.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTags, scorePhotoMatch } from './vocabulary.js';

test('only vocabulary words survive, normalised and deduped', () => {
  assert.deepEqual(normalizeTags(['Halo', 'micro pave', 'emerald_cut', 'sapphire', 'halo', 42]), ['halo', 'micro-pave', 'emerald-cut']);
  assert.deepEqual(normalizeTags('halo'), []);
});

test('category outweighs metal, tags separate close matches', () => {
  const photo = { category: 'Earrings', subCategory: 'Studs', metalColor: 'Rose Gold', tags: ['halo', 'stud', 'round'] };
  const haloStud = { category: 'Earrings', subCategory: 'Studs', metalColor: 'Rose Gold' };
  const plainStud = { category: 'Earrings', subCategory: 'Studs', metalColor: 'Yellow Gold', goldColors: ['Rose Gold'] };
  const ring = { category: 'Rings', metalColor: 'Rose Gold' };

  const a = scorePhotoMatch(photo, haloStud, ['halo', 'stud', 'round']);
  const b = scorePhotoMatch(photo, plainStud, ['stud', 'bezel']);
  const c = scorePhotoMatch(photo, ring, ['halo', 'round']);

  assert.ok(a > b, 'matching tags rank first');
  assert.ok(b > c, 'right category beats a wrong one with similar tags');
  assert.equal(scorePhotoMatch({}, haloStud, []), 0);
});
