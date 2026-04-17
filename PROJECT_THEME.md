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
