/**
 * Storefront-facing AI endpoints, plus the three scheduled jobs.
 *
 * Mounted before the buyer router in index.js so guests reach it without a
 * 401. Every feature re-checks its AI Studio switch here, not just in the UI:
 * a feature that is off must not spend the free model quota for anyone who
 * calls the endpoint directly.
 */
import crypto from 'crypto';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { optionalAuth } from '../middleware/auth.js';
import { sendError, sendSuccess } from '../utils/responses.js';
import { featuresFor } from '../services/ai/settings.js';

const router = express.Router();

router.use(optionalAuth);

// Tighter than the API-wide budget: each call here can spend model quota.
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, data: null, message: 'Too many requests. Please wait a minute.' },
});

export const requireFeature = (name) => async (req, res, next) => {
  const features = await featuresFor(req.user);
  if (!features[name]) return sendError(res, 'This feature is not available.', 403);
  return next();
};

router.get('/features', async (req, res) => sendSuccess(res, await featuresFor(req.user)));

// Vercel Cron calls these with `Authorization: Bearer $CRON_SECRET`. Without a
// secret configured they refuse to run at all, so they can never be public.
const CRON_JOBS = {};

function cronAuthorized(req) {
  const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET}`);
  const given = Buffer.from(String(req.get('authorization') || ''));
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

router.get('/cron/:job', async (req, res) => {
  if (!process.env.CRON_SECRET) return sendError(res, 'Scheduled jobs are not configured.', 503);
  if (!cronAuthorized(req)) return sendError(res, 'Unauthorized', 401);
  if (!Object.hasOwn(CRON_JOBS, req.params.job)) return sendError(res, 'Unknown job', 404);
  return sendSuccess(res, await CRON_JOBS[req.params.job]());
});

export default router;
