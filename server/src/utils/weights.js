/**
 * Line weights, karat-aware.
 *
 * `product.goldWeight` is the *18K* net weight (adminRoutes writes
 * `weights.net.k18` into it), so reading it raw quotes a 9K or 14K line at its
 * 18K figure. Every surface that totals or prints a line's weight must go
 * through these.
 *
 * ponytail: byte-identical mirror of the same two functions in
 * client/src/utils/productVariants.js — the client and server deploy as
 * separate Vercel projects, same as data/sizeMaster.js. Keep the two in sync;
 * merge into a shared workspace package if a third copy ever appears.
 */

const CARAT_WEIGHT_KEYS = { 9: 'k9', 14: 'k14', 18: 'k18' };

function caratWeightKey(goldCarat) {
  const match = String(goldCarat || '').match(/(\d+)\s*k/i);
  return match ? CARAT_WEIGHT_KEYS[Number(match[1])] : undefined;
}

export function goldWeightFor(product, goldCarat) {
  const key = caratWeightKey(goldCarat);
  const net = key ? Number(product?.weights?.net?.[key] || 0) : 0;
  return net > 0 ? net : Number(product?.goldWeight || 0);
}

export function diamondWeightFor(product) {
  return Number(product?.diamondWeight || product?.weights?.diamond || 0);
}

/** Pieces, not lines: 3 variants x 4 each is 12 pieces. */
export function totalPieces(items = []) {
  return items.reduce((sum, item) => sum + (Number(item?.quantity) || 1), 0);
}

export function totalGoldWeight(items = []) {
  return items.reduce(
    (sum, item) => sum + goldWeightFor(item?.product, item?.customization?.goldCarat) * (Number(item?.quantity) || 1),
    0,
  );
}

export function totalDiamondWeight(items = []) {
  return items.reduce(
    (sum, item) => sum + diamondWeightFor(item?.product) * (Number(item?.quantity) || 1),
    0,
  );
}
