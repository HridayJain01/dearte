/**
 * AI Studio and Blog admin endpoints. Mounted at /api/admin/ai behind
 * requireAuth + requireAdmin in index.js.
 */
import express from 'express';
import { BlogPost, PhotoIndex, Product } from '../models/index.js';
import { sendSuccess } from '../utils/responses.js';
import { isEmailConfigured } from '../services/email/transport.js';
import { aiFailure, aiStatus } from '../services/ai/llm.js';
import { getAiSettings, saveAiSettings } from '../services/ai/settings.js';
import { recentRuns } from '../services/ai/jobs.js';

const router = express.Router();

// What is configured is reported as booleans only; no key or URL ever leaves.
router.get('/status', async (_req, res) => {
  try {
    const [settings, runs, activeProducts, indexedProducts, published, waiting] = await Promise.all([
      getAiSettings({ fresh: true }),
      recentRuns(20),
      Product.countDocuments({ status: 'Active' }),
      PhotoIndex.countDocuments({ indexedAt: { $ne: null } }),
      BlogPost.countDocuments({ status: 'published' }),
      BlogPost.countDocuments({ status: { $in: ['draft', 'needs_review'] } }),
    ]);
    const { text, vision } = aiStatus();

    return sendSuccess(res, {
      configured: {
        text,
        vision,
        pexels: Boolean(process.env.PEXELS_API_KEY),
        deployHook: Boolean(process.env.CLIENT_DEPLOY_HOOK_URL),
        cron: Boolean(process.env.CRON_SECRET),
        email: isEmailConfigured(),
      },
      models: {
        text: process.env.AI_TEXT_MODEL || '',
        vision: process.env.AI_VISION_MODEL || '',
        review: process.env.AI_REVIEW_MODEL || process.env.AI_TEXT_MODEL || '',
      },
      settings,
      runs,
      photoIndex: { total: activeProducts, indexed: indexedProducts },
      blog: { published, waiting },
    });
  } catch (error) {
    return aiFailure(res, error);
  }
});

router.put('/settings', async (req, res) => {
  try {
    return sendSuccess(res, await saveAiSettings(req.body || {}), 'AI settings saved');
  } catch (error) {
    return aiFailure(res, error);
  }
});

export default router;
