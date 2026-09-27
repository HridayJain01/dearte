/**
 * Public blog endpoints: published posts only. Mounted at /api/blog before the
 * buyer router in index.js so logged-out visitors (and the build) can read it.
 *
 * Linked products go through the visitor's catalogue rules, so a post never
 * shows a logged-out reader a style they could not open.
 */
import express from 'express';
import { BlogPost } from '../models/index.js';
import { optionalAuth } from '../middleware/auth.js';
import { sendError, sendSuccess } from '../utils/responses.js';
import { asString, parsePagination } from '../utils/validation.js';
import { serializePost } from '../services/ai/blog.js';
import { accessFilterFor, visibleProductsByIds } from '../services/ai/catalogue.js';

const router = express.Router();

router.use(optionalAuth);

// `include=body` is what the build asks for: every post with its full text,
// so it can prerender them. Browsing asks for cards only.
router.get('/', async (req, res) => {
  const includeBody = req.query.include === 'body';
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 12, maxLimit: includeBody ? 200 : 48 });
  const filter = { status: 'published' };
  const [posts, total] = await Promise.all([
    BlogPost.find(filter).sort({ publishedAt: -1 }).skip(skip).limit(limit).lean(),
    BlogPost.countDocuments(filter),
  ]);

  let items;
  if (includeBody) {
    const access = await accessFilterFor(req.user);
    items = await Promise.all(
      posts.map(async (post) => serializePost(post, { products: await visibleProductsByIds(post.products, req.user, { access }) })),
    );
  } else {
    items = posts.map((post) => serializePost(post, { full: false }));
  }

  return sendSuccess(res, { items, total, page, totalPages: Math.ceil(total / limit) });
});

router.get('/:slug', async (req, res) => {
  const post = await BlogPost.findOne({ slug: asString(req.params.slug), status: 'published' }).lean();
  if (!post) return sendError(res, 'Article not found', 404);

  const [products, related] = await Promise.all([
    visibleProductsByIds(post.products, req.user),
    BlogPost.find({ status: 'published', _id: { $ne: post._id } }).sort({ publishedAt: -1 }).limit(3).lean(),
  ]);

  return sendSuccess(res, {
    ...serializePost(post, { products }),
    related: related.map((item) => serializePost(item, { full: false })),
  });
});

export default router;
