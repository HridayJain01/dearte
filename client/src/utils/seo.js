/*
 * Single source of truth for every SEO value the app emits.
 *
 * The canonical host lives in an env var because the same bundle is deployed to
 * a preview URL and to the production domain: hardcoding one of them would make
 * every preview build advertise the wrong canonical. Set VITE_SITE_URL in the
 * Vercel project (Production scope) to the custom domain once it is attached.
 */

import { productDescription, productDisplayName } from './productTitle.js';

const FALLBACK_SITE_URL = 'https://dearte-client.vercel.app';

const stripTrailingSlash = (value) => String(value || '').replace(/\/+$/, '');

// Read from Vite in the browser and from process.env under Node, because the
// build scripts import this same module to stamp the sitemap and the static
// HTML shells.
const configuredSiteUrl =
  import.meta.env?.VITE_SITE_URL ||
  // globalThis rather than a bare `process`, which does not exist in the browser
  // bundle and which the browser-globals lint config would reject.
  globalThis.process?.env?.VITE_SITE_URL ||
  FALLBACK_SITE_URL;

export const SITE_URL = stripTrailingSlash(configuredSiteUrl);

/** The host baked into index.html; build scripts rewrite it to SITE_URL. */
export const PLACEHOLDER_SITE_URL = FALLBACK_SITE_URL;

export const SITE_NAME = 'DeArte Jewellery';
export const SITE_LEGAL_NAME = 'DeArte Jewels';

export const DEFAULT_TITLE = 'DeArte Jewellery — Lab-Grown Diamond Jewellery Manufacturer for B2B Buyers';
export const DEFAULT_DESCRIPTION =
  'DeArte is a B2B lab-grown diamond jewellery manufacturer supplying rings, earrings, pendants, bracelets and bridal sets to retailers and brands. Browse the wholesale catalogue, build custom orders and request a trade account.';

/** Absolute OG/Twitter card image. Lives in /public so it never gets a build hash. */
export const DEFAULT_OG_IMAGE = '/og-image.png';
export const DEFAULT_OG_IMAGE_WIDTH = 1200;
export const DEFAULT_OG_IMAGE_HEIGHT = 630;

export const CONTACT_EMAIL = 'concierge@deartejewels.com';

/** Social profiles feed schema.org `sameAs`; add real handles as they go live. */
export const SOCIAL_PROFILES = [];

/**
 * Turn a router path into an absolute, canonical URL.
 *
 * The query string is preserved, because a caller that passes one means it: a
 * facet view like `/products?category=Rings` is a landing page in its own right
 * and has to canonicalise to itself. Callers that want the bare page pass
 * `location.pathname`, which never carries a query — so consolidating a filtered
 * view is done by choosing which params to put in the path, not here. The
 * fragment is always dropped; it never identifies a distinct document.
 */
export function absoluteUrl(path = '/') {
  if (/^https?:\/\//i.test(path)) return path;
  const [rawPath, query] = String(path).split('#')[0].split('?');
  const clean = `/${rawPath.replace(/^\/+/, '')}`;
  // Keep the root as "/", strip the trailing slash everywhere else so a page
  // never has two canonical spellings.
  const normalized = clean === '/' ? '/' : stripTrailingSlash(clean);
  return `${SITE_URL}${normalized}${query ? `?${query}` : ''}`;
}

/**
 * `Page | DeArte Jewellery`, but never `DeArte Jewellery | DeArte Jewellery`.
 *
 * The suffix is dropped once the page's own title is long enough that adding it
 * would only push it past what a SERP renders (~60 characters). A derived
 * product title like "Rose Gold Lab-Grown Diamond Fashion Bracelet — ABR00382"
 * already says who it belongs to; losing its tail to an ellipsis would not help
 * anyone. Google appends the site name itself when it wants to.
 */
const TITLE_BUDGET = 60;

export function buildTitle(title) {
  if (!title) return DEFAULT_TITLE;
  if (title.includes(SITE_NAME)) return title;
  const suffixed = `${title} | ${SITE_NAME}`;
  return suffixed.length > TITLE_BUDGET && title.length > 40 ? title : suffixed;
}

/**
 * Meta descriptions are truncated by search engines around 155–160 characters.
 * Cutting on a word boundary keeps the snippet readable rather than clipped
 * mid-word by the SERP itself.
 */
export function clampDescription(text, limit = 158) {
  const flat = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (flat.length <= limit) return flat;
  const cut = flat.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 60 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\s]+$/, '')}…`;
}

/** Organization node — reused by the home page and the static HTML shells. */
export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    legalName: SITE_LEGAL_NAME,
    url: `${SITE_URL}/`,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/og-image.png`,
      width: DEFAULT_OG_IMAGE_WIDTH,
      height: DEFAULT_OG_IMAGE_HEIGHT,
    },
    description: DEFAULT_DESCRIPTION,
    email: CONTACT_EMAIL,
    ...(SOCIAL_PROFILES.length ? { sameAs: SOCIAL_PROFILES } : {}),
  };
}

/** WebSite node — declares the on-site search endpoint for a sitelinks searchbox. */
export function webSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: `${SITE_URL}/`,
    name: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    publisher: { '@id': `${SITE_URL}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/products?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * BreadcrumbList from `[{ name, path }]`. Breadcrumbs are what turn a bare URL
 * in the SERP into a readable `dearte › Products › Solitaire Ring` trail.
 */
export function breadcrumbSchema(trail = []) {
  if (!trail.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

/**
 * Product node for a catalogue style.
 *
 * `offers` is deliberately absent: trade pricing is only visible behind a buyer
 * login, and schema.org markup has to describe what the page actually shows.
 * Publishing a price a logged-out crawler cannot see is cloaking, and inventing
 * one is worse. Search Console will flag the missing field as a warning rather
 * than an error — the node still earns the entity understanding it is here for.
 */
export function productSchema(product, { path } = {}) {
  if (!product) return null;

  const specs = (product.specifications || [])
    .filter((spec) => spec?.attribute && spec?.value)
    .map((spec) => ({
      '@type': 'PropertyValue',
      name: spec.attribute,
      value: String(spec.value),
    }));

  const material = [product.metalType, product.metalColor].filter(Boolean).join(' ');

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productDisplayName(product),
    sku: product.styleCode,
    mpn: product.styleCode,
    url: absoluteUrl(path || `/products/${product.styleCode}`),
    description: clampDescription(productDescription(product), 300),
    ...(product.images?.length ? { image: product.images.filter(Boolean).slice(0, 6) } : {}),
    ...(product.category ? { category: [product.category, product.subCategory].filter(Boolean).join(' > ') } : {}),
    ...(material ? { material } : {}),
    brand: { '@type': 'Brand', name: SITE_NAME },
    manufacturer: { '@id': `${SITE_URL}/#organization` },
    ...(specs.length ? { additionalProperty: specs } : {}),
  };
}

/** ItemList node for a collection/occasion/product grid — helps carousels. */
export function itemListSchema(items = [], { name } = {}) {
  const entries = items.filter((item) => item?.path && item?.name);
  if (!entries.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    ...(name ? { name } : {}),
    numberOfItems: entries.length,
    itemListElement: entries.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}

/** FAQPage node from `[{ question, answer }]`, the one rich result this site can win outright. */
export function faqSchema(entries = []) {
  const valid = entries.filter((entry) => entry?.question && entry?.answer);
  if (!valid.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: valid.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: { '@type': 'Answer', text: entry.answer },
    })),
  };
}
