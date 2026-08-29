// Sheet-row helpers for the bulk product import. They live outside AdminPages so
// the chunking invariant below can be exercised by scripts/check-import-chunks.mjs
// without pulling React in.

export function normalizeSheetHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function normalizeRow(row) {
  const normalized = {};
  Object.entries(row || {}).forEach(([key, value]) => {
    normalized[normalizeSheetHeader(key)] = value;
  });
  return normalized;
}

export function getRowStyleCode(row) {
  const normalized = normalizeRow(row);
  return String(
    normalized.styleno || normalized.stylecode || normalized.style || normalized.collectionstyleno || '',
  ).trim();
}

const METAL_COLOR_LABELS = {
  rg: 'Rose Gold',
  wg: 'White Gold',
  yg: 'Yellow Gold',
  pg: 'Pink Gold',
  rosegold: 'Rose Gold',
  whitegold: 'White Gold',
  yellowgold: 'Yellow Gold',
};

const METAL_COLOR_NAMES = new Set(Object.values(METAL_COLOR_LABELS));

const VIEW_ALIASES = {
  left: 'Left',
  letf: 'Left',
  right: 'Right',
  through: 'Through',
  top: 'Top',
  up: 'Top',
};

// Preview-only mirror of server/src/utils/importFileName.js, which is what
// actually decides the colour and view on import. The two must agree, or the
// summary table promises something the import will not deliver -
// scripts/check-import-chunks.mjs asserts they still match.
export function parseImageFileName(fileName) {
  const base = String(fileName || '').trim().replace(/\.[^.]+$/, '');
  const segments = base.split('.').map((part) => part.trim()).filter(Boolean);
  if (segments.length < 2) return null;

  const metal = segments[segments.length - 1].split('_')[0].split('-').pop();
  const color = METAL_COLOR_LABELS[normalizeSheetHeader(metal)] || metal;
  if (!METAL_COLOR_NAMES.has(color)) return null;

  if (segments.length >= 3) {
    const raw = segments[segments.length - 2];
    return { view: VIEW_ALIASES[normalizeSheetHeader(raw)] || raw, color };
  }

  const words = segments[0].split(/\s+/);
  const view = VIEW_ALIASES[normalizeSheetHeader(words[words.length - 1])];
  return view ? { view, color } : null;
}

// Vercel caps the import function at 60s (server/vercel.json) and the handler
// resolves taxonomy one style at a time, so a full sheet in a single POST times
// out long before it finishes. Every row of one style must stay in the same
// chunk: the server replaces a product's colour variants per request, so a split
// style would lose whichever views landed in the earlier chunk.
export const IMPORT_CHUNK_ROWS = 200;

export function chunkRowsByStyle(rows, size = IMPORT_CHUNK_ROWS) {
  const groups = new Map();
  rows.forEach((row, index) => {
    // A style-less row cannot collide with anything (the server reports it as
    // skipped either way), so it gets a group of its own.
    const key = getRowStyleCode(row) || `row:${index}`;
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  });

  const chunks = [];
  let current = [];
  for (const group of groups.values()) {
    // A single style larger than `size` still ships whole - splitting it is the
    // one thing this function exists to prevent.
    if (current.length && current.length + group.length > size) {
      chunks.push(current);
      current = [];
    }
    current.push(...group);
  }
  if (current.length) chunks.push(current);
  return chunks;
}
