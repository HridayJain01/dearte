/**
 * Plain-language search: "rose gold bridal sets under 8 g" → the same filters
 * the products page already has. The model only picks from names this viewer
 * can actually see; every value is checked against those lists again here, so
 * the worst a bad answer can do is apply the wrong filter.
 */
import { Category, Collection, MetalOption, Product, SubCategory } from '../../models/index.js';
import { asString } from '../../utils/validation.js';
import { chatJson } from './llm.js';
import { clampNumber, clampText, matchNames } from './guards.js';
import { accessFilterFor, withAccess } from './catalogue.js';

export const SORTS = ['', 'best-sellers', 'new-arrivals', 'diamond-asc', 'diamond-desc', 'gold-asc', 'gold-desc'];
const STYLE_CODE = /^[a-z]{2,6}[-\s]?\d{3,}[a-z]?$/i;
const FACET_TTL_MS = 5 * 60 * 1000;
const QUERY_TTL_MS = 10 * 60 * 1000;
const MAX_CACHED_QUERIES = 500;

const facetCache = new Map();
const queryCache = new Map();

function cleanNames(values) {
  const seen = new Map();
  for (const value of values || []) {
    const name = typeof value === 'string' ? value.trim() : '';
    if (name && !seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

/**
 * The filter values that lead somewhere for this viewer, derived from the
 * products they can see (the same rule the products page's facets follow).
 */
export async function facetsFor(user) {
  const access = await accessFilterFor(user);
  const key = JSON.stringify(access);
  const cached = facetCache.get(key);
  if (cached && Date.now() - cached.at < FACET_TTL_MS) return { access, key, facets: cached.value };

  const filter = withAccess({ status: 'Active' }, access);
  const [categoryIds, subCategoryIds, collectionIds, metalIds, occasions] = await Promise.all([
    Product.distinct('category', filter),
    Product.distinct('subCategory', filter),
    Product.distinct('collection', filter),
    Product.distinct('metalColor', filter),
    Product.distinct('occasions', filter),
  ]);
  const byIds = (Model, ids) => Model.find({ _id: { $in: ids.filter(Boolean) }, active: true }).select('name').lean();
  const [categories, subCategories, collections, metalColors] = await Promise.all([
    byIds(Category, categoryIds),
    byIds(SubCategory, subCategoryIds),
    byIds(Collection, collectionIds),
    byIds(MetalOption, metalIds),
  ]);

  const value = {
    categories: cleanNames(categories.map((item) => item.name)),
    subCategories: cleanNames(subCategories.map((item) => item.name)),
    collections: cleanNames(collections.map((item) => item.name)),
    metalColors: cleanNames(metalColors.map((item) => item.name)),
    occasions: cleanNames(occasions),
  };
  facetCache.set(key, { value, at: Date.now() });
  return { access, key, facets: value };
}

const list = (value) => (Array.isArray(value) ? value : value ? [value] : []);

/**
 * Keep only values that exist, in range. Leftover words become a keyword
 * search only when nothing else mapped: the products page ANDs keywords, so
 * stacking them on filters would usually empty the results.
 */
export function sanitizeParsed(raw = {}, facets) {
  const params = {
    category: matchNames(list(raw.category), facets.categories).slice(0, 3),
    subCategory: matchNames(list(raw.subCategory), facets.subCategories).slice(0, 5),
    collection: matchNames(list(raw.collection), facets.collections).slice(0, 3),
    occasion: matchNames(list(raw.occasion), facets.occasions).slice(0, 3),
    metalColor: matchNames(list(raw.metalColor), facets.metalColors).slice(0, 3),
    diamondMin: clampNumber(raw.diamondMin, 0, 20),
    diamondMax: clampNumber(raw.diamondMax, 0, 20),
    goldMin: clampNumber(raw.goldMin, 0, 200),
    goldMax: clampNumber(raw.goldMax, 0, 200),
    sort: SORTS.includes(raw.sort) ? raw.sort : '',
    search: '',
  };
  for (const [low, high] of [['diamondMin', 'diamondMax'], ['goldMin', 'goldMax']]) {
    if (params[low] !== null && params[high] !== null && params[low] > params[high]) {
      [params[low], params[high]] = [params[high], params[low]];
    }
  }

  const mapped =
    ['category', 'subCategory', 'collection', 'occasion', 'metalColor'].some((field) => params[field].length) ||
    ['diamondMin', 'diamondMax', 'goldMin', 'goldMax'].some((field) => params[field] !== null) ||
    Boolean(params.sort);
  if (!mapped) params.search = clampText(list(raw.keywords).join(' '), 80);
  return params;
}

/** The chips a buyer reads back: "Earring · Rose Gold · gold up to 8 g". */
export function describeParams(params) {
  const range = (low, high, unit, noun) => {
    if (low !== null && high !== null) return `${noun} ${low}–${high} ${unit}`;
    if (high !== null) return `${noun} up to ${high} ${unit}`;
    if (low !== null) return `${noun} from ${low} ${unit}`;
    return '';
  };
  const sortLabels = {
    'best-sellers': 'best sellers',
    'new-arrivals': 'new arrivals',
    'diamond-asc': 'lightest diamonds first',
    'diamond-desc': 'heaviest diamonds first',
    'gold-asc': 'lightest gold first',
    'gold-desc': 'heaviest gold first',
  };
  return [
    ...params.category,
    ...params.subCategory,
    ...params.collection,
    ...params.occasion,
    ...params.metalColor,
    range(params.diamondMin, params.diamondMax, 'ct', 'diamond'),
    range(params.goldMin, params.goldMax, 'g', 'gold'),
    sortLabels[params.sort] || '',
    params.search && `“${params.search}”`,
  ].filter(Boolean);
}

const SYSTEM = `You turn a jewellery buyer's search into catalogue filters.
Use ONLY values from the lists provided and copy them exactly. Prefer a sub-category when one fits (for example "halo studs" → the matching halo or stud sub-category).
Diamond weights are in carats (ct); gold weights are in grams (g). "Under 8 g" means goldMax 8. Leave a field empty when the search does not ask for it.
sort is one of: "", "best-sellers", "new-arrivals", "diamond-asc", "diamond-desc", "gold-asc", "gold-desc".
Return ONLY JSON: {"category": [], "subCategory": [], "collection": [], "occasion": [], "metalColor": [], "diamondMin": null, "diamondMax": null, "goldMin": null, "goldMax": null, "sort": "", "keywords": []}
"keywords" holds only the important words that match none of the lists.`;

function remember(key, value) {
  queryCache.set(key, { value, at: Date.now() });
  if (queryCache.size > MAX_CACHED_QUERIES) queryCache.delete(queryCache.keys().next().value);
  return value;
}

/** The search as filters, plus the chips describing them. */
export async function parseSearch(query, user) {
  const text = asString(query, { maxLength: 200 });
  if (!text) throw Object.assign(new Error('Type what you are looking for.'), { status: 400 });

  // Style codes and one- or two-word searches are already what the keyword
  // search is good at; they never spend a model call.
  if (STYLE_CODE.test(text) || text.split(/\s+/).length < 3) {
    const params = sanitizeParsed({ keywords: [text] }, { categories: [], subCategories: [], collections: [], metalColors: [], occasions: [] });
    return { params, understood: describeParams(params), usedAi: false };
  }

  const { key: accessKey, facets } = await facetsFor(user);
  const cacheKey = `${accessKey}|${text.toLowerCase()}`;
  const cached = queryCache.get(cacheKey);
  if (cached && Date.now() - cached.at < QUERY_TTL_MS) return cached.value;

  const raw = await chatJson({
    system: SYSTEM,
    user: [
      `Search: "${text}"`,
      `Categories: ${facets.categories.join(', ') || '(none)'}`,
      `Sub-categories: ${facets.subCategories.join(', ') || '(none)'}`,
      `Collections: ${facets.collections.join(', ') || '(none)'}`,
      `Occasions: ${facets.occasions.join(', ') || '(none)'}`,
      `Metal colours: ${facets.metalColors.join(', ') || '(none)'}`,
    ].join('\n'),
    maxTokens: 400,
    temperature: 0,
    timeoutMs: 20_000,
  });

  const params = sanitizeParsed({ ...raw, keywords: list(raw.keywords).length ? raw.keywords : [text] }, facets);
  return remember(cacheKey, { params, understood: describeParams(params), usedAi: true });
}
