/**
 * AI catalogue builder: a buyer describes a lookbook ("24 rose gold bridal
 * pieces under 6 g") and gets a spread of styles they can see, with a title and
 * a short introduction to edit before downloading it as a PDF.
 *
 * The model only turns the brief into filters (checked against the same lists
 * as plain-language search) and style tags. Picking and spreading the pieces
 * is plain code, and never leaves the buyer's own catalogue.
 */
import { Category, Collection, MetalOption, PhotoIndex, Product, SubCategory } from '../../models/index.js';
import { serializeProduct } from '../../utils/serializers.js';
import { asString, escapeRegex } from '../../utils/validation.js';
import { CATEGORY_TREE } from '../../data/taxonomy.js';
import { chatJson } from './llm.js';
import { bannedClaims, clampNumber, clampText, ungroundedNumbers } from './guards.js';
import { normalizeTags, vocabularyPrompt } from './vocabulary.js';
import { primaryImage, productPopulate, withAccess } from './catalogue.js';
import { describeParams, facetsFor, sanitizeParsed } from './search.js';

export const MIN_ITEMS = 6;
export const MAX_ITEMS = 40;
const DEFAULT_ITEMS = 24;
// ponytail: candidates are ranked in memory; move to an aggregation past a few thousand styles.
const MAX_CANDIDATES = 600;
const DEFAULT_TITLE = 'A DeArte selection';

const SYSTEM = `You plan a jewellery lookbook for a retailer who buys from DeArte, a manufacturer of lab-grown diamond jewellery.
From the buyer's brief choose catalogue filters using ONLY values from the lists provided (copied exactly), the number of pieces (what the brief asks for, or ${DEFAULT_ITEMS} when it names none), and style tags.
Set a sub-category only when the brief names that kind of piece (for example "halo studs" or "tennis bracelets"); "earrings" on its own means just the category.
Diamond weights are in carats (ct); gold weights are in grams (g). "Under 6 g" means goldMax 6. Leave a filter empty when the brief does not ask for it.
sort is "" unless the brief asks only for best sellers ("best-sellers") or new arrivals ("new-arrivals").
tags: at most 4 words from the vocabulary that the brief itself names or clearly implies (for example "halo" or "minimal"); usually none.
Write a title of at most 60 characters and an introduction of 1 or 2 sentences (at most 280 characters) in a refined, factual tone, with no clichés such as "timeless elegance". Do not state how many pieces there are (the final count may differ), and do not mention prices, discounts, certification, or any number that is not in the brief.
Return ONLY JSON: {"title": "", "intro": "", "count": ${DEFAULT_ITEMS}, "filters": {"category": [], "subCategory": [], "collection": [], "occasion": [], "metalColor": [], "diamondMin": null, "diamondMax": null, "goldMin": null, "goldMax": null, "sort": ""}, "tags": []}

Vocabulary:
${vocabularyPrompt()}`;

// Loosened in this order when too few styles match, until there are at least
// MIN_ITEMS. Category is never dropped: a book of earrings stays earrings.
const RELAX_STEPS = [
  { label: 'weights', fields: ['diamondMin', 'diamondMax', 'goldMin', 'goldMax'] },
  { label: 'best sellers / new arrivals only', fields: ['sort'] },
  { label: 'occasion', fields: ['occasion'] },
  { label: 'collection', fields: ['collection'] },
  { label: 'metal colour', fields: ['metalColor'] },
  { label: 'sub-category', fields: ['subCategory'] },
];

const EMPTY_VALUES = { diamondMin: null, diamondMax: null, goldMin: null, goldMax: null, sort: '' };

function isSet(params, field) {
  const value = params[field];
  return Array.isArray(value) ? value.length > 0 : value !== null && value !== '';
}

/** The product filter for these params (names are resolved to ids here). */
async function productFilter(params) {
  const filter = { status: 'Active' };
  const idsOf = async (Model, names) => (await Model.find({ name: { $in: names } }).select('_id').lean()).map((doc) => doc._id);
  if (params.category.length) filter.category = { $in: await idsOf(Category, params.category) };
  if (params.subCategory.length) filter.subCategory = { $in: await idsOf(SubCategory, params.subCategory) };
  if (params.collection.length) filter.collection = { $in: await idsOf(Collection, params.collection) };
  if (params.metalColor.length) filter.metalColor = { $in: await idsOf(MetalOption, params.metalColor) };
  if (params.occasion.length) filter.occasions = { $in: params.occasion };
  // The same fields the products page filters its weight ranges on.
  for (const [field, low, high] of [['diamondWeight', params.diamondMin, params.diamondMax], ['goldWeight', params.goldMin, params.goldMax]]) {
    if (low === null && high === null) continue;
    filter[field] = {};
    if (low !== null) filter[field].$gte = low;
    if (high !== null) filter[field].$lte = high;
  }
  if (params.sort === 'best-sellers') filter.isBestSeller = true;
  if (params.sort === 'new-arrivals') filter.isNewArrival = true;
  return filter;
}

/** Tags shared, then best sellers, then new arrivals, then most ordered. */
export function preferenceOrder(entries, wantedTags = []) {
  const wanted = new Set(wantedTags);
  const score = (entry) =>
    3 * (entry.tags || []).filter((tag) => wanted.has(tag)).length + (entry.isBestSeller ? 2 : 0) + (entry.isNewArrival ? 1 : 0);
  return [...entries].sort((a, b) => score(b) - score(a) || (b.orderCount || 0) - (a.orderCount || 0) || String(a.styleCode).localeCompare(String(b.styleCode)));
}

/**
 * Up to `count` items, taken round-robin across groups (sub-category, else
 * category) so one kind of piece cannot fill the book. `items` arrive best
 * first, and groups take turns in the order their best item appears.
 */
export function diversify(items, count, groupOf) {
  const groups = new Map();
  for (const item of items) {
    const key = groupOf(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  const queues = [...groups.values()];
  const picked = [];
  for (let round = 0; picked.length < count; round += 1) {
    let took = false;
    for (const queue of queues) {
      if (round < queue.length && picked.length < count) {
        picked.push(queue[round]);
        took = true;
      }
    }
    if (!took) break;
  }
  return picked;
}

// Whole words, singular or plural: "rings" must not match inside "earrings".
const mentions = (text, name) => new RegExp(`\\b${escapeRegex(name.toLowerCase().replace(/s$/, ''))}s?\\b`, 'i').test(text);

/** Kinds of piece the brief asks for that this buyer's catalogue does not carry. */
export function missingKinds(brief, facets) {
  const visible = new Set(facets.categories.map((name) => name.toLowerCase()));
  return CATEGORY_TREE.map((entry) => entry.name).filter((name) => !visible.has(name.toLowerCase()) && mentions(brief, name));
}

/** A title and introduction that claim nothing the brief did not say. */
export function sanitizeCopy(raw = {}, brief = '') {
  const clean = (text) => text && !bannedClaims(text).length && !ungroundedNumbers(text, [brief]).length;
  const title = clampText(raw.title, 60);
  const intro = clampText(raw.intro, 280);
  return { title: clean(title) ? title : DEFAULT_TITLE, intro: clean(intro) ? intro : '' };
}

/** The brief in, a titled selection of the buyer's visible styles out. */
export async function buildCatalogue(brief, user) {
  const text = asString(brief, { maxLength: 300 });
  if (text.length < 3) throw Object.assign(new Error('Describe the catalogue you want, e.g. “24 rose gold bridal pieces under 6 g”.'), { status: 400 });

  const { access, facets } = await facetsFor(user);
  const raw = await chatJson({
    system: SYSTEM,
    user: [
      `Brief: "${text}"`,
      `Categories: ${facets.categories.join(', ') || '(none)'}`,
      `Sub-categories: ${facets.subCategories.join(', ') || '(none)'}`,
      `Collections: ${facets.collections.join(', ') || '(none)'}`,
      `Occasions: ${facets.occasions.join(', ') || '(none)'}`,
      `Metal colours: ${facets.metalColors.join(', ') || '(none)'}`,
    ].join('\n'),
    maxTokens: 1200,
    temperature: 0.3,
    timeoutMs: 25_000,
  });

  // Keywords are not searched here: a book is built from filters and tags.
  const params = { ...sanitizeParsed(raw.filters && typeof raw.filters === 'object' ? raw.filters : {}, facets), search: '' };
  if (!['best-sellers', 'new-arrivals'].includes(params.sort)) params.sort = '';
  const count = Math.round(clampNumber(raw.count, MIN_ITEMS, MAX_ITEMS) ?? DEFAULT_ITEMS);
  const tags = normalizeTags(Array.isArray(raw.tags) ? raw.tags : []).slice(0, 4);

  // "Rings" for a buyer who can only see earrings: say so, rather than
  // quietly filling a "rings" lookbook with whatever they can see.
  const missing = params.category.length || params.subCategory.length ? [] : missingKinds(text, facets);
  if (missing.length) {
    return {
      ...sanitizeCopy(raw, text),
      understood: [],
      relaxed: [],
      requested: count,
      items: [],
      message: `Your catalogue does not include ${missing.join(' or ')}. You can build a lookbook from: ${facets.categories.join(', ') || 'no categories yet'}.`,
    };
  }

  // Only styles with a photo: a lookbook without pictures is no use.
  const find = async () =>
    (
      await Product.find(withAccess(await productFilter(params), access))
        .sort({ isBestSeller: -1, isNewArrival: -1, orderCount: -1 })
        .limit(MAX_CANDIDATES)
        .populate(productPopulate)
    )
      .map((doc) => ({ doc, product: serializeProduct(doc) }))
      .filter((entry) => primaryImage(entry.product));

  // Loosen the least important filters until enough styles match.
  const relaxed = [];
  let found = await find();
  for (const step of RELAX_STEPS) {
    if (found.length >= MIN_ITEMS) break;
    if (!step.fields.some((field) => isSet(params, field))) continue;
    for (const field of step.fields) params[field] = Array.isArray(params[field]) ? [] : EMPTY_VALUES[field];
    relaxed.push(step.label);
    found = await find();
  }

  const index = tags.length
    ? await PhotoIndex.find({ product: { $in: found.map((entry) => entry.product.id) } }).select('product tags').lean()
    : [];
  const tagsByProduct = new Map(index.map((entry) => [String(entry.product), entry.tags]));
  const ranked = preferenceOrder(
    found.map(({ doc, product }) => ({
      product,
      styleCode: product.styleCode,
      tags: tagsByProduct.get(product.id) || [],
      isBestSeller: doc.isBestSeller,
      isNewArrival: doc.isNewArrival,
      orderCount: doc.orderCount,
    })),
    tags,
  );
  const items = diversify(ranked, count, (entry) => entry.product.subCategory || entry.product.category || '').map((entry) => entry.product);

  return {
    ...sanitizeCopy(raw, text),
    understood: [...describeParams(params), ...tags],
    relaxed,
    requested: count,
    items,
  };
}
