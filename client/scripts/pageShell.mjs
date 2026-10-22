/*
 * Static HTML bodies for the non-blog public pages, used by seo-build.mjs.
 *
 * Same job as blogShell.mjs: crawlers that do not run JavaScript (AI bots,
 * Bing, link previews) read this instead of an empty #root. React replaces it
 * when the app boots. Pure string builders; every value is escaped.
 */

import { escapeHtml } from './blogShell.mjs';

const CONTAINER = 'style="max-width:48rem;margin:2.5rem auto;padding:0 1rem;line-height:1.7"';

const page = (body) => `<main ${CONTAINER}>\n${body}\n<p><a href="/contact">Talk to the trade desk</a> · <a href="/register">Open a trade account</a></p>\n</main>`;

const list = (items = []) => (items.length ? `<ul>${items.map((text) => `<li>${escapeHtml(text)}</li>`).join('')}</ul>` : '');

export function renderEducationHtml(data) {
  const sections = (data.sections || [])
    .map((section) => `<section><h2>${escapeHtml(section.title)}</h2>${list(section.bullets)}</section>`)
    .join('\n');
  return page(`<h1>${escapeHtml(data.title)}</h1>\n<p>${escapeHtml(data.intro)}</p>\n${sections}`);
}

export function renderFaqHtml(faqs) {
  const items = faqs.map((faq) => `<dt>${escapeHtml(faq.question)}</dt><dd>${escapeHtml(faq.answer)}</dd>`).join('');
  return page(`<h1>Answers for wholesale buyers</h1>\n<dl>${items}</dl>`);
}

// About copy is hand-written JSX, not API data, so the essentials are restated
// here. Keep in step with AboutPage in src/pages/ContentPages.jsx.
export function renderAboutHtml() {
  return page(`<h1>Modern jewellery, rooted in timeless craft.</h1>
<p>De Arté is a B2B fine-jewellery house built for retail partners who value clarity, beauty, and reliability. We design with emotional depth, engineer for scale, and deliver collections that feel both elevated and sellable.</p>
<p>DeArte Jewellery manufactures lab-grown diamond jewellery — rings, earrings, pendants, bracelets and bridal sets — for retailers and brands.</p>`);
}

/** `productName`/`productDescription` are passed in so this stays free of src imports. */
export function renderProductHtml(product, { name, description }) {
  const rows = (product.specifications || [])
    .filter((spec) => spec?.attribute && spec?.value)
    .map((spec) => `<tr><th scope="row">${escapeHtml(spec.attribute)}</th><td>${escapeHtml(spec.value)}</td></tr>`)
    .join('');
  const image = product.images?.[0];
  return page(`<p><a href="/products">Catalogue</a></p>
<h1>${escapeHtml(name)}</h1>
<p>Style code ${escapeHtml(product.styleCode)}</p>
${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" style="max-width:100%;height:auto">` : ''}
<p>${escapeHtml(description)}</p>
${rows ? `<table><tbody>${rows}</tbody></table>` : ''}
<p>Trade pricing is shared with approved buyers after sign-in.</p>`);
}

/** llms.txt: a plain-text map of the site for LLM crawlers. */
export function renderLlmsTxt({ siteUrl, siteName, posts = [], educationPaths = [] }) {
  const link = (title, path, note) => `- [${title}](${siteUrl}${path})${note ? `: ${note}` : ''}`;
  return `# ${siteName}

> ${siteName} is a B2B manufacturer of lab-grown diamond jewellery (rings, earrings, pendants, bracelets, bridal sets), supplying retailers and brands. Trade pricing is shared with approved buyers.

## Key pages
${link('About', '/about', 'who we are and how we work')}
${link('Catalogue', '/products', 'wholesale lab-grown diamond jewellery styles')}
${link('Trade buyer FAQ', '/faq', 'ordering, pricing and sizing questions')}
${link('Contact', '/contact', 'talk to the trade desk')}

## Guides
${educationPaths.map((path) => link(path.split('/').pop().replace(/-/g, ' '), path)).join('\n')}

## Journal
${posts.map((post) => link(post.title, `/blog/${post.slug}`)).join('\n')}
`;
}
