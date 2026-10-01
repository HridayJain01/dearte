/** Self-check for the product page's specification boxes. Run: node src/utils/serializers.check.js */
import assert from 'node:assert/strict';
import { serializeProduct } from './serializers.js';

const boxes = (specifications) => serializeProduct({ _id: 'p1', specifications }).specifications;

// A piece with colour stone shows the box...
assert.deepEqual(boxes([{ attribute: 'Net Wt (18kt)', value: '2.4' }, { attribute: 'Colour Stone Wt (ct)', value: '0.42' }]), [
  { attribute: 'Net Wt (18kt)', value: '2.4' },
  { attribute: 'Colour Stone Wt (ct)', value: '0.42' },
]);

// ...one without it (0, 0.00 ct, blank) does not, and nor does any other empty row.
assert.deepEqual(
  boxes([
    { attribute: 'Colour Stone Wt (ct)', value: '0' },
    { attribute: 'Colour Stone Weight', value: '0.00 ct' },
    { attribute: 'Diamond Wt (ct)', value: '0.5' },
    { attribute: 'Setting Type', value: '  ' },
    { attribute: 'Size', value: '0-1 mm' },
  ]),
  [
    { attribute: 'Diamond Wt (ct)', value: '0.5' },
    { attribute: 'Size', value: '0-1 mm' },
  ],
);
console.log('serializers ok');
