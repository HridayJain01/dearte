/** Self-check for the Style No values-only update. Run: node src/utils/bulkUpdate.check.js */
import assert from 'node:assert/strict';
import { importUpdateFields, parseBulkUpdateRows, syncWeightSpecifications } from './bulkUpdate.js';

const { updates, errors } = parseBulkUpdateRows([
  { 'Style No': 'DR101', 'Net Wt(18kt)': '3.4567', 'Gross Wt(14kt)': '', Status: 'inactive' },
  { 'Style No': 'DR101', 'Diamond Wt(ct)': 0.25 }, // repeated style merges
  { 'Style No': 'DR102', 'Net Wt(9kt)': 'abc' },
  { 'Style No': 'DR103', Name: '' },
  { 'Net Wt(18kt)': 2 },
  {},
]);

assert.deepEqual(updates.get('DR101'), { 'weights.net.k18': 3.457, status: 'Inactive', 'weights.diamond': 0.25 });
assert.equal(updates.size, 1);
assert.deepEqual(errors.map((e) => [e.row, e.styleCode]), [[4, 'DR102'], [5, 'DR103'], [6, '']]);

const specs = syncWeightSpecifications(
  [{ attribute: 'Net Wt (18kt)', value: '1' }, { attribute: 'Size', value: '12' }],
  { net: { k18: 3.457, k14: 0 }, diamond: 0.25 },
);
assert.deepEqual(specs, [
  { attribute: 'Net Wt (18kt)', value: '3.457' },
  { attribute: 'Diamond Wt (ct)', value: '0.25' },
  { attribute: 'Size', value: '12' },
]);

// Older spellings of a weight row are replaced too, not listed beside the new figure.
assert.deepEqual(
  syncWeightSpecifications(
    [{ attribute: 'Net Wt(18K)', value: '2.39' }, { attribute: 'Diamond Wt', value: '3.14' }, { attribute: 'Gold Weight', value: '2.39 g' }, { attribute: 'Diamond Quality', value: 'VS' }],
    { net: { k18: 9.876 }, colourStone: 0.42 },
  ),
  [
    { attribute: 'Net Wt (18kt)', value: '9.876' },
    { attribute: 'Colour Stone Wt (ct)', value: '0.42' },
    { attribute: 'Diamond Quality', value: 'VS' },
  ],
);

// A re-uploaded import sheet without images or flags: only what it carries is written.
const update = importUpdateFields(
  {
    styleCode: 'DR101', name: '', description: '', sku: '', status: undefined, isBestSeller: undefined,
    occasions: [], media: [], colorVariants: [], customizationOptions: undefined, subCategoryId: null,
    categoryId: 'cat1', goldWeight: 9.876, diamondWeight: 0, weights: { net: { k18: 9.876 } },
    specifications: [{ attribute: 'Net Wt (18kt)', value: '9.876' }],
  },
  [{ attribute: 'Net Wt (18kt)', value: '2.392' }, { attribute: 'Size', value: '12' }],
);
assert.deepEqual(update, {
  styleCode: 'DR101', categoryId: 'cat1', goldWeight: 9.876, diamondWeight: 0, weights: { net: { k18: 9.876 } },
  specifications: [{ attribute: 'Net Wt (18kt)', value: '9.876' }, { attribute: 'Size', value: '12' }],
});
console.log('bulkUpdate ok');
