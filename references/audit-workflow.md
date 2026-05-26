# Multi-Page Audit and Polish Workflow

The procedural playbook for auditing an existing multi-page site against a reference and polishing it to that level of discipline. Use this when the work is not building a new page from scratch but bringing an existing surface to a consistent visual bar across every route.

The strategic four-phase workflow in the entry SKILL.md (Frame, Plan, Build, Verify) is the right frame for greenfield work. The 19 phases below are the right frame for audit and polish work. Run them in order; each phase has a clear input and a clear output.

## Core Principle

Treat the rendered browser as the source of truth. Do not judge visual quality from code alone. Capture screenshots, inspect them, compare against the reference, patch the smallest set of templates, styles, or assets needed, and re-capture until the visible result is clean at every requested viewport.

The goal is not to copy another brand pixel-for-pixel unless explicitly requested. The goal is to match the reference site's level of discipline: proportion, density, hierarchy, alignment, typography, spacing, interaction behavior, responsive refinement, and absence of visual defects.

Equally important: repeated widgets must be standardized. If the same kind of thing appears on multiple pages, such as a hero, feature card, pricing card, integration tile, CTA band, testimonial, FAQ, footer column, media row, badge, form, or navigation dropdown, it should follow one canonical visual and content contract unless there is a deliberate, documented variant. Polishing each instance separately is not enough.

## Operating Rules

These rules apply to every phase below. Treat any violation as a defect.

1. Identify the target URL, project root, build system, source directories, and reference URL or screenshots before making changes.
2. Capture a baseline before editing when visual polish is the task.
3. Capture at least one desktop viewport and one mobile viewport. Use `1440x900` and `375x812` unless the user specifies otherwise. See [responsive.md](responsive.md) for the canonical breakpoints table.
4. Audit route-by-route. Include generated pages, legal pages, pricing pages, integration pages, 404 pages, and programmatic content routes if they are linked or published.
5. Audit component-by-component across routes. Build a widget inventory and compare every repeated widget type across pages before finalizing. See [components.md](components.md).
6. Extract repeated markup into reusable components, partials, includes, or framework-native primitives when the local stack supports it. If extraction is not feasible, normalize the markup and document why duplication remains.
7. Compare real screenshots against the reference. Vague statements such as "looks better" are not evidence.
8. Fix root component causes when the same issue appears across pages: navigation, footer, cards, buttons, typography, spacing tokens, image rules, or grid primitives.
9. Re-render and re-screenshot after each meaningful group of fixes.
10. Preserve the site's content, brand intent, and information architecture unless the user asks for copy or structure changes.
11. Keep changes scoped. Do not rewrite the entire design system when a token, component, template, or layout rule fixes the defect.
12. Run available validation commands before final delivery: build, lint, stylelint, tests, visual capture, accessibility checks, Lighthouse, and the geometry sweep in [defects.md](defects.md).
13. Never declare the pass complete while known visible issues remain.

### Parallelizing an audit or fix pass across agents (optional)

When the audit or the fixes are split across multiple automated agents:

- Give each agent a DISJOINT set of files. Two agents editing the same file collide and overwrite each other.
- Do the shared foundation first (shared components, tokens, shared data modules), serially, before fanning out page-level work that depends on it.
- Verify centrally after all agents finish, with the programmatic sweeps and a rebuild. Per-agent self-reports are not the gate.
- Trust but verify each report. An agent may read a file while another is mid-edit and report it "broken" when it is not, or flag a correct value as wrong. Re-read the file before acting on a surprising claim.

## Phase 1: Discover Context

Before capturing or editing, determine:

- Project root and package manager.
- Build system and templating mechanism (whatever the project uses; the workflow does not depend on a specific framework).
- Source locations for templates, components, global CSS, component CSS, JavaScript, image assets, fonts, config, and generated output.
- Local dev URL and whether a server is already running.
- Reference source: live URL, screenshot folder, design export, previous production site, or written design standard.
- Route scope: entire site, root only, a section, or a list of specific routes.

Read the project's existing scripts before inventing commands. If a dev server is needed and none is running, start it. If the standard port is occupied, use the existing server when it matches the project; otherwise pick another port.

## Phase 2: Inventory Routes

Build a route list from multiple sources:

- Linked anchors on the homepage and primary navigation.
- Static-build output directories for routes the user can land on.
- Sitemap files.
- Route manifests, content data files, collection templates, or programmatic page data.
- Known required pages from the user.

Exclude only routes that are intentionally external, authenticated admin flows, logout or delete actions, file or mail or tel links, or fragments of pages already covered.

If route generation is broken, fix missing published pages before polishing the rest of the site. A polished 404 for a page that should exist is still a failure.

## Phase 3: Inventory Repeated Widgets

Before editing styles, build a cross-page widget inventory. The inventory is mandatory for any multi-page polish.

The 11 widget families and the inventory record format live in [components.md](components.md). For each family, record routes where it appears, the source that renders it, required and optional content fields, allowed variants, the canonical visual contract, and which deviations are intentional versus accidental.

Use this inventory to decide whether to extract, extend, or normalize. The extraction rule (extract at three or more duplicates, or at two with clear future reuse, or any visible drift) is the same one in [components.md](components.md). Do not keep two visually different implementations of the same widget type unless they have distinct semantic purposes and named variants.

## Phase 4: Capture Baseline

Capture every route in scope at both audit viewports before editing. Store screenshots in a timestamped audit directory. Capture both viewport screenshots and full-page screenshots when useful.

Use consistent file names so before-and-after comparison is mechanical:

- `<route>_desktop.png`
- `<route>_desktop_full.png`
- `<route>_mobile.png`
- `<route>_mobile_full.png`
- `reference_desktop.png`
- `reference_mobile.png`
- `report.json`

Run from a headless browser of your choice (Puppeteer, Playwright, or equivalent). The script below uses only standard browser APIs and standard Node modules; adapt the route list and the output directory for the project under audit.

Before running it, install the browser-automation library the script imports (for the example below: `npm install --save-dev puppeteer`). Save the script as `capture.cjs` and invoke it with `node capture.cjs <output-dir>` (the output directory defaults to `visual-audit/`). If the project already uses Playwright or another driver, port the loop body; the screenshot file naming convention is the load-bearing part, not the driver.

```js
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const baseUrl = process.env.TARGET_URL || "http://localhost:3000";
const outDir = process.argv[2] || "visual-audit";
const routes = ["/"];
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 375, height: 812 },
];

const safeName = (route) =>
  (route === "/"
    ? "home"
    : route.replace(/^\/|\/$/g, "").replace(/[^a-z0-9]+/gi, "_").toLowerCase()
  ) || "home";

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await puppeteer.launch({ headless: "new" });
  const failures = [];
  for (const route of routes) {
    for (const vp of viewports) {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
      try {
        const response = await page.goto(`${baseUrl}${route}?qa=${Date.now()}`, {
          waitUntil: "networkidle0", timeout: 30000,
        });
        if (response && response.status() >= 400) {
          failures.push({ route, viewport: vp.name, status: response.status() });
        }
        const file = path.join(outDir, `${safeName(route)}_${vp.name}.png`);
        await page.screenshot({ path: file });
        await page.screenshot({ path: file.replace(".png", "_full.png"), fullPage: true });
      } catch (error) {
        failures.push({ route, viewport: vp.name, error: String(error.message || error) });
      } finally {
        await page.close();
      }
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify({ baseUrl, routes, failures }, null, 2));
})();
```

Adapt the script rather than rewriting it. Add route discovery, contact sheets, interactive captures, and the geometry sweep from [defects.md](defects.md) as the task requires.

## Phase 5: Capture Reference

Capture the reference target at the same viewport sizes used in Phase 4. If the reference is a live site, use cache-busted URLs and the same browser engine as the baseline. If the reference is a screenshot or design export, place the assets next to the local screenshots so side-by-side comparison is one open command away.

When comparing to a reference:

- Match polish level, not necessarily exact color or content.
- Compare the first viewport first: navigation, hero, primary CTA, image treatment, first hint of next section.
- Then compare section rhythm: density, vertical spacing, card grids, media-to-copy balance, and CTA placement.
- Finally compare details: shadows, borders, radii, icon alignment, label treatment, focus states, hover states, mobile drawer behavior, footer density.

## Phase 6: Audit Each Route

For every route and viewport, inspect every category below. Record findings as route plus viewport plus component plus what is wrong plus why it matters plus likely source plus screenshot plus fix status.

| Category | What to inspect |
|----------|-----------------|
| Header and navigation | Logo alignment, nav item spacing, dropdown centering, active state, hover/focus/pressed, sticky behavior, z-index, seam lines, mobile drawer, scroll lock |
| Hero | First-viewport composition, heading scale, line length, CTA alignment, media size, image sharpness, next-section reveal, mobile fold |
| Sections | Vertical rhythm, background bands, max-widths, gutters, content density, section transitions |
| Cards and tiles | Equal heights in rows, equal widths, consistent padding, aligned baselines, clickable area, hover, focus ring, icon and image alignment, aspect ratio |
| Buttons and links | Size, label clarity, icon centering, hover drift, duplicate arrows, disabled states, touch target, focus visibility |
| Typography | Family, weight, scale, line-height, letter-spacing, wrapping, measure, hierarchy, alignment |
| Color | Background, foreground, accent consistency, contrast, border, hover, active, muted text, light and dark bands |
| Images and media | Crop, aspect ratio, resolution, `srcset`, lazy and eager loading, alt text, visual relevance, repeated or placeholder assets |
| Forms | Labels, placeholders, validation states, focus, disabled, field heights, mobile keyboard fit |
| Footer | Layout balance, link columns, legal row, social icon spacing, hit area, mobile stacking |
| Responsive behavior | No horizontal scroll, no clipping, no desktop layout on mobile, no text overflow, no oversized buttons or cards, no tiny tap targets |

Also compare each widget against other instances of the same family. Do same-type cards have the same padding, radius, border, hover, min-height, CTA position, and typography? Does the same CTA mean the same thing and use the same label style? Do integration and logo tiles use one image size, one logo treatment, and one fallback? Do section headers use the same eyebrow, H2, subhead, width, and gap rules? Do hero variants have named purposes and shared internals? Are component variants explicit in code, or are they accidental class combinations?

## Phase 7: Prioritize Fixes

Fix in this order. Higher tiers always block lower tiers.

1. Broken routes, 404s, missing generated pages, hard layout failures.
2. Global shell defects: header, navigation, footer, body overflow, typography tokens, color tokens.
3. Cross-page widget drift: same widget type implemented differently across pages without a named variant.
4. Cross-page component defects: cards, buttons, pricing, integration tiles, form controls, media blocks.
5. Page-specific hierarchy and section density issues; interaction and accessibility issues; asset and performance polish; minor copy clarity where misleading product claims or repeated template text needs work.

Prefer global fixes when a defect repeats. Prefer page-level fixes when the defect is truly contextual.

## Phase 8: Patch With Component Discipline

When repeated widgets drift, fix the component system before tuning page-specific CSS. The full extraction sequence and the component contract checklist live in [components.md](components.md). Walk that file before editing.

The summary: choose a canonical contract, name the widget and variants clearly, move repeated markup into the project's component mechanism, pass content as explicit fields, make variants explicit, centralize CSS, re-render every route, and compare instances side-by-side at both viewports. Anti-patterns to avoid (copy-paste tweaking, near-duplicate components, one-off CSS for drift, overly generic components requiring per-call-site overrides) also live in [components.md](components.md).

## Phase 9: Patch With Design Discipline

Use existing design primitives before adding new ones. Patch CSS, templates, and components conservatively.

- Normalize tokens first: spacing, color, border, radius, shadow, type scale. Token detail lives in [design.md](design.md).
- Use stable dimensions for repeated UI: `min-height`, `aspect-ratio`, grid tracks, `align-items: stretch`, fixed icon boxes.
- Avoid arbitrary one-off margins. Use local precedent or none.
- Use `gap` for internal spacing instead of stacked margins where possible.
- Use `max-width` and responsive constraints for readable line lengths. Layout primitive detail lives in [responsive.md](responsive.md).
- Use full-card anchors when a card visually behaves as a link. Do not nest anchors.
- Keep CTA hover transforms from stacking with card hover transforms.
- Use `:focus-visible` rings that are clearly visible and consistent. Contrast detail lives in [accessibility.md](accessibility.md).
- Avoid hiding visible text behind mismatched `aria-label`. Visible text is the accessible name.
- Make hover and focus states visually related so a keyboard user gets the same clarity as a pointer user.
- Use `srcset` and `sizes` for recurring large images.
- Use `loading="eager"` and `fetchpriority="high"` only on the hero LCP image. Use `loading="lazy"` and `decoding="async"` for below-the-fold imagery. Image strategy detail lives in [performance.md](performance.md).

## Phase 10: Verify After Every Fix Group

After a meaningful fix group:

1. Rebuild or let the dev server hot reload.
2. Re-capture the affected routes at desktop and mobile.
3. Compare before and after.
4. Inspect at least the first viewport and the edited section.
5. Confirm no regression on shared components.
6. If a reusable widget changed, capture every route where the widget appears, not only the route where the defect was first noticed.

Do not wait until the end to discover that a global CSS fix broke mobile.

## Phase 11: Programmatic Geometry Checks

Use browser automation to catch issues that screenshots miss: viewport bleed, hidden text overflow, sub-44 hit targets, duplicate arrows, dropdown miscentering, mobile drawer scroll-lock failures, focus invisibility.

The canonical 9-check sweep, the JS snippet that runs it, and the per-check thresholds live in [defects.md](defects.md). Run it on every audited route at both capture viewports. A run is clean when every check returns zero issues.

Filter false positives only when you can explain them, such as hidden off-canvas content or intentionally overflowing dropdown internals that do not affect the page viewport. Document the filter so the next run does not re-discover it.

Run BOTH programmatic sweeps: the geometry sweep (visual, headless browser) and the content-and-markup sweep (SEO and HTML validity, Node over the built HTML). See [defects.md](defects.md) for both. A route is not signed off until both return clean.

## Phase 12: Component Drift Checks

Use browser automation to compare same-family widgets across pages. This does not replace visual judgment, but it catches drift early.

The drift collector snippet and the property list (width, height, padding, radius, border, background, shadow, typography, CTA position, image metrics) live in [components.md](components.md). Run it on every route in scope. Compare the result for each family across pages.

Flag any difference that is not explained by a named variant. A family is drift-free when every same-variant instance produces the same metrics within rounding tolerance.

## Phase 13: Interaction QA

Capture explicit interaction screenshots and verify behavior:

- Desktop dropdown open.
- Mobile menu open.
- Hovered card or button.
- Focus-visible state on major controls.
- Pricing card hover or focus if cards animate.
- Modal, drawer, accordion, tabs, carousel, or form validation states if present.

Behavioral checks:

- Dropdowns are centered or intentionally aligned.
- Dropdowns stay within the viewport.
- Esc closes popovers.
- Outside click closes popovers.
- Mobile drawer locks page scroll while open and restores scroll after close.
- Buttons do not drift on hover.
- Active and current nav states are visible.
- Focus ring is not clipped.
- Interactive element accessible names match visible labels.

State coverage detail (empty, loading, success, error, partial, disabled, read-only, stale, offline, unauthorized, limit-reached, initial, done) lives in [ui-ux.md](ui-ux.md).

## Phase 14: Accessibility Validation

Use Lighthouse, axe, or equivalent when available. Treat these as baseline checks, not replacements for human visual inspection. The full WCAG 2.2 AA framework, ARIA rules, contrast targets, keyboard patterns, screen reader checks, and focus management live in [accessibility.md](accessibility.md).

The minimum required basics specific to multi-page polish:

- `<html lang>` exists and is valid on every route.
- Exactly one primary `<main>` per route.
- Logical heading order; one H1 per route; sequential H2 to H3.
- Links and buttons have accessible names.
- Form controls have labels.
- Visible labels match accessible names.
- Images have useful alt text or empty decorative alt.
- Contrast passes for text, UI controls, and focus indicators in both light and dark mode.
- Focus order follows visual order.
- No keyboard traps.
- Skip link works and does not create viewport overflow while hidden.

If a visual fix creates an accessibility problem, the visual fix is incomplete.

## Phase 15: Lighthouse and Performance Polish

Run Lighthouse when the project has it set up or when the user asks for production polish. Fix failing assertions. Treat warnings as useful triage but do not over-optimize at the cost of design unless the user asks. Lighthouse setup, scoring weights, and audit-by-audit fixes live in [lighthouse.md](lighthouse.md). Performance mechanics and asset strategy live in [performance.md](performance.md).

Common visual-performance fixes that surface in audit work:

- Add responsive `srcset` variants for hero and recurring large images.
- Use correct intrinsic `width` and `height` on every image to prevent layout shift.
- Preload or prioritize only the actual LCP image.
- Avoid loading offscreen imagery eagerly.
- Remove giant decorative images that are visually indistinguishable from smaller assets.
- Keep webfont usage intentional. Cap to two families and four weights.
- Avoid expensive shadows and filters on large scrolling surfaces if they cause jank.

## Phase 16: Reference-Level Design Heuristics

Use these tests when comparing the audited site to the reference. Each test is a yes-or-no judgment supported by the captured screenshots. The same list lives in [design.md](design.md) "Reference Comparison Heuristics" for use outside this audit workflow; the two copies are intentionally identical so each file is self-contained for its reader's mode.

1. First viewport has a clear hierarchy and does not feel accidental.
2. The brand or product is visible immediately when relevant.
3. The next section peeks intentionally rather than crowding the hero.
4. Repeated cards in a row align on top edges, bottom edges, and CTA baselines.
5. Text blocks have readable line lengths and consistent rhythm.
6. Labels, eyebrows, and badges use one visual language.
7. Buttons use one size system and one radius system.
8. Icons sit optically centered, not just mathematically centered.
9. Borders are subtle and consistent.
10. Shadows support hierarchy but do not muddy the palette.
11. Alternate background bands feel deliberate.
12. Mobile layout feels designed, not merely stacked.
13. Footer spacing is calmer than the body, with no stray gaps or cramped links.
14. Empty states, legal pages, and 404 pages share the same polish as marketing pages.
15. Same-family widgets look like members of one system across pages.
16. Variants are recognizably intentional, not accidental drift.

A site at reference level passes every test. A site at "fine" level fails three or more.

## Phase 17: Common Defects and Fixes

The 29-row symptom-to-fix lookup table lives in [defects.md](defects.md). Use it whenever a defect surfaces during Phase 6 or Phase 13. Apply the standard fix at the right layer (component, page, or design token), then re-run the geometry sweep on the affected route.

## Phase 18: Deliverables

Provide a concise final package:

- Summary of main changes.
- Per-page checklist with issues found, fixes applied, and screenshot references.
- Before-and-after screenshot paths for desktop and mobile.
- Reference screenshot paths.
- Interactive screenshot paths if menus, drawers, or cards were tested.
- Validation commands and pass-or-fail results.
- Remaining risks only if real issues remain.
- Widget inventory and standardization notes: which repeated widgets were found, which were extracted or normalized, and which named variants remain.

Per-page checklist format:

```markdown
| Route | Issues found | Fixes applied | Before | After |
| --- | --- | --- | --- | --- |
| `/pricing/` | Pricing CTA drift, partial card click area | Full-card anchors, stable hover state | [D](before/pricing_desktop.png) [M](before/pricing_mobile.png) | [D](after/pricing_desktop.png) [M](after/pricing_mobile.png) |
```

Widget inventory format:

```markdown
| Widget family | Routes | Source | Standardization action | Variants |
| --- | --- | --- | --- | --- |
| Integration tile | `/integrations/`, `/whatsapp/`, `/for/.../` | duplicated markup plus partial | Extracted to `integration-card` | `link`, `static-logo` |
```

Validation summary format:

```markdown
- Build: passed
- Lint: passed
- Capture: 24 routes, `failures: []`
- Geometry sweep: `[]` at `1440x900` and `375x812`
- Drift collector: zero unexplained differences across families
- Lighthouse: passed required assertions
```

## Phase 19: Final Acceptance Gate

Before final delivery, confirm every item below. This is the authoritative gate for multi-page audit and polish work. The Self-Improvement section in the entry SKILL.md is the short version.

- Every in-scope route was captured at desktop (`1440x900`) and mobile (`375x812`).
- Every route returns the expected HTTP status.
- Repeated widget families have been inventoried and compared across pages.
- Same-purpose widgets have been extracted into reusable components or partials, or normalized to one contract where extraction is not feasible.
- Remaining variants are named, intentional, and visually consistent within their variant.
- Every edited shared component was re-captured on every route where it appears (not just the route where the defect was noticed) and the geometry sweep passed.
- The latest screenshots reflect the latest code.
- Build and lint pass, or failures are clearly unrelated and reported.
- No horizontal scroll exists on mobile.
- No known text overflow, clipped controls, duplicate arrows, tiny touch targets, or partial clickable-card defects remain.
- The geometry sweep returns zero issues on every audited route at both capture viewports.
- The drift collector returns no unexplained differences for any widget family.
- Navigation, footer, pricing, cards, forms, and interactive states pass Phase 13 interaction QA and Phase 14 accessibility validation.
- Accessibility basics from Phase 14 are clean on every route.
- Reference-Level Design Heuristics from Phase 16 pass.
- The final checklist is written and linked.

If any item fails, continue fixing or clearly state the blocker. Do not present an incomplete visual pass as complete.

## See Also

- [components.md](components.md) for extraction discipline, contracts, and drift detection
- [defects.md](defects.md) for the symptom-to-fix lookup table and the canonical geometry sweep
- [accessibility.md](accessibility.md) for the WCAG framework, ARIA, contrast, focus, screen reader
- [responsive.md](responsive.md) for capture viewports, breakpoints, and layout primitives
- [design.md](design.md) for tokens, typography, color, and shadow language
- [performance.md](performance.md) for image, font, and asset strategy
- [lighthouse.md](lighthouse.md) for audit setup and score-driven fixes
- [pre-launch.md](pre-launch.md) for the launch gate that runs alongside this workflow
