// Self-check for the bulk-import chunker: node scripts/check-import-chunks.mjs
import assert from 'node:assert/strict';
import { chunkRowsByStyle, getRowStyleCode } from '../src/utils/importChunks.js';

const row = (style, view) => ({ 'Style No': style, View: view, 'File Name': `${style}-${view}.jpg` });

// Header variants all resolve to the same style code.
assert.equal(getRowStyleCode({ 'Style No': ' AB-1 ' }), 'AB-1');
assert.equal(getRowStyleCode({ style_code: 'AB-1' }), 'AB-1');
assert.equal(getRowStyleCode({ Colour: 'Rose' }), '');

// The invariant: a style is never split across chunks, whatever the size.
const rows = [];
for (let style = 0; style < 120; style += 1) {
  for (let view = 0; view < 4; view += 1) rows.push(row(`S${style}`, view));
}

for (const size of [1, 3, 10, 200]) {
  const chunks = chunkRowsByStyle(rows, size);
  assert.equal(chunks.flat().length, rows.length, `size ${size}: rows lost or duplicated`);

  const seen = new Set();
  for (const chunk of chunks) {
    for (const style of new Set(chunk.map(getRowStyleCode))) {
      assert.ok(!seen.has(style), `size ${size}: style ${style} split across chunks`);
      seen.add(style);
    }
  }
}

// Style-less rows still travel, and do not get grouped together by an empty key.
assert.equal(chunkRowsByStyle([{ View: 'a' }, { View: 'b' }], 1).length, 2);

console.log('import chunker OK');
