import { sendError } from '../utils/responses.js';
import { verifyToken } from '../utils/auth.js';
import { db } from '../services/store.js';

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.replace('Bearer ', '')
    : null;
  const token = req.cookies.token || bearerToken;

  if (!token) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const payload = verifyToken(token);
    const user = db.users.find((entry) => entry.id === payload.id);

    if (!user) {
      return sendError(res, 'User not found', 401);
    }

    req.user = user;
    return next();
  } catch (error) {
    return sendError(res, 'Invalid or expired token', 401);
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return sendError(res, 'Admin access required', 403);
  }

  return next();
};
