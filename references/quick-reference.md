---
title: Quick Reference
purpose: The condensed view of the highest-leverage rules across performance, accessibility, SEO, UI/UX, design, and multi-page consistency. Scan against any change.
load-when:
  task-keywords: [rule, quick reference, highest leverage, condensed view, checklist]
  symptoms: [score dropped, contrast fail, touch target too small, duplicate id, layout shift]
prereq: SKILL.md
related: [pre-launch.md, lighthouse.md, performance.md, accessibility.md]
size: ~80 lines
---

# Quick Reference: The 41 Highest-Leverage Rules

A condensed view. Every rule has a longer treatment in the references. New rules and refinements land here as the skill grows; check the file's `git log` if a numbered cross-reference looks off.

## Performance (the levers that actually move the score)

1. **One LCP image, optimized end-to-end.** Serve AVIF first, WebP fallback, responsive `srcset` with at least 3 widths, declared `width`/`height`, `fetchpriority="high"`, no lazy-load, preload only if the image is rendered by client JS.
2. **Inline critical CSS for above-the-fold; defer the rest.** Aim for under 14 KB of inline CSS so it fits in the first TCP round trip.
3. **Self-host fonts, subset to used glyphs, `font-display: swap` for body, `optional` for display.** Preload at most one critical font weight. Never preload 4 weights.
4. **Cap initial JS at the budget.** Code-split by route and by interaction. Defer hydration of below-the-fold islands. Prefer server components or static HTML where possible.
5. **No layout-shifting late content.** Reserve space with `aspect-ratio`, `min-height`, or skeletons. The CLS budget is < 0.1 mobile / < 0.05 desktop.
6. **Animate only `transform` and `opacity`.** Anything that triggers layout (width/height/top/left/margin) is forbidden in animations.
7. **Pin third-party scripts to async/defer with `fetchpriority="low"`.** Treat every third-party script as a Lighthouse hostage. Audit count and total CPU monthly.
8. **Cache aggressively at the edge.** Static assets get immutable + 1 year. HTML gets stale-while-revalidate. API responses get the longest TTL the data allows.
9. **Unique ids in reused components.** A component with a hardcoded DOM `id` produces duplicate ids when rendered more than once (invalid HTML, broken ARIA). Derive a per-instance id (`useId()` or equivalent) and namespace child ids.
10. **Verify the shipped artifact.** Check copied static files and headers (a `_headers` file, robots.txt, security headers) in the BUILT output and the live response, not just source.

## Accessibility (the levers that actually move the score AND help real users)

11. **Semantic HTML first; ARIA only where semantics fall short.** A `<button>` beats `<div role="button">` every time.
12. **Contrast >= 4.5:1 for body, >= 3:1 for large text and meaningful UI graphics.** Verify in both light and dark mode separately.
13. **Visible focus on every interactive element**, with 2-4px outline and 3:1 contrast against the surface and against the element's resting state.
14. **One H1; sequential headings; no skipped levels; no headings used as styling hooks.**
15. **Every input has a programmatic label.** Placeholder is not a label.
16. **Every meaningful image has descriptive alt; every decorative image has `alt=""`.**
17. **Keyboard parity.** Everything reachable by mouse must be reachable, operable, and visible-when-focused by keyboard.
18. **Respect `prefers-reduced-motion`** by removing or shortening non-essential animation, never by leaving full motion in place.

## SEO (the levers that actually move the score AND drive traffic)

19. **Unique, intent-matching `<title>` and `<meta name="description">` per page.** 50-60 char title, 140-160 char description.
20. **Self-referencing canonical on every indexable page.** No conflicting canonicals between hreflang variants.
21. **One H1 with the primary intent term used naturally.** Sequential H2/H3.
22. **Descriptive, kebab-case, lowercase URLs without tracking params in canonical.**
23. **JSON-LD structured data where applicable** (Organization, WebSite, BreadcrumbList, Article, FAQPage, Product, SoftwareApplication, HowTo).
24. **Internal linking with descriptive anchor text.** No "click here". No orphan pages.
25. **`robots: index, follow` on indexable pages**, `noindex` on private, search-result, or duplicate pages.
26. **XML sitemap lists only canonical, indexable, 200-status URLs**, referenced from robots.txt.
27. **AI answer-engine readiness.** Ship an `llms.txt` page index (and optionally an `llms-full.txt` of quotable facts), ensure the AI crawler user-agents are not blocked in robots.txt (a dedicated named group is needed only when it repeats your disallows, since it replaces the `*` group), and keep load-bearing facts in server-rendered text. Generative search reads and cites the rendered HTML and valid structured data, not images or client-only JS.
28. **Never fabricate structured data.** Emit `aggregateRating`, `review`, `sameAs`, and `SearchAction` only when each is backed by something real (real reviews, real profiles, a working search endpoint). Every JSON-LD value must be derivable from visible content.

## UI/UX (the levers that move perceived quality)

29. **Touch targets >= 44x44 CSS px for standalone controls** (the iOS 44pt / Android 48dp guideline), with 8px+ spacing. Inline text links (breadcrumbs, in-prose links, footer text lists) are exempt under WCAG 2.5.8; do not inflate them to 44px, it reads as broken. Reserve the large target for buttons, toggles, icon buttons, and CTAs.
30. **Every async action has loading -> success/error feedback within 100ms of the trigger.** Skeleton screens beat spinners after 300ms.
31. **One primary CTA per screen.** Secondary actions visually subordinate; destructive actions visually separated.
32. **State the empty state.** Empty lists, empty searches, and zero-data charts get a specific message, not a blank canvas.
33. **The mobile nav must work without JavaScript.** If the small-screen nav is JS-driven (a disclosure, an island, a media-gated component), ship a `<noscript>` fallback nav or render the links in static HTML and enhance, so the links exist before and without hydration.
34. **Scroll-lock without a sideways jump.** When locking body scroll for a modal, reserve the scrollbar width as `padding-right` (`window.innerWidth - document.documentElement.clientWidth`) and restore it on close, or the page shifts when the scrollbar disappears.

## Design (the levers that move "this looks designed")

35. **Pick a distinctive type pairing.** Refuse Inter + system-ui defaults. Pair a characterful display face with a refined body face. Cap to 2 families and 4 weights.
36. **Commit to a dominant color with one or two sharp accents.** Timid, evenly-distributed palettes read as generic. Use semantic tokens, never raw hex in components.

## Multi-page consistency (the levers that prevent cross-page drift)

37. **Extract repeated markup at the third instance** (or at the second with clear future reuse, or at any visible drift). One source of truth or one named variant; no third option.
38. **No page-local CSS overrides on shared widgets.** Components own their visual contract; pages adjust only what the component exposes.
39. **Capture before-and-after screenshots at `1440x900` and `375x812` for every visible change.** Vague claims of improvement without screenshot evidence are not evidence.
40. **Re-render every route after every fix group on shared widgets.** A global change verified on one page is not verified.
41. **Geometry sweep returns zero issues at both audit viewports** (viewport bleed, text overflow, sub-44 targets, duplicate arrows, drawer scroll-lock, focus presence). See [defects.md](defects.md).

## See also

- [pre-launch.md](pre-launch.md) for the verification gate to score these rules against
- [lighthouse.md](lighthouse.md) for the Lighthouse audit map underpinning rules 1 through 26
- [performance.md](performance.md), [accessibility.md](accessibility.md) for the depth behind each rule
