/*
 * Every style in the catalogue arrives through the Excel bulk import, which
 * sets `name` to the style code and leaves `description` empty. That is fine
 * inside a trade catalogue where buyers search by style code — but it means the
 * pages this site most needs to rank carried a title, an <h1>, an image alt and
 * a meta description that all read "ABR00382", with not one word a buyer would
 * ever type into a search box.
 *
 * These helpers build a truthful descriptive name out of the attributes the
 * import *does* populate — category, sub category, metal colour, stone weight —
 * and fall back to the real `name` the moment someone gives a style one.
 */

const LAB_GROWN = 'Lab-Grown Diamond';

/** A style whose name is just its code carries no information. */
function hasRealName(product) {
  const name = String(product?.name || '').trim();
  if (!name) return false;
  return name.toLowerCase() !== String(product?.styleCode || '').trim().toLowerCase();
}

/**
 * "Rose Gold Lab-Grown Diamond Fashion Bracelet".
 *
 * Sub category leads because it is the specific noun ("Fashion Bracelet"), with
 * the broad category only used when there is no sub category to be had.
 */
export function productDisplayName(product) {
  if (!product) return '';
  if (hasRealName(product)) return product.name;

  const noun = product.subCategory || product.category || 'Jewellery';
  const parts = [product.metalColor, LAB_GROWN, noun].filter(Boolean);
  const built = parts.join(' ').replace(/\s+/g, ' ').trim();

  return built || product.styleCode || '';
}

/** The display name plus the style code, for a <title> or a share card. */
export function productTitle(product) {
  const name = productDisplayName(product);
  const code = product?.styleCode;
  if (!code) return name;
  return name.includes(code) ? name : `${name} — ${code}`;
}

/**
 * A meta description assembled from the specification table, for the styles
 * that shipped without any prose. Anything an editor has actually written wins.
 */
export function productDescription(product) {
  if (!product) return '';
  const written = String(product.description || '').trim();
  if (written) return written;

  const noun = String(product.subCategory || product.category || 'jewellery').toLowerCase();
  const carats = Number(product.weights?.diamond || product.diamondWeight || 0);
  const colour = String(product.metalColor || '').toLowerCase();
  const karats = (product.customizationOptions?.goldCarats || []).join(', ');

  const opening = [
    carats > 0 ? `${carats} ct` : null,
    LAB_GROWN.toLowerCase(),
    noun,
    colour ? `in ${colour}` : null,
  ]
    .filter(Boolean)
    .join(' ');

  return [
    opening.charAt(0).toUpperCase() + opening.slice(1),
    karats ? `Available in ${karats}` : null,
    `Style ${product.styleCode} from the DeArte wholesale catalogue`,
  ]
    .filter(Boolean)
    .join('. ')
    .concat('.');
}
