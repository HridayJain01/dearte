/**
 * "Recently viewed" lives in this browser only. It is keyed per buyer so a
 * shared counter device never shows one account's catalogue to the next.
 * ponytail: stores a snapshot of each product, so weights/photos can lag an
 * edit until the style is viewed again; fetch by style code if that matters.
 */
const LIMIT = 12;
const keyFor = (userId) => `dearte:recent:${userId || 'guest'}`;

export function recentlyViewed(userId) {
  try {
    return JSON.parse(localStorage.getItem(keyFor(userId))) || [];
  } catch {
    return [];
  }
}

export function rememberViewed(product, userId) {
  // The detail payload carries its own related rail and spec table; the card
  // needs neither, and they would bloat storage.
  const { relatedProducts: _related, specifications: _specs, ...card } = product;
  const list = [card, ...recentlyViewed(userId).filter((item) => item.id !== product.id)].slice(0, LIMIT);
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(list));
  } catch {
    // Private mode or a full quota: the rail just stays as it was.
  }
}
