// node --test client/scripts/blogShell.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { articleSchemas, fillRoot, jsonLdScripts, postDataScript, renderArticleHtml, renderIndexHtml } from './blogShell.mjs';

const post = {
  slug: 'ring-care',
  title: 'Ring care <at home>',
  excerpt: 'Keep "sparkle" & shine.',
  publishedAt: '2026-09-29T00:00:00Z',
  coverImage: { secureUrl: 'https://res.cloudinary.com/x/cover.jpg', alt: 'A ring' },
  sections: [{ heading: 'Clean gently', paragraphs: ['Use warm water.</script><script>alert(1)</script>'], bullets: ['Soft brush'] }],
  faq: [{ question: 'How often?', answer: 'Monthly.' }],
  products: [{ styleCode: 'ABR 001', name: 'ABR 001' }],
  tags: ['care'],
};

test('article markup escapes everything a model wrote', () => {
  const html = renderArticleHtml(post, { productName: () => 'Rose Gold Ring' });
  assert.ok(html.includes('<h1>Ring care &lt;at home&gt;</h1>'));
  assert.ok(html.includes('Keep &quot;sparkle&quot; &amp; shine.'));
  assert.ok(!html.includes('<script>'), 'no script tag can be injected');
  assert.ok(html.includes('<a href="/products/ABR%20001">Rose Gold Ring</a>'));
  assert.ok(html.includes('<h2>Questions retailers ask</h2>'));
});

test('JSON in script tags cannot close the tag early', () => {
  const scripts = jsonLdScripts(articleSchemas(post, { siteUrl: 'https://example.com', siteName: 'DeArte Jewellery' }));
  assert.equal((scripts.match(/<\/script>/g) || []).length, 3, 'BlogPosting, BreadcrumbList, FAQPage');
  assert.ok(postDataScript(post).indexOf('</script>') === postDataScript(post).length - '</script>'.length);
  assert.equal(JSON.parse(postDataScript(post).replace(/^<script[^>]*>|<\/script>$/g, '')).title, post.title);
});

test('schemas carry the canonical URLs', () => {
  const [article, breadcrumbs] = articleSchemas(post, { siteUrl: 'https://example.com', siteName: 'DeArte Jewellery' });
  assert.equal(article.mainEntityOfPage, 'https://example.com/blog/ring-care');
  assert.equal(breadcrumbs.itemListElement[1].item, 'https://example.com/blog');
});

test('index lists every post and the root is filled once', () => {
  const html = fillRoot('<body><div id="root"></div></body>', renderIndexHtml([post]));
  assert.ok(html.includes('<a href="/blog/ring-care">Ring care &lt;at home&gt;</a>'));
  assert.ok(html.startsWith('<body><div id="root"><main'));
});
