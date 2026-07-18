/**
 * Central environment handling.
 *
 * Secrets used to fall back to hardcoded development defaults, which meant a
 * production deploy that forgot to set JWT_SECRET would happily sign tokens
 * with a value published in this repo. Anyone could then forge an admin
 * session. Startup now fails loudly instead.
 */

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const isProduction = NODE_ENV === 'production';

const REQUIRED_IN_PRODUCTION = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'CLIENT_ORIGIN'];

// Values that shipped as fallbacks or placeholders; refuse them outright.
const BANNED_SECRETS = new Set([
  'dearte-access-secret',
  'dearte-refresh-secret',
  'your_jwt_secret_here_generate_new_one',
  'your_refresh_secret_here_generate_new_one',
  'changeme',
  'secret',
]);

const MIN_SECRET_LENGTH = 32;

export function validateEnvironment() {
  const errors = [];
  const warnings = [];

  if (isProduction) {
    for (const key of REQUIRED_IN_PRODUCTION) {
      if (!process.env[key]) {
        errors.push(`${key} is required in production but is not set.`);
      }
    }
  }

  for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET']) {
    const value = process.env[key];
    if (!value) continue;

    if (BANNED_SECRETS.has(value)) {
      errors.push(`${key} is set to a known placeholder value. Generate a fresh secret.`);
    } else if (value.length < MIN_SECRET_LENGTH) {
      const message = `${key} is shorter than ${MIN_SECRET_LENGTH} characters, which is too weak to sign sessions.`;
      if (isProduction) errors.push(message);
      else warnings.push(message);
    }
  }

  if (
    process.env.JWT_SECRET &&
    process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET
  ) {
    errors.push('JWT_SECRET and JWT_REFRESH_SECRET must be different values.');
  }

  if (!isProduction) {
    warnings.push(
      `NODE_ENV is "${NODE_ENV}". Session cookies will not be marked Secure. Set NODE_ENV=production on your deployment host.`,
    );
  }

  for (const warning of warnings) {
    console.warn(`[config] ${warning}`);
  }

  if (errors.length) {
    throw new Error(`Invalid configuration:\n  - ${errors.join('\n  - ')}`);
  }
}

/**
 * Secrets are read through these so no module can silently substitute a
 * default. In development an ephemeral secret is generated per boot, which
 * invalidates old sessions on restart but never leaks a shared constant.
 */
function developmentFallback(label) {
  console.warn(`[config] ${label} is unset; using a random per-process value (development only).`);
  return `dev-${label}-${Math.random().toString(36).slice(2)}${Date.now()}`;
}

export const ACCESS_SECRET = process.env.JWT_SECRET || developmentFallback('JWT_SECRET');
export const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || developmentFallback('JWT_REFRESH_SECRET');
