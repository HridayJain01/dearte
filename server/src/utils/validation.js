import mongoose from 'mongoose';

/**
 * Request-shaped input helpers.
 *
 * The API previously handed `req.body` and `req.query` values straight to
 * Mongoose. Because Express parses `?foo[$ne]=1` into an object, that let a
 * caller smuggle query operators into a filter, and unescaped user text reached
 * `$regex` where a crafted pattern can hang the event loop.
 */

/** Reject anything that is not a primitive string, defeating `?x[$ne]=` operator injection. */
export function asString(value, { maxLength = 200 } = {}) {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return '';
  return value.slice(0, maxLength).trim();
}

/** Escape regex metacharacters so user text is matched literally, not compiled as a pattern. */
export function escapeRegex(value) {
  return asString(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Build a safe case-insensitive "contains" matcher. */
export function containsMatcher(value, options = {}) {
  const escaped = escapeRegex(asString(value, options));
  return escaped ? { $regex: escaped, $options: 'i' } : null;
}

export function isObjectId(value) {
  return typeof value === 'string' && mongoose.Types.ObjectId.isValid(value);
}

export function toNumber(value, fallback = null) {
  const raw = asString(value, { maxLength: 32 });
  // `Number('')` is 0, so an absent or rejected value would otherwise become a
  // real `0` bound on a range filter instead of being left out.
  if (!raw) return fallback;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Clamp pagination so a caller cannot ask for the entire collection in one request. */
export function parsePagination(query, { defaultLimit = 24, maxLimit = 100 } = {}) {
  const page = Math.max(1, Math.floor(toNumber(query.page, 1) ?? 1));
  const rawLimit = Math.floor(toNumber(query.limit, defaultLimit) ?? defaultLimit);
  const limit = Math.min(Math.max(1, rawLimit), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
}

/** Restrict a value to a known set; anything else falls back to the default. */
export function oneOf(value, allowed, fallback = '') {
  const candidate = asString(value);
  return allowed.includes(candidate) ? candidate : fallback;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value) {
  const email = asString(value, { maxLength: 254 });
  return Boolean(email) && EMAIL_PATTERN.test(email);
}

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/**
 * bcrypt silently truncates past 72 bytes, so cap the input rather than give a
 * false sense of strength, and require enough length to resist offline guessing.
 */
export function validatePassword(value) {
  if (typeof value !== 'string' || !value) return 'Password is required.';
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (value.length > PASSWORD_MAX_LENGTH) {
    return `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`;
  }
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    return 'Password must contain at least one letter and one number.';
  }
  return null;
}

/** Normalise an email for storage and lookup. */
export function normalizeEmail(value) {
  return asString(value, { maxLength: 254 }).toLowerCase();
}
