/**
 * Banner and announcement-bar copy for AI Studio. Suggestions only: an admin
 * picks one, and it becomes an inactive banner through the existing endpoint.
 */
import { Category, Product } from '../../models/index.js';
import { serializeProduct } from '../../utils/serializers.js';
import { asString } from '../../utils/validation.js';
import { chatJson } from './llm.js';
import { bannedClaims, clampText, ungroundedNumbers } from './guards.js';
import { displayName, productPopulate } from './catalogue.js';

export const INTERNAL_LINKS = [
  '/products?sort=best-sellers',
  '/products?sort=new-arrivals',
  '/products',
  '/collections',
  '/occasions',
  '/blog',
  '/contact',
];

const SYSTEM = `You write short promotional copy for the storefront of DeArte Jewellery, a B2B manufacturer of lab-grown diamond jewellery whose buyers are jewellery retailers.
Tone: refined, confident and specific. No hype, no exclamation marks, no emoji.
Never invent discounts, prices, dates, deadlines or any number that is not in the brief.
Return ONLY JSON: {"banners": [{"title": "at most 40 characters", "subtitle": "at most 90 characters", "ctaLabel": "at most 18 characters", "ctaLink": "one of the allowed links, copied exactly"}], "announcements": ["one line of at most 100 characters for the bar above the menu"]}
Write 3 banners and 3 announcements.`;

const list = (value) => (Array.isArray(value) ? value : []);

/** Keep variants that fit the slots, link inside the site and claim nothing we don't know. */
export function sanitizeCopy(raw = {}, { links = INTERNAL_LINKS, brief = '' } = {}) {
  const clean = (text) => !bannedClaims(text).length && !ungroundedNumbers(text, [brief]).length;
  const banners = list(raw.banners)
    .map((banner) => ({
      title: clampText(banner?.title, 40),
      subtitle: clampText(banner?.subtitle, 90),
      ctaLabel: clampText(banner?.ctaLabel, 18) || 'Explore',
      ctaLink: links.includes(banner?.ctaLink) ? banner.ctaLink : '/products',
    }))
    .filter((banner) => banner.title && clean(`${banner.title} ${banner.subtitle} ${banner.ctaLabel}`))
    .slice(0, 3);
  const announcements = list(raw.announcements)
    .map((line) => clampText(line, 100))
    .filter((line) => line && clean(line))
    .slice(0, 3);
  return { banners, announcements };
}

export async function bannerCopy(goal) {
  const brief = asString(goal, { maxLength: 300 }) || 'Promote the current best sellers and new arrivals to jewellery retailers.';
  const [bestSellers, newArrivals, categories] = await Promise.all([
    Product.find({ isBestSeller: true, status: 'Active' }).sort({ orderCount: -1 }).limit(8).populate(productPopulate),
    Product.find({ isNewArrival: true, status: 'Active' }).sort({ createdAt: -1 }).limit(8).populate(productPopulate),
    Category.find({ active: true }).select('name').lean(),
  ]);
  const links = [...INTERNAL_LINKS, ...categories.map((category) => `/products?category=${encodeURIComponent(category.name)}`)];
  const names = (docs) => docs.map((doc) => displayName(serializeProduct(doc))).join('; ') || '(none)';

  const raw = await chatJson({
    system: SYSTEM,
    user: [
      `Brief: ${brief}`,
      `Best sellers: ${names(bestSellers)}`,
      `New arrivals: ${names(newArrivals)}`,
      `Allowed links: ${links.join(' , ')}`,
    ].join('\n'),
    maxTokens: 900,
    temperature: 0.8,
    timeoutMs: 30_000,
  });
  return sanitizeCopy(raw, { links, brief });
}
