/**
 * Checks applied to everything a model writes before it reaches a buyer, a
 * crawler or the database. Model output is treated like any other untrusted
 * input: it is matched against lists we own, and prose is checked for claims
 * DeArte never made. Pure functions only, so they are tested without a model.
 */

const DEFAULT_ALLOWED_NUMBERS = ['4', '9', '14', '18'];

// A number followed by one of these is a claim (a price, a share, a weight) and
// must be backed by the facts we supplied. Bare small counts ("5 ways") are not.
const UNIT_AFTER = /^\s?(%|percent\b|per\s?cent\b|x\b|×|ct\b|cts\b|carats?\b|g\b|gm\b|grams?\b|mm\b|kg\b|lakh|crore|million|billion|bn\b|mn\b|k\b)/i;
const CURRENCY_BEFORE = /(₹|rs\.?|inr|\$|usd|us\$|€|£)\s?$/i;

function normalizeNumber(raw) {
  const plain = String(raw).replace(/,/g, '');
  if (!/^\d+(\.\d+)?$/.test(plain)) return plain;
  return String(Number(plain));
}

function numbersIn(text) {
  return (String(text || '').match(/\d[\d,]*(?:\.\d+)?/g) || []).map(normalizeNumber);
}

/**
 * Every figure in `text` must appear in one of `sources` (the facts we gave the
 * model), be a small bare count, or be this year / last year / next year.
 * Returns the figures that are not accounted for.
 */
export function ungroundedNumbers(text, sources = [], { now = new Date() } = {}) {
  const allowed = new Set([...DEFAULT_ALLOWED_NUMBERS, ...sources.flatMap(numbersIn)]);
  const year = now.getFullYear();
  const unknown = new Set();
  const pattern = /\d[\d,]*(?:\.\d+)?/g;
  const source = String(text || '');
  let match;

  while ((match = pattern.exec(source))) {
    const value = normalizeNumber(match[0]);
    if (allowed.has(value)) continue;

    const before = source.slice(Math.max(0, match.index - 4), match.index);
    const after = source.slice(match.index + match[0].length, match.index + match[0].length + 10);
    const isClaim = UNIT_AFTER.test(after) || CURRENCY_BEFORE.test(before);
    const numeric = Number(value);

    if (!isClaim && Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) continue;
    if (!isClaim && numeric >= year - 1 && numeric <= year + 1) continue;
    unknown.add(match[0]);
  }

  return [...unknown];
}

const BANNED_CLAIMS = [
  { pattern: /\bguarant(ee|y)\w*/i, label: 'guarantee' },
  { pattern: /\b(best|lowest|cheapest)\s+(prices?|rates?)\b/i, label: 'price superlative' },
  { pattern: /\binvestment\b/i, label: 'investment claim' },
  { pattern: /\bresale value\b/i, label: 'resale value' },
  {
    // "Customers appreciate…" is fine; "appreciates in value" is not.
    pattern: /\b(appreciat\w*\s+(in|over)\s+(value|price|time)|(value|price)\s+appreciation|(grows?|growing|rises?|rising)\s+in\s+value|holds?\s+(its|their)\s+value)\b/i,
    label: 'value appreciation',
  },
  { pattern: /\b100\s?(%|percent)/i, label: '100% claim' },
  { pattern: /\b(heal|heals|healing|cures?|therapeutic)\b/i, label: 'health claim' },
  {
    pattern: /\b(de beers|lightbox|tiffany|cartier|tanishq|kalyan|malabar|caratlane|bluestone|pandora|swarovski)\b/i,
    label: 'competitor brand',
  },
];

const CERTIFICATION = /\bcertif(y|ied|ies|icates?|ications?)\b/i;

function findClaims(text, facts = '') {
  const body = String(text || '');
  const found = BANNED_CLAIMS.map(({ pattern, label }) => ({ label, match: body.match(pattern) })).filter((item) => item.match);
  if (!/\bcertif/i.test(String(facts || ''))) {
    const match = body.match(CERTIFICATION);
    if (match) found.push({ label: 'certification claim', match });
  }
  return { body, found };
}

/**
 * Claims a trade manufacturer should not make in marketing copy. A
 * certification claim is only allowed when our own facts mention it.
 */
export function bannedClaims(text, facts = '') {
  return findClaims(text, facts).found.map(({ label }) => label);
}

/** The same claims, each with the words that tripped it, so a rewrite can find them. */
export function claimEvidence(text, facts = '') {
  const { body, found } = findClaims(text, facts);
  return found.map(({ label, match }) => {
    const start = Math.max(0, match.index - 40);
    const end = Math.min(body.length, match.index + match[0].length + 40);
    return `${label}: "…${body.slice(start, end).replace(/\s+/g, ' ').trim()}…"`;
  });
}

const STOPWORDS = new Set(
  'a an the and or of for to in on with your you how what why when is are be by from at as it its this that vs guide'.split(' '),
);

function significantWords(title) {
  return new Set(
    String(title || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/[\s-]+/)
      .filter((word) => word && !STOPWORDS.has(word))
      .map((word) => (word.length > 3 && word.endsWith('s') ? word.slice(0, -1) : word)),
  );
}

/** Jaccard overlap of the meaningful words in two titles, 0..1. */
export function titleSimilarity(a, b) {
  const left = significantWords(a);
  const right = significantWords(b);
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const word of left) if (right.has(word)) shared += 1;
  return shared / (left.size + right.size - shared);
}

const squash = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Map whatever the model wrote onto names we actually have, dropping anything
 * that is not one of them. Tolerates case, spacing, punctuation and a plural s.
 */
export function matchNames(values, allowed = []) {
  const list = Array.isArray(values) ? values : [values];
  const byKey = new Map();
  for (const name of allowed) {
    if (typeof name !== 'string' || !name.trim()) continue;
    const key = squash(name);
    byKey.set(key, name);
    byKey.set(key.endsWith('s') ? key.slice(0, -1) : `${key}s`, name);
  }

  const matched = [];
  for (const value of list) {
    if (typeof value !== 'string') continue;
    const name = byKey.get(squash(value));
    if (name && !matched.includes(name)) matched.push(name);
  }
  return matched;
}

/** A finite number inside [min, max], or null. */
export function clampNumber(value, min, max) {
  if (value === null || value === undefined || typeof value === 'boolean') return null;
  const digits = typeof value === 'string' ? value.replace(/[^\d.]/g, '') : value;
  if (digits === '') return null;
  const number = Number(digits);
  if (!Number.isFinite(number)) return null;
  return Math.min(max, Math.max(min, number));
}

/**
 * Trim to `max` characters on a word boundary. Models like to write
 * non-breaking hyphens ("Lab‑Grown"), which searches don't match; they become
 * plain hyphens, and odd spaces (which \s covers) plain spaces.
 */
export function clampText(value, max) {
  const flat = String(value ?? '')
    .replace(/[\u2010\u2011]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\s-]+$/, '');
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
