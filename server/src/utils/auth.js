import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { catalogAccessDto } from './catalogAccess.js';

import { ACCESS_SECRET, REFRESH_SECRET, isProduction } from '../config/env.js';

export const COOKIE_NAMES = {
  access: 'dearte_access',
  refresh: 'dearte_refresh',
};

function isProd() {
  return isProduction;
}

export function accessCookieOptions() {
  return {
    httpOnly: true,
    secure: isProd(),
    sameSite: isProd() ? 'none' : 'lax',
    maxAge: 1000 * 60 * 15,
    path: '/',
  };
}

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: isProd(),
    sameSite: isProd() ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 14,
    path: '/',
  };
}

export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      role: user.role,
      email: user.email,
    },
    ACCESS_SECRET,
    { expiresIn: '15m' },
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      tokenId: crypto.randomUUID(),
    },
    REFRESH_SECRET,
    { expiresIn: '14d' },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

/**
 * Refresh tokens are long-lived, so they are stored as digests rather than raw
 * strings: read access to the users collection no longer hands out live
 * 14-day sessions.
 */
export function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export function refreshTokenMatches(storedValues, token) {
  const digest = hashRefreshToken(token);
  return (storedValues || []).includes(digest);
}

/** Cryptographically random 6-digit reset code, stored only as a digest. */
export function generateOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

export function hashOtp(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

/** Constant-time compare so a stored code cannot be recovered by timing. */
export function otpMatches(storedHash, candidate) {
  if (!storedHash || !candidate) return false;
  const expected = Buffer.from(storedHash, 'utf8');
  const actual = Buffer.from(hashOtp(candidate), 'utf8');
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

export function userDto(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    companyName: user.companyName,
    status: user.status,
    catalogAccess: catalogAccessDto(user),
  };
}
