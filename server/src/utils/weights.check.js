/**
 * Self-check for the karat-aware weight maths. Run: node src/utils/weights.check.js
 *
 * Also asserts the client mirror (client/src/utils/productVariants.js) agrees —
 * a silent drift between the two is exactly the bug this file exists to catch.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { goldWeightFor, totalDiamondWeight, totalGoldWeight, totalPieces } from './weights.js';

const ring = {
  goldWeight: 5.0, // the 18K net weight, as adminRoutes writes it
  diamondWeight: 0.5,
  weights: { net: { k9: 2.6, k14: 3.9, k18: 5.0 }, diamond: 0.5 },
};
// Uploaded before per-karat weights existed: only the single figure.
const legacy = { goldWeight: 4.0, weights: {} };
// Diamond carats recorded only under `weights`, never mirrored to the flat field.
const weightsOnly = { goldWeight: 1.0, weights: { diamond: 0.25 } };

assert.equal(goldWeightFor(ring, '9K'), 2.6, '9K line must use its own net weight');
assert.equal(goldWeightFor(ring, '14K'), 3.9);
assert.equal(goldWeightFor(ring, '18K'), 5.0);
assert.equal(goldWeightFor(ring, ''), 5.0, 'no karat chosen falls back to the flat weight');
assert.equal(goldWeightFor(legacy, '9K'), 4.0, 'missing per-karat weight falls back, never 0');

const cart = [
  { quantity: 3, customization: { goldCarat: '9K' }, product: ring },
  { quantity: 2, customization: { goldCarat: '18K' }, product: ring },
  { quantity: 1, product: weightsOnly },
];

assert.equal(totalPieces(cart), 6, 'pieces, not lines');
assert.equal(Number(totalGoldWeight(cart).toFixed(2)), 18.80); // 3*2.6 + 2*5.0 + 1*1.0
assert.equal(Number(totalDiamondWeight(cart).toFixed(2)), 2.75); // 5*0.5 + 1*0.25
assert.equal(totalPieces([{ product: ring }]), 1, 'missing quantity counts as one piece');
assert.equal(totalGoldWeight([]), 0);

// The regression this fixes: reading the flat field ignores the karat.
const naive = cart.reduce((s, i) => s + Number(i.product.goldWeight) * i.quantity, 0);
assert.notEqual(Number(naive.toFixed(2)), Number(totalGoldWeight(cart).toFixed(2)));

const here = dirname(fileURLToPath(import.meta.url));
const mirror = readFileSync(resolve(here, '../../../client/src/utils/productVariants.js'), 'utf8');
for (const fn of ['goldWeightFor', 'diamondWeightFor', 'totalPieces', 'totalGoldWeight', 'totalDiamondWeight']) {
  assert.ok(mirror.includes(`export function ${fn}(`), `client mirror is missing ${fn}`);
}
assert.ok(
  mirror.includes("const net = key ? Number(product?.weights?.net?.[key] || 0) : 0;"),
  'client goldWeightFor has drifted from the server copy',
);

console.log('weights: ok');
