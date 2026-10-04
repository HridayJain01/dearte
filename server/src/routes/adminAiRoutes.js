/**
 * AI Studio and Blog admin endpoints. Mounted at /api/admin/ai behind
 * requireAuth + requireAdmin in index.js.
 */
import express from 'express';
import { BlogPost, PhotoIndex, Product } from '../models/index.js';
import { sendError, sendSuccess } from '../utils/responses.js';
import { isObjectId } from '../utils/validation.js';
import { isEmailConfigured } from '../services/email/transport.js';
import { aiFailure, aiStatus } from '../services/ai/llm.js';
import { getAiSettings, saveAiSettings } from '../services/ai/settings.js';
import { recentRuns, triggerClientRebuild } from '../services/ai/jobs.js';
import { generateDraftNow, serializePost } from '../services/ai/blog.js';
import { runPhotoIndexNow } from '../services/ai/photoSearch.js';
import { notifyPushBlogPost } from '../services/pushNotifications.js';
import { bannerCopy } from '../services/ai/banner.js';
import { askData } from '../services/ai/insights.js';

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

// A manual batch, whether or not the nightly job is switched on.
router.post('/photo-index/run', async (_req, res) => {
  try {
    return sendSuccess(res, await runPhotoIndexNow());
  } catch (error) {
    return aiFailure(res, error);
  }
});

// Suggestions only; the admin turns one into an inactive banner.
router.post('/banner-copy', async (req, res) => {
  try {
    return sendSuccess(res, await bannerCopy(req.body?.goal));
  } catch (error) {
    return aiFailure(res, error);
  }
});

// "Ask your data": a question in, a report and a short answer out.
router.post('/ask', async (req, res) => {
  try {
    return sendSuccess(res, await askData(req.body?.question));
  } catch (error) {
    return aiFailure(res, error);
  }
});

// ── Blog ────────────────────────────────────────────────────────────────────

router.get('/blog/posts', async (_req, res) => {
  const posts = await BlogPost.find().sort({ createdAt: -1 }).limit(100).lean();
  return sendSuccess(res, posts.map((post) => serializePost(post, { full: true, admin: true })));
});

// Runs one generation inside this request (about 20–45 s). The run is logged
// either way; a failed one comes back with ok: false and its reason.
router.post('/blog/generate', async (_req, res) => {
  try {
    const { run, post } = await generateDraftNow();
    return sendSuccess(res, { run, post: post && serializePost(post.toObject(), { admin: true }) });
  } catch (error) {
    return aiFailure(res, error);
  }
});

router.post('/blog/posts/:id/regenerate', async (req, res) => {
  if (!isObjectId(req.params.id)) return sendError(res, 'Post not found', 404);
  const existing = await BlogPost.findById(req.params.id);
  if (!existing) return sendError(res, 'Post not found', 404);
  try {
    const { run, post } = await generateDraftNow({ topicTitle: existing.topic || existing.title, replacing: existing._id });
    // A replaced draft goes; a published post stays until someone unpublishes it.
    if (run.ok && post && existing.status !== 'published') await existing.deleteOne();
    return sendSuccess(res, { run, post: post && serializePost(post.toObject(), { admin: true }) });
  } catch (error) {
    return aiFailure(res, error);
  }
});

router.put('/blog/posts/:id', async (req, res) => {
  if (!isObjectId(req.params.id)) return sendError(res, 'Post not found', 404);
  const status = req.body?.status;
  if (!['published', 'unpublished'].includes(status)) return sendError(res, 'status must be published or unpublished', 400);

  const post = await BlogPost.findById(req.params.id);
  if (!post) return sendError(res, 'Post not found', 404);
  // Only a post's first time live goes to the app; re-publishing after a fix does not.
  const firstPublish = status === 'published' && !post.publishedAt;
  post.status = status;
  if (firstPublish) post.publishedAt = new Date();
  await post.save();
  if (firstPublish) await notifyPushBlogPost(post).catch((e) => console.error('[push] blog post notify failed', e.message));

  // Either way the storefront's prerendered pages and sitemap have to change.
  const rebuilding = await triggerClientRebuild();
  return sendSuccess(
    res,
    { post: serializePost(post.toObject(), { admin: true }), rebuilding },
    status === 'published' ? 'Post published' : 'Post unpublished',
  );
});

router.delete('/blog/posts/:id', async (req, res) => {
  if (!isObjectId(req.params.id)) return sendError(res, 'Post not found', 404);
  const post = await BlogPost.findById(req.params.id);
  if (!post) return sendError(res, 'Post not found', 404);
  const wasLive = post.status === 'published';
  await post.deleteOne();
  if (wasLive) await triggerClientRebuild();
  return sendSuccess(res, null, 'Post deleted');
});

export default router;
