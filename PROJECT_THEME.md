# De Arté Jewels — Brand Theme & Design System

## Core Philosophy
Restrained, editorial luxury. Maximum 10 colour variables. No contrasting external colours. Sharp 90° geometry everywhere. Inspired by the visual discipline of Diamonds Factory, Sacet, and Austen Blake.

---

## Colour Palette (10 Variables)

### Surfaces & Backgrounds
| Token | Hex | Purpose |
|---|---|---|
| `--color-primary-bg` | `#FAF0F3` | Page background (Pearl White) |
| `--color-surface` | `#FFFFFF` | Cards, panels, elevated surfaces |
| `--color-surface-alt` | `#F5ECF0` | Alternate section backgrounds |

### Brand
| Token | Hex | Purpose |
|---|---|---|
| `--color-primary` | `#6B0F2E` | Primary CTA, headings, hero sections (Deep Crimson) |
| `--color-primary-hover` | `#8B1A3A` | Hover state for primary (Rich Burgundy) |
| `--color-accent` | `#D4A82A` | Sparse metallic accent — gold dividers, active dots, stars |

### Text
| Token | Hex | Purpose |
|---|---|---|
| `--color-text` | `#3A1A28` | Body text — warm dark tone derived from crimson |
| `--color-text-muted` | `#9A7080` | Secondary text, placeholders, captions, labels |

### Borders
| Token | Hex | Purpose |
|---|---|---|
| `--color-border` | `#E8D5DA` | Default borders — soft rose-tinted gray |
| `--color-border-active` | `#6B0F2E` | Active/focus borders = primary |

---

## Aesthetic Rules

- **Perfect Geometry:** Zero rounded borders anywhere. No `rounded-*` utilities.
- **Sharp Borders:** 1px solid borders preferred. No 0.5px.
- **Shadows:** Extremely subtle, tinted with Deep Crimson `rgba(107, 15, 46, 0.06)`.
- **Whitespace:** Generous padding. Sections use 5rem padding-block.
- **Typography:** `Cormorant Garamond` (serif) for headings. `Jost` (sans-serif) for body/labels.
- **Label Style:** Uppercase, wide tracking (0.14em), small font, `text-muted` colour.
- **Consistency:** Only use these 10 tokens. Never introduce `red-500`, `emerald-100`, or any external Tailwind colours.

---

## Button Variants
| Variant | Background | Text | Hover |
|---|---|---|---|
| `primary` | `--color-primary` | white | `--color-primary-hover` |
| `secondary` | `--color-surface-alt` | `--color-primary` | `--color-border` |
| `ghost` | transparent | `--color-primary` | `--color-surface-alt` |
| `link` | none | `--color-primary` | underline |
| `danger` | `--color-primary` | white | `--color-primary-hover` |

---

## Dark-on-Dark Pattern (Footer, Auth Shell, CTA Banner)
When the background is `--color-primary`:
- Text uses `white/60` to `white/80`
- Labels use `--color-accent`
- Borders use `white/15` to `white/20`
- Inputs use `white/40` placeholder, `--color-accent` focus

---

## Motion & Light System (Cinematic Layer)

The 10 core colour tokens are unchanged. The cinematic layer adds
**derived** tokens in `client/src/index.css` — every gradient/scrim is mixed
from the existing brand colours. Never introduce new raw hex values in
components; extend the tokens instead.

### Motion Tokens
| Token | Value | Purpose |
|---|---|---|
| `--ease-lux` | `cubic-bezier(0.22, 1, 0.36, 1)` | Default ease-out for reveals/hovers — confident, never bouncy |
| `--ease-cinema` | `cubic-bezier(0.33, 0, 0.15, 1)` | Slow cinematic drift (Ken Burns, crossfades, sweep) |
| `--dur-quick` | `300ms` | Micro-interactions (colour, icon nudges) |
| `--dur-reveal` | `700ms` | Scroll reveals |
| `--dur-slow` | `1400ms` | Hero crossfade and other slow moments |

### Light & Depth Tokens
| Token | Purpose |
|---|---|
| `--gold-hairline` | Gold hairline gradient (rules, draw-in underlines) |
| `--gold-sheen` | The single "facet shimmer" sweep gradient |
| `--scrim-hero` | Multi-stop crimson-to-transparent hero scrim (left-weighted) |
| `--scrim-photo` | Bottom photo scrim for white-on-image labels |
| `--scrim-veil` | Modal/backdrop veil (popup promo) |
| `--glow-crimson` | Radial burgundy depth for crimson fields (CTA banner) |
| `--glass-surface` | Frosted surface value (header treatment) |
| `--shadow-lifted` | Hover-elevation shadow, crimson-tinted |

### Utilities & Primitives
- `.reveal` / `.is-visible` + `<Reveal>` (`components/ui/motion.jsx`) —
  rise-and-fade on scroll via IntersectionObserver; stagger with the `delay`
  prop (`--reveal-delay`). Purely presentational; accepts `as` for the tag.
- `<Parallax speed={0.05–0.15}>` — gentle scroll drift, rAF-throttled.
- `.gold-hairline` — 1px gold rule; size with `w-*`.
- `.hairline-draw` — gold underline that draws in on hover (own or `.group`).
- `.light-sweep` — the one sparkle motif. **Hero and CTA banner only.**
- `.scrim-hero`, `.scrim-photo`, `.cta-glow`, `.hero-copy` — scrim/glow helpers.
- `.animate-ken-burns`, `.hero-slide`, `.animate-hero-line`,
  `.animate-slide-progress` — hero choreography (crossfade, staggered copy
  entrances via `--line-delay`, 5s gold progress indicators).
- `.snap-rail` — `scroll-snap-type: x proximity` for horizontal rails
  (pair children with `snap-start`).

### Motion Rules
- Animate **transform/opacity only** — never layout properties.
- Everything falls back to a static, fully-visible render under
  `prefers-reduced-motion: reduce` (CSS media query + JS `matchMedia` in the
  motion primitives).
- Reveal travel is 20px max; hover lifts are 4px max; one sweep motif per view.

### Geometry Ruling
Razor-sharp everywhere, **zero exceptions**: avatars, brand logos and metal
swatches are square. (The WhatsApp float is the one legacy circle left —
scheduled to be squared in the global-chrome pass.) The off-brand navy
`#002130` has been removed; the category showcase and diamond icon now use
`--color-accent` / `lux-heading` crimson.
