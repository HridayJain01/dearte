# SEO

## The constraint everything here works around

The storefront is a **Vite + React SPA**, not Next.js. There is no SSG, no ISR,
no SSR and no App Router — the server hands every visitor the same empty
`<div id="root">` and the page is built in the browser.

Googlebot renders JavaScript, so it eventually sees the real page. Nothing else
does. Bing, LinkedIn, WhatsApp, Slack, X and the AI crawlers fetch the HTML and
stop reading. Before this work they all saw one document titled `client` with an
empty body, for every URL on the site.

So the site is optimised on two tracks that have to stay in step:

| Track | Who it serves | Where it lives |
| --- | --- | --- |
| Static HTML shells, one per public route, with real head tags baked in | every crawler, and every link preview | `client/scripts/seo-build.mjs` |
| Head tags rewritten in place as the buyer navigates | Googlebot, and the browser tab | `client/src/components/seo/Seo.jsx` |

Both read the same copy out of `client/src/utils/seoRoutes.js`. **Edit a title or
description there and both tracks change together** — that is the whole reason
the table exists.

## What runs at build time

`npm run build --workspace client` is `vite build` followed by
`scripts/seo-build.mjs`, which:

1. Stamps the canonical host (`VITE_SITE_URL`) into `index.html`, the route
   shells, `robots.txt` and `sitemap.xml`.
2. Writes one HTML shell per route in `INDEXABLE_PATHS` — `dist/about.html`,
   `dist/education/diamond.html`, and so on — each carrying that route's title,
   description, canonical and Open Graph tags.
3. Writes `sitemap.xml`: the static routes, plus every style the **public** API
   returns to a logged-out request. That last part is deliberate — those are
   exactly the product pages a crawler can reach, and listing any others would
   be publishing soft 404s.

The script never fails the build. If the API is unreachable the sitemap ships
with static routes only and the deploy proceeds.

## The one environment variable

`VITE_SITE_URL` — the canonical origin, no trailing slash.

Set it in the Vercel project under **Settings → Environment Variables**, scoped
to **Production only**. Leaving it unset for Preview keeps preview builds from
claiming to be the live site.

Until it is set everything falls back to `https://dearte-client.vercel.app`
(`FALLBACK_SITE_URL` in `src/utils/seo.js`). When a custom domain is attached,
set the variable and redeploy — nothing else changes.

## Why `vercel.json` looks like that

- **`cleanUrls: true`** is what makes Vercel serve `dist/about.html` at `/about`,
  and 308 `/about.html` back to `/about` so a route never has two indexable
  spellings.
- **Rewrites run after the filesystem check**, so the prerendered shells win and
  only the dynamic routes (`/products/:styleCode`) and genuine misses fall
  through to `index.html`.
- **`/assets/*` is cached for a year** because Vite fingerprints those filenames.
  HTML must revalidate or a deploy would never reach a returning visitor.

## What is deliberately not indexed

`noindex` on cart, checkout, wishlist, account, catalogue, all of `/admin`, the
auth pages, and the 404. They need a session, so a crawler only ever sees an
empty shell — indexing them adds thin pages and nothing else.

Two more, set on the product list:

- **Search result pages** (`?search=`) — permutations of pages already indexed.
- **Page 2 and beyond** — same.

Category, sub-category, collection and occasion facets *are* indexed, and each
one canonicalises to itself minus `sort` and `page`. Those are real landing
pages ("diamond stud earrings"); the sort order is not.

## Product names are derived, not stored

The Excel bulk import sets every style's `name` to its style code and leaves
`description` empty. `src/utils/productTitle.js` builds a readable name out of
the attributes the import does populate — `Rose Gold Lab-Grown Diamond Fashion
Bracelet` instead of `ABR00382` — and yields to a real `name` the moment an
editor writes one.

This is a stopgap for a data problem. Hand-written names and descriptions on the
styles you most want to rank will beat anything derived from a taxonomy.

## Pages the admin has gated

`/collections`, `/products`, `/events`, `/testimonials` and `/trusted-by` sit
behind the guest-access toggles in **Admin → Configuration**. When a toggle is
off, a logged-out visitor — crawler included — is redirected to `/login`.

The build reads those flags from the live API and drops any closed route from
both the sitemap and the shells, rather than publishing a URL that answers with
a sign-in wall. Watch the build log:

```
[seo] gated for guests, so excluded: /collections
```

**`/collections` is currently gated.** The header links to it on every page, so
guests hit a sign-in wall from the main navigation, and the page cannot rank at
all. Opening that toggle is a one-click merchandising decision and is worth
making — a "shop by collection" page is a strong landing page and the copy for
it is already written.

## The ceiling this cannot lift

**Only products in the guest catalogue can ever rank.** A logged-out crawler
sees whatever `getGuestCatalogue()` allows — at the time of writing, 9 styles.
The rest of the catalogue is invisible to search by design. Widening it is a
merchandising decision, made in Admin → Configuration, not a code change.

Product detail pages also get **no static shell**, only sitemap entries: a shell
would be a build-time snapshot of a catalogue that changes from the admin panel,
and a stale title is worse than a rendered one. Googlebot renders them fine.

## After deploying

1. Verify `https://<domain>/robots.txt` and `/sitemap.xml` resolve and name the
   right host.
2. Add the property in Google Search Console, submit the sitemap.
3. Run the live URL through the Rich Results Test — `Product` will warn about a
   missing `offers`. That is expected and correct: trade pricing is only visible
   behind a buyer login, and publishing a price a crawler cannot see is cloaking.
