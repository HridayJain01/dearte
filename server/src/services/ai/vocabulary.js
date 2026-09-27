/**
 * The fixed words shop-by-photo is allowed to describe a piece with.
 *
 * Both sides use this list: the nightly photo index tags each catalogue style
 * with it, and a buyer's uploaded photo is described with it too. Matching two
 * closed vocabularies is what lets the ranking be plain arithmetic instead of a
 * vector store. Add words here, not in a prompt.
 */

export const TAG_GROUPS = {
  motif: [
    'floral', 'leaf', 'heart', 'star', 'butterfly', 'bow', 'evil-eye', 'moon', 'snake', 'infinity',
    'geometric', 'abstract', 'cluster', 'halo', 'solitaire', 'three-stone', 'eternity', 'bar', 'knot',
    'teardrop', 'paisley', 'peacock', 'crown', 'initial',
  ],
  silhouette: [
    'stud', 'hoop', 'huggie', 'drop', 'dangle', 'jhumka', 'chandelier', 'ear-cuff', 'climber', 'band',
    'cocktail', 'stackable', 'open', 'bypass', 'tennis', 'bangle', 'cuff', 'chain', 'link', 'pendant',
    'choker', 'lariat', 'mangalsutra', 'nose-pin', 'anklet', 'brooch', 'charm',
  ],
  setting: ['prong', 'bezel', 'pave', 'micro-pave', 'channel', 'invisible', 'tension', 'flush'],
  stoneShape: [
    'round', 'oval', 'pear', 'marquise', 'emerald-cut', 'princess', 'cushion', 'radiant', 'heart-shape',
    'baguette', 'asscher', 'trillion',
  ],
  style: ['minimal', 'classic', 'vintage', 'contemporary', 'traditional', 'bridal', 'statement', 'everyday', 'festive', 'delicate', 'bold'],
};

export const ALL_TAGS = new Set(Object.values(TAG_GROUPS).flat());

/** The vocabulary as prompt text, one group per line. */
export function vocabularyPrompt() {
  return Object.entries(TAG_GROUPS)
    .map(([group, words]) => `${group}: ${words.join(', ')}`)
    .join('\n');
}

const MAX_TAGS = 12;

/** Keep only vocabulary words (case, spaces and underscores tolerated), deduped. */
export function normalizeTags(values) {
  const list = Array.isArray(values) ? values : [];
  const tags = [];
  for (const value of list) {
    if (typeof value !== 'string') continue;
    const tag = value.trim().toLowerCase().replace(/[\s_]+/g, '-');
    if (ALL_TAGS.has(tag) && !tags.includes(tag)) tags.push(tag);
    if (tags.length >= MAX_TAGS) break;
  }
  return tags;
}

const same = (a, b) => Boolean(a && b) && String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

function overlap(left = [], right = []) {
  if (!left.length || !right.length) return 0;
  const set = new Set(right);
  const shared = left.filter((tag) => set.has(tag)).length;
  return shared / (new Set([...left, ...right]).size);
}

/**
 * How well a catalogue style matches what the vision model saw in a photo.
 * Category matters most, then sub category, then metal; the tag overlap
 * (0..1) is what separates two rings from each other.
 */
export function scorePhotoMatch(photo, product, productTags = []) {
  let score = 0;
  if (same(photo.category, product.category)) score += 3;
  if (same(photo.subCategory, product.subCategory)) score += 2;
  const colours = [product.metalColor, ...(product.goldColors || [])];
  if (photo.metalColor && colours.some((colour) => same(colour, photo.metalColor))) score += 1;
  score += 5 * overlap(photo.tags, productTags);
  return score;
}
