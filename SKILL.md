---
name: frontend-excellence
description: Holistic, framework-agnostic playbook for shipping ultra-fast, accessible, search-friendly, visually distinctive web interfaces. Combines Lighthouse mastery (target 95+ mobile, 99+ desktop, 100 A11y/BP/SEO), UI/UX patterns drawn from Apple HIG and Material Design, design aesthetics that avoid generic AI styling, plus deep guidance on performance, accessibility, SEO, motion, forms, layout, and data visualization. Apply this when building, reviewing, refactoring, or polishing any web UI regardless of framework (vanilla HTML/CSS/JS, React, Vue, Svelte, Astro, Solid, Next.js, Nuxt, SvelteKit, Remix, Qwik, Lit, Web Components). Use to make decisions about typography, color, spacing, motion, contrast, semantic structure, asset loading, render strategy, hydration, third-party scripts, image formats, font loading, JS budgets, CSS architecture, ARIA, keyboard flows, focus management, structured data, meta tags, and Core Web Vitals.
---

# Frontend Excellence

A single, holistic skill for delivering web interfaces that look unforgettable, perform near the top of the Lighthouse curve, and degrade gracefully across devices and assistive technologies. Framework-agnostic by design: every rule is expressed as a principle plus a concrete check, never as a library API.

## When to Use

Apply this skill any time the work changes how an interface **looks, feels, moves, loads, ranks, or is interacted with**. Examples:

- Building or refactoring any page, form, modal, navigation, table, chart, or component
- Choosing typography, color, spacing, motion, or visual style
- Auditing or improving Core Web Vitals (LCP, INP, CLS), bundle size, or hydration cost
- Auditing or improving accessibility (contrast, keyboard, screen reader, focus, dynamic type)
- Auditing or improving on-page SEO (titles, descriptions, headings, structured data, canonicals)
- Reviewing visual polish, hierarchy, contrast, density, dark/light mode parity
- Replacing generic AI-flavored styling with a distinctive aesthetic direction
- Auditing or polishing an existing multi-page site against a reference design or production baseline

Skip this skill for backend logic, infrastructure, data pipelines, or non-visual scripting.

## North Star Targets

Every interface should meet these bars before being considered "done". Treat any failure as a blocking defect, not a polish task.

| Category | Mobile target | Desktop target | Source |
|----------|--------------|----------------|--------|
| Lighthouse Performance | >= 95 | >= 99 | Lighthouse |
| Lighthouse Accessibility | 100 | 100 | Lighthouse + axe |
| Lighthouse Best Practices | 100 | 100 | Lighthouse |
| Lighthouse SEO | 100 | 100 | Lighthouse |
| Largest Contentful Paint (LCP) | < 2.5s | < 2.0s | Core Web Vitals |
| Interaction to Next Paint (INP) | < 200ms | < 200ms | Core Web Vitals |
| Cumulative Layout Shift (CLS) | < 0.1 | < 0.05 | Core Web Vitals |
| Time to First Byte (TTFB) | < 800ms | < 600ms | Core Web Vitals |
| First Contentful Paint (FCP) | < 1.8s | < 1.0s | Lighthouse |
| Total Blocking Time (TBT) | < 200ms | < 100ms | Lighthouse |
| Initial JS payload (gzipped) | < 90 KB | < 130 KB | Budget |
| Initial CSS payload (gzipped) | < 25 KB | < 35 KB | Budget |
| Web font payload (per screen) | <= 2 families, <= 4 weights | same | Budget |

These are the universal bar. A given project may consciously relax a budget for a specific surface (e.g., a heavily interactive client-rendered tool that legitimately ships more JS), but the relaxation should be a recorded, justified exception, not a default.

## Priority Stack (read top-down on any review)

1. **Crawlability and indexability** (does the page exist in the index, with the right canonical and meta?)
2. **Accessibility correctness** (semantic HTML, contrast, keyboard, focus, screen reader)
3. **Core Web Vitals** (LCP, INP, CLS, TTFB)
4. **Layout and responsive integrity** (no horizontal scroll, no clipped content, safe-area respect)
5. **Visual hierarchy and intentional aesthetic** (typography, color, spacing, motion, density)
6. **Interaction quality** (hover, press, focus, loading, error, empty, success states)
7. **Forms and feedback** (validation, error placement, recovery, autofill, autosave)
8. **Motion and animation** (purposeful, reduced-motion safe, transform-only)
9. **Data and charts** (legible, accessible, responsive)
10. **Polish and craft** (icon discipline, dark/light parity, brand fidelity)

Higher-priority items always block lower-priority items. Never trade contrast for aesthetics. Never trade INP for animation.

## Reference Index

Detailed guidance lives in `references/`. Load the relevant file when the work touches that domain.

| File | Use when |
|------|---------|
| [Lighthouse mastery](references/lighthouse.md) | Running a Lighthouse audit, interpreting scores, fixing specific failing audits, setting up CI gates |
| [Performance deep dive](references/performance.md) | Optimizing assets, JS execution, hydration, render strategy, network, caching, fonts, images |
| [Accessibility mastery](references/accessibility.md) | Semantic HTML, ARIA, keyboard, focus, screen reader, contrast, dynamic type, reduced motion |
| [SEO playbook](references/seo.md) | Meta tags, headings, structured data, canonicals, sitemaps, robots, internal linking, content quality |
| [UI/UX principles](references/ui-ux.md) | Touch targets, navigation, density, hover/press/focus states, hierarchy, empty/loading/error states |
| [Design aesthetics](references/design.md) | Typography, color theory, spacing, composition, atmosphere, dark/light parity, avoiding AI slop |
| [Responsive layout](references/responsive.md) | Breakpoints, mobile-first, container queries, fluid typography, safe areas, viewport units |
| [Motion and animation](references/motion.md) | Timing, easing, principles, reduced-motion, transform-only, choreography |
| [Forms and feedback](references/forms.md) | Validation, error placement, autofill, autosave, success/error states, multi-step flows |
| [Data visualization](references/data-viz.md) | Chart selection, axes, legends, color, accessibility, large datasets |
| [Pre-launch checklist](references/pre-launch.md) | Final verification gate before declaring a page complete |
| [Multi-page audit workflow](references/audit-workflow.md) | Auditing or polishing an existing multi-page site against a reference; route-by-route capture, fix, and verify procedure |
| [Component discipline](references/components.md) | Standardizing repeated widgets, defining component contracts, detecting drift across pages |
| [Visual defects and geometry checks](references/defects.md) | Symptom-to-fix lookup for common visible defects and the canonical programmatic geometry sweep |

## Workflow

### 1. Frame the work

Before writing code, capture:

- **Audience and intent**: who is using this, and what task are they trying to complete (discovering, comparing, deciding, doing the job, recovering from error)
- **Indexability**: is this surface indexed by search engines, or behind authentication? (Affects SEO requirements only; performance and accessibility bars are universal.)
- **Aesthetic direction**: pick one bold lane (refined-minimal, editorial, brutalist, organic, retro-futuristic, luxury, playful, industrial). See [design.md](references/design.md). Refuse to default to "Inter on white with a purple gradient".
- **Constraints**: render strategy (SSR / SSG / CSR / ISR / streaming / islands / resumable), hydration model, browser support floor, locale, writing direction (LTR / RTL)

The rendered browser is the source of truth at every phase. Do not judge visual quality from code alone; capture screenshots, compare against the reference, fix, and re-capture. When the work is auditing or polishing an existing multi-page site rather than building new, switch to the 19-phase Multi-Page Polish Loop below; the strategic frame above still applies.

### 2. Plan the structure

- One H1 per page. Sequential H2 -> H3, no skipped levels.
- Land the LCP element in the first viewport. It must be a real, served asset with declared dimensions, not lazy-loaded, not behind hydration.
- Reserve space for every async element (image, video, ad, embed, late-injected component) using `aspect-ratio`, fixed height, or skeleton.
- Place navigation, primary action, and trust signals above the fold on the relevant device class.
- Decide which sections are server-rendered, which are streamed, which are deferred, and which are client-only. Justify every client-only choice.

### 3. Build with budgets

For each surface, declare and verify:

- JS payload budget (initial route, gzipped)
- CSS payload budget (initial route, gzipped)
- Image payload budget (above-the-fold)
- Font budget (families, weights, subsets, byte total)
- Third-party script budget (count and total ms of main-thread time)

Reject any addition that breaks a budget without an explicit, recorded waiver.

### 4. Verify

Run the full Lighthouse + axe + visual + responsive + dark-mode + reduced-motion + keyboard + screen-reader pass before declaring the work complete. See [pre-launch.md](references/pre-launch.md).

## Multi-Page Polish Loop

When the work is auditing or polishing an existing multi-page site, **read [audit-workflow.md](references/audit-workflow.md) first** for the full procedure (operating rules, capture script, per-phase detail, final acceptance gate). The 19 phases below are the index; deep links jump into the corresponding sections. Component extraction discipline lives in [components.md](references/components.md); the defect lookup and geometry sweep live in [defects.md](references/defects.md).

1. **Discover Context**: identify project root, build system, source directories, dev server, reference target, and route scope.
2. **Inventory Routes**: build a route list from links, sitemaps, route manifests, and known required pages.
3. **Inventory Repeated Widgets**: catalogue the 11 widget families across routes; record source, contract, and variants.
4. **Capture Baseline**: screenshot every route at `1440x900` and `375x812` before editing.
5. **Capture Reference**: screenshot the reference target at the same viewports.
6. **Audit Each Route**: walk header, hero, sections, cards, buttons, typography, color, images, forms, footer, and responsive behavior at each viewport.
7. **Prioritize Fixes**: broken routes first, then global shell, then cross-page widget drift, then cross-page component defects, then page-specific issues.
8. **Patch With Component Discipline**: fix the canonical contract, not page-local CSS.
9. **Patch With Design Discipline**: tokens first; stable dimensions, gap, max-width, focus-visible, and per-role image loading.
10. **Verify After Every Fix Group**: rebuild, re-capture, side-by-side compare; check shared components on every route.
11. **Run Programmatic Geometry Checks**: viewport overflow, text overflow, sub-44 targets, duplicate arrows, dropdown centering, drawer scroll-lock, focus presence.
12. **Component Drift Checks**: collect computed styles and bounding boxes per family across pages; flag unexplained differences.
13. **Interaction QA**: open dropdowns, drawers, modals, tabs; verify Esc, outside-click, scroll-lock, focus ring, accessible names.
14. **Accessibility Validation**: lang, main, headings, labels, alt, contrast, focus order, no traps, skip link.
15. **Lighthouse and Performance Polish**: responsive `srcset`, intrinsic dimensions, LCP preload, lazy below the fold, font budget.
16. **Reference-Level Design Heuristics**: 16 yes-or-no quality tests against the reference target.
17. **Common Defects and Fixes**: 29-row symptom-to-fix lookup; apply the standard fix at the right layer.
18. **Deliverables**: per-page checklist, widget inventory, before-and-after screenshots, validation summary.
19. **Final Acceptance Gate**: 16-item binary checklist; not done until every item is yes.

## Quick Reference: The 35 Highest-Leverage Rules

A condensed view. Every rule has a longer treatment in the references.

### Performance (the levers that actually move the score)

1. **One LCP image, optimized end-to-end.** Serve AVIF first, WebP fallback, responsive `srcset` with at least 3 widths, declared `width`/`height`, `fetchpriority="high"`, no lazy-load, preload only if the image is rendered by client JS.
2. **Inline critical CSS for above-the-fold; defer the rest.** Aim for under 14 KB of inline CSS so it fits in the first TCP round trip.
3. **Self-host fonts, subset to used glyphs, `font-display: swap` for body, `optional` for display.** Preload at most one critical font weight. Never preload 4 weights.
4. **Cap initial JS at the budget.** Code-split by route and by interaction. Defer hydration of below-the-fold islands. Prefer server components or static HTML where possible.
5. **No layout-shifting late content.** Reserve space with `aspect-ratio`, `min-height`, or skeletons. The CLS budget is < 0.1 mobile / < 0.05 desktop.
6. **Animate only `transform` and `opacity`.** Anything that triggers layout (width/height/top/left/margin) is forbidden in animations.
7. **Pin third-party scripts to async/defer with `fetchpriority="low"`.** Treat every third-party script as a Lighthouse hostage. Audit count and total CPU monthly.
8. **Cache aggressively at the edge.** Static assets get immutable + 1 year. HTML gets stale-while-revalidate. API responses get the longest TTL the data allows.

### Accessibility (the levers that actually move the score AND help real users)

9. **Semantic HTML first; ARIA only where semantics fall short.** A `<button>` beats `<div role="button">` every time.
10. **Contrast >= 4.5:1 for body, >= 3:1 for large text and meaningful UI graphics.** Verify in both light and dark mode separately.
11. **Visible focus on every interactive element**, with 2-4px outline and 3:1 contrast against the surface and against the element's resting state.
12. **One H1; sequential headings; no skipped levels; no headings used as styling hooks.**
13. **Every input has a programmatic label.** Placeholder is not a label.
14. **Every meaningful image has descriptive alt; every decorative image has `alt=""`.**
15. **Keyboard parity.** Everything reachable by mouse must be reachable, operable, and visible-when-focused by keyboard.
16. **Respect `prefers-reduced-motion`** by removing or shortening non-essential animation, never by leaving full motion in place.

### SEO (the levers that actually move the score AND drive traffic)

17. **Unique, intent-matching `<title>` and `<meta name="description">` per page.** 50-60 char title, 140-160 char description.
18. **Self-referencing canonical on every indexable page.** No conflicting canonicals between hreflang variants.
19. **One H1 with the primary intent term used naturally.** Sequential H2/H3.
20. **Descriptive, kebab-case, lowercase URLs without tracking params in canonical.**
21. **JSON-LD structured data where applicable** (Organization, WebSite, BreadcrumbList, Article, FAQPage, Product, SoftwareApplication, HowTo).
22. **Internal linking with descriptive anchor text.** No "click here". No orphan pages.
23. **`robots: index, follow` on indexable pages**, `noindex` on private, search-result, or duplicate pages.
24. **XML sitemap lists only canonical, indexable, 200-status URLs**, referenced from robots.txt.

### UI/UX (the levers that move perceived quality)

25. **Touch targets >= 44x44pt** (iOS) or **>= 48x48dp** (Android), with 8px+ spacing between adjacent targets.
26. **Every async action has loading -> success/error feedback within 100ms of the trigger.** Skeleton screens beat spinners after 300ms.
27. **One primary CTA per screen.** Secondary actions visually subordinate; destructive actions visually separated.
28. **State the empty state.** Empty lists, empty searches, and zero-data charts get a specific message, not a blank canvas.

### Design (the levers that move "this looks designed")

29. **Pick a distinctive type pairing.** Refuse Inter + system-ui defaults. Pair a characterful display face with a refined body face. Cap to 2 families and 4 weights.
30. **Commit to a dominant color with one or two sharp accents.** Timid, evenly-distributed palettes read as generic. Use semantic tokens, never raw hex in components.

### Multi-page consistency (the levers that prevent cross-page drift)

31. **Extract repeated markup at the third instance** (or at the second with clear future reuse, or at any visible drift). One source of truth or one named variant; no third option.
32. **No page-local CSS overrides on shared widgets.** Components own their visual contract; pages adjust only what the component exposes.
33. **Capture before-and-after screenshots at `1440x900` and `375x812` for every visible change.** Vague claims of improvement without screenshot evidence are not evidence.
34. **Re-render every route after every fix group on shared widgets.** A global change verified on one page is not verified.
35. **Geometry sweep returns zero issues at both audit viewports** (viewport bleed, text overflow, sub-44 targets, duplicate arrows, drawer scroll-lock, focus presence). See [defects.md](references/defects.md).

## Self-Improvement

After applying this skill, before declaring work complete:

- Did Lighthouse run on real production builds (not dev mode) with throttled mobile and desktop presets?
- Did axe (or equivalent) run with zero violations on every changed page?
- Did the page render correctly at 320px, 375px, 768px, 1024px, 1280px, and 1920px?
- Did the page render correctly in light and dark mode independently (not by CSS-inverting one)?
- Did the page render correctly with `prefers-reduced-motion: reduce`?
- Did the page work end-to-end with keyboard only?
- Did the page survive a screen reader pass (VoiceOver or NVDA) for the primary task?
- Did the LCP element ship with `fetchpriority="high"`, declared dimensions, and a real served asset?
- Did all custom fonts load with `font-display` set, and is the count <= 2 families / 4 weights?
- Did every async section reserve space?
- Did every interactive element have visible focus and meet contrast?
- Did the page expose unique title, description, canonical, OG, Twitter, and (where applicable) JSON-LD?

For multi-page audit and polish work, also confirm:

- Was a widget inventory built for every shared family (header, hero, section, CTA, card, media, list, interactive, empty, legal, 404)?
- Were baseline screenshots captured at `1440x900` and `375x812` before any edits?
- Were after screenshots captured at `1440x900` and `375x812` for every changed route?
- Did the geometry sweep return zero issues on every audited route at both viewports?
- Did the drift collector return no unexplained differences for any shared widget family?
- Was a per-route audit table (issues found, fixes applied, before, after) delivered with the change?

If any answer is "no" or "not checked", the work is not done.
