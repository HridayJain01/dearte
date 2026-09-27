/**
 * Shop by photo, without embeddings or a vector index.
 *
 * Nightly, the vision model tags each style's main photo with words from a
 * fixed vocabulary (vocabulary.js) and the tags go into PhotoIndex — never
 * into the product. A buyer's photo is described with the same vocabulary,
 * and styles are ranked by category, metal and tag overlap.
 *
 * ponytail: tag matching finds "similar style", not "this exact design"; the
 * upgrade path is image embeddings (CLIP) if buyers need exact matches.
 */
import { Category, PhotoIndex, Product } from '../../models/index.js';
import { serializeProduct } from '../../utils/serializers.js';
import { AiError, aiStatus, chatJson } from './llm.js';
import { matchNames } from './guards.js';
import { normalizeTags, scorePhotoMatch, vocabularyPrompt } from './vocabulary.js';
import { getAiSettings } from './settings.js';
import { deadlineIn, runJob, timeLeft } from './jobs.js';
import { accessFilterFor, primaryImage, productPopulate, withAccess } from './catalogue.js';
import { facetsFor } from './search.js';

const DAY = 24 * 60 * 60 * 1000;
const RETRY_AFTER_DAYS = 7;
const BATCH_LIMIT = 60;
const WORKERS = 3;
// ponytail: candidates are scored in memory; fine for a few thousand styles,
// move the category filter and tag overlap into an aggregation beyond that.
const MAX_CANDIDATES = 600;
const RESULTS = 24;
// A downscaled 768 px JPEG is ~100–200 KB, well inside the API's 1 MB body limit.
const MAX_IMAGE_CHARS = 900_000;
const DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

const list = (value) => (Array.isArray(value) ? value : []);

const TAG_SYSTEM = `You tag product photos of fine jewellery for a visual search index.
Choose 3 to 10 tags ONLY from the vocabulary below that best describe the piece's motif, silhouette, setting, stone shapes and style.
Return ONLY JSON: {"tags": ["..."]}

Vocabulary:
${vocabularyPrompt()}`;

const PHOTO_SYSTEM = `A jewellery retailer uploaded a photo to find similar pieces in a catalogue. Identify the main piece of jewellery in it.
Choose category, sub-category and metal colour ONLY from the lists given, or "" when unsure. Choose 3 to 10 tags ONLY from the vocabulary.
If the photo shows no jewellery, set "isJewellery" to false.
Return ONLY JSON: {"isJewellery": true, "category": "", "subCategory": "", "metalColor": "", "tags": []}

Vocabulary:
${vocabularyPrompt()}`;

async function tagProduct(product, timeoutMs) {
  const raw = await chatJson({
    system: TAG_SYSTEM,
    user: `Style ${product.styleCode}: ${[product.category, product.subCategory].filter(Boolean).join(' / ') || 'jewellery'}.`,
    images: [primaryImage(product)],
    maxTokens: 300,
    temperature: 0,
    timeoutMs,
  });
  return normalizeTags(list(raw.tags));
}

/** Styles still to tag: never indexed, or last failed over a week ago. Guest-visible first. */
async function pendingProducts() {
  const done = await PhotoIndex.find({
    $or: [{ indexedAt: { $ne: null } }, { attemptedAt: { $gte: new Date(Date.now() - RETRY_AFTER_DAYS * DAY) } }],
  }).distinct('product');
  const base = { status: 'Active', _id: { $nin: done } };
  const order = { isBestSeller: -1, isNewArrival: -1, updatedAt: -1 };

  const guestVisible = await Product.find(withAccess(base, await accessFilterFor(null)))
    .sort(order)
    .limit(BATCH_LIMIT)
    .populate(productPopulate);
  const others =
    guestVisible.length < BATCH_LIMIT
      ? await Product.find({ ...base, _id: { $nin: [...done, ...guestVisible.map((doc) => doc._id)] } })
          .sort(order)
          .limit(BATCH_LIMIT - guestVisible.length)
          .populate(productPopulate)
      : [];
  return [...guestVisible, ...others].map(serializeProduct);
}

/** Tag as many pending styles as the time budget allows, three at a time. */
export async function indexPhotos({ deadline = deadlineIn() } = {}) {
  if (!aiStatus().vision) throw new AiError('The vision model is not configured.', 503);
  const model = process.env.AI_VISION_MODEL || '';
  const queue = await pendingProducts();
  let cursor = 0;
  let indexed = 0;
  let failed = 0;
  let busy = false;

  const record = (productId, fields) =>
    PhotoIndex.updateOne({ product: productId }, { $set: { attemptedAt: new Date(), ...fields } }, { upsert: true });

  async function worker() {
    while (cursor < queue.length && !busy && timeLeft(deadline) > 12_000) {
      const product = queue[cursor];
      cursor += 1;
      if (!primaryImage(product)) {
        await record(product.id, { error: 'No photo' });
        failed += 1;
        continue;
      }
      try {
        const tags = await tagProduct(product, Math.min(30_000, timeLeft(deadline) - 5_000));
        await record(product.id, { tags, model, indexedAt: new Date(), error: '' });
        indexed += 1;
      } catch (error) {
        // Rate-limited: stop for today and leave the style untouched, so it
        // is first in line tomorrow rather than parked for a week.
        if (error?.status === 429) {
          busy = true;
          break;
        }
        await record(product.id, { error: String(error?.message || error).slice(0, 200) });
        failed += 1;
      }
    }
  }
  await Promise.all(Array.from({ length: WORKERS }, worker));

  const [active, done] = await Promise.all([
    Product.countDocuments({ status: 'Active' }),
    PhotoIndex.countDocuments({ indexedAt: { $ne: null } }),
  ]);
  return `Tagged ${indexed} style(s)${failed ? `, ${failed} failed` : ''}${busy ? ', stopped at the rate limit' : ''}; ${Math.max(0, active - done)} still to go.`;
}

export async function runPhotoIndexCron() {
  const settings = await getAiSettings({ fresh: true });
  if (!settings.photoIndex.enabled) return { skipped: 'The photo index is off.' };
  if (!aiStatus().vision) return { skipped: 'The vision model is not configured.' };
  const deadline = deadlineIn();
  return runJob('photo-index', 'cron', () => indexPhotos({ deadline }));
}

export function runPhotoIndexNow() {
  const deadline = deadlineIn();
  return runJob('photo-index', 'admin', () => indexPhotos({ deadline }));
}

/** Rank serialized products against what the model saw; best first. */
export function rankProducts(photo, products, tagsByProduct = new Map(), limit = RESULTS) {
  return products
    .map((product) => ({ product, score: scorePhotoMatch(photo, product, tagsByProduct.get(product.id) || []) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.product);
}

/** The buyer's photo in, the closest visible styles out. The photo is never stored. */
export async function searchByPhoto(image, user) {
  const dataUrl = typeof image === 'string' ? image : '';
  if (!DATA_URL.test(dataUrl) || dataUrl.length > MAX_IMAGE_CHARS) {
    throw Object.assign(new Error('Send a JPEG, PNG or WebP photo under about 700 KB.'), { status: 400 });
  }

  const { access, facets } = await facetsFor(user);
  const raw = await chatJson({
    system: PHOTO_SYSTEM,
    user: [
      `Categories: ${facets.categories.join(', ') || '(none)'}`,
      `Sub-categories: ${facets.subCategories.join(', ') || '(none)'}`,
      `Metal colours: ${facets.metalColors.join(', ') || '(none)'}`,
    ].join('\n'),
    images: [dataUrl],
    maxTokens: 300,
    temperature: 0,
    timeoutMs: 30_000,
  });

  const photo = {
    category: matchNames(raw.category || '', facets.categories)[0] || '',
    subCategory: matchNames(raw.subCategory || '', facets.subCategories)[0] || '',
    metalColor: matchNames(raw.metalColor || '', facets.metalColors)[0] || '',
    tags: normalizeTags(list(raw.tags)),
  };
  const seen = [photo.metalColor, photo.subCategory || photo.category, ...photo.tags].filter(Boolean);
  if (raw.isJewellery === false) return { seen: [], items: [], message: "We couldn't find a piece of jewellery in that photo." };

  // Narrow to the detected category when it leaves enough to choose from.
  const category = photo.category ? await Category.findOne({ name: photo.category }).select('_id').lean() : null;
  let docs = category
    ? await Product.find(withAccess({ status: 'Active', category: category._id }, access)).limit(MAX_CANDIDATES).populate(productPopulate)
    : [];
  if (docs.length < 8) {
    docs = await Product.find(withAccess({ status: 'Active' }, access)).limit(MAX_CANDIDATES).populate(productPopulate);
  }

  const products = docs.map(serializeProduct).filter(primaryImage);
  const index = await PhotoIndex.find({ product: { $in: products.map((product) => product.id) } }).select('product tags').lean();
  const tagsByProduct = new Map(index.map((entry) => [String(entry.product), entry.tags]));
  const items = rankProducts(photo, products, tagsByProduct);

  return {
    seen,
    items,
    message: items.length ? '' : 'Nothing in the catalogue looks close to that photo yet.',
  };
}
