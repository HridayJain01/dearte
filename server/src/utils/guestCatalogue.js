// Cached loader for the admin-configured "what may a guest browse" rules.
//
// Every public catalogue endpoint needs these rules for logged-out visitors, so
// we cache the SiteSettings lookup for a short window instead of hitting the DB
// on each request. The cache is cleared whenever the admin saves site settings.
import { SiteSettings } from '../models/index.js';

const CACHE_TTL_MS = 30_000;
let cache = { value: null, at: 0 };

// Normalised shape callers can rely on (string ids, always-present arrays).
function normalize(raw) {
  const gc = raw || {};
  return {
    includeFlagged: gc.includeFlagged !== false,
    categories: (gc.categories || []).map(String),
    subCategories: (gc.subCategories || []).map(String),
    collections: (gc.collections || []).map(String),
    occasions: (gc.occasions || []).filter((value) => typeof value === 'string' && value.trim()),
  };
}

export function invalidateGuestCatalogueCache() {
  cache = { value: null, at: 0 };
}

export async function getGuestCatalogue() {
  if (cache.value && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  const settings = await SiteSettings.findOne()
    .sort({ createdAt: -1 })
    .select('guestCatalogue')
    .lean();
  const value = normalize(settings?.guestCatalogue);
  cache = { value, at: Date.now() };
  return value;
}
