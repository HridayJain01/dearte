// Sheet parsing for "update values by Style No". Only non-blank cells are applied,
// so a sheet with just Style No + Net Wt(18kt) touches nothing else.
// Kept out of adminRoutes so bulkUpdate.check.js can run without a database.
import { normalizeHeader } from './importFileName.js';

const STYLE_KEYS = ['styleno', 'stylecode', 'style', 'collectionstyleno'];

// [product path, header aliases, kind]
const COLUMNS = [
  ['weights.gross.k18', ['grosswt18kt', 'grosswt18k'], 'weight'],
  ['weights.gross.k14', ['grosswt14kt', 'grosswt14k'], 'weight'],
  ['weights.gross.k9', ['grosswt9kt', 'grosswt9k'], 'weight'],
  ['weights.net.k18', ['netwt18kt', 'netwt18k'], 'weight'],
  ['weights.net.k14', ['netwt14kt', 'netwt14k'], 'weight'],
  ['weights.net.k9', ['netwt9kt', 'netwt9k'], 'weight'],
  ['weights.diamond', ['diamondwtct', 'diamondwt', 'diamondweight'], 'weight'],
  ['weights.colourStone', ['colourstonewtct', 'colourstonewt', 'colorstonewt', 'stoneweight'], 'weight'],
  ['name', ['productname', 'name'], 'text'],
  ['description', ['description'], 'text'],
  ['metalType', ['metaltype'], 'text'],
  ['metal', ['metal'], 'text'],
  ['settingType', ['settingtype'], 'text'],
  ['sku', ['sku'], 'text'],
  ['status', ['status'], 'status'],
];

// The weight rows the importer writes into specifications, in display order.
export const WEIGHT_SPECS = [
  ['Gross Wt (18kt)', 'gross', 'k18'],
  ['Gross Wt (14kt)', 'gross', 'k14'],
  ['Gross Wt (9kt)', 'gross', 'k9'],
  ['Net Wt (18kt)', 'net', 'k18'],
  ['Net Wt (14kt)', 'net', 'k14'],
  ['Net Wt (9kt)', 'net', 'k9'],
  ['Diamond Wt (ct)', 'diamond'],
  ['Colour Stone Wt (ct)', 'colourStone'],
];

function pick(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return undefined;
}

/** rows → { updates: Map<styleCode, {path: value}>, errors: [{row, styleCode, reason}] } */
export function parseBulkUpdateRows(rows = []) {
  const updates = new Map();
  const errors = [];

  rows.forEach((rawRow, index) => {
    const row = {};
    for (const [key, value] of Object.entries(rawRow || {})) row[normalizeHeader(key)] = value;
    const rowNumber = index + 2; // header row + 1-based
    const styleCode = String(pick(row, STYLE_KEYS) ?? '').trim();
    if (!styleCode) {
      if (Object.values(row).some((value) => String(value).trim())) {
        errors.push({ row: rowNumber, styleCode: '', reason: 'Missing Style No' });
      }
      return;
    }

    const set = {};
    const problems = [];
    for (const [path, keys, kind] of COLUMNS) {
      const raw = pick(row, keys);
      if (raw === undefined) continue;
      if (kind === 'weight') {
        const number = Number(typeof raw === 'string' ? raw.replace(/,/g, '').trim() : raw);
        if (!Number.isFinite(number) || number < 0) problems.push(`${keys[0]} "${raw}" is not a number`);
        else set[path] = Math.round(number * 1000) / 1000;
      } else if (kind === 'status') {
        const status = String(raw).trim().toLowerCase();
        if (status === 'active' || status === 'inactive') set[path] = status === 'active' ? 'Active' : 'Inactive';
        else problems.push(`Status "${raw}" must be Active or Inactive`);
      } else {
        set[path] = String(raw).trim();
      }
    }

    if (problems.length) {
      errors.push({ row: rowNumber, styleCode, reason: problems.join('; ') });
      return;
    }
    if (!Object.keys(set).length) {
      errors.push({ row: rowNumber, styleCode, reason: 'No values to update' });
      return;
    }
    // A repeated style (one row per image in the import sheet) merges; later cells win.
    updates.set(styleCode, { ...updates.get(styleCode), ...set });
  });

  return { updates, errors };
}

// Every spelling a weight row has been saved under: the labels above, older imports'
// "Net Wt(18K)" / "Diamond Wt", and the editor's "Gold Weight". All of them are
// replaced on a rewrite, or the page would list the old weight beside the new one.
const isWeightRow = (attribute) => /^(gross|net|gold|diamond|colou?rstone)(wt|weight)/.test(normalizeHeader(attribute));

/** Rewrite the weight rows of specifications from product.weights, keeping any other rows. */
export function syncWeightSpecifications(specifications = [], weights = {}) {
  const weightRows = WEIGHT_SPECS.map(([attribute, group, key]) => ({
    attribute,
    value: Number(key ? weights?.[group]?.[key] : weights?.[group]) || 0,
  }))
    .filter((item) => item.value > 0)
    .map((item) => ({ ...item, value: String(item.value) }));
  return [...weightRows, ...specifications.filter((item) => !isWeightRow(item.attribute))];
}

/**
 * What a re-uploaded import sheet may change on a style that already exists: only
 * what the sheet carries. Blank cells, empty lists and a sheet sent without images
 * are dropped, so the stored name, description, photos, status and flags survive,
 * and the weight rows are rewritten among the style's own specification rows.
 */
export function importUpdateFields(payload, currentSpecifications = []) {
  const fields = Object.fromEntries(
    Object.entries(payload).filter(
      ([, value]) => value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && !value.length),
    ),
  );
  return { ...fields, specifications: syncWeightSpecifications(currentSpecifications, payload.weights) };
}
