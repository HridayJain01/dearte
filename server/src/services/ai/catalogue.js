/**
 * Catalogue helpers shared by the AI features. Everything a buyer (or a
 * crawler) is shown goes through the same access rules as the storefront, so
 * an AI answer can never surface a style the viewer could not open anyway.
 */
import { Product } from '../../models/index.js';
import { productAccessFilter } from '../../utils/catalogAccess.js';
import { getGuestCatalogue } from '../../utils/guestCatalogue.js';
import { serializeProduct } from '../../utils/serializers.js';

export const productPopulate = [
  { path: 'category' },
  { path: 'subCategory' },
  { path: 'collection' },
  { path: 'metalColor' },
];

// The same merge publicRoutes.js does; copied rather than moved so that file
// stays untouched by this feature.
export function withAccess(filter, accessFilter) {
  if (!accessFilter || Object.keys(accessFilter).length === 0) return filter;
  return { $and: [filter, accessFilter] };
}

/** The storefront's catalogue rules for this visitor (null = logged out). */
export async function accessFilterFor(user) {
  const guestCatalogue = user ? null : await getGuestCatalogue().catch(() => null);
  return productAccessFilter(user, guestCatalogue);
}

/**
 * A readable name for a serialized product. Mirrors productDisplayName() in
 * client/src/utils/productTitle.js: imported styles carry their style code as
 * their name, so one is built from the taxonomy instead.
 */
export function displayName(product) {
  if (!product) return '';
  const name = String(product.name || '').trim();
  if (name && name.toLowerCase() !== String(product.styleCode || '').trim().toLowerCase()) return name;
  const noun = product.subCategory || product.category || 'Jewellery';
  const built = [product.metalColor, 'Lab-Grown Diamond', noun].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  return built || product.styleCode || '';
}

const round = (value) => Number(Number(value || 0).toFixed(2));

/** One line of facts about a serialized product, for a prompt. */
export function productFacts(product) {
  const diamond = round(product.weights?.diamond || product.diamondWeight);
  const gold = round(product.weights?.net?.k18 || product.goldWeight);
  const colours = (product.customizationOptions?.goldColors || []).join(', ');
  const karats = (product.customizationOptions?.goldCarats || []).join(', ');
  return [
    `${displayName(product)} (style ${product.styleCode})`,
    [product.category, product.subCategory].filter(Boolean).join(' / '),
    colours && `metal colours: ${colours}`,
    karats && `karats: ${karats}`,
    diamond && `diamond ${diamond} ct`,
    gold && `18K net gold ${gold} g`,
    product.collection && `collection: ${product.collection}`,
    product.occasions?.length && `occasions: ${product.occasions.join(', ')}`,
  ]
    .filter(Boolean)
    .join('; ');
}

/** The first photo of a serialized product, or ''. */
export function primaryImage(product) {
  return product?.images?.find(Boolean) || '';
}

/**
 * Serialized Active products for `ids`, in that order, keeping only the ones
 * this visitor may see.
 */
export async function visibleProductsByIds(ids = [], user = null, { access } = {}) {
  if (!ids.length) return [];
  const filter = withAccess({ _id: { $in: ids }, status: 'Active' }, access ?? (await accessFilterFor(user)));
  const docs = await Product.find(filter).populate(productPopulate);
  const byId = new Map(docs.map((doc) => [String(doc._id), serializeProduct(doc)]));
  return ids.map((id) => byId.get(String(id))).filter(Boolean);
}
