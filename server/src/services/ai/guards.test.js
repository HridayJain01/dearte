// node --test server/src/services/ai/guards.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bannedClaims,
  clampNumber,
  clampText,
  escapeHtml,
  matchNames,
  titleSimilarity,
  ungroundedNumbers,
} from './guards.js';

const now = new Date('2026-09-28T00:00:00Z');

test('figures must come from the facts we supplied', () => {
  assert.deepEqual(ungroundedNumbers('Available in 9K, 14K and 18K gold.', [], { now }), []);
  assert.deepEqual(ungroundedNumbers('Lab-grown now makes up 52% of engagement rings.', [], { now }), ['52']);
  assert.deepEqual(
    ungroundedNumbers('Lab-grown now makes up 52% of engagement rings.', ['Industry share: 52% (source)'], { now }),
    [],
  );
  assert.deepEqual(ungroundedNumbers('Prices start at ₹25,000.', [], { now }), ['25,000']);
});

test('small counts and nearby years pass, claims with units do not', () => {
  assert.deepEqual(ungroundedNumbers('Five styles, 3 tips and the 4Cs for 2026.', [], { now }), []);
  assert.deepEqual(ungroundedNumbers('Stones are 3x brighter.', [], { now }), ['3']);
  assert.deepEqual(ungroundedNumbers('A 2 ct solitaire', [], { now }), ['2']);
  assert.deepEqual(ungroundedNumbers('Back in 1998 the market was different.', [], { now }), ['1998']);
});

test('style codes and weights in the product facts are allowed', () => {
  const sources = ['ABR00382 · Diamond 0.45 ct · Gold 3.2 g'];
  assert.deepEqual(ungroundedNumbers('Style ABR00382 carries 0.45 ct over 3.2 g of gold.', sources, { now }), []);
});

test('banned claims are caught, certification only when not in facts', () => {
  assert.deepEqual(bannedClaims('A timeless piece for every season.'), []);
  assert.ok(bannedClaims('A smart investment that will appreciate.').includes('investment claim'));
  assert.ok(bannedClaims('Unlike Tanishq, we …').includes('competitor brand'));
  assert.ok(bannedClaims('Every stone is certified.').includes('certification claim'));
  assert.deepEqual(bannedClaims('Every stone is certified.', 'IGI certified stones on request'), []);
});

test('title similarity catches near-duplicates only', () => {
  assert.ok(titleSimilarity('Lab-Grown vs Natural Diamonds: A Retailer Guide', 'Natural vs Lab-Grown Diamonds for Retailers') > 0.6);
  assert.ok(titleSimilarity('How to Style Rose Gold Earrings', 'Diwali Stocking Checklist for Jewellers') < 0.2);
});

test('names map onto our own list or are dropped', () => {
  const allowed = ['Rings', 'Earrings', 'Rose Gold', 'Bridal'];
  assert.deepEqual(matchNames(['ring', 'EARRINGS', 'rose-gold', 'Sapphire'], allowed), ['Rings', 'Earrings', 'Rose Gold']);
  assert.deepEqual(matchNames('bridal', allowed), ['Bridal']);
  assert.deepEqual(matchNames([{ $ne: 1 }], allowed), []);
});

test('numbers and text are clamped', () => {
  assert.equal(clampNumber('8g', 0, 50), 8);
  assert.equal(clampNumber(999, 0, 50), 50);
  assert.equal(clampNumber('abc', 0, 50), null);
  assert.equal(clampNumber(null, 0, 50), null);
  assert.equal(clampText('Rose gold studs for everyday wear', 20), 'Rose gold studs for');
  assert.equal(escapeHtml('<b>"x"</b>'), '&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
});
