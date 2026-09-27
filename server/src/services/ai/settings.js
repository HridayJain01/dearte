/**
 * AI Studio settings: read with defaults, saved only when an admin saves.
 *
 * Nothing here writes on read, so a deploy never creates the settings document
 * on its own. Reads are cached briefly because /api/ai/features is asked on
 * every storefront page that shows an AI control.
 */
import { AiSettings } from '../../models/index.js';
import { BLOG_TOPICS } from '../../data/blogTopics.js';
import { asString } from '../../utils/validation.js';
import { aiStatus } from './llm.js';

const MODES = ['off', 'staff', 'everyone'];
const FEATURE_KEYS = ['smartSearch', 'photoSearch', 'restock', 'catalogueBuilder'];
const MAX_TOPICS = 100;
const CACHE_TTL_MS = 30_000;

function seedQueue() {
  return BLOG_TOPICS.map((topic) => ({
    title: topic.title,
    angle: topic.angle || '',
    keywords: topic.keywords || [],
    hints: { category: '', occasion: '', collection: '', ...(topic.hints || {}) },
    months: topic.months || [],
    status: 'queued',
    source: 'seed',
    usedAt: null,
  }));
}

function withDefaults(doc) {
  const saved = doc || {};
  return {
    features: Object.fromEntries(
      FEATURE_KEYS.map((key) => [key, MODES.includes(saved.features?.[key]) ? saved.features[key] : 'staff']),
    ),
    photoIndex: { enabled: saved.photoIndex?.enabled === true },
    nudges: { enabled: saved.nudges?.enabled === true },
    blog: {
      enabled: saved.blog?.enabled === true,
      autoPublish: saved.blog?.autoPublish !== false,
      postsPerWeek: saved.blog?.postsPerWeek === 2 ? 2 : 1,
      facts: saved.blog?.facts || '',
      topicQueue: Array.isArray(saved.blog?.topicQueue) ? saved.blog.topicQueue : seedQueue(),
    },
  };
}

let cache = { value: null, at: 0 };

export function invalidateAiSettings() {
  cache = { value: null, at: 0 };
}

export async function getAiSettings({ fresh = false } = {}) {
  if (!fresh && cache.value && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  const doc = await AiSettings.findOne().lean();
  const value = withDefaults(doc);
  cache = { value, at: Date.now() };
  return value;
}

const toBoolean = (value, fallback) => (typeof value === 'boolean' ? value : fallback);

export function sanitizeTopics(list) {
  return (Array.isArray(list) ? list : [])
    .slice(0, MAX_TOPICS)
    .map((topic) => ({
      title: asString(topic?.title, { maxLength: 140 }),
      angle: asString(topic?.angle, { maxLength: 300 }),
      keywords: (Array.isArray(topic?.keywords) ? topic.keywords : [])
        .map((word) => asString(word, { maxLength: 60 }))
        .filter(Boolean)
        .slice(0, 6),
      hints: {
        category: asString(topic?.hints?.category, { maxLength: 60 }),
        occasion: asString(topic?.hints?.occasion, { maxLength: 60 }),
        collection: asString(topic?.hints?.collection, { maxLength: 60 }),
      },
      months: (Array.isArray(topic?.months) ? topic.months : [])
        .map(Number)
        .filter((month) => Number.isInteger(month) && month >= 1 && month <= 12),
      status: ['queued', 'used', 'skipped'].includes(topic?.status) ? topic.status : 'queued',
      source: ['seed', 'admin', 'ai'].includes(topic?.source) ? topic.source : 'admin',
      usedAt: topic?.usedAt ? new Date(topic.usedAt) : null,
    }))
    .filter((topic) => topic.title);
}

/** Merge an admin's partial update onto the current settings, field by field. */
export function sanitizeSettings(body = {}, current = withDefaults(null)) {
  const features = { ...current.features };
  for (const key of FEATURE_KEYS) {
    if (MODES.includes(body.features?.[key])) features[key] = body.features[key];
  }

  const blogInput = body.blog || {};
  return {
    features,
    photoIndex: { enabled: toBoolean(body.photoIndex?.enabled, current.photoIndex.enabled) },
    nudges: { enabled: toBoolean(body.nudges?.enabled, current.nudges.enabled) },
    blog: {
      enabled: toBoolean(blogInput.enabled, current.blog.enabled),
      autoPublish: toBoolean(blogInput.autoPublish, current.blog.autoPublish),
      postsPerWeek: [1, 2].includes(Number(blogInput.postsPerWeek)) ? Number(blogInput.postsPerWeek) : current.blog.postsPerWeek,
      facts: blogInput.facts !== undefined ? asString(blogInput.facts, { maxLength: 4000 }) : current.blog.facts,
      topicQueue: Array.isArray(blogInput.topicQueue) ? sanitizeTopics(blogInput.topicQueue) : current.blog.topicQueue,
    },
  };
}

export async function saveAiSettings(body) {
  const current = await getAiSettings({ fresh: true });
  const next = sanitizeSettings(body, current);
  await AiSettings.findOneAndUpdate({}, { $set: next }, { upsert: true, runValidators: true });
  invalidateAiSettings();
  return getAiSettings({ fresh: true });
}

export function isStaff(user) {
  return ['admin', 'sales'].includes(user?.role);
}

function allowed(mode, user) {
  return mode === 'everyone' || (mode === 'staff' && isStaff(user));
}

/**
 * Which AI controls this visitor should see. Anything that fails (settings
 * unreadable, AI not configured) resolves to "off", never to an error.
 */
export async function featuresFor(user) {
  let settings;
  try {
    settings = await getAiSettings();
  } catch {
    return Object.fromEntries(FEATURE_KEYS.map((key) => [key, false]));
  }

  const { text, vision } = aiStatus();
  const mode = settings.features;
  return {
    smartSearch: text && allowed(mode.smartSearch, user),
    photoSearch: vision && Boolean(user) && allowed(mode.photoSearch, user),
    // Restock suggestions are arithmetic over order history; no model needed.
    restock: Boolean(user) && allowed(mode.restock, user),
    catalogueBuilder: text && Boolean(user) && allowed(mode.catalogueBuilder, user),
  };
}
