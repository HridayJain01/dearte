/**
 * A cart or order line is a product *plus* the exact combination the buyer
 * chose, so every surface that renders a line has to resolve its imagery and
 * weights from that combination instead of falling back to the product
 * defaults. Two lines of the same style must never look identical.
 */

// Matched in order: "Rose Gold" and "White Gold" both contain "gold", so the
// specific tones have to be tested before the yellow catch-all.
const GOLD_COLOR_SWATCHES = [
  [/rose|pink/i, '#e3ac97'],
  [/white|rhodium|platinum|silver/i, '#dfe1e4'],
  [/yellow|gold/i, '#e2bd63'],
];

export function goldColorSwatch(color) {
  const match = GOLD_COLOR_SWATCHES.find(([pattern]) => pattern.test(String(color || '')));
  return match ? match[1] : 'var(--color-surface-alt)';
}

export function variantFor(product, goldColor) {
  const target = String(goldColor || '').trim().toLowerCase();
  if (!target) return null;

  return (product?.colorVariants || []).find(
    (variant) => String(variant.color || '').trim().toLowerCase() === target,
  ) || null;
}

/**
 * Every photo uploaded for the chosen colour. Falls back to the product's
 * default media so a line never renders as an empty box when that colour has
 * no gallery of its own.
 */
export function variantImages(product, goldColor) {
  const images = (variantFor(product, goldColor)?.views || [])
    .map((view) => view.asset?.secureUrl)
    .filter(Boolean);

  if (images.length) return images;
  return (product?.images || []).filter(Boolean);
}

export function variantImage(product, customization) {
  return variantImages(product, customization?.goldColor)[0] || '';
}

const CARAT_WEIGHT_KEYS = { 9: 'k9', 14: 'k14', 18: 'k18' };

function caratWeightKey(goldCarat) {
  const match = String(goldCarat || '').match(/(\d+)\s*k/i);
  return match ? CARAT_WEIGHT_KEYS[Number(match[1])] : undefined;
}

/**
 * Gold weight for the karat on the line. The per-karat net weights come from
 * the bulk-upload sheet; styles uploaded before those existed only carry the
 * single `goldWeight`, which stands in.
 */
export function goldWeightFor(product, goldCarat) {
  const key = caratWeightKey(goldCarat);
  const net = key ? Number(product?.weights?.net?.[key] || 0) : 0;
  return net > 0 ? net : Number(product?.goldWeight || 0);
}

export function diamondWeightFor(product) {
  return Number(product?.diamondWeight || product?.weights?.diamond || 0);
}

const LINE_IDENTITY_KEYS = ['goldColor', 'goldCarat', 'diamondQuality', 'size', 'note'];

/**
 * Line identity, mirroring `isSameCartLine` on the server: same style at a
 * different colour, karat, quality, size or note is a different line.
 */
export function sameCustomization(a, b) {
  return LINE_IDENTITY_KEYS.every((key) => String(a?.[key] || '') === String(b?.[key] || ''));
}

/**
 * The labelled facets of a line, ready to render as chips. `sizeNoun` comes
 * from the size master ("Ring Size", "Bangle Size", ...).
 */
export function customizationChips(customization, { sizeNoun = 'Size' } = {}) {
  return [
    customization?.goldColor && {
      label: 'Colour',
      value: customization.goldColor,
      swatch: goldColorSwatch(customization.goldColor),
    },
    customization?.goldCarat && { label: 'Karat', value: customization.goldCarat },
    customization?.diamondQuality && { label: 'Quality', value: customization.diamondQuality },
    customization?.size && { label: sizeNoun, value: customization.size },
  ].filter(Boolean);
}

/** One-line summary for dense surfaces (checkout review, order history, PDF). */
export function customizationSummary(customization, { sizeNoun = 'Size' } = {}) {
  return customizationChips(customization, { sizeNoun })
    .map((chip) => (chip.label === 'Colour' || chip.label === 'Karat' || chip.label === 'Quality'
      ? chip.value
      : `${chip.label} ${chip.value}`))
    .join(' • ');
}
