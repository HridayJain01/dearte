/*
 * Post-build SEO pass. Runs after `vite build`, over `dist/`.
 *
 * It exists because this app is a client-rendered SPA. Googlebot will execute
 * the bundle and eventually see the tags <Seo> writes, but nothing else will:
 * Bing, LinkedIn, WhatsApp, Slack, X and the AI crawlers read the HTML as
 * served and stop. Without this step every one of them sees a single empty
 * shell for the whole site.
 *
 * Its jobs:
 *   1. Stamp the canonical host into dist/index.html and robots.txt, so the same
 *      source builds correctly for a preview URL and for the live domain.
 *   2. Ask the API which pages are open to guests, and drop the gated ones —
 *      publishing a URL that answers with a sign-in wall helps nobody.
 *   3. Write a static HTML shell per public route with that route's real title,
 *      description, canonical and Open Graph tags.
 *   4. Write sitemap.xml — those routes, plus whatever of the catalogue the
 *      public API is willing to hand a logged-out visitor.
 *   5. Prerender the blog: every published post gets a page whose HTML holds
 *      the full article (blogShell.mjs), plus sitemap entries, and new posts
 *      are announced to IndexNow on production builds.
 *
 * Nothing here is allowed to fail the build. A sitemap without product URLs is
 * a small loss; a deploy that does not happen is a large one.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { loadEnv } from 'vite';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

// Vite reads .env.production; plain Node does not. Load the same files Vite
// just used and put them on process.env, so this script and the bundle it is
// decorating agree on the host and the API base.
const viteEnv = loadEnv(process.env.NODE_ENV || 'production', ROOT, '');
for (const [key, value] of Object.entries(viteEnv)) {
  if (process.env[key] === undefined) process.env[key] = value;
}

// Imported after the env is in place: seo.js reads process.env at module scope,
// and a static import would be hoisted above the loop above.
const { PLACEHOLDER_SITE_URL, SITE_URL, clampDescription } = await import('../src/utils/seo.js');
const { INDEXABLE_PATHS, ROUTE_SEO } = await import('../src/utils/seoRoutes.js');
const { productDisplayName } = await import('../src/utils/productTitle.js');
const {
  INDEXNOW_KEY,
  articleSchemas,
  beforeClose,
  fillRoot,
  jsonLdScripts,
  postDataScript,
  renderArticleHtml,
  renderIndexHtml,
} = await import('./blogShell.mjs');

const API_BASE = (process.env.VITE_API_PROXY_TARGET || '').replace(/\/+$/, '');
const SITE_NAME = 'DeArte Jewellery';
const BUILD_DATE = new Date().toISOString().slice(0, 10);

const log = (message) => console.log(`[seo] ${message}`);

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const escapeXml = escapeHtml;

/** Swap every occurrence of the host baked into index.html for the real one. */
function applyHost(html) {
  if (SITE_URL === PLACEHOLDER_SITE_URL) return html;
  return html.split(PLACEHOLDER_SITE_URL).join(SITE_URL);
}

/**
 * Replace a single head tag by regex rather than parsing the document: the file
 * we are editing is our own index.html, its head is hand-written above, and a
 * DOM parser would be a dependency for no gain.
 */
function replaceTag(html, pattern, replacement) {
  return pattern.test(html) ? html.replace(pattern, replacement) : html;
}

function buildShell(template, path, meta) {
  const canonical = `${SITE_URL}${path === '/' ? '/' : path}`;
  const title = escapeHtml(meta.title.includes(SITE_NAME) ? meta.title : `${meta.title} | ${SITE_NAME}`);
  const description = escapeHtml(clampDescription(meta.description));

  let html = template;
  html = replaceTag(html, /<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  html = replaceTag(
    html,
    /<meta\s+name="description"[\s\S]*?\/>/,
    `<meta name="description" content="${description}" />`,
  );
  html = replaceTag(html, /<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${canonical}" />`);
  html = replaceTag(html, /<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${title}" />`);
  html = replaceTag(
    html,
    /<meta\s+property="og:description"[\s\S]*?\/>/,
    `<meta property="og:description" content="${description}" />`,
  );
  html = replaceTag(html, /<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${canonical}" />`);
  html = replaceTag(html, /<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${title}" />`);
  html = replaceTag(
    html,
    /<meta\s+name="twitter:description"[\s\S]*?\/>/,
    `<meta name="twitter:description" content="${description}" />`,
  );
  return html;
}

/**
 * Read the admin-controlled guest-access flags. A gated page redirects a
 * logged-out visitor to /login, so publishing it in the sitemap would hand the
 * crawler a sign-in wall and a wasted fetch.
 *
 * On any failure this returns an empty object, which means "assume open" — the
 * safe direction. A sitemap entry that redirects costs a little crawl budget; a
 * page silently dropped from the sitemap costs it its ranking.
 */
async function fetchGuestAccess() {
  if (!API_BASE) return {};
  try {
    const response = await fetch(`${API_BASE}/site/home`, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) return {};
    const payload = await response.json();
    return payload?.data?.siteSettings?.guestAccess || {};
  } catch (error) {
    log(`Could not read guest access (${error?.message || error}); treating every page as public.`);
    return {};
  }
}

/**
 * Ask the public API for the styles a logged-out visitor is allowed to see —
 * exactly the set a crawler can reach, so exactly the set that belongs in the
 * sitemap. Anything else is a soft 404 waiting to happen.
 */
async function fetchPublicProducts() {
  if (!API_BASE) {
    log('VITE_API_PROXY_TARGET is not set; sitemap will list static routes only.');
    return [];
  }

  const collected = [];
  const controller = new AbortController();
  // The API is on a container that spins down when idle, so the first request
  // of a build can take ~30s to answer. Worth waiting for once; still bounded so
  // a hung API cannot stall the deploy.
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    // The guest catalogue is small, but page through anyway so the sitemap does
    // not silently truncate if the admin opens it up later.
    for (let page = 1; page <= 20; page += 1) {
      const url = `${API_BASE}/products?page=${page}&limit=100`;
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        log(`API responded ${response.status} for ${url}; stopping.`);
        break;
      }

      const payload = await response.json();
      const items = payload?.data?.items || payload?.data?.products || payload?.data || [];
      if (!Array.isArray(items) || items.length === 0) break;

      collected.push(...items);

      const total = payload?.data?.total ?? payload?.total;
      if (typeof total === 'number' && collected.length >= total) break;
      if (items.length < 100) break;
    }
  } catch (error) {
    log(`Could not reach the API (${error?.message || error}); sitemap will list static routes only.`);
  } finally {
    clearTimeout(timeout);
  }

  return collected.filter((item) => item?.styleCode);
}

/**
 * Every published blog post, with its full text, as a logged-out reader gets
 * it (linked products are scoped to the guest catalogue). Empty on any
 * failure: the blog pages then fall back to the plain shell and render in the
 * browser, as every page did before this step existed.
 */
async function fetchPublishedPosts() {
  if (!API_BASE) return [];
  try {
    const response = await fetch(`${API_BASE}/blog?include=body&limit=200`, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) {
      log(`API responded ${response.status} for the blog; posts are not prerendered.`);
      return [];
    }
    const payload = await response.json();
    return (payload?.data?.items || []).filter((post) => post?.slug && post?.title);
  } catch (error) {
    log(`Could not read the blog (${error?.message || error}); posts are not prerendered.`);
    return [];
  }
}

async function writeBlogPages(template, posts) {
  const indexMeta = ROUTE_SEO['/blog'];
  const indexPath = join(DIST, 'blog', 'index.html');
  await mkdir(dirname(indexPath), { recursive: true });
  await writeFile(indexPath, fillRoot(buildShell(template, '/blog', indexMeta), renderIndexHtml(posts)), 'utf8');

  for (const post of posts) {
    const path = `/blog/${post.slug}`;
    let html = buildShell(template, path, { title: post.title, description: post.metaDescription || post.excerpt });
    html = replaceTag(html, /<meta property="og:type" content="[^"]*" \/>/, '<meta property="og:type" content="article" />');
    const image = post.coverImage?.secureUrl;
    if (image) {
      html = replaceTag(html, /<meta property="og:image" content="[^"]*" \/>/, `<meta property="og:image" content="${escapeHtml(image)}" />`);
      html = replaceTag(html, /<meta name="twitter:image" content="[^"]*" \/>/, `<meta name="twitter:image" content="${escapeHtml(image)}" />`);
      // The declared size describes the default brand card, not this photo.
      html = html.replace(/\s*<meta property="og:image:(width|height)" content="[^"]*" \/>/g, '');
    }
    html = beforeClose(html, 'head', jsonLdScripts(articleSchemas(post, { siteUrl: SITE_URL, siteName: SITE_NAME })));
    html = fillRoot(html, renderArticleHtml(post, { productName: productDisplayName }));
    html = beforeClose(html, 'body', postDataScript(post));

    const filePath = join(DIST, 'blog', post.slug, 'index.html');
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, html, 'utf8');
  }
  log(`blog: prerendered ${posts.length} post(s)`);
}

/**
 * Tell Bing and the other IndexNow engines about posts published in the last
 * three days. Production builds only, so a preview never announces itself.
 */
async function announceNewPosts(posts) {
  if (process.env.VERCEL_ENV !== 'production') return;
  const cutoff = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const urlList = posts
    .filter((post) => new Date(post.publishedAt).getTime() >= cutoff)
    .map((post) => `${SITE_URL}/blog/${post.slug}`);
  if (!urlList.length) return;
  try {
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: new URL(SITE_URL).host,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
      signal: AbortSignal.timeout(15000),
    });
    log(`IndexNow: ${response.status} for ${urlList.length} URL(s)`);
  } catch (error) {
    log(`IndexNow ping failed (${error?.message || error}); the sitemap still lists the posts.`);
  }
}

function sitemapEntry({ path, lastmod, changefreq, priority }) {
  return [
    '  <url>',
    `    <loc>${escapeXml(`${SITE_URL}${path}`)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority !== undefined ? `    <priority>${priority.toFixed(1)}</priority>` : null,
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');
}

async function main() {
  const indexPath = join(DIST, 'index.html');
  const rawTemplate = await readFile(indexPath, 'utf8');
  const template = applyHost(rawTemplate);

  const guestAccess = await fetchGuestAccess();
  const isPublic = (path) => {
    const key = ROUTE_SEO[path]?.guestAccessKey;
    return !key || guestAccess[key] !== false;
  };

  const publicPaths = INDEXABLE_PATHS.filter(isPublic);
  const gated = INDEXABLE_PATHS.filter((path) => !isPublic(path));
  if (gated.length) {
    log(`gated for guests, so excluded: ${gated.join(', ')}`);
  }

  // 1. The home page keeps index.html, with the host corrected.
  await writeFile(indexPath, buildShell(template, '/', ROUTE_SEO['/']), 'utf8');

  // 2. One shell per public route, written as <route>/index.html so Vercel
  //    serves it for /about with no cleanUrls involved — cleanUrls turns
  //    /index.html into a redirect, which kills the SPA rewrite's destination.
  //    Anything without a file falls through to that rewrite.
  let shells = 0;
  for (const path of publicPaths) {
    if (path === '/') continue;
    const meta = ROUTE_SEO[path];
    if (!meta) continue;

    const filePath = join(DIST, path.replace(/^\//, ''), 'index.html');
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, buildShell(template, path, meta), 'utf8');
    shells += 1;
  }
  log(`wrote ${shells} static route shells`);

  // 3. robots.txt has to name the sitemap at the live host to be useful.
  //    Read from public/ rather than dist/ so re-running this step never tries
  //    to substitute a host into a file it already rewrote.
  try {
    const robots = await readFile(join(ROOT, 'public', 'robots.txt'), 'utf8');
    await writeFile(join(DIST, 'robots.txt'), applyHost(robots), 'utf8');
  } catch {
    log('no public/robots.txt; skipped.');
  }

  // 4. Sitemap: static routes first, then the publicly visible catalogue.
  const urls = publicPaths.map((path) =>
    sitemapEntry({
      path: path === '/' ? '/' : path,
      lastmod: BUILD_DATE,
      changefreq: ROUTE_SEO[path].changefreq,
      priority: ROUTE_SEO[path].priority,
    }),
  );

  const products = await fetchPublicProducts();
  const seen = new Set();
  for (const product of products) {
    if (seen.has(product.styleCode)) continue;
    seen.add(product.styleCode);
    urls.push(
      sitemapEntry({
        path: `/products/${encodeURIComponent(product.styleCode)}`,
        lastmod: (product.updatedAt || product.createdAt || '').slice(0, 10) || BUILD_DATE,
        changefreq: 'weekly',
        priority: 0.7,
      }),
    );
  }

  // 5. The blog: prerendered pages, sitemap entries, IndexNow.
  const posts = await fetchPublishedPosts();
  if (posts.length) {
    await writeBlogPages(template, posts);
    for (const post of posts) {
      urls.push(
        sitemapEntry({
          path: `/blog/${encodeURIComponent(post.slug)}`,
          lastmod: String(post.updatedAt || post.publishedAt || '').slice(0, 10) || BUILD_DATE,
          changefreq: 'monthly',
          priority: 0.7,
        }),
      );
    }
    await announceNewPosts(posts);
  }

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');

  await writeFile(join(DIST, 'sitemap.xml'), sitemap, 'utf8');
  log(`sitemap.xml: ${publicPaths.length} static + ${seen.size} product + ${posts.length} blog URLs at ${SITE_URL}`);
}

main().catch((error) => {
  // A broken SEO pass must never block a deploy.
  console.error('[seo] post-build step failed; the app bundle is unaffected.', error);
});
