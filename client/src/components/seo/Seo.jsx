import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_HEIGHT,
  DEFAULT_OG_IMAGE_WIDTH,
  SITE_NAME,
  absoluteUrl,
  buildTitle,
  clampDescription,
} from '../../utils/seo';

/*
 * Why this is imperative rather than react-helmet-async.
 *
 * Under React 19 that library stops managing the DOM and simply renders
 * <title>/<meta>/<link> elements, leaning on React's own hoisting. React hoists
 * them but does not deduplicate: every mounted instance emitted its own copy on
 * top of the tags already in the served HTML, so a page shipped three <title>
 * tags, three descriptions and three canonicals, and a crawler reading the first
 * of each got the generic index.html defaults on every route.
 *
 * Updating the existing tags in place is what we actually want anyway. The
 * static shell (index.html, or a route shell from scripts/seo-build.mjs) already
 * carries a full, correct head; this only has to keep it in step as the buyer
 * navigates. One tag of each kind, always.
 */

const MANAGED = 'data-seo';

function upsertMeta(selector, attribute, key, content) {
  if (!content) return;
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    tag.setAttribute(MANAGED, 'managed');
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

const setMetaName = (name, content) => upsertMeta(`meta[name="${name}"]`, 'name', name, content);
const setMetaProperty = (property, content) =>
  upsertMeta(`meta[property="${property}"]`, 'property', property, content);

/** Used where leaving a previous route's value behind would be a lie. */
function removeMetaProperty(property) {
  document.head.querySelector(`meta[property="${property}"]`)?.remove();
}

function setCanonical(href) {
  let tag = document.head.querySelector('link[rel="canonical"]');
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', 'canonical');
    tag.setAttribute(MANAGED, 'managed');
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', href);
}

/**
 * Route-level JSON-LD is replaced wholesale on every navigation. The graph baked
 * into index.html (Organization + WebSite) carries no marker and is left alone —
 * it describes the site, not the page.
 */
function setStructuredData(nodes) {
  for (const stale of document.head.querySelectorAll(`script[${MANAGED}="route-schema"]`)) {
    stale.remove();
  }
  for (const node of nodes) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute(MANAGED, 'route-schema');
    script.textContent = JSON.stringify(node);
    document.head.appendChild(script);
  }
}

/**
 * Declares one route's head.
 *
 * Render exactly one per route — the deepest one wins by accident of effect
 * ordering, not by design, so two on a page is a bug rather than a fallback.
 *
 * `noindex` is for pages that are real to a buyer but worthless in a SERP: cart,
 * checkout, account, auth and the 404. Leaving those indexable is what produces
 * the cluster of thin results that drags a small site's quality signals down.
 */
export function Seo({
  title,
  description,
  path,
  image,
  imageAlt,
  type = 'website',
  noindex = false,
  schema,
}) {
  const location = useLocation();
  // Canonicalise to the path the route was designed for, ignoring the query
  // string, so filtered and paginated views consolidate onto one URL.
  const canonical = absoluteUrl(path ?? location.pathname);
  const resolvedTitle = buildTitle(title);
  const resolvedDescription = clampDescription(description || DEFAULT_DESCRIPTION);
  const resolvedImage = absoluteUrl(image || DEFAULT_OG_IMAGE);
  const isDefaultImage = !image;
  const alt = imageAlt || resolvedTitle;

  // Serialised so the effect re-runs when the graph's contents change, not just
  // when a new array identity happens to be passed in.
  const schemaJson = JSON.stringify((Array.isArray(schema) ? schema : [schema]).filter(Boolean));

  useLayoutEffect(() => {
    document.title = resolvedTitle;

    setMetaName('description', resolvedDescription);
    setMetaName(
      'robots',
      noindex
        ? 'noindex, nofollow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    );
    setCanonical(canonical);

    setMetaProperty('og:type', type);
    setMetaProperty('og:site_name', SITE_NAME);
    setMetaProperty('og:locale', 'en_IN');
    setMetaProperty('og:title', resolvedTitle);
    setMetaProperty('og:description', resolvedDescription);
    setMetaProperty('og:url', canonical);
    setMetaProperty('og:image', resolvedImage);
    setMetaProperty('og:image:alt', alt);
    // The declared dimensions describe the fixed brand card only. A product
    // photo's are unknown, and leaving the card's numbers behind would tell
    // every scraper to reserve the wrong box.
    if (isDefaultImage) {
      setMetaProperty('og:image:width', String(DEFAULT_OG_IMAGE_WIDTH));
      setMetaProperty('og:image:height', String(DEFAULT_OG_IMAGE_HEIGHT));
    } else {
      removeMetaProperty('og:image:width');
      removeMetaProperty('og:image:height');
    }

    setMetaName('twitter:card', 'summary_large_image');
    setMetaName('twitter:title', resolvedTitle);
    setMetaName('twitter:description', resolvedDescription);
    setMetaName('twitter:image', resolvedImage);
    setMetaName('twitter:image:alt', alt);

    setStructuredData(JSON.parse(schemaJson));
  }, [
    resolvedTitle,
    resolvedDescription,
    canonical,
    resolvedImage,
    alt,
    isDefaultImage,
    type,
    noindex,
    schemaJson,
  ]);

  return null;
}
