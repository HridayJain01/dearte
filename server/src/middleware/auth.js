import { User } from '../models/index.js';
import { verifyAccessToken, COOKIE_NAMES } from '../utils/auth.js';
import { sendError } from '../utils/responses.js';

export const requireAuth = async (req, res, next) => {
  const token = req.cookies[COOKIE_NAMES.access];

  if (!token) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);

    if (!user) {
      return sendError(res, 'User not found', 401);
    }

    req.user = user;
    return next();
  } catch (error) {
    return sendError(res, 'Invalid or expired session', 401);
  }
};

export const optionalAuth = async (req, _res, next) => {
  const token = req.cookies[COOKIE_NAMES.access];

  if (!token) {
    return next();
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);
    req.user = user || null;
  } catch (error) {
    req.user = null;
  }

  return next();
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return sendError(res, 'Admin access required', 403);
  }

  return next();
};
