import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_SECRET || 'dearte-access-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dearte-refresh-secret';

export const COOKIE_NAMES = {
  access: 'dearte_access',
  refresh: 'dearte_refresh',
};

function isProd() {
  return process.env.NODE_ENV === 'production';
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

export function userDto(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    companyName: user.companyName,
    status: user.status,
  };
}
