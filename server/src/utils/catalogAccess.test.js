// node --test server/src/utils/catalogAccess.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { productAccessFilter, hasFullCatalogAccess } from './catalogAccess.js';

const gc = { includeFlagged: true, categories: ['c1'], subCategories: [], collections: [], occasions: ['Wedding'] };

test('admin and sales see everything', () => {
  assert.deepEqual(productAccessFilter({ role: 'admin' }), {});
  assert.deepEqual(productAccessFilter({ role: 'sales' }), {});
});

test('buyer defaults to full access, restricted buyer is scoped', () => {
  assert.deepEqual(productAccessFilter({ role: 'buyer' }), {});
  assert.deepEqual(
    productAccessFilter({ role: 'buyer', catalogAccess: { mode: 'restricted', categories: ['c1'], collections: ['x1'] } }),
    { $or: [{ category: { $in: ['c1'] } }, { collection: { $in: ['x1'] } }] },
  );
});

test('restricted buyer with nothing granted sees nothing', () => {
  assert.deepEqual(
    productAccessFilter({ role: 'buyer', catalogAccess: { mode: 'restricted' } }),
    { _id: { $in: [] } },
  );
  assert.equal(hasFullCatalogAccess(null), false);
});

test('guest gets the guest-catalogue clauses; unconfigured store = teaser only', () => {
  assert.deepEqual(productAccessFilter(null, gc), {
    $or: [{ showToGuests: true }, { category: { $in: ['c1'] } }, { occasions: { $in: ['Wedding'] } }],
  });
  assert.deepEqual(productAccessFilter(null, {}), { showToGuests: true });
  assert.deepEqual(productAccessFilter(null, { includeFlagged: false }), { _id: { $in: [] } });
});
