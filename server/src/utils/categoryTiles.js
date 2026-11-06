import { normalizeAsset } from './assets.js';

// Tiles link inside the storefront only; a blank or outside link opens the
// catalogue filtered by the tile's label. A tile without a label or a photo is
// dropped.
export function sanitizeCategoryTiles(tiles) {
  if (!Array.isArray(tiles)) return undefined;
  return tiles
    .slice(0, 12)
    .map((tile) => {
      const label = String(tile?.label || '').trim().slice(0, 40);
      const link = String(tile?.link || '').trim();
      return {
        label,
        link: /^\/(?!\/)/.test(link) ? link.slice(0, 300) : `/products?category=${encodeURIComponent(label)}`,
        image: normalizeAsset(tile?.image),
      };
    })
    .filter((tile) => tile.label && tile.image.secureUrl);
}
