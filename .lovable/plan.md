# Redesign: "What We Shop" Section — Phase 1 Proposal

Planning only. No code, asset, or data changes until approved.

## 1. Problems with the current design

- **Five squeezed columns on desktop** (`xl:grid-cols-5`): cards become narrow strips, text wraps awkwardly, and the row looks template-like.
- **Text overlay on images**: titles/descriptions sit on a dark gradient over the photo, which reads as generic and hurts legibility on busy images.
- **AI-generated imagery**: the five 1920×1920 images include fake Tabedaar-branded staff, uniforms and packaging — exactly the "artificial" look to remove.
- **Oversized styling**: `rounded-3xl` corners, heavy hover lift (-8px) and large shadows feel inflated rather than premium.
- **No call to action per card**: the whole card is clickable but nothing says so — no "Shop Now" affordance.
- **Excess whitespace on mobile**: `py-20` section padding plus tall cards create long empty stretches.

## 2. Proposed desktop layout (≥1024px)

- Three-column grid, consistent card width, generous gutters (24–32px).
- Row 1: Fashion & Clothing, Gifting & Personal Items, Food Delivery.
- Row 2: Groceries and Anything Else, centered (grid with the last two cards spanning centered columns).
- All cards identical dimensions; images share one aspect ratio (4:3).

## 3. Proposed mobile / tablet layout

- Tablet (640–1023px): two-column grid, last card full-width or left-aligned in row 3.
- Mobile (<640px): single column, reduced section padding (`py-12` instead of `py-20`), 16px card gaps, no horizontal scroll, headings/descriptions stay at readable sizes.

## 4. Redesigned category card

- **Structure**: image on top (4:3, `object-cover`), clean white content area below — no text overlay.
- **Content area**: small orange category icon (existing Lucide icons: Shirt, Gift, UtensilsCrossed, Apple, Package) in a soft orange-tinted circle, navy title, one-line muted description, and an understated "Shop Now →" link in orange.
- **Styling**: `rounded-2xl` (not 3xl), thin border (`border-border/60`), subtle shadow, hover = slight lift (-4px) + mild image zoom (scale-105) + arrow nudge. No gradients, no glow.
- Whole card remains clickable, preserving current behavior.

## 5. Image replacements

Replace all five AI-generated images with realistic commercial-style photography (no fake Tabedaar staff, uniforms, or branded packaging):

| Category | Subject | Dimensions |
|---|---|---|
| Fashion & Clothing | Clothing rack / folded garments in a boutique | 1200×900 (4:3) |
| Gifting & Personal Items | Wrapped gift boxes, ribbon, warm light | 1200×900 |
| Food Delivery | Restaurant meal being packed / plated dishes | 1200×900 |
| Groceries | Fresh produce and staples in a basket | 1200×900 |
| Anything Else | Mixed parcels / electronics / household items | 1200×900 |

Images will be generated as photorealistic stock-style photography (no text, no logos, no people in branded clothing), saved as optimized JPGs (~150–250KB each), lazy-loaded as today.

## 6. Typography, spacing, color

- Keep heading "What We Shop"; polish the subheading to: *"From everyday essentials to special gifts — shopped and delivered for you."*
- Titles: existing font, `text-lg font-bold` navy (`text-foreground`); descriptions `text-sm text-muted-foreground`.
- Colors stay on brand tokens: navy `#0d1e4a`, orange `#f15717` (icons + Shop Now link only), white cards on the existing background.
- Section padding: `py-12` mobile / `py-20` desktop; card gap 24px.

## 7. Trust strip (recommended)

Add a slim four-item strip below the grid, separated by a soft divider — it fits naturally and reinforces the premium feel:
- Trusted Personal Shopping · Delivery Worldwide · Shop from Lahore · Dedicated Customer Support

Small orange icons + short labels, single row on desktop, 2×2 on mobile.

## 8. Files to modify

- `src/pages/Home.tsx` — section markup, grid classes, card structure, trust strip (category data and `handleCategoryClick` routing reused unchanged).
- `src/assets/category-*.jpg` — five replacement images.
- Possibly `src/index.css` — one small card style adjustment (or done inline with existing tokens).

No other sections, routes, or functionality touched. Click behavior (place-order for signed-in users, signup otherwise) is preserved exactly.

## 9. Performance & SEO impact

- Positive: smaller images (1200×900 vs 1920×1920), same lazy-loading, fewer paint-heavy overlays.
- SEO: heading text moves from image overlay into real card content — better crawlability; alt texts retained. No negative impact expected.

## Approval gate

Nothing will be implemented until you approve. Tell me any revisions (layout, imagery style, trust strip in/out) and I'll update the plan.
