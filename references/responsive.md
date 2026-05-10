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
