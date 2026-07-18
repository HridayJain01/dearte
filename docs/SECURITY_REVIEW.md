# DeArte — Security & Compliance Review

**Date:** 2026-07-18
**Scope:** Full repository (`client/`, `server/`, root config) — secrets handling, authentication and access control, input validation and injection, dependency vulnerabilities, configuration, CORS, rate limiting, error and PII leakage, deploy blockers.
**Outcome:** 24 issues found — 4 critical, 7 high, 9 medium, 4 low. All fixed except 3 that need an action outside the codebase (marked **ACTION REQUIRED**).

---

## Executive summary

Three findings were serious enough that they alone should have blocked a deploy:

1. **Anyone could take over any account, including the admin.** `POST /api/auth/forgot-password` set every user's reset code to the constant `123456` *and returned it in the HTTP response*. Knowing an email address was sufficient to reset that account's password.
2. **A fresh production database seeded a working admin login published in this repo** — `admin@dearte.com` / `Admin@123`.
3. **JWT signing secrets silently fell back to hardcoded values** in this repository. A deploy that missed `JWT_SECRET` would sign sessions with a public constant, letting anyone forge an admin token.

There was also a CORS misconfiguration that made the first two dramatically easier to exploit: when `NODE_ENV` was not exactly `production`, the API reflected *any* origin with `credentials: true`, so any website could make authenticated requests using a logged-in user's cookies.

All three are fixed and verified. The remaining action items are credential rotation and the `xlsx` dependency, detailed at the end.

---

## Verification

Fixes were exercised against a live instance of the API booted in production mode against a **throwaway local MongoDB** (never the production database).

- **40 automated checks, all passing** — 20 adversarial (attempted takeover, injection, forged tokens, CORS abuse, oversized bodies, privilege escalation) and 20 functional regression (register → activate → login → refresh → logout, password reset happy path, search and filters still return correct results).
- Client builds clean (`vite build`) and lints clean (`eslint`).
- All server modules pass `node --check`.
- Seeding verified in three configurations: production without an admin password (refuses to boot), production with one (boots, published credentials dead), and development (unchanged local workflow).

One bug in the new code was caught by these tests before it landed: `toNumber` converted an empty or rejected value into a literal `0`, which would have added a spurious `$gte: 0` bound to weight-range filters. Fixed in `server/src/utils/validation.js`.

---

## Critical

### C1. Account takeover via hardcoded, response-leaked password reset OTP
**Where:** `server/src/routes/authRoutes.js`, `client/src/pages/AuthPages.jsx`

`forgot-password` assigned the literal code `123456` to any account and returned it in the JSON response. The UI displayed it and advertised the value on screen. Any unauthenticated caller could reset the admin's password with two requests.

**Fixed:**
- Codes are now generated with `crypto.randomInt` (6 digits, uniformly random).
- Only a **SHA-256 digest** of the code is stored; the plaintext never touches the database.
- Comparison uses `crypto.timingSafeEqual`.
- The code is **never returned in the response**. Delivery is out of band via `server/src/services/passwordResetDelivery.js`.
- Reset attempts are capped at 5 per issued code, after which the code is invalidated.
- The client no longer displays or expects the code.

> **ACTION REQUIRED:** there is no mail transport in the codebase — the `EMAIL_*` variables in `.env.example` are not consumed anywhere and `nodemailer` is not a dependency. Until a transport is wired up, reset codes are written to the server log only (and in production the endpoint logs a warning that nothing was sent). Self-service password reset is therefore **not functional for end users** until you implement `deliverResetOtp`. The stub is clearly marked with a `TODO(deploy)`.

### C2. Publicly known admin credentials seeded into production
**Where:** `server/src/bootstrap/seedDatabase.js`, `server/src/data/seed.js`

`seedDatabase()` runs on every boot and seeds when the users collection is empty — i.e. on the first production boot. It created `admin@dearte.com` with `bcrypt.hashSync('Admin@123')`, a credential visible to anyone reading this repository, plus demo buyers with `Buyer@123`.

**Fixed:** in production the initial admin now requires `SEED_ADMIN_PASSWORD` (validated for strength) and optionally `SEED_ADMIN_EMAIL`; the server **refuses to start** rather than seed the default. Demo buyer accounts get a random unguessable password in production. Local development is unchanged, with a warning logged.

### C3. JWT secrets fell back to hardcoded repository constants
**Where:** `server/src/utils/auth.js` → new `server/src/config/env.js`

```js
const ACCESS_SECRET = process.env.JWT_SECRET || 'dearte-access-secret';
```

A deploy missing this variable would sign sessions with a value published here — anyone could mint an admin token. Verified as exploitable pre-fix.

**Fixed:** secrets are centralised in `config/env.js` with startup validation that **fails the boot** in production if they are missing, under 32 characters, set to a known placeholder, or identical to each other. Development uses a random per-process value rather than a shared constant. Verified: a token signed with `dearte-access-secret` is now rejected with 401.

### C4. Live database credentials in plaintext, pointed at production
**Where:** `server/.env`, `.env`

`server/.env` contains a working MongoDB Atlas username and password in plaintext, and the local environment points at the **production** database. These files are correctly gitignored and **no secret was ever committed** (verified across all history), but the credentials are exposed on disk and were pasted into a file that also serves as the local dev config.

**Partly fixed:** `.gitignore` hardened to cover `.env.*` at any depth plus `*.pem`/`*.key`/`*.p12`/`*.pfx`, with the safe templates re-allowed.

> **ACTION REQUIRED:**
> 1. **Rotate the MongoDB Atlas password now** (the one for user `hriday01`), along with the Cloudinary API secret and any Gmail app password in that file. Treat all of them as exposed.
> 2. Point local development at a **separate database** from production. Running the seeder or a test against the production URI is a live-data risk.
> 3. Restrict Atlas network access to your deployment's egress IPs rather than `0.0.0.0/0`, if it is currently open.

---

## High

### H1. CORS reflected arbitrary origins with credentials enabled
**Where:** `server/src/index.js`

When `NODE_ENV !== 'production'` the API ran `cors({ origin: true, credentials: true })`, echoing back **any** origin. Since `NODE_ENV` is host-supplied and easily unset on Render, a production deploy could silently run in this mode — letting any website on the internet issue authenticated cross-origin requests with a logged-in user's cookies, and read the responses. This is a full CSRF/data-exfiltration path against every authenticated endpoint, and it compounded C1–C3.

**Fixed:** arbitrary origins are never reflected in any mode. Production uses a strict allow-list (`CLIENT_ORIGIN` plus optional `ADDITIONAL_CLIENT_ORIGINS`); outside production, only loopback origins are additionally permitted, via an anchored pattern that rejects lookalikes such as `https://localhost.evil.com`. Verified both directions.

### H2. NoSQL operator injection in public product filters
**Where:** `server/src/routes/publicRoutes.js`

Query values went straight into Mongoose filters. Express parses `?stockType[$ne]=x` into an object, so a caller could smuggle Mongo operators into `stockType`, `diamondMin/Max`, `goldMin/Max` and the taxonomy filters — bypassing the `status: 'Active'` intent and enumerating unpublished inventory.

**Fixed:** every value is coerced to a primitive string first (`asString` returns `''` for objects and arrays), numeric bounds go through `toNumber`, and `stockType` is restricted to a known set via `oneOf`.

### H3. ReDoS via unescaped user input in `$regex`
**Where:** `server/src/routes/publicRoutes.js` (public search), `server/src/routes/adminRoutes.js` (6 sites)

User-supplied text was interpolated directly into `$regex`. A crafted pattern such as `(a+)+(a+)+$` causes catastrophic backtracking and hangs the process — an unauthenticated single-request denial of service on a single-process Node deployment.

**Fixed:** all user text passes through `escapeRegex` so it is matched literally. Verified: the catastrophic pattern now returns in 51 ms, and normal search still returns correct results.

### H4. Unbounded pagination
**Where:** `server/src/routes/publicRoutes.js`

`limit` was passed to `.limit()` unvalidated; `?limit=999999` would pull the entire catalogue (with four populated joins per row) into memory. `NaN` values produced broken queries.

**Fixed:** `parsePagination` clamps `limit` to 1–100 and floors `page` at 1, with sane fallbacks. Verified.

### H5. Rate limiting applied only to `/api/auth`
**Where:** `server/src/index.js`

Every other endpoint — product search, the 25 MB bulk-import route, all admin routes — had no limit at all.

**Fixed:** a global limiter (300 req/min per IP) now covers the whole API, with the tighter auth limits layered on top.

### H6. Rate limiting was ineffective behind the proxy
**Where:** `server/src/index.js`

`trust proxy` was never set. Behind Render/Vercel, `express-rate-limit` keys on the proxy's IP, so all callers share one bucket — the limiter both fails to isolate an attacker and can lock out legitimate users.

**Fixed:** `app.set('trust proxy', 1)`.

### H7. Dependency vulnerabilities (18 advisories)
**Where:** `package-lock.json`

Included 2 critical and 6 high advisories: `axios` (numerous prototype-pollution gadgets enabling credential injection and request hijacking), `react-router` (unauthenticated RCE via vendored turbo-stream, plus a CSRF vector), `form-data` (CRLF injection), `vite`, `shell-quote`/`concurrently`, `dompurify`, `qs`, `postcss` and others.

**Fixed:** `npm audit fix` resolved **17 of 18**. All were within existing semver ranges — only the lockfile changed, no manifest version bumps, no breaking upgrades. Client build and lint pass afterwards.

> **ACTION REQUIRED — `xlsx` (high, no fix on npm):** prototype pollution + ReDoS, used by the admin bulk-import UI. The npm-published `xlsx` package is abandoned; the maintained release lives at SheetJS's own registry. Remediate by repointing the dependency:
> ```
> npm i --workspace client https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
> ```
> I did **not** apply this automatically because it changes where the package resolves from, which affects your install and deploy pipeline and should be a deliberate choice. Exposure is limited: parsing happens in the admin's browser, not on the server, and requires an admin to open a hostile spreadsheet.

---

## Medium

### M1. Server error handler leaked internals
`console.error(err)` plus `sendError(res, err.message, 500)` returned raw exception messages — Mongoose cast details, schema field names, driver errors — to callers.
**Fixed:** 5xx responses now return a generic `Internal server error` while the full error is logged server-side. `CastError`/`ValidationError` map to a clean 400. A 404 handler was added.

### M2. Malformed IDs caused 500s
`GET /api/orders/:id` put an arbitrary path segment into an `_id` match; a non-ObjectId threw a `CastError` surfacing as a 500 with schema internals.
**Fixed:** the `_id` branch is only used when the value is a valid ObjectId. `getProductByClientId` guards the cast so a malformed or object-shaped id reads as "not found". Verified: returns 404, not 500.

### M3. Refresh tokens stored in plaintext
14-day refresh JWTs were stored raw in `user.refreshTokens`, so read access to the users collection yielded live sessions for every user — material given C4.
**Fixed:** only SHA-256 digests are stored; login, refresh, `/me` and logout all compare digests. Verified: no raw JWTs at rest.

### M4. No input validation on registration
`bcrypt.hash(req.body.password, 10)` threw a 500 on a missing password; there was no email-format check, no password strength requirement, and no field length limits.
**Fixed:** name, email format and password strength (8+ chars, letter + digit) validated server-side; every field length-bounded; bcrypt cost raised 10 → 12. Client `zod` schemas updated to mirror the server rules.

### M5. Mass-assignment risk at registration
The account document was built from individually-named fields, but adjacent code spread request bodies. Confirmed by test that `role`/`status` cannot be set at signup — hardened explicitly with a comment so a future edit does not reintroduce it. `PUT /api/profile` was converted from a key list to an explicit field/max-length map for the same reason.

### M6. User enumeration on password reset
`reset-password` returned `404 Account not found` for unknown emails, letting an attacker enumerate registered addresses. `login` returned early without hashing when the user was missing, leaking existence through response timing.
**Fixed:** all reset failures return one identical message; login always performs a bcrypt comparison against a dummy hash. Verified: byte-identical responses for known vs unknown addresses.

### M7. Unauthenticated health endpoint queried the database
`/api/health` ran `Product.countDocuments()` on every call — a free unauthenticated database query (cheap DoS amplification) that also disclosed catalogue size.
**Fixed:** returns static status only.

### M8. 25 MB body limit on every endpoint
The bulk-import allowance was applied globally, so any unauthenticated endpoint would buffer 25 MB per request.
**Fixed:** the 25 MB limit is scoped to `/api/admin/products/bulk-import`; everything else is capped at 1 MB. Verified: a 3 MB login body returns 413.

### M9. Order IDs collided (deploy blocker)
`DAR-ORD-${Math.floor(Math.random() * 9000 + 1000)}` drew from 9,000 values against a **unique index**. By the birthday bound, a collision — surfacing as a hard 500 at checkout — becomes more likely than not after about 110 orders. The IDs were also trivially guessable.
**Fixed:** `DAR-ORD-<YYMMDD>-<10 hex chars>` from `crypto.randomBytes`.

---

## Low

### L1. Prototype-chain lookup on public content routes
`seedData.staticPages[req.params.slug]` with `__proto__` or `constructor` returned internal objects to unauthenticated callers.
**Fixed:** guarded with `Object.hasOwn`. Verified: returns 404.

### L2. Security headers
`crossOriginResourcePolicy` was disabled outright and no CSP was set.
**Fixed:** scoped to `cross-origin` rather than off, plus a restrictive CSP (`default-src 'none'`, `frame-ancestors 'none'`), `no-referrer`, and `x-powered-by` disabled. HSTS and `X-Content-Type-Options` confirmed present.

### L3. Unused dependencies at the root
`boneyard-js` (an obscure, low-usage package) and `mongodb` were declared but imported nowhere — needless supply-chain surface.
**Fixed:** both removed.

### L4. Unbounded free-text fields
Cart special instructions, order notes and shipping address had no length cap, and `paymentMethod` was accepted as arbitrary text.
**Fixed:** all bounded; `paymentMethod` restricted to the two supported values.

---

## Reviewed and found clean

- **Client-side XSS:** no `dangerouslySetInnerHTML`, `innerHTML`, `eval`, or `new Function` anywhere in `client/src`. React's default escaping is relied on throughout.
- **Token storage:** sessions live in `httpOnly` cookies, not `localStorage` — confirmed `HttpOnly` is set on the wire. The only browser storage use is a popup-frequency flag.
- **Secrets in git history:** no `.env` file or credential was ever committed, across all branches.
- **Access control:** `requireAuth` / `requireAdmin` are correctly mounted on the user and admin routers; role is read from the database on each request rather than trusted from the JWT. Order and catalogue queries are scoped by `user: req.user._id`, so there is no IDOR on buyer data.
- **PII in responses:** `serializeUser` excludes `passwordHash`, `refreshTokens` and `resetOtp`; verified on a live response. Ops-only WhatsApp numbers are stripped from public site settings.
- **Admin routes:** already used `String()` coercion and ObjectId validation for ID parameters; only the `$regex` escaping (H3) needed changing.
- **WhatsApp webhook:** the verify token is compared against an env value and rejects when unset.

---

## Pre-deploy checklist

Blocking:

- [ ] **Rotate** the MongoDB Atlas password, Cloudinary API secret, and Gmail app password in `server/.env` — treat as exposed (C4).
- [ ] Set `NODE_ENV=production` on the host. Without it, cookies are not `Secure` (C4/H1).
- [ ] Set `JWT_SECRET` and `JWT_REFRESH_SECRET` to distinct 32+ byte random values — the API will refuse to start otherwise (C3).
- [ ] Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` before the first boot against an empty database (C2).
- [ ] Set `CLIENT_ORIGIN` to the exact storefront origin; add any others to `ADDITIONAL_CLIENT_ORIGINS` (H1).
- [ ] Point local development at a non-production database (C4).

Strongly recommended:

- [ ] Implement `deliverResetOtp` (SMTP or the existing WhatsApp service) — password reset does not reach users until then (C1).
- [ ] Repoint `xlsx` to the maintained SheetJS build (H7).
- [ ] Restrict MongoDB Atlas network access to your deployment's egress IPs.
- [ ] Rotate the seeded admin password after first login.

Worth doing soon (not addressed here, out of scope of a security pass):

- No automated test suite exists. The 40 checks written for this review were run against a throwaway database and then removed; consider adopting a permanent suite covering at least the auth flows.
- Consider per-account login throttling in addition to the current per-IP limits, to blunt password spraying across many accounts from rotating IPs.

---

## Files changed

**Added**
- `server/src/config/env.js` — centralised secret handling and startup validation
- `server/src/utils/validation.js` — input coercion, regex escaping, pagination clamping, email/password rules
- `server/src/services/passwordResetDelivery.js` — out-of-band OTP delivery (stub, marked `TODO(deploy)`)
- `docs/SECURITY_REVIEW.md` — this report

**Modified**
- `server/src/index.js` — CORS allow-list, trust proxy, global rate limit, scoped body limits, CSP/headers, 404 + hardened error handler, static health check
- `server/src/routes/authRoutes.js` — OTP generation/hashing/attempt-capping, enumeration parity, registration validation, refresh-token digests, tiered rate limits
- `server/src/routes/publicRoutes.js` — operator-injection and ReDoS fixes, pagination clamp, prototype-safe lookups
- `server/src/routes/userRoutes.js` — collision-resistant order IDs, ObjectId guards, field bounds, payment method allow-list
- `server/src/routes/adminRoutes.js` — regex escaping across 6 search sites
- `server/src/utils/auth.js` — env-backed secrets, OTP and refresh-token hashing helpers
- `server/src/bootstrap/seedDatabase.js` — production admin credentials from env, random demo-buyer passwords
- `server/src/models/User.js` — `resetOtp.attempts`, digest-storage note
- `client/src/pages/AuthPages.jsx` — stopped displaying the reset code
- `client/src/utils/validators.js` — password rules mirroring the server
- `.gitignore`, `.env.example`, `package.json`, `package-lock.json`
