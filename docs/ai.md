# AI features

Seven features, all on free tiers, all switched on and off in the admin panel.
None of them changes a product or user record; AI data lives in its own
collections (`AiSettings`, `BlogPost`, `PhotoIndex`, `AiJobRun`).

| Feature | Where | Who sees it | Model |
|---|---|---|---|
| Automated blog | `/blog`, home "From the journal", Admin → Blog | Everyone | text + review |
| Restock suggestions | Account page, Monday email | Signed-in buyers | none (arithmetic) |
| Shop by photo | Camera button on `/products` | Signed-in buyers | vision |
| Plain-language search | ✨ button on `/products` | Everyone | text |
| Banner and announcement copy | Admin → AI Studio | Admins | text |
| Ask your data | Admin → AI Studio | Admins | text |
| AI catalogue builder | `/catalogue` | Signed-in buyers | text |

Code: `server/src/services/ai/*` (one module per feature, `llm.js` for every
model call, `guards.js` for the output checks), routes in `aiRoutes.js`,
`blogRoutes.js` and `adminAiRoutes.js`, client pieces in
`client/src/components/ai/StorefrontAi.jsx`, `pages/AdminAiPages.jsx`,
`pages/BlogPages.jsx`.

## Setup

API project in Vercel → Settings → Environment Variables (never in chat or git):

| Variable | Value | Where from |
|---|---|---|
| `AI_API_KEY` | your Groq key | console.groq.com → API Keys |
| `AI_TEXT_MODEL` | `openai/gpt-oss-120b` | console.groq.com/docs/models |
| `AI_VISION_MODEL` | `qwen/qwen3.8-27b` | same page, an image-capable model |
| `AI_REVIEW_MODEL` | `qwen/qwen3.8-27b` | optional; keep it different from the text model |
| `PEXELS_API_KEY` | your Pexels key | pexels.com/api (optional: blog stock photos) |
| `CRON_SECRET` | `openssl rand -hex 32` | you make it; Vercel sends it to the cron routes |
| `CLIENT_DEPLOY_HOOK_URL` | the hook URL | **client** project → Settings → Git → Deploy Hooks |

`AI_BASE_URL` defaults to Groq. Any OpenAI-compatible provider works by
changing it and the model ids.

Check a key and model ids without the database:

```bash
node server/scripts/ai-smoke.mjs
```

Model ids are retired from time to time. If AI Studio shows features on but
every call fails, run the smoke script; a 404 `model_not_found` means the id
needs changing in Vercel.

## Switches

**Admin → AI Studio**

- Each buyer feature: *Off*, *Staff preview* (admin and sales only) or *Everyone*.
  Everything starts on Staff preview: try it on the live site signed in as
  admin, then switch it to Everyone.
- Photo index: the nightly tagging job (off until ticked). *Run a batch now*
  tags a few styles immediately.
- Restock reminder emails (off until ticked; needs email configured).

**Admin → Blog**

- *Write and publish on schedule* (off until ticked), *Publish automatically*,
  posts per week (Tuesdays, or Tuesdays and Fridays).
- *Facts the writer may use*: the only figures and company claims a post may
  contain besides the product data. The writer is given just what the
  storefront itself says (company name and address, the house diamond quality,
  karats and colours, categories, services). If DeArte is, say, BIS hallmarked,
  add that line here; until then posts will not claim it.
- The topic queue. When fewer than five topics are left, the model proposes ten.

**Kill switches**, fastest first: set the feature to *Off* in AI Studio; untick
the job; remove `AI_API_KEY` in Vercel (every AI control disappears and every
AI endpoint answers 503); disable the crons under Vercel → Settings → Cron Jobs.

## Scheduled jobs

In `server/vercel.json`. Hobby runs each entry once a day, anywhere inside the
stated hour.

| Job | Schedule (UTC) | India time | Notes |
|---|---|---|---|
| Blog | 21:30 daily | about 03:00 | writes only on Tue (and Fri, at 2 a week) |
| Photo index | 19:00, 20:00, 23:00, 00:00, 01:00 | between 00:30 and 07:30 | five short runs; silent once everything is tagged |
| Restock emails | 22:30 Mondays | about 04:00 Tuesday | only styles that came due in the past week |

Vercel may deliver a run twice. The blog and restock jobs claim the day
atomically (`claimCronRun()` in `jobs.js`), so a duplicate does nothing; the
photo index is safe to repeat. Every run is listed under AI Studio → Recent
runs, and runs expire after 90 days.

## What the free tier allows (measured September 2026)

Groq's free limits are per model, which is why the text, vision and review
roles use different models where possible.

| | `gpt-oss-120b` | `qwen3.8-27b` |
|---|---|---|
| Requests a day | 1,000 | 1,000 |
| Tokens a minute | 8,000, counting prompt + requested output | 8,000 total; 7,000 input; **1,000 output** |

Consequences built into the code:

- **Qwen cannot write the blog** (a post is ~1,700 output tokens), so it only
  does vision and the review.
- gpt-oss is asked for low reasoning effort. At its default it sometimes
  thinks for 5,000+ tokens, blowing the minute's allowance.
- A 429 carries `retry-after`; `chatJson` waits once when that fits inside the
  call's own time limit. A buyer's search fails fast instead of hanging.
- Groq counts an image as ~2,300 input tokens, so the photo index manages
  about three styles a minute: ~4 per run, ~20 a night. 330 styles take about
  two and a half weeks, or less if you press *Run a batch now* a few times.
- Rough per-call cost: search ~1 s; ask ~1–2 s; a blog post 5–15 s, well
  inside the 60 s function limit.

If the site outgrows this, Groq's paid tier lifts the limits with no code
change. That is the only thing here that costs money.

## Guardrails

Model output is treated as untrusted input.

- **Filters and tags** must match names that exist (`matchNames`,
  `normalizeTags`). The worst a wrong answer can do is apply the wrong filter.
- **Every product shown goes through the storefront's access rules**. A
  restricted buyer never sees a style they could not open, and a blog post
  links only guest-visible styles.
- **Figures must be grounded.** A number in a post, banner, lookbook
  introduction or data answer must appear in the facts or data the model was
  given. Otherwise the post is rewritten or held, the copy is dropped, and the
  data answer falls back to the table.
- **Claims are checked**: guarantees, investment or resale value, health
  claims, other brands, and certification unless the facts mention it.
- **The blog reviewer** separates must-fix problems (anything about DeArte not
  in the facts, factual errors, legal risk) from style notes. A must-fix item
  or a score under 7 triggers one rewrite; if it still fails, the post is held
  and the ops list is emailed.
- **Ask your data** picks one of eight fixed reports; the model never writes a
  query. Buyer names go to the model as "Buyer 1…" and are restored here.
- **Photos buyers upload** are shrunk in the browser, sent once, and never
  stored.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "The AI service is busy right now" | the minute's allowance is used up | wait a minute; it refills continuously |
| Every AI call fails, AI Studio shows keys set | model id retired or key revoked | run the smoke script; update the id in Vercel |
| Blog posts held with "not reviewed" | the review could not run in time | read it and publish, or press Rewrite |
| Posts published but not in Google yet | no deploy hook, or the build failed | check `CLIENT_DEPLOY_HOOK_URL`; see docs/seo.md |
| Shop by photo only matches on category | styles not tagged yet | tick Photo index, or *Run a batch now* |
| Restock "Add to cart" says choose a size | the old order line had no size | the buyer opens the style and picks one |

## Tests

```bash
node --test server/src/services/ai/*.test.js
node --test client/scripts/blogShell.test.mjs
```
