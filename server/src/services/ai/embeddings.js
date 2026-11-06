/**
 * Visual search on image embeddings (Voyage multimodal).
 *
 * Each style's main photo, plus a one-line caption, becomes a 1024-number
 * vector stored in PhotoIndex. A buyer's photo or sentence is embedded into the
 * same space and styles are ranked by cosine similarity — so a photo finds the
 * same design, and "floral halo ring with leaf shank" finds it by meaning.
 *
 * ponytail: vectors are scored in memory (cached per instance). Fine for a few
 * thousand styles; beyond that, move to an Atlas `$vectorSearch` index on
 * photoindexes.embedding.
 */
import { MetalOption, Category, PhotoIndex, Product, SubCategory } from '../../models/index.js';
import { serializeProduct } from '../../utils/serializers.js';
import { AiError } from './llm.js';
import { accessFilterFor, primaryImage, productPopulate, visibleProductsByIds, withAccess } from './catalogue.js';
import { timeLeft } from './jobs.js';

const API = 'https://api.voyageai.com/v1/multimodalembeddings';
const BATCH = 16;
const CACHE_MS = 10 * 60 * 1000;
const RESULTS = 24;

const model = () => process.env.VOYAGE_MODEL || 'voyage-multimodal-3';
export const embeddingsReady = () => Boolean(process.env.VOYAGE_API_KEY);

// A 512 px Cloudinary rendition keeps image tokens (and cost) small.
const smallImage = (url) => (url.includes('/upload/') ? url.replace('/upload/', '/upload/f_jpg,q_auto,w_512/') : url);

export function caption(product) {
  return [product.metalColor, product.subCategory || product.category, product.name || product.styleCode].filter(Boolean).join(' ');
}

/** inputs: arrays of Voyage content parts. inputType: 'document' (catalogue) or 'query' (buyer). */
async function embed(inputs, inputType, timeoutMs = 30_000) {
  const response = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: model(), input_type: inputType, inputs: inputs.map((content) => ({ content })) }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).slice(0, 200);
    throw new AiError(response.status === 429 ? 'The embedding service is busy. Try again in a minute.' : `Embedding failed: ${detail}`, response.status === 429 ? 429 : 503);
  }
  const body = await response.json();
  return body.data.map((item) => item.embedding);
}

export function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/** Ids by similarity to `vector`, among `entries` ([{ id, embedding }]) allowed by `allowed` (a Set or null). */
export function nearest(vector, entries, allowed = null, limit = RESULTS) {
  return entries
    .filter((entry) => !allowed || allowed.has(entry.id))
    .map((entry) => ({ id: entry.id, score: cosine(vector, entry.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

let cache = null;
async function allEmbeddings() {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.entries;
  const docs = await PhotoIndex.find({ embeddedAt: { $ne: null } }).select('product +embedding').lean();
  cache = { at: Date.now(), entries: docs.map((doc) => ({ id: String(doc.product), embedding: doc.embedding })) };
  return cache.entries;
}

/** Styles whose current main photo has no embedding yet (new, or photo changed). */
async function pendingEmbeds() {
  const [docs, index] = await Promise.all([
    Product.find({ status: 'Active' }).sort({ isBestSeller: -1, updatedAt: -1 }).populate(productPopulate),
    PhotoIndex.find({ embeddedAt: { $ne: null } }).select('product embeddedImage').lean(),
  ]);
  const done = new Map(index.map((entry) => [String(entry.product), entry.embeddedImage]));
  return docs.map(serializeProduct).filter((product) => primaryImage(product) && done.get(product.id) !== primaryImage(product));
}

/** Embed pending styles in batches until the deadline. Returns a one-line summary. */
export async function embedPhotos({ deadline }) {
  if (!embeddingsReady()) return 'Embeddings are off (no VOYAGE_API_KEY).';
  const pending = await pendingEmbeds();
  let embedded = 0;
  let busy = false;
  for (let start = 0; start < pending.length && timeLeft(deadline) > 15_000; start += BATCH) {
    const batch = pending.slice(start, start + BATCH);
    let vectors;
    try {
      vectors = await embed(
        batch.map((product) => [{ type: 'text', text: caption(product) }, { type: 'image_url', image_url: smallImage(primaryImage(product)) }]),
        'document',
        timeLeft(deadline) - 5_000,
      );
    } catch (error) {
      if (error?.status === 429) busy = true;
      else console.warn('[embeddings] batch failed:', error?.message);
      break;
    }
    await PhotoIndex.bulkWrite(
      batch.map((product, i) => ({
        updateOne: {
          filter: { product: product.id },
          update: { $set: { embedding: vectors[i], embeddedImage: primaryImage(product), embedModel: model(), embeddedAt: new Date() } },
          upsert: true,
        },
      })),
    );
    embedded += batch.length;
  }
  if (embedded) cache = null;
  return `Embedded ${embedded} style(s)${busy ? ', stopped at the rate limit' : ''}; ${pending.length - embedded} still to go.`;
}

export const pendingEmbedCount = async () => (embeddingsReady() ? (await pendingEmbeds()).length : 0);

/** Visible product ids for this viewer, optionally narrowed by category / sub-category / metal names. */
async function allowedIds(access, { category = [], subCategory = [], metalColor = [] } = {}) {
  const filter = { status: 'Active' };
  const ids = async (Model, names) => (await Model.find({ name: { $in: names } }).select('_id').lean()).map((doc) => doc._id);
  if (category.length) filter.category = { $in: await ids(Category, category) };
  if (subCategory.length) filter.subCategory = { $in: await ids(SubCategory, subCategory) };
  if (metalColor.length) filter.metalColor = { $in: await ids(MetalOption, metalColor) };
  return new Set((await Product.distinct('_id', withAccess(filter, access))).map(String));
}

/**
 * Rank visible styles against a photo (data URL) or text. Hard filters (from
 * smart search) narrow first; if they leave nothing, they are dropped.
 */
export async function similarProducts({ image, text, filters, user }) {
  const access = await accessFilterFor(user);
  const content = image ? [{ type: 'image_base64', image_base64: image }] : [{ type: 'text', text }];
  const [[vector], entries] = await Promise.all([embed([content], 'query', 20_000), allEmbeddings()]);
  let allowed = await allowedIds(access, filters);
  if (!allowed.size && filters) allowed = await allowedIds(access);
  const ranked = nearest(vector, entries, allowed);
  return visibleProductsByIds(ranked.map((entry) => entry.id), user, { access });
}
