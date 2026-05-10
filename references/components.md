# Component Discipline

Framework-agnostic guidance on standardizing repeated widgets across pages, defining component contracts, and detecting drift before it ships. Polishing each instance separately is not enough: same-purpose widgets must follow one canonical visual and content contract.

## Terms

The rest of this file (and [audit-workflow.md](audit-workflow.md) and [defects.md](defects.md)) uses these terms with the meanings below. Pin them down before reading further.

- **Widget family**: a group of repeated UI elements that serve the same role across pages, e.g. all feature cards, all CTA bands, all hero variants. See the 11-family table below.
- **Canonical contract**: the single, authoritative visual and content specification for a widget family. Names the required and optional content fields, the allowed variants, the CSS properties that are part of the family (padding, radius, shadow, etc.), and the states (hover, focus, active, disabled, loading). A component is not done until the contract is documented and every instance matches it.
- **Named variant**: an intentional, documented variation of a component with a clear purpose, exposed through one prop, one class, or one data attribute (e.g., `card--feature`, `card--integration`, `card--pricing`). Variants are part of the contract; ad hoc class combinations are not variants, they are drift.
- **Drift**: a repeated widget that looks or behaves differently across pages without a named variant. Drift indicates a missing component abstraction or an incomplete variant set. Detected by visual comparison and by the drift collector (below).
- **Drift collector**: a browser-automation script that reads computed styles and bounding boxes for every member of a family across every audited route, then flags any difference not explained by a named variant.

## When to Extract

Extraction turns repeated markup into a single source of truth. Extract when any of these hold:

- The same structure appears three or more times across routes.
- The same structure appears twice with clear future reuse.
- Duplicated markup is causing visible drift (different padding, radius, typography, or hover behavior on instances that should look identical).

Do not extract when:

- The local stack has no include or component mechanism and adding one would add build complexity out of proportion to the benefit. Normalize markup and class names instead.
- The two instances look similar but serve genuinely different semantic purposes. Build them as named variants rather than forcing one component to flex.

The principle expressed as a check: a repeated widget either has one source of truth or has a documented, named variant. There is no third option.

## The 11 Widget Families

Every multi-page polish pass starts by inventorying these families. For each family the inventory must record: routes where it appears, source (template or component or duplicated markup), required and optional content fields, allowed variants, and the canonical visual contract (spacing, typography, border, radius, shadow, color, icon placement, image ratio, CTA behavior, focus ring, hover behavior, responsive behavior).

| Family | Members | Standardization criteria |
|--------|---------|--------------------------|
| Global shell | Header, primary nav, dropdowns, mobile drawer, footer, legal/social row | One header, one footer, one drawer; consistent across every route |
| Hero systems | Centered, asymmetric, product, landing, legal/simple | Each hero variant is a named component; no ad-hoc combinations |
| Section headers | Eyebrow/label, heading, subheading | One spacing rule, one max-width rule, one alignment rule per variant |
| CTA systems | Primary button, secondary button, text link, final CTA band, pricing CTA, card CTA | One size scale, one radius scale, one focus ring, one hover transform |
| Card systems | Feature, benefit, outcome, pain, directory, integration, pricing, FAQ, legal-content | Equal heights in rows, consistent padding, consistent CTA placement |
| Media systems | Image rows, logo tiles, screenshots, illustrations, icon boxes, avatars | Fixed image box dimensions per family, one alt-text policy, one loading strategy |
| Data/list systems | Pricing tables, comparison tables, FAQ lists, pain lists, checklists, icon lists | Tabular figures for numbers, one bullet/icon style per list type |
| Interactive systems | Accordions, tabs, menus, dropdowns, drawers, modals, hover cards, forms | One open/close behavior, one focus management policy, one Esc/outside-click rule |
| Empty states | Empty list, empty search, zero data | Same polish as marketing surfaces; specific message and primary action |
| Legal pages | Terms, privacy, acceptable use, security | Shared layout shell; consistent typography and spacing |
| 404 / error pages | 404, 5xx, offline | Branded, useful (search box, home link), not just an apology |

The inventory is mandatory for any multi-page polish. Without it, drift is invisible and standardization is guesswork. See [audit-workflow.md](audit-workflow.md) Phase 3 for the procedure.

## Component Contract Checklist

A widget is ready for extraction when every item below is true. Before declaring a component done, walk this list.

- [ ] Required content fields are documented by usage: title, body, eyebrow, image, CTA, secondary CTA, metadata, icon, badge.
- [ ] Optional fields have graceful empty states and do not leave blank gaps.
- [ ] Markup is semantic and stable. Headings use the right level; landmarks are correct; lists are real lists.
- [ ] Layout is resilient to long text, very short text, and missing optional fields. Test the longest realistic title and the shortest.
- [ ] Desktop and mobile behavior is defined explicitly, not by accident.
- [ ] Hover, focus, active, disabled, and loading states are defined when relevant.
- [ ] Accessible names come from visible content unless a different name is necessary; visible text and `aria-label` agree.
- [ ] Images have consistent intrinsic dimensions, aspect ratio, loading strategy, and alt behavior.
- [ ] No page-specific magic numbers exist inside the component unless exposed as a named variant.
- [ ] The component owns its CSS. Page-local overrides on shared widgets are forbidden.
- [ ] Variants are explicit (one prop, one class, one data attribute), not arbitrary class combinations.

A component shipped without these answers is half-built and will drift on the next page.

## Extraction Sequence

Follow this sequence. Skipping a step turns extraction into yet another duplicated markup variant.

1. Choose the canonical contract. Pick the best existing implementation, the reference target, and the product needs as inputs. The contract is one design, not a union of all current usages.
2. Name the widget and its variants clearly. Names like `hero-asymmetric`, `section-heading`, `feature-card`, `integration-card`, `pricing-card`, `final-cta`, `alternating-row`, or `faq-list` make intent obvious. Avoid `card`, `section`, `block` (too generic).
3. Move the repeated markup into the framework's native component or partial mechanism. Applies in any templating system that supports component reuse: server-side partials, single-file components, JSX components, or build-time includes. Pick the mechanism the project already uses.
4. Pass content as explicit fields. Embedded page-specific text inside shared markup is the most common cause of "we have a component but it still drifts".
5. Make variants explicit through one prop, one class, or one data attribute. If a variant needs three coordinated changes, encode them in one named variant, not three knobs.
6. Centralize the CSS for the family and remove or reduce page-local overrides. The component owns its visual contract; page CSS adjusts only what the component exposes.
7. Re-render every route that uses the widget. A single broken instance proves the component is incomplete.
8. Compare every instance side-by-side at both audit viewports. If two instances do not look like members of the same system, the contract is wrong or the variant set is incomplete.

## What To Avoid

These four anti-patterns produce most cross-page drift.

- Copy-pasting a polished widget and tweaking classes page by page. The first divergence is the start of the drift; every subsequent page makes the contract harder to recover.
- Creating near-duplicate components with different names but the same semantic purpose. `feature-card`, `feature-tile`, and `benefit-card` that differ only in padding and CTA copy are one component with one variant axis.
- Fixing drift by adding more one-off CSS selectors. Page-local overrides reduce the symptom and reproduce the disease at the next site of drift.
- Making one component so generic that every call site needs overrides to look right. Generic components without strong defaults push the styling burden back to the page, which is where the drift lives.

## Drift Detection

Programmatic drift detection complements visual review. Collect computed styles and bounding boxes for every member of a family across every route, then flag any difference not explained by a named variant.

For each repeated widget selector, collect:

- Width, height, padding, border-radius, border color, border width, border style, background, box-shadow.
- Heading font-size, weight, line-height.
- Body font-size, line-height, color.
- CTA position and size.
- Image and logo rendered size and aspect ratio.
- Grid row height variance across the row.

Run from a headless browser of your choice (Puppeteer, Playwright, or equivalent). The snippet below uses only standard DOM and CSSOM APIs:

```js
const componentMetrics = await page.evaluate(() => {
  const read = (el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const heading = el.querySelector("h2, h3, .card-title");
    const body = el.querySelector("p");
    const cta = el.querySelector("a, button, .btn, .btn-text");
    const img = el.querySelector("img");
    return {
      selector: el.className,
      width: Math.round(r.width),
      height: Math.round(r.height),
      padding: cs.padding,
      radius: cs.borderRadius,
      background: cs.backgroundColor,
      borderColor: cs.borderColor,
      borderWidth: cs.borderWidth,
      borderStyle: cs.borderStyle,
      shadow: cs.boxShadow,
      headingSize: heading ? getComputedStyle(heading).fontSize : null,
      headingWeight: heading ? getComputedStyle(heading).fontWeight : null,
      bodySize: body ? getComputedStyle(body).fontSize : null,
      bodyLine: body ? getComputedStyle(body).lineHeight : null,
      cta: cta ? cta.getBoundingClientRect().toJSON() : null,
      image: img ? img.getBoundingClientRect().toJSON() : null,
    };
  };
  const families = {
    cards: [".feature-card", ".card-link", ".grid-item"],
    integrations: [".integration-card", ".integration-tile", ".integration-logo-tile"],
    pricing: [".pricing-card", ".pricing-table"],
  };
  const out = {};
  for (const [name, selectors] of Object.entries(families)) {
    out[name] = selectors.flatMap((s) => [...document.querySelectorAll(s)].map(read));
  }
  return out;
});
```

Run the collector on every route in scope. Compare the result for each family across pages. Any difference in padding, radius, shadow, heading size, or CTA position that is not explained by a named variant is drift; fix the component (not the page) until the next run is clean.

A family is drift-free when every same-variant instance produces the same metrics within rounding tolerance.

## CSS Patterns That Prevent Drift

These patterns reduce the surface area for drift before it starts. Use them on every shared widget. Detailed treatment of layout primitives lives in [responsive.md](responsive.md); detailed treatment of color, typography, and shadow tokens lives in [design.md](design.md). The patterns below are the multi-instance subset.

### Tokens before primitives

Normalize spacing, color, border, radius, shadow, and type scale tokens before building components. A component that references tokens stays in step with the system; a component that hardcodes values drifts from it.

### Stable dimensions for repeated UI

Card rows, logo tiles, and grid items must hold a consistent shape regardless of content length.

- `min-height` on cards prevents short-content rows from collapsing.
- `aspect-ratio` on media boxes prevents image jitter.
- `align-items: stretch` on grid and flex rows keeps siblings the same height.
- Fixed icon boxes (square wrapper around the SVG) prevent optical mis-centering.

### Card grid pattern

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
  align-items: stretch;
}

.card-grid > * {
  min-width: 0;
  height: 100%;
}

.card-link {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  text-decoration: none;
}

.card-link:focus-visible,
.button:focus-visible {
  outline: 3px solid var(--focus-ring-fallback, #4f8cff);
  outline: 3px solid color-mix(in srgb, var(--accent) 45%, white);
  outline-offset: 3px;
}

@media (max-width: 767px) {
  .card-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
```

The `min-width: 0` on grid children is the most-skipped guard against text overflow. Without it, long words break out of the cell and drag the page wide on mobile.

`color-mix(in srgb, ...)` is Baseline 2024. Older browsers fall back to the preceding `outline` declaration, so always provide the static-color line first. If the project supports browsers older than the 2024 baseline, drop the `color-mix` line entirely and use a precomputed token (`var(--color-focus-ring)`) instead.

### Spacing via gap, not margin stacks

Use `gap` for internal spacing on flex and grid containers. Margin stacks accumulate across instances and produce per-page drift; `gap` is owned by the container and stays constant.

### Line length via max-width

Constrain prose with `max-inline-size: 65ch` (or similar). Cards without measure constraints produce 90-character lines on desktop and 30-character lines on mobile, neither of which reads cleanly.

### Full-card anchor, not nested anchors

When a card visually behaves as a link, the entire card is the anchor. Nested anchors are invalid HTML and produce inconsistent click areas. If a card needs an inner CTA distinct from the outer link, switch to the button-card pattern: a stretched `::before` pseudo-element on the title link makes the whole card clickable while keeping nested controls separate.

### Hover transforms do not stack

If the card animates on hover and an inner CTA also animates, the two transforms compose and produce a buggy shift. Pick one layer for the hover transform; suppress the other inside the animated container.

### Focus-visible, not focus

Use `:focus-visible` so mouse users do not see a ring when clicking but keyboard users always do. The ring must be 2 to 4 px, with 3:1 contrast against both the surface and the resting state. Detailed contrast targets live in [accessibility.md](accessibility.md).

### Image loading strategy per role

- Hero LCP image: `loading="eager"`, `fetchpriority="high"`, declared `width` and `height`, `srcset` plus `sizes` for responsive widths.
- Below-the-fold imagery: `loading="lazy"`, `decoding="async"`.
- Logo tiles and avatars: fixed intrinsic dimensions, consistent ratio across the family.

Performance treatment of images and fonts lives in [performance.md](performance.md); the rule above is the multi-instance one.

### Visible text is the accessible name

Do not hide visible text behind a mismatched `aria-label`. If the visible text names the control well, let it be the accessible name. When a control is icon-only, the `aria-label` matches the visible meaning the icon conveys.

## See Also

- [audit-workflow.md](audit-workflow.md) for the multi-page audit procedure that builds the widget inventory
- [defects.md](defects.md) for symptom-to-fix lookup and the canonical geometry sweep
- [ui-ux.md](ui-ux.md) for state coverage and interaction patterns
- [accessibility.md](accessibility.md) for focus-visible, accessible names, and contrast rules referenced in the CSS patterns above
- [responsive.md](responsive.md) for layout primitives
- [design.md](design.md) for tokens, typography, and shadow language
