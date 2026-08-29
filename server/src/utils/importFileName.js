// Sheet parsing for the bulk product import. Kept out of adminRoutes so
// scripts/check-import-filenames.mjs can exercise it without a database.

export function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

export const METAL_COLOR_LABELS = {
  rg: 'Rose Gold',
  wg: 'White Gold',
  yg: 'Yellow Gold',
  pg: 'Pink Gold',
  rosegold: 'Rose Gold',
  whitegold: 'White Gold',
  yellowgold: 'Yellow Gold',
};

const METAL_COLOR_NAMES = new Set(Object.values(METAL_COLOR_LABELS));

export function normalizeMetalColorName(value) {
  const raw = String(value || '').trim();
  return METAL_COLOR_LABELS[normalizeHeader(raw)] || raw;
}

// The photographer's view vocabulary, plus the spellings that actually turn up
// in the sheets ("left", "LEFT", "Letf", "up").
const VIEW_ALIASES = {
  left: 'Left',
  letf: 'Left',
  right: 'Right',
  through: 'Through',
  top: 'Top',
  up: 'Top',
};

export function normalizeViewName(value) {
  const trimmed = String(value || '').trim();
  return VIEW_ALIASES[normalizeHeader(trimmed)] || trimmed;
}

/*
 * A file name encodes Style.View.<setting>-<metal>_WM.ext, e.g.
 * "ABL00008.Left.WG-RG_WM.jpg".
 *
 * The metal after the hyphen is the colour the photo actually shows; the prefix
 * is constant across the catalogue. The sheet's own Colour column has proven
 * unreliable (a whole 3312-row sheet arrived reading "Rose Gold" on every line),
 * so the file name is the source of truth for both colour and view.
 *
 * Segments are read from the right because style codes may themselves contain a
 * space and a suffix: "ALR000108 A.Left.WG-RG_WM.jpg".
 *
 * Returns null when the name does not parse; the caller reports the row.
 */
export function parseImageFileName(fileName) {
  const base = String(fileName || '').trim().replace(/\.[^.]+$/, '');
  const segments = base.split('.').map((part) => part.trim()).filter(Boolean);
  if (segments.length < 2) return null;

  const metal = segments[segments.length - 1].split('_')[0].split('-').pop();
  const color = normalizeMetalColorName(metal);
  if (!METAL_COLOR_NAMES.has(color)) return null;

  if (segments.length >= 3) {
    return { view: normalizeViewName(segments[segments.length - 2]), color };
  }

  // Two segments: a few rows separate the style from the view with a space
  // instead of a dot ("APND00281 Left.WG-RG_WM.jpg"). Only rescue it when the
  // trailing word is a view we recognise, so a style code that merely ends in a
  // word is not mistaken for one.
  const words = segments[0].split(/\s+/);
  const view = VIEW_ALIASES[normalizeHeader(words[words.length - 1])];
  return view ? { view, color } : null;
}
