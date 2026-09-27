/*
 * Static HTML for the blog, used by seo-build.mjs.
 *
 * A post's full text goes into the served HTML, so crawlers that do not run
 * JavaScript (Bing, link previews, AI crawlers) read the article, not an empty
 * app shell. React replaces this markup when it boots; the post's JSON rides
 * along in a script tag so the page can render from it without refetching.
 *
 * Pure string builders: every value is escaped, nothing a model wrote can
 * become markup. Tested in blogShell.test.mjs.
 */

// Also the name of client/public/<key>.txt, which IndexNow fetches to confirm
// the site owns this key. Not a secret: it is meant to be public.
export const INDEXNOW_KEY = '14d93bd0c8520c2f588a7d1ba5b6e756';

export const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** JSON safe to place inside a <script>: `</script>` cannot close it early. */
export const safeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

export function jsonLdScripts(nodes) {
  return nodes
    .filter(Boolean)
    .map((node) => `<script type="application/ld+json">${safeJson(node)}</script>`)
    .join('\n');
}

const dateLabel = (value) =>
  value ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '';

// Readable while the app loads; React replaces it moments later.
const CONTAINER = 'style="max-width:48rem;margin:2.5rem auto;padding:0 1rem;line-height:1.7"';

export function renderArticleHtml(post, { productName = (product) => product.name || product.styleCode } = {}) {
  const cover = post.coverImage?.secureUrl
    ? `<img src="${escapeHtml(post.coverImage.secureUrl)}" alt="${escapeHtml(post.coverImage.alt || post.title)}" style="max-width:100%;height:auto">`
    : '';
  const sections = (post.sections || [])
    .map(
      (section) =>
        `<section><h2>${escapeHtml(section.heading)}</h2>${(section.paragraphs || []).map((text) => `<p>${escapeHtml(text)}</p>`).join('')}${
          section.bullets?.length ? `<ul>${section.bullets.map((text) => `<li>${escapeHtml(text)}</li>`).join('')}</ul>` : ''
        }</section>`,
    )
    .join('\n');
  const faq = post.faq?.length
    ? `<section><h2>Questions retailers ask</h2><dl>${post.faq
        .map((entry) => `<dt>${escapeHtml(entry.question)}</dt><dd>${escapeHtml(entry.answer)}</dd>`)
        .join('')}</dl></section>`
    : '';
  const products = post.products?.length
    ? `<section><h2>Pieces from this story</h2><ul>${post.products
        .map((product) => `<li><a href="/products/${encodeURIComponent(product.styleCode)}">${escapeHtml(productName(product))}</a></li>`)
        .join('')}</ul></section>`
    : '';

  return `<main ${CONTAINER}><article>
<p><a href="/blog">Journal</a></p>
<h1>${escapeHtml(post.title)}</h1>
${post.publishedAt ? `<p><time datetime="${escapeHtml(new Date(post.publishedAt).toISOString())}">${escapeHtml(dateLabel(post.publishedAt))}</time></p>` : ''}
${cover}
${post.excerpt ? `<p>${escapeHtml(post.excerpt)}</p>` : ''}
${sections}
${faq}
${products}
<p><a href="/register">Open a trade account</a> · <a href="/contact">Talk to the trade desk</a></p>
<p>Prepared by the DeArte editorial desk with AI assistance.</p>
</article></main>`;
}

export function renderIndexHtml(posts) {
  const items = posts
    .map(
      (post) =>
        `<li><a href="/blog/${encodeURIComponent(post.slug)}">${escapeHtml(post.title)}</a>${post.excerpt ? `<p>${escapeHtml(post.excerpt)}</p>` : ''}</li>`,
    )
    .join('\n');
  return `<main ${CONTAINER}><h1>The DeArte journal</h1>
<p>Lab-grown diamond know-how, styling ideas and retail advice for jewellery buyers.</p>
<ul>
${items}
</ul></main>`;
}

export function articleSchemas(post, { siteUrl, siteName }) {
  const url = `${siteUrl}/blog/${post.slug}`;
  const nodes = [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.metaDescription || post.excerpt,
      ...(post.coverImage?.secureUrl ? { image: [post.coverImage.secureUrl] } : {}),
      datePublished: post.publishedAt,
      dateModified: post.updatedAt || post.publishedAt,
      mainEntityOfPage: url,
      author: { '@type': 'Organization', name: siteName, url: `${siteUrl}/` },
      publisher: { '@id': `${siteUrl}/#organization` },
      ...(post.tags?.length ? { keywords: post.tags.join(', ') } : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: 'Journal', item: `${siteUrl}/blog` },
        { '@type': 'ListItem', position: 3, name: post.title, item: url },
      ],
    },
  ];
  if (post.faq?.length) {
    nodes.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: post.faq.map((entry) => ({
        '@type': 'Question',
        name: entry.question,
        acceptedAnswer: { '@type': 'Answer', text: entry.answer },
      })),
    });
  }
  return nodes;
}

/** The post itself, for BlogPostPage to render from without a fetch. */
export function postDataScript(post) {
  return `<script id="prerendered-post" type="application/json">${safeJson(post)}</script>`;
}

/** Put markup inside the app's root element. */
export function fillRoot(html, markup) {
  return html.replace('<div id="root"></div>', () => `<div id="root">${markup}</div>`);
}

export function beforeClose(html, tag, markup) {
  return html.replace(`</${tag}>`, () => `${markup}\n</${tag}>`);
}
