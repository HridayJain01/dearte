/*
 * The metadata for every crawlable static route, in one table.
 *
 * Three consumers read it, which is the point of keeping it out of the
 * components: the page renders it through <Seo>, `scripts/seo-build.mjs` writes
 * a matching static HTML shell so non-JS crawlers see the same tags, and the
 * same script lists these paths in sitemap.xml.
 *
 * Titles stay under ~60 characters and descriptions under ~158 so neither gets
 * clipped in the result snippet, and each one leads with the term a trade buyer
 * would actually search for rather than with the brand name.
 */

export const ROUTE_SEO = {
  '/': {
    title: 'DeArte Jewellery — Lab-Grown Diamond Jewellery Manufacturer',
    description:
      'B2B manufacturer of lab-grown diamond jewellery. Wholesale rings, earrings, pendants, bracelets and bridal sets in 9K, 14K and 18K gold for retail buyers.',
    priority: 1.0,
    changefreq: 'weekly',
  },
  '/products': {
    guestAccessKey: 'pageProducts',
    title: 'Wholesale Diamond Jewellery Catalogue',
    description:
      'Browse the full DeArte trade catalogue: lab-grown diamond rings, earrings, pendants, bracelets and bangles, filterable by category, metal and stone weight.',
    priority: 0.9,
    changefreq: 'daily',
  },
  '/collections': {
    guestAccessKey: 'pageCollections',
    title: 'Jewellery Collections for Retail Buyers',
    description:
      'Shop DeArte by collection — curated lab-grown diamond jewellery families built around a single design story, ready to merchandise as a retail range.',
    priority: 0.8,
    changefreq: 'weekly',
  },
  '/occasions': {
    title: 'Shop Diamond Jewellery by Occasion',
    description:
      'Bridal, engagement, everyday and gifting edits of lab-grown diamond jewellery, grouped by the occasion your customers are buying for.',
    priority: 0.8,
    changefreq: 'weekly',
  },
  '/about': {
    title: 'About DeArte — Our Atelier and Craft',
    description:
      'DeArte designs and manufactures lab-grown diamond jewellery end to end — concept sketch to showcase-ready piece — for retailers and private-label brands.',
    priority: 0.7,
    changefreq: 'monthly',
  },
  '/contact': {
    title: 'Contact DeArte — Open a Trade Account',
    description:
      'Talk to the DeArte trade desk about wholesale pricing, custom manufacturing, private label programmes and opening a buyer account.',
    priority: 0.7,
    changefreq: 'monthly',
  },
  '/faq': {
    title: 'Trade Buyer FAQs — Orders and Sizing',
    description:
      'Answers on minimum orders, lead times, gold karat and metal colour options, diamond quality, ring sizing and returns for DeArte trade buyers.',
    priority: 0.6,
    changefreq: 'monthly',
  },
  '/events': {
    guestAccessKey: 'pageEvents',
    title: 'Trade Shows and Jewellery Events',
    description:
      'Where to meet DeArte in person — the trade shows, exhibitions and buyer previews where the current lab-grown diamond collections are on display.',
    priority: 0.6,
    changefreq: 'weekly',
  },
  '/testimonials': {
    guestAccessKey: 'pageTestimonials',
    title: 'What Retail Partners Say About DeArte',
    description:
      'Reviews from the jewellery retailers, brands and wholesale buyers who source their lab-grown diamond ranges from DeArte.',
    priority: 0.5,
    changefreq: 'monthly',
  },
  '/trusted-by': {
    guestAccessKey: 'pageTrustedBrands',
    title: 'Brands and Retailers We Supply',
    description:
      'The jewellery houses and retail partners that return to DeArte season after season for lab-grown diamond manufacturing.',
    priority: 0.5,
    changefreq: 'monthly',
  },
  '/careers': {
    title: 'Careers at DeArte Jewellery',
    description:
      'Open roles across design, manufacturing, quality and trade sales at DeArte. Join a team building lab-grown diamond jewellery for global retail.',
    priority: 0.4,
    changefreq: 'monthly',
  },
  '/education/diamond': {
    title: 'Lab-Grown Diamond Guide — The 4Cs',
    description:
      'How cut, colour, clarity and carat work in lab-grown diamonds, and what each grade means when you are specifying stones for a retail range.',
    priority: 0.7,
    changefreq: 'monthly',
  },
  '/education/metals': {
    title: 'Gold Guide — 9K, 14K and 18K Explained',
    description:
      'A buyer’s guide to gold karats and metal colours: how 9K, 14K and 18K differ in purity, durability, colour and cost across yellow, white and rose gold.',
    priority: 0.7,
    changefreq: 'monthly',
  },
  '/education/ethical-sourcing': {
    title: 'Ethical Sourcing of Lab-Grown Diamonds',
    description:
      'How DeArte sources lab-grown diamonds and recycled gold, and the traceability and certification a retailer can pass on to their own customers.',
    priority: 0.7,
    changefreq: 'monthly',
  },
  '/education/size-guide': {
    title: 'Jewellery Size Guide — Ring and Bangle',
    description:
      'Ring, bangle, bracelet and chain sizing charts with Indian, US and UK conversions, plus how to measure accurately before placing a wholesale order.',
    priority: 0.7,
    changefreq: 'monthly',
  },
  '/privacy-policy': {
    title: 'Privacy Policy',
    description: 'How DeArte Jewellery collects, uses, stores and protects the personal data of its trade account holders and site visitors.',
    priority: 0.3,
    changefreq: 'yearly',
  },
  '/terms': {
    title: 'Terms & Conditions',
    description: 'The terms governing use of the DeArte trade platform, wholesale orders, pricing, delivery and account responsibilities.',
    priority: 0.3,
    changefreq: 'yearly',
  },
  '/return-policy': {
    title: 'Return Policy',
    description: 'DeArte’s return, exchange and repair terms for wholesale jewellery orders, including timelines and the condition pieces must be in.',
    priority: 0.3,
    changefreq: 'yearly',
  },
};

/**
 * Paths that belong in the sitemap and deserve a prerendered HTML shell.
 *
 * `guestAccessKey` on an entry means the route is behind an admin-controlled
 * gate (Admin → Configuration → guest access). When that gate is closed a
 * logged-out visitor — a crawler included — is redirected to /login, so the
 * build drops the route from both the sitemap and the shells rather than
 * advertising a URL that answers with a sign-in wall. Reopen the gate and the
 * next build puts it back; see scripts/seo-build.mjs.
 */
export const INDEXABLE_PATHS = Object.keys(ROUTE_SEO);

/**
 * Routes deliberately kept out of the index. They are behind a session or have
 * no standalone search value, so indexing them would only add thin pages.
 */
export const NOINDEX_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/cart',
  '/checkout',
  '/wishlist',
  '/profile',
  '/catalogue',
  '/admin',
];

/** Lookup helper; returns an empty object so callers can spread it safely. */
export function routeSeo(path) {
  return ROUTE_SEO[path] || {};
}
