---
title: Component Discipline
purpose: Standardizing repeated widgets across pages, defining canonical component contracts, slot-based composition, and detecting drift before it ships.
load-when:
  task-keywords: [component, widget, contract, extraction, slots, composition, Storybook, tokens, design]
  symptoms: [duplicate id, score dropped, viewport overflow, dark mode broken]
prereq: SKILL.md
related: [audit-workflow.md, defects.md, design.md, ui-ux.md]
size: ~330 lines
---

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

Extract data before markup. The first duplication to remove is shared DATA, not shared structure: a value used in two or more places (a domain or base URL, a price, a label, a disclaimer, a magic number, an enum) belongs in one module that every call site imports. Hardcoding the same string or number in several files is the most common and most damaging form of drift, because the copies diverge silently.

Know when to STOP extracting. A duplicate that varies by exactly one value is a clean component with one prop. A near-duplicate that would need two or more shape or layout props to cover its variants is usually a premature abstraction: it pushes the styling burden back to the call site (the over-generic-component anti-pattern above) and is harder to read than the duplication it replaced. Extract data and structurally-identical blocks; leave contextually-distinct near-duplicates inline and note them.

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
- [ ] No hardcoded DOM `id` inside the component. Any `id` (and any `aria-controls`, `aria-labelledby`, `for`, or `href="#..."` that targets one) is derived from a per-instance unique id (`useId()` or the framework equivalent) and child ids are namespaced under it. A component with a static id breaks the moment it renders twice on a page.

A component shipped without these answers is half-built and will drift on the next page.

## Server vs Client Boundary

State the boundary at the top of the contract. A component that tries to be both fails both: it ships client JS for behaviour that only runs on the server, or it skips hydration for behaviour that only runs on the client. Reject the in-between.

- **Server boundary**: no event handlers, no client state, no browser-only APIs (`window`, `document`, `localStorage`, `IntersectionObserver`). Renders on the server (or at build time), ships zero client JS for itself. Pattern matches the modern server-component model: data fetch, layout, semantic markup, the page's static skeleton.
- **Client boundary**: interactive, hydrated, owns its event handlers and its local state. Ships the JS needed to drive its behaviour. Pattern matches a client island: a modal, a popover, a tab strip, an autocomplete.
- **Hybrid is a defect**: a "server" component that calls a hook, attaches a listener, or reads `window` will explode in a server runtime or skip hydration silently. A "client" component that does no interactive work pays for hydration without earning it.

Declare the boundary in the contract header (a JSDoc tag, a top-of-file comment, a directive the framework recognises). Lint or type-check rejects components that import a server-only module from a client boundary, or a browser-only API from a server boundary.

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

## Versioning and Breaking Changes

The canonical contract is an API. Treat it like one. The component family carries a semver, the consumers know which version they are on, and breaking changes ship with a migration path.

- **Patch (`x.y.Z`)**: bug fix that does not change the contract. A focus ring that was 2 px is now 3 px to pass contrast; a margin that was 16 px is now 24 px to match the token. Consumers pick up the fix on the next install with no code change.
- **Minor (`x.Y.0`)**: backward-compatible addition. A new optional prop, a new named variant, a new slot, an additional state. Existing call sites keep working unchanged.
- **Major (`X.0.0`)**: removed prop, removed variant, renamed slot, changed default behaviour, changed required-vs-optional, changed semantic markup in a way that affects accessibility wiring. Existing call sites need an update.

Deprecation discipline for any planned removal:

- Mark the prop, variant, or slot with `@deprecated` JSDoc and a short reason. Type checkers and editors surface the warning at every call site.
- Emit a one-line `console.warn` in development builds (gated by `process.env.NODE_ENV !== "production"` or the framework equivalent). Production stays silent. The warning names the deprecated thing and points at the migration.
- Link the migration codemod from the deprecation message, not from a separate changelog entry. The deprecation goes:

```text
[component] prop `size="huge"` is deprecated; use the `<header slot>` instead. Run `npx your-codemod component-size-huge` to migrate. Removed in v3.0.0.
```

- The codemod ships with the deprecation, not after the removal. A deprecation without a migration path is a future breakage.

## What To Avoid

These four anti-patterns produce most cross-page drift.

- Copy-pasting a polished widget and tweaking classes page by page. The first divergence is the start of the drift; every subsequent page makes the contract harder to recover.
- Creating near-duplicate components with different names but the same semantic purpose. `feature-card`, `feature-tile`, and `benefit-card` that differ only in padding and CTA copy are one component with one variant axis.
- Fixing drift by adding more one-off CSS selectors. Page-local overrides reduce the symptom and reproduce the disease at the next site of drift.
- Making one component so generic that every call site needs overrides to look right. Generic components without strong defaults push the styling burden back to the page, which is where the drift lives.
- Hardcoding a DOM `id` (or an `aria-controls` / `aria-labelledby` target) inside a reusable component. Rendered more than once on a page it produces duplicate ids: invalid HTML, a Lighthouse `duplicate-id` (or axe `duplicate-id-aria`) failure, and broken ARIA wiring (a label or control points at the wrong instance). Generate a unique id per instance and namespace children under it.

## Slots and Composition Over Prop Explosion

The over-generic-component anti-pattern resolves to slots, not more props. When a component needs to vary by structure (a card with an optional badge above the title, a section with an optional aside, a hero with an optional footnote), exposing a slot keeps the component small AND the call site readable. Exposing another shape prop produces a god-component that nobody can use without reading its source.

The rule: if you would need three or more shape props (props that change which elements render, not props that change what those elements contain), use a slot instead.

- A slot is `children` (the default slot), named slots like `<header>` and `<footer>` (web components, single-file frameworks), or render props (component-as-function patterns). Whichever the framework supports, expose composition explicitly.
- Reach for slots when the variation is structural: optional sections, optional decorations, optional adjacent content.
- Stay on props when the variation is data: title text, image URL, CTA label, variant name (one named variant prop, not a knob per CSS property).
- Composed components stay testable: each slot has a known contract; the parent does not need to know what fills it.
- Slots prevent the prop explosion -> drift cycle: when adding a fourth shape prop is the only way to support a new variant, the call site eventually wires the props together inconsistently and the family drifts again.

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

## Component Playground Discipline

A component playground (Storybook, Histoire, Ladle, or any component workshop) is where the contract is exercised in isolation. If a state is not in a story, it is not in the contract.

- **One story per variant**: every named variant in the contract has its own story. Reviewers compare variants side-by-side without spinning up the host app.
- **One matrix story per family**: a single story renders every state-by-prop combination on one page. Resting, hover, focus, disabled, loading, error; primary, secondary, ghost; small, medium, large. The matrix catches the unrendered combinations before a designer has to.
- **Visual regression on the story tree, not on integration screens**: snapshot each story and the matrix story; gate PRs on the story-tree diff. Integration-level visual tests are flaky (data shifts, animations time out) and miss component-level drift. Story-level tests are deterministic.
- **Interaction tests live next to stories**: a story that exercises an interaction (click, focus, submit) carries its own play function and assertions. The playground is the test surface for the contract.
- **Stories ship with the component**, in the same package, in the same review. A component without stories is not done.

## Token Transformation Pipeline

Design tokens live in one place, not in CSS, JS, iOS, Android, and Figma independently. A transformation pipeline takes the single source of truth and emits every target output. Choose ONE pipeline; mixing them produces drift between targets.

- **Source format**: a single JSON or YAML file (or a small directory of them) that defines color, spacing, typography, radius, shadow, motion, and z-index tokens with semantic names. The W3C Design Tokens Community Group format is the standard worth aiming for: it is platform-neutral and tool-agnostic, so the source survives a future tool change.
- **Pipelines that read the source**:
  - **Style Dictionary**: mature, scriptable, emits CSS variables, JS exports (ESM and CJS), iOS Swift, Android XML, and arbitrary custom formats via JS templates. Use when the team wants to control the pipeline and ship to multiple platforms.
  - **Tokens Studio**: Figma plugin that round-trips tokens between design and code; integrates with Style Dictionary as the build step. Use when designers own the tokens and need a Figma-first edit surface.
  - **W3C DTCG-compatible CLI**: a smaller, format-faithful build that emits whichever targets the project needs without the broader Style Dictionary surface. Use when the project commits to the W3C format and wants the lowest pipeline complexity.
- **Outputs to emit by default**: CSS custom properties (a `:root` block per theme), a JS or TS export module, optionally platform-specific outputs (iOS, Android) when relevant.
- **Pipeline runs in CI**: the build emits the outputs from the source on every commit; the outputs are committed (or generated and consumed inline). A drift between source and output is the kind of bug that ships unnoticed.
- **No raw hex, raw px, or raw ms in component CSS**: every value comes from a token. Lint enforces it.

## See Also

- [audit-workflow.md](audit-workflow.md) for the multi-page audit procedure that builds the widget inventory
- [defects.md](defects.md) for symptom-to-fix lookup and the canonical geometry sweep
- [ui-ux.md](ui-ux.md) for state coverage and interaction patterns
- [accessibility.md](accessibility.md) for focus-visible, accessible names, and contrast rules referenced in the CSS patterns above
- [responsive.md](responsive.md) for layout primitives
- [design.md](design.md) for tokens, typography, and shadow language
