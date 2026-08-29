// Self-check for the bulk-import file name parser: node scripts/check-import-filenames.mjs
import assert from 'node:assert/strict';
import { normalizeViewName, parseImageFileName } from '../src/utils/importFileName.js';

const parse = (name) => parseImageFileName(name);

// The ordinary shape.
assert.deepEqual(parse('ABL00008.Left.WG-RG_WM.jpg'), { view: 'Left', color: 'Rose Gold' });
assert.deepEqual(parse('ABL00008.Top.WG-YG_WM.jpg'), { view: 'Top', color: 'Yellow Gold' });
assert.deepEqual(parse('ABL00008.Through.WG-WG_WM.jpg'), { view: 'Through', color: 'White Gold' });

// A style code containing a space must not be mistaken for a style/view split.
assert.deepEqual(parse('ALR000108 A.Right.WG-RG_WM.jpg'), { view: 'Right', color: 'Rose Gold' });

// A space where the dot should be is rescued, but only when the trailing word
// really is a view.
assert.deepEqual(parse('APND00281 Left.WG-RG_WM.jpg'), { view: 'Left', color: 'Rose Gold' });
assert.equal(parse('APND00281 Bracelet.WG-RG_WM.jpg'), null);

// Single-token colours still work, and view spellings are canonicalised.
assert.deepEqual(parse('ABL00008.left.RG.jpg'), { view: 'Left', color: 'Rose Gold' });
assert.deepEqual(parse('ABL00008.LEFT.RG_WM.jpg'), { view: 'Left', color: 'Rose Gold' });
assert.deepEqual(parse('ABL00008.Letf.RG_WM.jpg'), { view: 'Left', color: 'Rose Gold' });
assert.deepEqual(parse('ABL00008.up.RG_WM.jpg'), { view: 'Top', color: 'Rose Gold' });

// Unknown metals and malformed names are rejected rather than guessed at.
assert.equal(parse('ABL00008.Left.WG-ZZ_WM.jpg'), null);
assert.equal(parse('ABL00008.jpg'), null);
assert.equal(parse(''), null);

// An unrecognised view is passed through rather than dropped.
assert.equal(normalizeViewName('Bottom'), 'Bottom');

console.log('import file name parser OK');
