/**
 * The blog autopilot: topic → linked products → draft → checks → review →
 * (one rewrite) → images → save → publish → rebuild the storefront.
 *
 * Nothing is published that failed a check. A draft that cannot pass is kept
 * as `needs_review` and the ops list is emailed, so a bad night costs a draft,
 * never a bad page on the site.
 */
import { AiSettings, BlogPost, Category, Collection, Product, SiteSettings } from '../../models/index.js';
import { seedData } from '../../data/seed.js';
import { CATEGORY_TREE, DIAMOND_QUALITY, OCCASIONS } from '../../data/taxonomy.js';
import { slugify } from '../../utils/slugify.js';
import { escapeRegex } from '../../utils/validation.js';
import { normalizeAsset } from '../../utils/assets.js';
import { serializeProduct } from '../../utils/serializers.js';
import { AiError, aiStatus, chatJson } from './llm.js';
import {
  bannedClaims,
  clampNumber,
  clampText,
  escapeHtml,
  matchNames,
  titleSimilarity,
  ungroundedNumbers,
} from './guards.js';
import { getAiSettings, invalidateAiSettings, sanitizeTopics } from './settings.js';
import { deadlineIn, notifyAdmins, runJob, storefrontUrl, timeLeft, triggerClientRebuild } from './jobs.js';
import { accessFilterFor, displayName, primaryImage, productFacts, productPopulate, withAccess } from './catalogue.js';

export const PASS_SCORE = 7;
export const PUBLISH_DAYS = { 1: ['Tue'], 2: ['Tue', 'Fri'] };
const IST = 'Asia/Kolkata';

export function istParts(now = new Date()) {
  return {
    month: Number(new Intl.DateTimeFormat('en-US', { timeZone: IST, month: 'numeric' }).format(now)),
    weekday: new Intl.DateTimeFormat('en-US', { timeZone: IST, weekday: 'short' }).format(now),
    monthName: new Intl.DateTimeFormat('en-US', { timeZone: IST, month: 'long', year: 'numeric' }).format(now),
  };
}

/**
 * The next topic to write. A seasonal topic jumps the queue in its months and
 * waits out of season; otherwise the queue is taken in order.
 */
export function nextTopic(queue = [], month) {
  const queued = queue.filter((topic) => topic.status === 'queued');
  return (
    queued.find((topic) => topic.months?.length && topic.months.includes(month)) ||
    queued.find((topic) => !topic.months?.length) ||
    null
  );
}

const list = (value) => (Array.isArray(value) ? value : []);

/** Coerce whatever the writer returned into the stored shape, trimmed. */
export function normaliseDraft(raw = {}) {
  const sections = list(raw.sections)
    .slice(0, 10)
    .map((section) => ({
      heading: clampText(section?.heading, 120),
      paragraphs: list(section?.paragraphs).map((text) => clampText(text, 2000)).filter(Boolean).slice(0, 8),
      bullets: list(section?.bullets).map((text) => clampText(text, 300)).filter(Boolean).slice(0, 10),
    }))
    .filter((section) => section.heading && (section.paragraphs.length || section.bullets.length));

  return {
    title: clampText(raw.title, 90),
    metaDescription: clampText(raw.metaDescription, 170),
    excerpt: clampText(raw.excerpt, 300),
    sections,
    faq: list(raw.faq)
      .map((entry) => ({ question: clampText(entry?.question, 200), answer: clampText(entry?.answer, 800) }))
      .filter((entry) => entry.question && entry.answer)
      .slice(0, 6),
    tags: list(raw.tags).map((tag) => clampText(tag, 40)).filter(Boolean).slice(0, 6),
    imageQuery: clampText(raw.imageQuery, 80),
    imageAlt: clampText(raw.imageAlt, 160),
  };
}

/** All the prose in a draft, for the checks. */
export function draftText(draft) {
  return [
    draft.title,
    draft.metaDescription,
    draft.excerpt,
    ...draft.sections.flatMap((section) => [section.heading, ...section.paragraphs, ...section.bullets]),
    ...draft.faq.flatMap((entry) => [entry.question, entry.answer]),
  ].join('\n');
}

export function wordCount(draft) {
  const body = [
    ...draft.sections.flatMap((section) => [...section.paragraphs, ...section.bullets]),
    ...draft.faq.map((entry) => entry.answer),
  ].join(' ');
  return body.split(/\s+/).filter(Boolean).length;
}

/** Hard checks. Any problem here blocks publishing, whatever the review says. */
export function draftProblems(draft, { sources = [], facts = '', existingTitles = [] } = {}) {
  const problems = [];
  if (draft.title.length < 20 || draft.title.length > 75) problems.push('The title must be 20–75 characters.');
  if (draft.metaDescription.length < 110 || draft.metaDescription.length > 165) {
    problems.push('The meta description must be 110–165 characters.');
  }
  if (!draft.excerpt) problems.push('An excerpt is missing.');
  if (draft.sections.length < 4 || draft.sections.length > 8) problems.push('Use 4–8 sections.');

  const words = wordCount(draft);
  if (words < 700 || words > 1600) problems.push(`The article is ${words} words; write 900–1,300.`);

  const text = draftText(draft);
  const unknown = ungroundedNumbers(text, sources);
  if (unknown.length) problems.push(`Remove figures that are not in FACTS or PRODUCTS: ${unknown.slice(0, 8).join(', ')}.`);
  const claims = bannedClaims(text, facts);
  if (claims.length) problems.push(`Remove these kinds of claim: ${claims.join(', ')}.`);

  const similar = existingTitles.find((title) => titleSimilarity(title, draft.title) >= 0.6);
  if (similar) problems.push(`Too close to the existing post “${similar}”; take a clearly different angle.`);
  return problems;
}

const WRITER_SYSTEM = `You write for the journal of DeArte Jewellery, a B2B manufacturer of lab-grown diamond jewellery that supplies jewellery retailers and brands.
Readers: owners and buyers at jewellery stores, mostly in India, and the style-conscious customers they serve.
Voice: warm, expert, specific and calm. Indian English spelling (jewellery, colour, centre). No hype, no exclamation marks, no clichés such as "timeless elegance" or "in today's world".

Hard rules:
- Use a number (price, percentage, market size, date, weight, count of anything) ONLY if it appears in FACTS or PRODUCTS. Otherwise describe without numbers.
- Never name another jewellery brand, retailer or laboratory that is not in FACTS.
- Never promise guarantees, investment returns, resale value or health benefits.
- Never invent anything about DeArte: no workshop stories, people, locations, awards, certifications or design inspirations beyond FACTS.
- Lab-grown diamonds are real diamonds with the same chemical, physical and optical properties as mined diamonds, grown by CVD or HPHT. Never call them fake, simulants or cubic zirconia.
- Mention DeArte naturally one to three times. The article must be genuinely useful to a reader who never buys from DeArte.
- Refer to PRODUCTS by name only where they fit, and say nothing about them beyond their listed facts.

Return ONLY a JSON object:
{"title": "under 70 characters, specific, contains the main keyword",
 "metaDescription": "130-155 characters for search results",
 "excerpt": "one or two sentences for the article card",
 "sections": [{"heading": "...", "paragraphs": ["..."], "bullets": ["optional short list items"]}],
 "faq": [{"question": "...", "answer": "two or three sentences"}],
 "tags": ["three to six short topic tags"],
 "imageQuery": "three to six words to search a stock photo library for a lifestyle photo, no brand names",
 "imageAlt": "alt text for that photo"}
Write 5 to 7 sections and 900 to 1,300 words across paragraphs and bullets, plus 3 or 4 FAQ entries.`;

const REVIEW_SYSTEM = `You are the managing editor of a trade journal for jewellery retailers. Review the draft strictly.
Score it from 1 to 10, where 7 means "good enough to publish without edits".
Deduct for: factual errors about diamonds, lab-grown diamonds, gold or hallmarking; claims about the company that are not in FACTS; filler and vague generalities; repetition; a salesy or hyped tone; weak structure; advice that would not help a jewellery retailer; anything legally risky.
Return ONLY JSON: {"score": <integer 1-10>, "issues": ["specific, actionable problems, at most six"]}.`;

const TOPIC_SYSTEM = `You plan the editorial calendar for the journal of DeArte Jewellery, a B2B manufacturer of lab-grown diamond jewellery whose readers are jewellery retailers and their customers.
Suggest specific, useful topics: understanding the lab-grown market as a retailer, styling, selling advice, buying guides, care, and seasonal occasions in India. Avoid news you cannot verify and never name other brands.
Return ONLY JSON: {"topics": [{"title": "under 70 characters", "angle": "one sentence", "keywords": ["two or three search phrases"], "hints": {"category": "one of the categories or empty", "occasion": "one of the occasions or empty"}, "months": [month numbers 1-12 only if the topic is seasonal]}]}`;

function companyFacts(site) {
  const info = seedData.companyInfo || {};
  return [
    `${site?.companyName || 'DeArte Jewellery'} (DeArte Jewels) is a B2B manufacturer of lab-grown diamond jewellery supplying jewellery retailers and brands through trade accounts.`,
    site?.address ? `Address: ${site.address}.` : '',
    info.founded ? `${info.founded}.` : '',
    `Every piece uses one house diamond quality: ${DIAMOND_QUALITY} (VVS-VS clarity, EF colour).`,
    'Gold is offered in 9K, 14K and 18K, in yellow, rose and white gold.',
    info.certifications?.length ? `Company credentials: ${info.certifications.join(', ')}.` : '',
    `Categories made: ${CATEGORY_TREE.map((item) => item.name).join(', ')}.`,
    'Services: a wholesale trade catalogue, custom manufacturing and private label programmes.',
  ]
    .filter(Boolean)
    .join('\n');
}

const promptView = (draft) => ({
  title: draft.title,
  metaDescription: draft.metaDescription,
  excerpt: draft.excerpt,
  sections: draft.sections,
  faq: draft.faq,
});

const timeoutFor = (deadline, reserve) => Math.max(5_000, timeLeft(deadline) - reserve);

async function writeDraft(topic, context, { previous, feedback } = {}, timeoutMs) {
  const user = [
    `TOPIC: ${topic.title}`,
    topic.angle && `ANGLE: ${topic.angle}`,
    topic.keywords?.length && `KEYWORDS: ${topic.keywords.join(', ')}`,
    `MONTH: ${context.monthName}`,
    '',
    'FACTS:',
    context.facts,
    '',
    'PRODUCTS (refer to them by name where they fit):',
    context.productLines || '(none)',
    previous && `\nPREVIOUS DRAFT:\n${JSON.stringify(promptView(previous))}`,
    feedback?.length && `\nEDITOR FEEDBACK. Fix every point:\n- ${feedback.join('\n- ')}`,
  ]
    .filter(Boolean)
    .join('\n');

  return normaliseDraft(await chatJson({ system: WRITER_SYSTEM, user, maxTokens: 4000, temperature: 0.6, timeoutMs }));
}

async function reviewDraft(draft, context, timeoutMs) {
  try {
    const result = await chatJson({
      system: REVIEW_SYSTEM,
      user: `FACTS:\n${context.facts}\n\nDRAFT:\n${JSON.stringify(promptView(draft))}`,
      model: process.env.AI_REVIEW_MODEL || undefined,
      maxTokens: 700,
      temperature: 0.1,
      timeoutMs,
    });
    return {
      score: Math.round(clampNumber(result.score, 0, 10) ?? 0),
      issues: list(result.issues).map((issue) => clampText(issue, 300)).filter(Boolean).slice(0, 6),
    };
  } catch (error) {
    // No review means no auto-publish; the draft is held rather than lost.
    console.warn('[blog] review failed:', error?.message);
    return null;
  }
}

async function findByName(Model, hint) {
  if (!hint) return null;
  const docs = await Model.find().select('name').lean();
  const [name] = matchNames(hint, docs.map((doc) => doc.name));
  return docs.find((doc) => doc.name === name) || null;
}

/**
 * Up to four guest-visible styles for a topic: the post is public, so every
 * link in it must open for a logged-out reader. Hints are dropped one at a
 * time (occasion, then collection, then category) until something matches.
 */
async function pickProducts(topic, limit = 4) {
  const access = await accessFilterFor(null);
  const hints = topic.hints || {};
  const [category, collection] = await Promise.all([
    findByName(Category, hints.category),
    findByName(Collection, hints.collection),
  ]);
  const clauses = [
    category && { category: category._id },
    collection && { collection: collection._id },
    hints.occasion && { occasions: { $regex: `^${escapeRegex(hints.occasion)}$`, $options: 'i' } },
  ].filter(Boolean);

  for (let size = clauses.length; size >= 0; size -= 1) {
    const filter = Object.assign({ status: 'Active' }, ...clauses.slice(0, size));
    const docs = await Product.find(withAccess(filter, access))
      .sort({ isBestSeller: -1, orderCount: -1, isNewArrival: -1, updatedAt: -1 })
      .limit(12)
      .populate(productPopulate);
    const products = docs.map(serializeProduct).filter(primaryImage);
    if (products.length >= 2 || size === 0) return products.slice(0, limit);
  }
  return [];
}

async function findStockPhoto(query, usedIds = []) {
  const key = process.env.PEXELS_API_KEY;
  if (!key || !query) return null;
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&per_page=15`;
  const response = await fetch(url, { headers: { Authorization: key }, signal: AbortSignal.timeout(8_000) });
  if (!response.ok) return null;
  const used = new Set(usedIds.map(String));
  const photo = list((await response.json())?.photos).find((item) => item?.id && !used.has(String(item.id)));
  if (!photo) return null;
  return {
    id: String(photo.id),
    src: photo.src?.large2x || photo.src?.large || photo.src?.original,
    alt: photo.alt || '',
    credit: { name: photo.photographer || 'Pexels', url: photo.url || 'https://www.pexels.com', source: 'Pexels' },
  };
}

/**
 * Copy a stock photo into Cloudinary so the post keeps working if the photo is
 * removed upstream. Falls back to the original URL if the copy fails.
 */
async function hostImage(url, folder, alt) {
  try {
    const { cloudinary } = await import('../../config/cloudinary.js');
    const result = await cloudinary.uploader.upload(url, { folder, resource_type: 'image' });
    return normalizeAsset({ publicId: result.public_id, secureUrl: result.secure_url, width: result.width, height: result.height, alt });
  } catch (error) {
    console.warn('[blog] could not copy the photo to Cloudinary:', error?.message);
    return normalizeAsset({ secureUrl: url, alt });
  }
}

function productCover(product) {
  const asset = product?.media?.find((item) => item?.secureUrl);
  return asset ? normalizeAsset({ ...asset, alt: `${displayName(product)} by DeArte` }) : normalizeAsset(null);
}

async function uniqueSlug(title) {
  const base = slugify(title).slice(0, 80).replace(/-+$/, '') || `post-${Date.now()}`;
  let slug = base;
  for (let n = 2; await BlogPost.exists({ slug }); n += 1) slug = `${base}-${n}`;
  return slug;
}

async function saveQueue(queue) {
  await AiSettings.updateOne({}, { $set: { 'blog.topicQueue': sanitizeTopics(queue) } }, { upsert: true });
  invalidateAiSettings();
}

/** Ask the model for ten fresh topics, minus anything close to what exists. */
async function suggestTopics(queue, monthName, timeoutMs) {
  const posts = await BlogPost.find().sort({ createdAt: -1 }).limit(200).select('title').lean();
  const known = [...queue.map((topic) => topic.title), ...posts.map((post) => post.title)];
  const result = await chatJson({
    system: TOPIC_SYSTEM,
    user: [
      `Suggest 10 new topics. Current month: ${monthName}.`,
      `Categories: ${CATEGORY_TREE.map((item) => item.name).join(', ')}`,
      `Occasions: ${OCCASIONS.join(', ')}`,
      `Already covered or queued (do not repeat or paraphrase):\n- ${known.slice(0, 120).join('\n- ')}`,
    ].join('\n'),
    maxTokens: 1500,
    temperature: 0.8,
    timeoutMs,
  });

  const fresh = [];
  for (const topic of sanitizeTopics(list(result.topics))) {
    if ([...known, ...fresh.map((item) => item.title)].some((title) => titleSimilarity(title, topic.title) >= 0.5)) continue;
    fresh.push({ ...topic, status: 'queued', source: 'ai' });
  }
  return fresh.slice(0, 10);
}

/**
 * Write one post. `forceDraft` (admin "Generate draft now") never publishes,
 * whatever the auto-publish setting says.
 */
export async function generatePost({ trigger = 'cron', deadline = deadlineIn(), topicTitle = '', forceDraft = false } = {}) {
  if (!aiStatus().text) throw new AiError('AI is not configured on the server.', 503);

  const settings = await getAiSettings({ fresh: true });
  const { month, monthName } = istParts();
  let queue = settings.blog.topicQueue.map((topic) => ({ ...topic }));
  let topic = topicTitle
    ? queue.find((item) => item.title === topicTitle) || { title: topicTitle, angle: '', keywords: [], hints: {}, months: [] }
    : nextTopic(queue, month);

  if (!topic) {
    queue = [...queue, ...(await suggestTopics(queue, monthName, timeoutFor(deadline, 30_000)).catch(() => []))];
    await saveQueue(queue);
    topic = nextTopic(queue, month);
    if (!topic) return { post: null, summary: 'No topic available. Add topics in Admin → Blog.' };
  }

  const [products, site, existing] = await Promise.all([
    pickProducts(topic),
    SiteSettings.findOne().sort({ updatedAt: -1 }).lean(),
    BlogPost.find({ status: { $ne: 'unpublished' } }).select('title').lean(),
  ]);
  const facts = [companyFacts(site), settings.blog.facts].filter(Boolean).join('\n');
  const productLines = products.map((product) => `- ${productFacts(product)}`).join('\n');
  const context = { facts, productLines, monthName };
  const checks = { sources: [facts, productLines], facts, existingTitles: existing.map((post) => post.title) };

  let draft = await writeDraft(topic, context, {}, timeoutFor(deadline, 12_000));
  let problems = draftProblems(draft, checks);
  let review = problems.length ? null : await reviewDraft(draft, context, timeoutFor(deadline, 6_000));

  if ((problems.length || !review || review.score < PASS_SCORE) && timeLeft(deadline) > 22_000) {
    const feedback = [...problems, ...(review?.issues || [])];
    draft = await writeDraft(topic, context, { previous: draft, feedback }, timeoutFor(deadline, 10_000));
    problems = draftProblems(draft, checks);
    review = problems.length || timeLeft(deadline) < 8_000 ? null : await reviewDraft(draft, context, timeoutFor(deadline, 4_000));
  }

  const passed = problems.length === 0 && Boolean(review) && review.score >= PASS_SCORE;
  const status = !passed ? 'needs_review' : forceDraft || !settings.blog.autoPublish ? 'draft' : 'published';
  const title = draft.title || topic.title;
  const slug = await uniqueSlug(title);

  // Cover: DeArte's own product photo first. A stock lifestyle photo is the
  // cover only when no product fits, and otherwise sits mid-article.
  let coverImage = productCover(products[0]);
  let coverCredit = {};
  let inlineImage = normalizeAsset(null);
  let inlineCredit = {};
  const stockPhotoIds = [];
  if (timeLeft(deadline) > 8_000) {
    const photo = await findStockPhoto(draft.imageQuery || topic.title, await BlogPost.distinct('stockPhotoIds')).catch(() => null);
    if (photo?.src) {
      const hosted = await hostImage(photo.src, `dearte/blog/${slug}`, draft.imageAlt || photo.alt);
      stockPhotoIds.push(photo.id);
      if (coverImage.secureUrl) {
        inlineImage = hosted;
        inlineCredit = photo.credit;
      } else {
        coverImage = hosted;
        coverCredit = photo.credit;
      }
    }
  }

  const post = await BlogPost.create({
    slug,
    title,
    metaDescription: draft.metaDescription,
    excerpt: draft.excerpt,
    sections: draft.sections,
    faq: draft.faq,
    coverImage,
    coverCredit,
    inlineImage,
    inlineCredit,
    stockPhotoIds,
    products: products.map((product) => product.id),
    tags: draft.tags,
    topic: topic.title,
    status,
    publishedAt: status === 'published' ? new Date() : null,
    quality: { score: review?.score || 0, issues: [...problems, ...(review?.issues || [])] },
    model: process.env.AI_TEXT_MODEL || '',
    wordCount: wordCount(draft),
    trigger,
  });

  const used = queue.find((item) => item.title === topic.title);
  if (used) Object.assign(used, { status: 'used', usedAt: new Date() });
  if (queue.filter((item) => item.status === 'queued').length < 5 && timeLeft(deadline) > 10_000) {
    queue = [...queue, ...(await suggestTopics(queue, monthName, timeoutFor(deadline, 5_000)).catch(() => []))];
  }
  await saveQueue(queue);

  if (status === 'published') {
    await afterPublish(post);
  } else if (status === 'needs_review' && trigger === 'cron') {
    await notifyAdmins({
      subject: `Blog draft held for review: ${title}`,
      heading: 'A blog draft needs a look',
      bodyHtml: `<p><strong>${escapeHtml(title)}</strong></p><p>It did not pass the automatic checks, so it was not published:</p><ul>${post.quality.issues
        .slice(0, 6)
        .map((issue) => `<li>${escapeHtml(issue)}</li>`)
        .join('')}</ul><p>Publish it anyway, regenerate it or delete it in Admin → Blog.</p>`,
      ctaLabel: 'Open Admin → Blog',
      ctaUrl: storefrontUrl('/admin/blog'),
    });
  }

  const verdict = { published: 'Published', draft: 'Saved draft', needs_review: 'Held for review' }[status];
  return { post, summary: `${verdict}: “${title}” (score ${post.quality.score}/10)` };
}

/** Rebuild the storefront so the post is prerendered, and tell the ops list. */
export async function afterPublish(post) {
  const rebuilding = await triggerClientRebuild();
  await notifyAdmins({
    subject: `New blog post live: ${post.title}`,
    heading: 'A new post is live on the blog',
    bodyHtml: `<p><strong>${escapeHtml(post.title)}</strong></p><p>${escapeHtml(post.excerpt)}</p><p>Quality score ${post.quality?.score || 0}/10. To take it down, open Admin → Blog and choose Unpublish.</p>`,
    ctaLabel: 'Read the post',
    ctaUrl: storefrontUrl(`/blog/${post.slug}`),
  });
  return rebuilding;
}

/** The nightly job. Skips quietly (no run logged) on days it has nothing to do. */
export async function runBlogCron(now = new Date()) {
  const settings = await getAiSettings({ fresh: true });
  if (!settings.blog.enabled) return { skipped: 'Blog autopilot is off.' };
  if (!aiStatus().text) return { skipped: 'AI is not configured.' };
  const { weekday } = istParts(now);
  if (!PUBLISH_DAYS[settings.blog.postsPerWeek].includes(weekday)) return { skipped: `Not a publish day (${weekday}).` };
  const since = new Date(now.getTime() - 20 * 60 * 60 * 1000);
  if (await BlogPost.exists({ trigger: 'cron', createdAt: { $gte: since } })) return { skipped: 'Already ran today.' };

  const deadline = deadlineIn();
  return runJob('blog', 'cron', async () => (await generatePost({ trigger: 'cron', deadline })).summary);
}

/** Admin → Blog → "Generate draft now" (or Regenerate for a topic). */
export async function generateDraftNow({ topicTitle = '' } = {}) {
  const deadline = deadlineIn();
  let post = null;
  const run = await runJob('blog', 'admin', async () => {
    const result = await generatePost({ trigger: 'admin', deadline, topicTitle, forceDraft: true });
    post = result.post;
    return result.summary;
  });
  return { run, post };
}

/** The API shape of a post. `full` adds the body and linked products. */
export function serializePost(doc, { full = true, products = [], admin = false } = {}) {
  if (!doc) return null;
  const base = {
    id: String(doc._id),
    slug: doc.slug,
    title: doc.title,
    metaDescription: doc.metaDescription,
    excerpt: doc.excerpt,
    coverImage: normalizeAsset(doc.coverImage),
    coverCredit: doc.coverCredit || {},
    tags: doc.tags || [],
    wordCount: doc.wordCount || 0,
    publishedAt: doc.publishedAt,
    updatedAt: doc.updatedAt,
  };
  if (full) {
    Object.assign(base, {
      sections: doc.sections || [],
      faq: doc.faq || [],
      inlineImage: normalizeAsset(doc.inlineImage),
      inlineCredit: doc.inlineCredit || {},
      products,
    });
  }
  if (admin) {
    Object.assign(base, {
      status: doc.status,
      topic: doc.topic,
      quality: doc.quality || { score: 0, issues: [] },
      trigger: doc.trigger,
      model: doc.model,
      createdAt: doc.createdAt,
    });
  }
  return base;
}
