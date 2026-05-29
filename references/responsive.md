---
title: Responsive Layout
purpose: Framework-agnostic guidance on layouts that hold across viewports, orientations, themes, zoom levels, and modern form factors. Covers breakpoints, container queries, fluid units, safe areas, subgrid, has() patterns, scrollbar-gutter, and foldables.
load-when:
  task-keywords: [responsive, breakpoint, mobile, tablet, desktop, container query, viewport, safe area, dvh, srcset, fluid typography, subgrid, scrollbar-gutter]
  symptoms: [horizontal scroll, viewport overflow, scroll lock side shift, iOS 100vh, broken on Safari, rubber-band scroll]
prereq: SKILL.md
related: [ui-ux.md, design.md, accessibility.md, performance.md]
size: ~620 lines
---

# Responsive Layout

Framework-agnostic guidance on building layouts that work across the full range of devices, from 320px phones to 4K displays, in portrait and landscape, with light and dark themes, with system text scaling, and with browser zoom.

## Mobile-First

Always design and code mobile first.

- Mobile constraints (small viewport, touch input, slow network, limited CPU) force the right tradeoffs.
- Adding desktop affordances on top of mobile is easier than stripping mobile complexity from a desktop-first design.
- Most users are mobile. Treating mobile as an afterthought is treating users as an afterthought.

CSS pattern:

```css
/* Default styles target mobile */
.nav {
  padding: 12px;
  flex-direction: column;
}

/* Min-width media queries layer up */
@media (min-width: 768px) {
  .nav {
    padding: 16px 24px;
    flex-direction: row;
  }
}
```

Avoid `max-width` queries layered downward; they invert the natural flow.

### The mobile nav must survive without JavaScript

A common pattern hides the desktop nav on small screens with CSS and replaces it with a JS-driven menu (a disclosure, an island, or a component hydrated only at a mobile breakpoint). This is good for performance, but it has a trap: the menu's links do not exist in the static HTML until the JavaScript hydrates. With JS disabled, slow, or failed, a phone has a logo and nothing to navigate with.

- Ship a `<noscript>` fallback nav (a plain `<nav>` of the same links, shown only on small screens) so the site is navigable without JavaScript:

```html
<noscript>
  <!-- shown only on small screens; the JS menu replaces it when hydrated -->
  <nav aria-label="Primary" class="mobile-only">
    <ul><li><a href="/a">A</a></li><li><a href="/b">B</a></li></ul>
  </nav>
</noscript>
```

- Or render the links in static HTML always and let the JavaScript progressively enhance them into a toggle.
- Keep the performance-minded hydration directive (load the menu JS only on small screens). The point is that the LINKS exist without JS, not that the enhanced interaction does.
- The check: load any page with JavaScript disabled at a phone width. Every primary nav destination must be reachable.

## Breakpoints

Pick a small, consistent set. Common scales:

| Breakpoint | Pixel | Targets |
|-----------|-------|---------|
| (default) | < 640px | Phones |
| `sm` | 640px | Large phones, small tablets |
| `md` | 768px | Tablets portrait |
| `lg` | 1024px | Tablets landscape, small laptops |
| `xl` | 1280px | Laptops, desktops |
| `2xl` | 1536px | Large desktops |
| `3xl` (optional) | 1920px | Very large displays |

Tailwind's defaults match this. Custom breakpoints should be deliberate.

Don't add a breakpoint per device. Three or four well-chosen breakpoints handle every reasonable layout.

## Canonical Audit Capture Viewports

For multi-page polish work, two specific viewport sizes are the canonical capture targets. They are the sizes used by the screenshot loop and the geometry sweep.

| Role | Width x Height | Notes |
|------|----------------|-------|
| Desktop audit | `1440x900` | Common laptop and external display proxy; wide enough to see desktop nav, narrow enough to catch hero overflow |
| Mobile audit | `375x812` | iPhone-class viewport; small enough to expose mobile drawer, drift, and touch-target failures |

Both sizes are required for any cross-page audit. See [audit-workflow.md](audit-workflow.md) Phase 4 for the capture procedure and [defects.md](defects.md) for the geometry sweep that runs at both sizes.

## Container Queries

Container queries (`@container`) let components respond to their container, not the viewport. Use when the same component appears in different layouts:

```css
.card {
  container-type: inline-size;
  container-name: card;
}

@container card (min-width: 400px) {
  .card-body {
    flex-direction: row;
  }
}
```

When to use:

- A card that's full-width on mobile and a 1/3 column on desktop, where its internal layout should respond to its width, not the viewport.
- Reusable components that appear in sidebars, modals, and main content.

When NOT to use:

- Top-level page layout. Viewport queries are simpler and more universally supported.

### Style queries: `@container style(...)`

Style queries let a descendant respond to a custom property declared on the container, not to its size. Use them to express conditional styling based on theme, density, or any container-scoped state.

```css
.card { container-name: card; --theme: light; }
.card.dark { --theme: dark; }

@container card style(--theme: dark) {
  .card-title { color: var(--color-foreground-on-dark); }
}
```

This eliminates the need for nested theme-class selectors throughout components. The component reads the theme from its container, and the container declares it once. Use for theme propagation, density modes (`--density: compact`), brand variants, anywhere a single conditional re-styles a component subtree.

### `@container scroll-state` (sticky-aware styling)

When an element is `position: sticky`, there is no native CSS to ask "am I currently stuck?". `@container scroll-state(stuck: top)` answers that question, letting you style the sticky element differently the moment it pins.

```css
.sticky-header {
  position: sticky; top: 0;
  container-type: scroll-state;
  background: transparent;
  transition: background 200ms ease-out;
}

@container scroll-state(stuck: top) {
  .sticky-header { background: var(--color-surface); box-shadow: var(--shadow-sm); }
}
```

Use for headers that go opaque when pinned, side nav items that gain emphasis when stuck, table headers that shadow when separated from rows. This replaces the JS `IntersectionObserver` with a sentinel that everyone used to write. Support is rolling out; `IntersectionObserver` remains the fallback.

## `:has()` Cookbook

`:has()` (Baseline 2023; broad support across Chrome, Safari, Firefox) is the parent selector CSS lacked for two decades. It lets a parent style itself based on the state or presence of its descendants. Treat it as the standard tool for parent-state styling, not an experimental flourish.

Canonical patterns:

- **Component variant by child presence.** Style a card differently when it has an image.

```css
.card { padding: var(--space-4); }
.card:has(img) { padding: 0; } /* the image fills the top */
```

- **Form-level invalid state.** Style the whole form when any field is invalid, without a JS class toggle.

```css
.form:has(:invalid) { border-color: var(--color-danger); }
.form:has(:invalid) .submit-btn { opacity: 0.6; pointer-events: none; }
```

- **Layout shifts based on child count.** A nav that becomes vertical when it has more than five items.

```css
.menu:has(> :nth-child(6)) { flex-direction: column; }
```

- **Container-relative state.** A card that lifts when any descendant button is hovered.

```css
.card:has(button:hover) { transform: translateY(-2px); }
```

- **Empty-state styling.** A list that styles its empty state without a special class.

```css
.list:not(:has(li)) { display: grid; place-items: center; min-height: 200px; }
```

Rules:

- `:has()` is computed at every style recalculation; do not chain deep `:has(.a:has(.b:has(.c)))` expressions in heavy lists. The performance cost is real but rarely measurable for the patterns above.
- Use `:has()` to replace ad-hoc class toggles your JS used to manage. Fewer event listeners, fewer race conditions, less hydration cost.
- The polyfill is JavaScript that re-runs on every DOM change; do not ship it. Treat `:has()` as the modern path and let unsupported browsers degrade to the unstyled state.

## Fluid Typography

Use `clamp()` to scale type smoothly between breakpoints rather than stepping at fixed media queries:

```css
.h1 {
  font-size: clamp(2rem, 1.5rem + 2.5vw, 4rem);
  /* min 32px, max 64px, scales with viewport between */
}
```

Format: `clamp(min, preferred, max)`. The preferred value should reach the min at the smallest viewport you support and the max at the largest.

For vertical rhythm, also use clamp on `line-height` if needed, though usually keeping `line-height` as a unitless multiplier (`line-height: 1.2`) handles fluid scaling automatically.

## Viewport Units

| Unit | Meaning |
|------|--------|
| `vw` / `vh` | 1% of viewport width/height (legacy, includes browser chrome on mobile) |
| `dvw` / `dvh` | Dynamic viewport (changes as browser chrome shows/hides). Use for full-height mobile layouts. |
| `svw` / `svh` | Small viewport (smallest possible, browser chrome visible) |
| `lvw` / `lvh` | Large viewport (largest possible, browser chrome hidden) |
| `cqw` / `cqh` | Container query units |

For full-height mobile heroes, use `min-height: 100dvh` (not `100vh`). `100vh` overflows on iOS Safari when the address bar is showing.

## Safe Areas

Modern phones have notches, dynamic islands, gesture bars, and home indicators. Respect them.

```css
.fixed-bottom-bar {
  padding-bottom: max(16px, env(safe-area-inset-bottom));
}

.fixed-top-bar {
  padding-top: max(16px, env(safe-area-inset-top));
}
```

In your viewport meta:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

The `viewport-fit=cover` is required for `env(safe-area-inset-*)` to work properly.

## Logical Properties

For RTL support, use logical properties instead of physical:

| Physical | Logical |
|---------|---------|
| `margin-left` | `margin-inline-start` |
| `margin-right` | `margin-inline-end` |
| `padding-top` | `padding-block-start` |
| `padding-bottom` | `padding-block-end` |
| `text-align: left` | `text-align: start` |
| `text-align: right` | `text-align: end` |
| `border-left` | `border-inline-start` |
| `width` | `inline-size` |
| `height` | `block-size` |

When `<html dir="rtl">`, logical properties automatically flip. Physical properties don't.

## Layout Primitives

Build layouts from a small set of primitives:

### Stack

Vertical layout with consistent gap.

```css
.stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
```

### Cluster

Horizontal layout, wraps to multiple lines if needed, consistent gap.

```css
.cluster {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
}
```

### Sidebar

Two-column layout where one column is fixed-width and the other flexes.

```css
.with-sidebar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-6);
}

.with-sidebar > .sidebar {
  flex-basis: 280px;
  flex-grow: 1;
}

.with-sidebar > .main {
  flex-basis: 0;
  flex-grow: 999;
  min-inline-size: 50%;
}
```

### Switcher

Multi-column layout that becomes a stack below a threshold.

```css
.switcher {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
}

.switcher > * {
  flex-grow: 1;
  flex-basis: calc((600px - 100%) * 999);
}
```

When the container drops below 600px, items stack.

### Center

Center an element with optional max-width.

```css
.center {
  box-sizing: content-box;
  max-inline-size: 65ch;
  margin-inline: auto;
  padding-inline: var(--space-4);
}
```

### Cover

Fill the available space with header, centered content, footer.

```css
.cover {
  display: flex;
  flex-direction: column;
  min-block-size: 100dvh;
  padding: var(--space-4);
}

.cover > main {
  margin-block: auto;
}
```

### Frame

A box with a fixed aspect ratio.

```css
.frame {
  aspect-ratio: 16 / 9;
  overflow: hidden;
}

.frame > img,
.frame > video {
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
}
```

### Reel

Horizontal scrolling cluster (carousel without arrows).

```css
.reel {
  display: flex;
  gap: var(--space-4);
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: thin;
}

.reel > * {
  flex: 0 0 auto;
  scroll-snap-align: start;
}
```

### Grid

CSS Grid with auto-fit:

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-4);
}
```

This wraps from 1 column to 2/3/4 columns as the container grows.

### Subgrid

Subgrid (Baseline 2024, Chrome, Safari, Firefox) is the right tool the moment a nested element needs to align to the parent grid's rows or columns. Without subgrid, a card's title, body, and footer cannot align across siblings unless every card has the same content height; with subgrid, they align automatically because they live on the same tracks.

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  grid-template-rows: auto 1fr auto; /* title, body, footer */
  gap: var(--space-4);
}

.card {
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 3;
}

.card-title  { grid-row: 1; }
.card-body   { grid-row: 2; }
.card-footer { grid-row: 3; }
```

The whole row of card titles now share a row track; the whole row of footers share a track. Vertical alignment across cards is automatic. The same pattern works for columns: a form whose labels align across the page even when nested in a field-group wrapper, a magazine layout where a caption column threads through nested editorial blocks.

Use subgrid for:

- Card grids where titles, prices, CTAs must align across rows even with varying body lengths.
- Forms where labels, inputs, and helper text must form three clean columns across nested fieldsets.
- Editorial pages where a sidebar caption column aligns to the body grid.

Anti-pattern: using `subgrid` on a grid that does not need named-area alignment. It is the alignment tool; if the children do not need to align to the parent's tracks, regular grid is simpler.

## Containers and Max Widths

### Page container

Most surfaces benefit from a max content width:

```css
.container {
  max-inline-size: var(--container-width, 1280px);
  margin-inline: auto;
  padding-inline: clamp(16px, 4vw, 48px);
}
```

Common max-widths:

| Width | Use |
|-------|-----|
| 640px | Long-form reading content |
| 768px | Reading with a sidebar |
| 1024px | Routine application UI |
| 1280px | Hero or feature-rich layouts |
| 1440px | Big imagery, generous whitespace |
| 1600px | Wide screens, data-heavy surfaces |

Don't go full-width on huge displays. Lines longer than ~75 characters become hard to read.

### Reading containers

For prose, set `max-inline-size: 65ch` to constrain line length.

## Animating Intrinsic Sizes

### `interpolate-size` and `calc-size()` with `height: auto`

Animating to and from `height: auto` was impossible in CSS for two decades; teams wrote JavaScript that pre-measured the open height, applied it in a `max-height` transition, then cleared it on `transitionend`. That code is the cause of every accordion that flashes, jumps, or measures the wrong height after content loads.

`interpolate-size: allow-keywords` (Baseline 2026, Chrome shipping) lets the browser interpolate intrinsic-size keywords like `auto`, `min-content`, and `max-content`. The animation just works:

```css
:root { interpolate-size: allow-keywords; }

.accordion-body {
  height: 0;
  overflow: hidden;
  transition: height 250ms ease-out;
}

.accordion-body[data-open] {
  height: auto;
}
```

`calc-size()` extends this for arithmetic on the intrinsic value: `height: calc-size(auto, size + 16px)` animates to the content's natural height plus padding.

Reduced-motion fallback:

```css
@media (prefers-reduced-motion: reduce) {
  .accordion-body { transition: none; }
}
```

For older browsers without `interpolate-size`, the accordion snaps open instantly. That is a clean degradation. Reach for the JS pre-measure pattern only when you must support a browser floor that excludes Chrome stable.

## Scrollbars

### `scrollbar-gutter: stable` (the modal-shift fix)

The classic "page jumps sideways when a modal opens" bug comes from the vertical scrollbar disappearing as the body scroll lock takes effect. The page widens by the scrollbar's width, and every fixed and centered element jumps. The traditional fix is to compute the scrollbar width and apply matching padding-right to the body on lock.

`scrollbar-gutter: stable` (Baseline 2024) replaces that JS dance with a single declaration: the browser reserves space for the scrollbar even when no scrollbar is visible. The gutter is always present, so removing the scrollbar (when scroll is locked, when content shrinks, when an overlay scrollbar fades out) no longer reflows the page.

```css
:root {
  scrollbar-gutter: stable;
}
```

Apply at the document root for the global benefit (modals, drawers, dialogs all stop shifting). Apply on individual scroll containers where you want the same stability for the same reason. On overlay-scrollbar systems (macOS default, mobile), the gutter is 0px and nothing changes; the rule is safe everywhere.

For dual-side stability (when you want symmetry on a centered layout), `scrollbar-gutter: stable both-edges` reserves the gutter on both sides.

## Horizontal Scroll: Forbidden

The single most common responsive bug: horizontal scroll on mobile.

Causes:

- Fixed-pixel widths exceeding viewport (`width: 1200px` on a 375px screen).
- Long unbreakable text (URLs, code, words in CJK).
- Images without `max-width: 100%`.
- Tables without overflow handling.
- Sidebars that don't collapse.

Fixes:

- Use `max-inline-size: 100%` (or `max-width: 100%` for non-RTL contexts) on images and embeds.
- Use `overflow-wrap: break-word` and `word-break: break-word` for long strings.
- Use `<div style="overflow-x: auto">` to wrap wide tables.
- Make sidebars collapse at small breakpoints.

Test: at 320px width, scroll horizontally; if you can, fix it.

## Accessibility at Different Viewports

WCAG 1.4.10 (Reflow): content must be usable at 320 CSS pixels wide without horizontal scroll.

WCAG 1.4.4 (Resize Text): content must be usable at 200% browser zoom without loss of functionality.

Test:

- Resize the browser to 320px wide.
- Set browser zoom to 200%.
- Set OS text size to largest.

If the layout breaks, fix it.

## Orientation

Some users hold phones in landscape. Don't lock layout to portrait.

- Don't assume landscape phones have a tablet-class screen height (they're short).
- For full-screen forms or inputs, support both orientations.
- Test landscape mode on an actual phone.

### Foldables and `device-posture`

Foldable phones (Galaxy Z Fold, Pixel Fold, Surface Duo) introduce a posture dimension that orientation alone does not capture: folded (single screen), unfolded (a single wide screen with a hinge gap), and book / tabletop modes (two halves at an angle). `viewport-fit=cover` on the viewport meta is required so layout can reach the seam and the safe-area insets work; the `device-posture` media query and the `screen.fold` API (where supported) let layout adapt to the hinge.

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

```css
@media (device-posture: folded) {
  .reader { columns: 1; padding-inline: var(--space-4); }
}

@media (device-posture: continuous) {
  .reader { columns: 2; column-gap: var(--space-8); }
}
```

For most product surfaces, foldable support is one breakpoint test (does the layout look right at 600 to 800px unfolded?) and a viewport meta. Reach for `device-posture` only when the seam genuinely changes the design (a reading app that splits across pages, a map app that uses one half for the map and one for controls). Support is partial; treat as progressive enhancement.

## Dynamic Type / Font Scaling

iOS and Android both support system-wide font scaling for accessibility. Web should respect browser zoom (which scales `rem`) and the system text size where exposed.

```css
/* Use rem for font-size so user agent text scaling works */
body {
  font-size: 1rem;  /* defaults to 16px, scales with user prefs */
}

h1 {
  font-size: 2.5rem;  /* scales proportionally */
}
```

Avoid `px` for font sizes. Use `rem` everywhere except where pixel-perfect rendering matters (logos, single-line UI labels).

## Reduced Motion

Respect `prefers-reduced-motion`. See [motion.md](motion.md).

## Reduced Data

```css
@media (prefers-reduced-data: reduce) {
  /* Skip non-essential animations, replace videos with posters, lower image quality */
}
```

Not yet widely supported, but adding the rule costs nothing.

## High Contrast

```css
@media (prefers-contrast: more) {
  /* Bump border weights, increase contrast, simplify backgrounds */
  :root {
    --color-border: var(--color-foreground);
  }
}
```

## Color Scheme

```css
@media (prefers-color-scheme: dark) {
  :root {
    /* Dark mode tokens */
  }
}
```

Or explicitly with a `[data-theme="dark"]` selector for user-controlled toggle.

Use `color-scheme` to opt in to native UA dark mode controls (scrollbars, form controls):

```css
:root { color-scheme: light dark; }
[data-theme="light"] { color-scheme: light; }
[data-theme="dark"] { color-scheme: dark; }
```

## Print

Content-rich surfaces may be printed. Add a minimal print stylesheet:

```css
@media print {
  nav, footer, .no-print { display: none; }
  body { font-size: 12pt; color: black; background: white; }
  a { color: black; text-decoration: underline; }
  a[href]::after { content: " (" attr(href) ")"; }
}
```

## Touch and Pointer

Different input modalities have different needs:

```css
/* Hover-capable pointer */
@media (hover: hover) and (pointer: fine) {
  .card:hover { transform: translateY(-2px); }
}

/* Touch-only */
@media (hover: none) and (pointer: coarse) {
  /* Larger hit targets, no hover-only affordances */
  .icon-btn { padding: 12px; }
}
```

Pointer types:

- `fine`: mouse, trackpad, stylus.
- `coarse`: touch.
- `hover` capability indicates the device can hover (hover-on-hold for touch is not real hover).

## Common Responsive Mistakes

- One desktop-first stylesheet with `max-width` overrides that pile up.
- Fixed-pixel widths (`width: 1200px`) on containers.
- Images without `max-width: 100%`.
- Tables without horizontal scroll.
- Sidebars that don't collapse.
- Hero text that's readable on desktop and a wall of words on mobile.
- Buttons that are tiny on mobile.
- Inputs that auto-zoom on iOS because text size is below 16px.
- A `100vh` hero that overflows on iOS Safari.
- A surface that requires scrolling 12 screens on mobile while only 2 screens on desktop.
- Padding that's too tight on mobile (cramping content) or too generous on mobile (wasting space).
- Font that's too big on mobile (5 words per line) or too small (10pt body).

## Self-Healing for Responsive

Before declaring work complete:

- [ ] Tested at 320px, 375px, 768px, 1024px, 1280px, 1920px
- [ ] Tested in portrait and landscape on a phone
- [ ] No horizontal scroll at any width
- [ ] Body text >= 16px on mobile
- [ ] Touch targets >= 44x44 with 8px gaps
- [ ] All images, videos, iframes have max-width: 100%
- [ ] Long tables have horizontal scroll
- [ ] Sidebar collapses on small screens
- [ ] Modals fit smallest viewport
- [ ] 200% browser zoom: layout intact
- [ ] System text size at largest: layout intact
- [ ] Safe area respected on notched/island devices
- [ ] `100dvh` instead of `100vh` for full-height mobile
- [ ] Works at `prefers-reduced-motion: reduce`
- [ ] Works at `prefers-color-scheme: dark`
- [ ] Tested with keyboard only

## See Also

- [ui-ux.md](ui-ux.md) for the functional spacing/layout rules
- [design.md](design.md) for visual rhythm and grids
- [accessibility.md](accessibility.md) for accessible scaling
