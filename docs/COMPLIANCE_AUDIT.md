# Website Compliance & Trust Audit

Audited 2026-09-11 against the storefront (`client/`) and API (`server/`). Jurisdiction assumed: India
(INR, GST, Mumbai address) with occasional export buyers. Not legal advice — have a lawyer review the
policy drafts below before publishing.

Status key: ✅ compliant · 🟡 partial · ❌ needs fixing · 🔧 fixed in this pass

---

## Ranked action list

### P0 — legal / trust exposure (do first)

| # | Action | Where | Status |
|---|--------|-------|--------|
| 1 | Login form shipped **prefilled with the owner's email and `password`**. Prefill removed. **If `password` is (or was) a real password on production, change it now.** | `client/src/pages/AuthPages.jsx` | 🔧 code / ❌ rotate password |
| 2 | **Fake testimonials and "trusted brands"**: invented names, Unsplash stock headshots, `ui-avatars.com` generated logos, reviews that praise the *software* ("user activation flow"). The seeder inserts them into an empty DB, so they are very likely live. Delete in Admin → Testimonials / Trusted brands unless each one is real and you have written permission. Remove from `server/src/data/seed.js`. Until real ones exist, toggle the home sections off (guest-access switches already exist). | `seed.js` L60–144, prod DB | ❌ |
| 3 | **Unsubstantiated claims** on About: "72h design-to-approval", "250+ retail partners", "99% QC pass consistency", "42 cities" are hard-coded constants. Plus ethical/environmental claims ("audited sourcing partners", "recycled gold", "traceable materials", "reduce waste"). Remove or back each with records. | `ContentPages.jsx` L16–39, `seed.js` L265–275, `seoRoutes.js` L111–114 | ❌ |
| 4 | **Placeholder business details**: phone `+91 98765 43210` / `wa.me/919876543210` (a real stranger's number format), social links to bare `instagram.com` etc., three different emails, no legal entity, GSTIN or grievance officer. Code fallbacks removed (the WhatsApp button and socials now only render when set); **replace the values in Admin → Config** and add the business block below. | `AppLayout.jsx`, `seed.js` L292–305, `index.html` JSON-LD | 🔧 code / ❌ data |
| 5 | **Policies are 3 sentences each.** Privacy Policy is legally required (IT Act s.43A + SPDI Rules 2011 r.4; DPDP Act 2023 s.5 notice). Publish the drafts below: Privacy (with cookies section), Terms, Return & Refund. | `seed.js` `staticPages` | ❌ |
| 6 | **Dead forms/buttons**: Contact "Submit Enquiry", footer "Subscribe", Careers "Apply Now" have no handler — the user types data and nothing happens. Decide per form: wire up, turn into `mailto:`, or remove. *(Needs your decision — functional change.)* | `ContentPages.jsx` L66–77, L453; `AppLayout.jsx` newsletter | ❌ |

### P1 — accessibility (WCAG 2.1 AA)

| # | Action | Status |
|---|--------|--------|
| 7 | Muted text `#9A7080` was 3.6–4.2:1 → now `#7A5463` (5.8–6.4:1). Gold used as text (2.0:1) → crimson. WhatsApp button 2:1 → WhatsApp teal. | 🔧 |
| 8 | No visible keyboard focus anywhere (`outline-none` everywhere, no `:focus-visible`). Global two-tone focus ring added. | 🔧 |
| 9 | Icon-only / symbol buttons with no accessible name: header Wishlist & Cart, all `−`/`+` quantity buttons, checkout notes, wishlist name input, footer IG/IN/FB. | 🔧 |
| 10 | Promo popup: no `aria-modal`, focus not moved, no Escape. Fixed. Image has `alt=""` though promos usually contain the offer text → add an `alt` field to `PopupAd` + admin form. | 🔧 / ❌ alt |
| 11 | Register: terms error was never rendered (submit silently did nothing when unticked). Fixed. | 🔧 |
| 12 | Contact form fields have placeholder-only labels (fix together with #6). | ❌ |
| 13 | `<Link><Button>` nesting in ~15 places (hero, About, CTA, 404, store pages) — a button inside a link: invalid HTML, two tab stops per action. Give `Button` an `as` prop and render `<Button as={Link} to="…">`. | ❌ |
| 14 | Hero carousel auto-advances every 5 s with no pause (WCAG 2.2.2). Pause on hover/focus and when `prefers-reduced-motion`, or add a pause button. | ❌ |
| 15 | Input/select borders `#E8D5DA` are 1.4:1 (WCAG 1.4.11 wants 3:1 for control boundaries). Use `#A88592` (3.3:1) on form controls only, leaving panel borders alone. | ❌ |
| 16 | Desktop nav dropdowns open on hover only; password show/hide toggle has `tabIndex={-1}`. | ❌ |
| 16b | Register/login errors show raw Zod text ("Too small: expected string to have >=2 characters"). Add human messages in `client/src/utils/validators.js`, e.g. `z.string().min(2, 'Enter your city')`. | ❌ |

### P2 — privacy hygiene & copy

| # | Action | Status |
|---|--------|--------|
| 17 | Register consent now links T&C + Privacy, discloses email/WhatsApp order messages, and the API **rejects signups without consent and stores `termsAcceptedAt`** (DPDP s.6(10) proof of consent). | 🔧 |
| 18 | Replace the Google Maps `<iframe>` on /contact with an "Open in Google Maps" link. It is the only third party that sets cookies — removing it means **no cookie banner is needed**. | ❌ |
| 19 | No way to delete an account (DPDP right to erasure). Minimum: state "email us to delete" in the policy; later add an admin "delete user" action. Also define retention for rejected (Inactive) signups. | ❌ |
| 20 | Every signup is stored with `kycDocuments: ['GST Certificate']` although nothing is uploaded — an inaccurate record. | ❌ |
| 21 | Order emails are sent from a personal Gmail. Use a domain address (`orders@yourdomain`). Move off `*.vercel.app` to a custom domain — the single biggest trust signal missing. | ❌ |
| 22 | Button copy: CTA "Shop Now" → `/checkout` (empty/login wall) → "Apply for a Trade Account" → `/register`. "Place Order" → "Submit Order Request" (no price shown; T&C say orders are reviewed). Events page title says "Upcoming" over past events. | ❌ |
| 23 | Google Fonts hotlinked (visitor IP to Google on every page; an EU court held this a GDPR breach). Self-host the two families if you sell into the EU. | ❌ low |
| 24 | `companyInfo` (Founded 2007, BIS Hallmarked, IGI Guided Grading) is not rendered but is sent in every `/site/home` response. Delete it or verify it. | ❌ low |

---

## Checklist verdicts

| Item | Verdict | Notes |
|------|---------|-------|
| Colour contrast | 🟡→🔧 | #7, #15 |
| Alt text on images | 🟡 | Products, banners, events, logos all have alt. Category tiles use `alt=""` correctly (link has a text label). Popup promo needs a real alt (#10). |
| Refund policy | ❌ | 3 lines, no timelines/process/refund method. Draft below. |
| Accessibility | 🟡→🔧 | #8–#16 |
| Privacy Policy page | ❌ | Exists at `/privacy-policy` but is not a legally adequate notice. Draft below. |
| Fake/misleading reviews | ❌ | #2 |
| Terms & Conditions | ❌ | 3 lines. Draft below. |
| 3rd-party embeds | 🟡 | Google Maps iframe (#18), Google Fonts (#23), Unsplash / ui-avatars hotlinks (go with #2). WhatsApp is a plain link — fine. |
| Cookies Policy | ❌ | None. Section drafted inside the Privacy Policy below. |
| Tracking/analytics | ✅ | No analytics, pixels or tag managers. Only first-party auth cookies. Adding GA/Meta Pixel later needs prior consent. |
| Form consent | 🟡→🔧 | #17. Newsletter (if wired) needs its own unticked opt-in + unsubscribe. |
| Clear button labels | 🟡 | Icon buttons fixed (#9); dead buttons (#6) and misleading CTAs (#22) remain. |
| Cookie consent | ✅ once #18 is done | Auth cookies and the two localStorage keys are strictly necessary/functional — no banner required. Keep the map iframe or add analytics → you need a blocking consent banner. |
| Real business details | ❌ | #4, #21 |
| Data minimisation | 🟡 | Checkout collects only notes ✅. Signup fields are justified for trade vetting/invoicing but must be explained in the policy. #19, #20, #24. |
| Keyboard-friendly forms | 🟡→🔧 | Auth forms use real labels; custom `Select` has full keyboard support ✅. Focus ring + terms error fixed. #12, #16 remain. |
| Unsupported claims | ❌ | #3, #24, plus "Trusted by premium retail partners" / "Brands that keep coming back" over placeholder data. |

Applicable references: IT Act 2000 s.43A & SPDI Rules 2011; DPDP Act 2023 & DPDP Rules 2025 (phased to 2027);
CCPA Guidelines on Misleading Advertisements & Endorsements 2022; BIS IS 19000:2022 (online reviews);
CCPA Greenwashing Guidelines 2024; WCAG 2.1 AA. B2B buyers purchasing for resale are generally outside the
CPA 2019 "consumer" definition, so the E-Commerce Rules 2020 apply lightly, but the advertising guidelines do not
depend on that.

---

## Business details block (footer + Contact page)

```
[Legal entity name, e.g. DeArte Jewels Pvt. Ltd.]
GSTIN: [..............]   CIN/LLPIN: [if applicable]
Registered office: [full street address, Mumbai, Maharashtra PIN]
Phone: [real number] · Email: [domain email]
Grievance Officer: [Name], [email], responds within 48 hours
```

Pick one brand spelling ("DeArte Jewellery" vs "De Arté" vs `legalName: "DeArte Jewels"` in `index.html`) and one email.

---

## Draft: Privacy Policy (`/privacy-policy`)

**Who we are.** [Legal entity] ("DeArte", "we") operates this trade platform. Contact: [email], [address].

**What we collect and why.**
- *Trade account application* — name, email, mobile, company name, GST number (optional), business address. Used to verify that you are a trade buyer, activate your account, and invoice and deliver orders.
- *Orders and wishlists* — products, sizes, quantities and notes you submit. Used to process and fulfil order requests.
- *Account security* — a hashed password (we never see it) and session tokens.
- *Messages you send us* — by email or WhatsApp.

We do not collect payment card details on this site and we do not sell your data.

**Who we share it with.** Only processors that help us run the service: Vercel (hosting), MongoDB (database), Cloudinary (product images), Meta Platforms (WhatsApp order confirmations to the number you gave us), Google (email delivery[, map on the Contact page]). Our staff access buyer data only to manage accounts and orders. We may disclose data where required by law.

**How long we keep it.** Active accounts: while the account is open. Order records: [8] years for tax/accounting. Rejected applications: deleted after [90] days.

**Your rights.** You can access, correct or delete your data, withdraw consent, and nominate someone to act for you, by emailing [Grievance Officer email]. We reply within [30] days. If you are not satisfied you may complain to the Data Protection Board of India.

**Security.** Passwords are hashed with bcrypt; sessions use secure, HTTP-only cookies; data is sent over HTTPS.

**Cookies and local storage.** We use only what the site needs to work:

| Name | Type | Purpose | Lasts |
|------|------|---------|-------|
| `dearte_access` | Cookie (HTTP-only) | Keeps you signed in | Short-lived, refreshed automatically |
| `dearte_refresh` | Cookie (HTTP-only) | Renews your session | 14 days |
| `dearte:sessionExpiresAt` | Local storage | Knows when to renew your session | Until sign-out |
| `dearte-popup-<id>` | Local/session storage | Stops a promotion re-appearing | 1 day / browser session |

We use no analytics or advertising cookies. [If the Google Maps embed is kept: the map on the Contact page is provided by Google, which may set its own cookies.]

**Changes.** We will post updates here with a new "last updated" date. Last updated: [date].

---

## Draft: Terms & Conditions (`/terms`)

1. **Who can use this site.** Access is for registered businesses buying for resale, approved by us. We may refuse or suspend any account.
2. **Your account.** Keep your login confidential; you are responsible for activity under it. Give us accurate business details.
3. **Order requests.** Submitting an order is a *request*, not a contract. A contract forms only when we confirm the order, price and delivery date in writing (email or WhatsApp).
4. **Prices and payment.** Prices are quoted per order and are exclusive of GST unless stated. Payment terms are set out in the order confirmation.
5. **Product information.** Diamond and gold weights shown are approximate and may vary within industry tolerances; the confirmed order and invoice govern. Images are representative.
6. **Delivery and risk.** Risk passes to you on delivery to the address in your account. Inspect parcels on receipt and report transit damage within 48 hours.
7. **Returns.** See the Return & Refund Policy.
8. **Private catalogues and content.** Catalogues, designs, images and prices shared with you are confidential and our intellectual property. Do not share them or reproduce the designs without written permission.
9. **Liability.** To the extent the law allows, our total liability for any order is limited to the amount paid for that order. We are not liable for indirect losses or loss of profit.
10. **Governing law.** Indian law; courts at Mumbai have exclusive jurisdiction.
11. **Contact and grievances.** [Grievance Officer, email, address].

---

## Draft: Return & Refund Policy (`/return-policy`)

**Report within 48 hours.** Contact your sales representative or [email] within 48 hours of delivery, with your order ID and photos of the item and packaging.

**What we accept.**
- *Manufacturing defect or wrong item* — replaced, repaired or refunded at our cost, including shipping.
- *Transit damage* — reported within 48 hours with unboxing photos.
- *Change of mind on stock items* — accepted within [7] days in unused, original condition with tags and certificates, subject to a [x]% restocking fee. Return shipping and insurance at your cost.

**What we don't accept.** Make-to-order, resized, engraved or custom pieces, except for a confirmed manufacturing defect. Items that have been worn, altered or damaged after delivery.

**Process.** We issue a return authorisation number. Ship the item insured using the method we specify. We inspect within [5] working days of receipt.

**Refunds.** Approved refunds go back via the original payment method, or as a credit note if you prefer, within [7] working days of approval. GST is adjusted by credit note.

---

## Draft: About page — replacement for the stats row

Swap the four numbers for facts you can prove, or delete the row. For example:

| Label | Value |
|-------|-------|
| Based in | Mumbai |
| Diamond quality | VVS–VS, EF |
| Metals | 9K / 14K / 18K gold, platinum |
| Made to order | Yes |

Keep "traceable materials" / "responsible growth" / "ethical sources" copy only if you can show supplier documentation on request. Otherwise use neutral wording such as "Lab-grown diamonds set in hallmarked gold" (only if hallmarked).
