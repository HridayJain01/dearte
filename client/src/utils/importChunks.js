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
