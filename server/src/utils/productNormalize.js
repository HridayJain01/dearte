const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const deriveGoldWeightFromKt = (p) =>
  Math.max(num(p.kt18NetWt), num(p.kt14NetWt), num(p.kt9NetWt), 0);

export function normalizeProduct(product) {
  const p = product;
  p.kt18GrossWt = num(p.kt18GrossWt);
  p.kt18NetWt = num(p.kt18NetWt);
  p.kt14GrossWt = num(p.kt14GrossWt);
  p.kt14NetWt = num(p.kt14NetWt);
  p.kt9GrossWt = num(p.kt9GrossWt);
  p.kt9NetWt = num(p.kt9NetWt);

  const hasKt = p.kt18NetWt + p.kt14NetWt + p.kt9NetWt > 0;
  if (!hasKt && num(p.goldWeight) > 0) {
    p.kt18NetWt = num(p.goldWeight);
    p.kt18GrossWt = num(p.goldWeight) * 1.05;
  }

  p.diamondWeight = num(p.diamondWeight ?? p.diamondWt);
  p.goldWeight = deriveGoldWeightFromKt(p) || num(p.goldWeight);

  if (p.stockQuantity === undefined || p.stockQuantity === null) {
    p.stockQuantity = p.stockType === 'Ready Stock' ? 10 : 0;
  } else {
    p.stockQuantity = Math.max(0, Math.floor(num(p.stockQuantity)));
  }

  return p;
}
