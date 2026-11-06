import { normalizeAsset } from './assets.js';

const BASE = 'https://storefront.invalid';

// A path on this site, or null. Browsers read "\" as "/", so "/\evil.com"
// would leave the site; resolving against a fixed origin catches that and
// anything else that changes host.
function internalPath(link) {
  if (!/^\/(?![/\\])/.test(link) || /[\u0000-\u001F\\]/.test(link)) return null;
  try {
    const url = new URL(link, BASE);
    if (url.origin !== BASE) return null;
    // Resolving "/.//evil.com" leaves "//evil.com", so the result is checked too.
    const path = `${url.pathname}${url.search}${url.hash}`;
    return /^\/(?![/\\])/.test(path) ? path : null;
  } catch {
    return null;
  }
}

// Tiles link inside the storefront only; a blank or outside link opens the
// catalogue filtered by the tile's label. A tile without a label or a photo is
// dropped.
export function sanitizeCategoryTiles(tiles) {
  if (!Array.isArray(tiles)) return undefined;
  return tiles
    .slice(0, 12)
    .map((tile) => {
      const label = String(tile?.label || '').trim().slice(0, 40);
      const link = internalPath(String(tile?.link || '').trim());
      return {
        label,
        link: link ? link.slice(0, 300) : `/products?category=${encodeURIComponent(label)}`,
        image: normalizeAsset(tile?.image),
      };
    })
    .filter((tile) => tile.label && tile.image.secureUrl);
}
