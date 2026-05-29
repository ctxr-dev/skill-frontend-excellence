---
title: Performance Deep Dive
purpose: Core Web Vitals discipline, asset loading, render strategy, hydration, network, caching, fonts, images, INP field attribution, BFCache, list virtualization, third-party script discipline.
load-when:
  task-keywords: [LCP, INP, CLS, TTFB, performance, bundle, hydration, render strategy, BFCache, preload, prefetch, Speculation Rules, Early Hints, fetchpriority, LoAF]
  symptoms: [LCP regression, INP regression, CLS regression, slow page, score dropped, bundle size grew, third-party script slow]
prereq: SKILL.md
related: [lighthouse.md, audit-workflow.md, defects.md, motion.md]
size: ~650 lines
---

# Performance Deep Dive

Lighthouse measures the symptoms; this document is about the underlying causes and the levers you actually pull. Framework-agnostic.

## Mental Model: The Loading Pipeline

Every page goes through these phases:

1. **Network**: DNS, TCP, TLS, HTTP (request -> first byte). Controlled by edge config and resource hints.
2. **HTML parse**: browser reads HTML, discovers sub-resources. Controlled by HTML structure and `<link>` order.
3. **CSS parse + render-tree build**: blocked by stylesheets in `<head>`. Controlled by critical CSS.
4. **JS download + parse + execute**: blocked by sync scripts. Controlled by `defer`/`async`/module strategy.
5. **First paint**: when something visible appears.
6. **LCP paint**: when the largest-in-viewport element finishes painting.
7. **Hydration / interactivity**: when JS attaches event handlers and the page becomes responsive (TBT/INP).
8. **Lazy phase**: below-the-fold images, non-critical scripts, deferred islands.

Every optimization moves work between phases or eliminates it. The cheapest optimization is the work you don't do.

## Core Web Vitals: What Each Means and How to Move It

### Largest Contentful Paint (LCP)

LCP is the render time of the largest text block, image, video poster, or background image in the initial viewport. Target: < 2.5s mobile, < 2.0s desktop.

**The four phases of LCP** (from Google's framework):

| Phase | Typical share | Lever |
|-------|--------------|-------|
| TTFB (server response) | 25-40% | Edge caching, server location, route compute |
| Resource load delay | 0-30% | Preconnect, preload, critical-CSS inlining, font preload |
| Resource load duration | 30-60% | Compression, format (AVIF/WebP), responsive sizing |
| Render delay | 0-20% | Render-blocking JS/CSS, font swap, hydration cost |

**Concrete LCP fixes, ordered by impact:**

1. **Identify the LCP element.** Open DevTools -> Performance -> capture a load -> find the LCP marker. The element will be named.
2. **If it's an image:**
   - Serve AVIF as the 2026 default (Baseline since 2024, supported in every evergreen engine). Keep a WebP source for users on older releases, and a JPEG only as the universal `<img>` fallback. Compression: AVIF q=50-65, WebP q=75-82.
   - Use `<picture>` with type-keyed sources.
   - Set `width` and `height` (or `aspect-ratio`) to prevent CLS.
   - Add `fetchpriority="high"`.
   - Never `loading="lazy"` on the LCP image.
   - Use `srcset` with at least 3 widths, plus `sizes` matching the rendered box.
   - Preload only when the image is rendered by client JS (CSR/hydration). Server-rendered `<img>` does not need preload.
3. **If it's text:**
   - Ensure the font that renders it is preloaded: `<link rel="preload" as="font" type="font/woff2" crossorigin>`.
   - Set `font-display: swap` so fallback shows immediately.
   - Use `size-adjust`, `ascent-override`, `descent-override`, `line-gap-override` on `@font-face` to match metric to fallback and prevent CLS on swap.
   - Avoid web fonts entirely for the largest hero text if possible (use a system stack).
4. **If it's a video poster:** treat as image; add `poster` attribute, declare dimensions.
5. **Reduce TTFB:**
   - Cache HTML at the edge with `s-maxage` + `stale-while-revalidate`.
   - Move compute close to users (edge functions, regional deploy).
   - Avoid blocking origin compute on slow data fetches; stream HTML if the framework supports it.

### Interaction to Next Paint (INP)

INP measures the slowest interaction during the page lifetime. Target: < 200ms (good), < 500ms (needs improvement).

INP is dominated by:

- Long tasks during the interaction (event handler running > 50ms)
- Long tasks blocking the next paint after the handler returns
- Synchronous layout reads in handlers
- Large React/Vue/Svelte re-render triggered by the interaction

**Levers:**

1. Break long tasks. Use `scheduler.yield()` (or `setTimeout(fn, 0)` / `requestIdleCallback` fallback) to chunk work.
2. Move expensive work off the main thread (Web Workers, OffscreenCanvas).
3. Avoid sync layout thrash: batch reads, then writes. Read all `getBoundingClientRect()` once, then write.
4. Memoize expensive renders. In React, use `useMemo`, `useCallback`, `React.memo`. In Vue, `computed`. In Svelte, `$derived` (Svelte 5).
5. Use CSS for state when possible (`:hover`, `:active`, `:focus-visible`, `:has()`, `:checked`, popover API) instead of JS state updates.
6. For large lists, virtualize with libraries like TanStack Virtual or framework-native.
7. For input fields, debounce expensive computations (search, validation) with 150-300ms debounce.

**INP attribution recipe (field-side):**

Lab Lighthouse cannot meaningfully score INP. Attribute it from real users instead. Two complementary observers, both sampled and shipped via `sendBeacon`:

1. `PerformanceObserver` on `event` (entry type `event`) gives every interaction's duration, target, and processing time. Filter for `duration > 40ms` to keep the volume manageable.
2. `PerformanceObserver` on `long-animation-frame` (LoAF) gives the frame that paid for the next paint, including the scripts that ran, their source URLs, and any forced-style or forced-layout work. INP is the slowest interaction, but LoAF is what made it slow.
3. The `web-vitals/attribution` build packages both: the `onINP` handler returns `attribution` with `targetElement`, `eventTarget` (a CSS selector), `eventType`, `loadState`, and the longest LoAF script `sourceURL`. Ship that, not just the metric value.

```html
<script type="module">
  import { onINP } from 'https://unpkg.com/web-vitals@4/attribution?module';
  onINP((metric) => {
    const a = metric.attribution;
    navigator.sendBeacon('/rum/inp', JSON.stringify({
      value: metric.value,
      rating: metric.rating,
      eventTarget: a.eventTarget,
      eventType: a.eventType,
      loadState: a.loadState,
      longAnimationFrame: a.longAnimationFrameEntries?.[0]?.scripts?.[0]?.sourceURL,
    }));
  }, { reportAllChanges: false });
</script>
```

The two highest-signal columns in the resulting dataset are `eventTarget` (which control is slow) and `longAnimationFrame.scripts[0].sourceURL` (which script paid the cost). Together they point at the fix.

### Cumulative Layout Shift (CLS)

CLS sums the layout-shift scores during the page session. Target: < 0.1 (mobile), < 0.05 (desktop).

**Common shift sources:**

- Images without dimensions
- Iframes/embeds without dimensions
- Late-loading fonts causing text re-flow (FOUT)
- Late-injected banners (cookie consent, promo bars)
- Ads injected above existing content
- Animations that change layout (width/height/top/left/margin)
- Scrollbar appearance/disappearance on overflow change

**Fixes:**

1. Declare `width` and `height` on every `<img>`, `<iframe>`, `<video>`. Use `aspect-ratio` for fluid layouts.
2. Reserve space for late content with `min-height` or skeletons.
3. Cookie/consent banners go below the fold or as overlay (fixed position, not in document flow).
4. For font swap, use `size-adjust` and `*-override` properties on `@font-face` to size-match the fallback so swap is invisible.
5. Animate only `transform` and `opacity`. Never animate layout-affecting properties.
6. For dynamic content (search results), use `min-height` on the container so the page doesn't grow as results arrive.

### Time to First Byte (TTFB)

TTFB is the time from request to first byte received. Target: < 800ms mobile, < 600ms desktop.

**Levers:**

1. Edge cache HTML where possible (SSG, ISR, edge functions).
2. Use a CDN with global PoPs (Cloudflare, Fastly, CloudFront, Vercel Edge).
3. For dynamic pages, stream the response so the first byte arrives before all data is fetched.
4. Move compute to the edge (Cloudflare Workers, Vercel Edge, Deno Deploy).
5. Profile the server route. Look for serial DB calls, slow third-party APIs, cold starts.

## JavaScript Strategy

### Render strategies

The render-strategy decision tree (SSG, ISR, SSR, streaming SSR, CSR, islands, resumability) is promoted to SKILL.md under `Decision: Render Strategy`. Decide there first, then return here for the implementation levers.

### Streaming SSR and the shell-plus-stream envelope

Streaming SSR (and React Server Components on top of it) is the framework-neutral pattern that beats both classic SSR (slow TTFB) and CSR (slow LCP) when the page depends on slow data. The envelope is the same in every framework:

1. The server flushes a complete HTML shell first: `<head>`, critical CSS, navigation, footer, layout containers. Nothing in the shell awaits data.
2. The slow regions are wrapped in Suspense (or the framework's equivalent boundary) and rendered as placeholders in the shell.
3. As each async data fetch resolves, the server streams an HTML chunk plus a tiny inline script that replaces the placeholder in-place. No client round trip.

Rules that make the envelope work:

- The `<head>` must not wait. No data-dependent `<title>`, `<meta>`, or canonical in the shell stream; resolve them statically per route or stream them as out-of-order chunks.
- Suspense boundaries are budget gates. Each one is a region the user can see before the data inside it arrives, so name them per UX intent (`<Suspense>` around "Reviews", "Related products"), not per technical boundary.
- The shell is the LCP candidate, not the streamed regions. Put the hero image in the shell; everything below the fold can stream.
- Verify with a slow-network capture (DevTools, Slow 3G). The shell paints fast and the regions fill in; if the page is blank until everything resolves, a boundary is in the wrong place.

### Hydration cost

The cost is roughly: bundle parse + module init + component constructor + diff against existing DOM. For React 18+:

- Server components don't ship JS at all. Use them for static structure.
- `'use client'` boundaries should be small leaves, not big trees.
- Lazy hydrate below-the-fold islands with `<Suspense>` + dynamic import or framework helpers.

For other frameworks:

- **Astro**: islands by default. Mark client components with `client:idle`, `client:visible`, `client:load` per criticality.
- **Qwik**: resumability instead of hydration. Components don't re-execute on the client unless the user interacts.
- **SvelteKit**: SSR + selective client. Use `<svelte:head>`, route-level `+page.server.ts`.
- **Vue/Nuxt**: similar tradeoffs to React. `<NuxtIsland>` for partial hydration.
- **Solid Start**: SSR + reactive primitives, low hydration cost.

### Bundle splitting

Default splits:

- Per route (every framework supports this).
- Per dynamic import (lazy-loaded modal, chart, editor).
- Per third party (vendor chunk).

Anti-patterns:

- One giant `vendor.js`. Split heavy libs (chart, editor, video player) so they only load on pages that use them.
- Importing default exports of barrel files. They prevent treeshaking. Import named exports directly: `import { foo } from 'lib/foo'`, not `import { foo } from 'lib'`.
- Dev-only code shipped to production. Wrap with `process.env.NODE_ENV !== 'production'` (or framework equivalent) so the bundler tree-shakes it.

### Treeshaking

For treeshaking to work:

- Use ES modules end-to-end (`"type": "module"` or `.mjs`).
- Mark library `package.json` with `"sideEffects": false` (or list specific files with side effects).
- Avoid importing entire libraries: `import _ from 'lodash'` blocks treeshaking; use `import debounce from 'lodash/debounce'` or replace with native.

## Image Strategy

### Format priority

1. **AVIF** for photographic content. ~50% smaller than JPEG at equal quality.
2. **WebP** as fallback for older browsers (Safari < 16). ~30% smaller than JPEG.
3. **JPEG** as final fallback. Use mozjpeg with quality 75-82 and progressive=true.
4. **PNG** only for graphics with transparency that AVIF/WebP can't handle (rare).
5. **SVG** for icons, logos, illustrations. Inline when small (< 1 KB), reference when large.

### Responsive images

Every non-trivial image needs `srcset` and `sizes`:

```html
<picture>
  <source
    type="image/avif"
    srcset="/img/hero-480.avif 480w, /img/hero-960.avif 960w, /img/hero-1440.avif 1440w"
    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 1280px"
  />
  <source
    type="image/webp"
    srcset="/img/hero-480.webp 480w, /img/hero-960.webp 960w, /img/hero-1440.webp 1440w"
    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 1280px"
  />
  <img
    src="/img/hero-960.jpg"
    width="1440"
    height="900"
    alt="..."
    fetchpriority="high"
    decoding="async"
  />
</picture>
```

When a high-resolution master exists only for a zoom, lightbox, or fullscreen view, do not ship it inline. Serve small responsive `srcset` widths (for example 640, 960, 1280) for the inline thumbnail, and load the full-resolution master only when the user opens the fullscreen view. A multi-thousand-pixel master is often hundreds of KB; serving it to a phone for a thumbnail wastes the entire image budget. The inline image and the fullscreen image are two different sources for the same asset.

### Lazy loading

- `loading="lazy"` on every `<img>` and `<iframe>` below the fold.
- `<iframe loading="lazy">` is the cheapest single win for any page that embeds a YouTube player, a Google Map, a Twitter / X timeline, a Vimeo embed, or a third-party widget. A typical YouTube embed costs 500 KB to 1 MB plus its own JS execution; deferring it past first paint can recover 10 to 20 Lighthouse points on a content page.
- Never on the LCP image.
- For video, use `preload="metadata"` and lazy-load the actual video on user interaction.

### Aspect-ratio reservation

For fluid layouts where width is dynamic but aspect ratio is known:

```css
.hero-image {
  aspect-ratio: 16 / 9;
  width: 100%;
  height: auto;
}
```

This reserves space and prevents CLS without hardcoding pixel dimensions.

## Font Strategy

Web fonts are one of the largest performance regressions any surface can absorb. Treat them as a budget.

### Budget

- Maximum 2 font families per page (1 display + 1 body, or 1 family with multiple weights).
- Maximum 4 weights total.
- Subset to the languages you actually serve (Latin, Latin-extended, Cyrillic, etc.).
- Use variable fonts when available; one variable file replaces 3-5 static weights.
- Self-host. Google Fonts CDN is OK but adds an extra DNS lookup; self-hosted is faster.

### Loading strategy

```html
<!-- Preload the critical body font, woff2 only -->
<link rel="preload" as="font" type="font/woff2" href="/fonts/body-regular.woff2" crossorigin />
```

Preload the asset the build actually emits, do not hardcode the filename. Build pipelines fingerprint assets (`body-regular.9f3a2c.woff2`), and the hash changes whenever the file changes. A hardcoded `<link rel="preload" href="/fonts/body-regular.woff2">` then points at a file that no longer exists: the preload silently does nothing and the LCP regresses with no error. Resolve the href from the build (import the asset and interpolate its emitted URL, or read the build manifest) so the preload always matches the shipped file. Same rule for any preloaded image or script.

```css
@font-face {
  font-family: 'BrandBody';
  src: url('/fonts/body-regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  /* CLS-prevention: match metrics to a fallback */
  size-adjust: 100%;
  ascent-override: 90%;
  descent-override: 22%;
  line-gap-override: 0%;
}
```

- `font-display: swap` for body fonts: shows fallback, then swaps. Slight FOUT, no FOIT.
- `font-display: optional` for display fonts when network is poor: shows fallback only if font isn't ready in 100ms. Best for LCP.
- `font-display: block` is forbidden in production (causes invisible text / FOIT).

## CSS Strategy

### Critical CSS

The first 14 KB of HTML fits in one TCP round trip. Inline the CSS needed to render the first viewport here. Defer the rest.

Two common approaches:

1. **Build-time critical CSS extraction** (Critters, Penthouse). Works for static pages.
2. **Component-scoped CSS** that ships only what's used (CSS Modules, vanilla-extract, Tailwind in JIT mode). Works for any framework.

### Defer non-critical CSS

```html
<link
  rel="preload"
  href="/css/below-fold.css"
  as="style"
  onload="this.rel='stylesheet'"
/>
<noscript><link rel="stylesheet" href="/css/below-fold.css" /></noscript>
```

Or:

```html
<link rel="stylesheet" href="/css/below-fold.css" media="print" onload="this.media='all'" />
```

### Avoid CSS bloat

- Run a production purge step (PurgeCSS, Tailwind JIT, UnoCSS).
- Avoid loading entire UI library themes (Material UI base CSS, Bootstrap full theme). Import only what's used.
- Use logical properties (`margin-inline`, `padding-block`) so RTL works without duplicating rules.

## Network Strategy

### Resource hints

Use sparingly. Every hint costs a connection slot.

- `dns-prefetch`: lowest cost, just resolves DNS. Use for low-priority third parties.
- `preconnect`: DNS + TCP + TLS. Use for high-priority third parties (your CDN, your API origin).
- `preload`: forces an early fetch. Use only for critical resources (LCP image, critical font).
- `prefetch`: low-priority hint for next-page resources. Use for likely next navigation.
- `modulepreload`: for ES module dependencies.

Anti-patterns:

- Preloading every font weight. Pick one or two.
- Preconnecting to 10+ origins. Pick three.
- Preloading images that are already discovered in the HTML. Wasteful.

### `fetchpriority` beyond images

`fetchpriority` is a hint to the browser's resource scheduler. It applies to `<link>`, `<script>`, `<img>`, and `fetch()`. Three high-leverage uses:

- `fetchpriority="high"` on the critical CSS preload (`<link rel="preload" as="style" fetchpriority="high">`) so it outranks images and fonts in the queue.
- `fetchpriority="high"` on the hero font preload and on the critical JS module that the LCP depends on.
- `fetchpriority="low"` on every third-party script tag, every below-the-fold image preload, and any analytics / ads `fetch()`. This tells the browser to deprioritise them behind anything that paints.

The browser still decides; the hint shifts the queue. Pair with `<script async fetchpriority="low">` for third-party tags, and audit Network panel "Priority" column to confirm the hint took effect.

### Speculation Rules API

Speculation Rules let the page tell the browser which next-navigations to prefetch or prerender. The browser opens a hidden background page, runs it, and swaps it in instantly when the user clicks. Modern engines support it (Chrome and Edge since 2024; Safari and Firefox progressively enhancing).

```html
<script type="speculationrules">
{
  "prerender": [
    { "source": "list", "urls": ["/pricing", "/docs"], "eagerness": "moderate" }
  ],
  "prefetch": [
    { "source": "document", "where": { "href_matches": "/blog/*" }, "eagerness": "conservative" }
  ]
}
</script>
```

Pick the rule by intent:

- `prerender` runs the next page (HTML, CSS, JS) in the background. Instant navigation. Costly. Use for the two or three most likely next pages.
- `prefetch` downloads the bytes but does not execute. Cheaper. Use for likely pages where prerender would be wasteful.

`eagerness` tunes how aggressively the browser acts on the rule:

- `eager`: fire as soon as the rule is parsed. Use only for one or two near-certain next pages.
- `moderate` (default for hover / focus): fire on hover or focus on a matching link.
- `conservative`: fire on `pointerdown`. Cheapest hint with the most user-intent signal.

Anti-patterns: prerender every link (burns CPU and bandwidth, blocks BFCache), prerender pages with auth side effects in the loader (the loader runs in the prerender), prerender pages that mutate analytics on load (you will double-count).

### Early Hints (HTTP 103)

HTTP 103 Early Hints let the CDN send `Link: <...>; rel=preload` headers before the origin even returns the HTML. The browser starts preloading the critical CSS, hero image, and key font during what would otherwise be dead TTFB.

```http
HTTP/1.1 103 Early Hints
Link: </css/critical.css>; rel=preload; as=style
Link: </fonts/body.woff2>; rel=preload; as=font; type=font/woff2; crossorigin
Link: </img/hero.avif>; rel=preload; as=image; fetchpriority=high
```

The final `200` follows with the full HTML. Major CDNs (Cloudflare, Fastly, Akamai) emit 103 either automatically from `<link rel="preload">` in the HTML or via an explicit edge directive. The win is real on slow-origin pages (200 to 400ms of LCP recovered) and zero on already-fast pages, so prioritise it where TTFB dominates LCP.

### BFCache hygiene

The back/forward cache (BFCache) snapshots the live page state when the user navigates away and restores it instantly on back / forward. A page that qualifies returns in under 100ms; a page that does not pays the full reload cost. For a returning user, qualifying is the single largest perceived-performance win available.

Rules to qualify:

- Replace `unload` listeners with `pagehide` and `visibilitychange`. Any `unload` listener disqualifies the page. The Lighthouse `no-unload-listeners` audit catches it; verify in third-party scripts too.
- Audit `Cache-Control: no-store` on HTML responses. `no-store` disqualifies BFCache. Most pages do not need it; reserve it for genuinely sensitive routes (post-login dashboards with secrets in the HTML).
- Close open `WebSocket` and `IndexedDB` transactions on `pagehide`. An open connection disqualifies the page in some engines.
- Avoid `Cache-Control: no-cache` plus a redirect; the round trip defeats the purpose.

Verify with the `NotRestoredReasons` API: in the `pageshow` handler, `event.notRestoredReasons` returns the structured list of blockers (with `src`, `reason`, and `url`). Ship it through RUM.

```html
<script type="module">
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) return; // BFCache hit; nothing to log
    const reasons = (event.notRestoredReasons || {}).reasons || [];
    if (reasons.length) {
      navigator.sendBeacon('/rum/bfcache', JSON.stringify({
        url: location.pathname,
        reasons,
      }));
    }
  });
</script>
```

The Chrome DevTools Application panel ("Back / forward cache") also runs the diagnostic on demand.

### Compression Dictionaries

Compression Dictionaries (the `Use-As-Dictionary` and `Available-Dictionary` headers, shipping as shared Brotli dictionaries) let a repeat visitor's browser reuse the bytes of a previous response as the dictionary for the next compression. A small JS bundle update can ship as a tiny delta against the previous version's bytes.

The pattern:

1. Serve the first response with `Use-As-Dictionary: "<id>"`. The browser stores it.
2. On the next response for the same resource family, the browser sends `Available-Dictionary: <id>` and the origin (or CDN) emits a shared-Brotli-compressed body keyed to that dictionary.
3. The browser decompresses against the stored dictionary; the wire bytes drop by 70 to 95 percent on small updates.

Use for high-traffic, slowly-changing assets: framework runtime bundles, design-system CSS, large JSON config blobs. Verify CDN support before relying on it (Cloudflare, Fastly, and major CDNs roll this out progressively); fall back to standard Brotli where unsupported. Pure win for repeat visitors; zero cost for first-time visitors.

### ESM-only as an upgrade path

A modern, evergreen-only target unlocks shipping ESM end-to-end:

- `<script type="module">` everywhere; drop the nomodule pair.
- `import maps` (`<script type="importmap">`) let the page resolve bare specifiers (`import { x } from 'lib'`) in the browser without a bundler. Pair with a CDN that serves stable, versioned modules.
- Module workers (`new Worker(url, { type: 'module' })`) let workers share code with the main thread via `import` rather than `importScripts`.
- Set `browserslist` to evergreen-only (`['>0.5%', 'not dead', 'not op_mini all', 'not ie 11']`) so the bundler stops emitting legacy transforms (`Symbol`, `Map`, `Promise` polyfills, `async`/`await` regenerator). Typical savings: 15 to 30 KB gzipped on the initial bundle.

The upgrade path is incremental: start by setting the browserslist, then drop the nomodule pair, then introduce import maps on routes that do not need the bundler's tree-shaking. Each step is independently shippable.

### HTTP/2 and HTTP/3

- HTTP/2 multiplexing means many small requests are fine. Don't over-bundle.
- HTTP/3 (QUIC) reduces handshake latency. Most modern CDNs support it; verify with `curl --http3`.

### Compression

- Brotli for static assets. ~20% better than gzip on text.
- gzip as fallback.
- No compression for already-compressed assets (images, video, woff2).

### Caching

| Asset | Cache-Control |
|-------|--------------|
| Versioned static (`/static/abc123.js`) | `public, max-age=31536000, immutable` |
| Versioned image | `public, max-age=31536000, immutable` |
| HTML | `public, max-age=0, s-maxage=300, stale-while-revalidate=86400` |
| API JSON (read-mostly) | `public, max-age=30, s-maxage=60, stale-while-revalidate=300` |
| API JSON (private / per-user) | `private, max-age=0, must-revalidate` |
| Service worker | `no-cache` |

## Third-Party Strategy

Third-party scripts are the silent assassin of Lighthouse scores. Treat them as a budget item.

### Audit

For each third party, record:

- What it does (analytics, ads, chat, embed, A/B test, error tracking)
- Bytes (compressed)
- Main-thread time (Lighthouse third-party-summary)
- Whether it blocks rendering
- Whether removal is acceptable

### Mitigations

1. **Remove first.** Most pages have at least one third party that contributes nothing measurable.
2. **Lazy-load on idle.** Wrap with `requestIdleCallback` or load after `load` event.
3. **Lazy-load on interaction.** Chat widgets load on hover/click of the trigger, not on page load.
4. **Move to a worker.** Use `partytown` to run analytics/ads on a Web Worker so they don't compete for the main thread.
5. **Self-host.** Google Tag Manager and others can be proxied through your own origin to remove the extra connection.
6. **Use a server-side equivalent.** GA4 supports server-side via Measurement Protocol; ad attribution can be server-side; A/B tests can be edge-side.

### Third-party script discipline

The taming playbook for any page where the third-party budget creeps:

**Set the budget.** Two numbers, both enforced in CI via Lighthouse `third-party-summary`:

- Count: at most 5 distinct third-party origins per page.
- Total main-thread time: at most 250ms on the mobile profile, ideally under 150ms.

A page outside the budget is a defect, not a tradeoff.

**Run the monthly audit.** First Monday of the month, take a fresh Lighthouse capture of the top three traffic routes, open `third-party-summary`, list every script with its main-thread cost. For each, decide: keep, defer, sandbox, or remove. A typical month removes one and defers one.

**Pick the load mode by decision matrix:**

| Script intent | Loads on | How | Notes |
|---------------|----------|-----|-------|
| Analytics (page-view ping) | `requestIdleCallback` after `load` | `<script defer fetchpriority="low">` | Tag manager or first-party proxy. Server-side equivalents are stricter. |
| Error tracking (Sentry, Datadog) | Page boot | `<script async fetchpriority="low">` | Must capture early errors; cannot fully defer. Keep this one, budget it. |
| A/B test flicker-prevention | Synchronous in `<head>` | `<script>` with strict timeout | Flicker-prevention scripts blocking render are a known LCP killer; prefer server-side or edge-side experimentation. |
| Chat / support widget | User intent (hover or click of trigger) | Dynamic `import()` on the trigger handler | Almost always defer until the user shows intent. Saves 200 to 500 KB. |
| Ads (display) | After main content paints | `requestIdleCallback` + IntersectionObserver | Lazy-load per ad slot when it scrolls within one viewport of the user. |
| Heavy analytics, marketing tags | Web Worker via `partytown` | `<script type="text/partytown">` | Moves main-thread cost to a worker. Verify the tag tolerates worker context (no DOM access). |

**Sandbox the embed.** Third-party embeds (YouTube, Twitter / X, Vimeo, Maps, social share buttons) should ship inside an `<iframe sandbox>` with the minimum `allow-*` flags:

```html
<iframe
  src="https://www.youtube.com/embed/<id>"
  title="<descriptive title>"
  loading="lazy"
  sandbox="allow-scripts allow-same-origin allow-presentation"
  allow="autoplay; fullscreen; picture-in-picture"
  referrerpolicy="strict-origin-when-cross-origin"
></iframe>
```

The `sandbox` attribute denies storage, navigation, and pop-ups by default and re-grants only what the embed actually needs. The `allow` attribute (Permissions Policy on the frame) gates the powerful APIs.

**Isolate origins for analytics.** Serve analytics through a first-party subdomain (`analytics.your-domain`) with a separate cookie scope. See [security.md](security.md) (cross-origin isolation, CSP for embedded scripts) and [embed-patterns.md](embed-patterns.md) (embed-as-host playbook).

### List virtualization and infinite scroll

A list that ever exceeds 100 to 200 items, or any list that renders rich children (cards with images, charts), is a virtualization candidate. The cost model: 1000 DOM nodes is heavy; 10000 is broken. Lighthouse `dom-size` fails at 1500.

**When to virtualize:**

- The list can grow past 200 items (search results, feed, table).
- Each row has more than 3 DOM nodes (cards, table rows with many columns, embedded media).
- The list is the LCP or near it: a slow first render of a long list moves LCP.

**Two strategies, framework-agnostic:**

1. **Windowing libraries** (TanStack Virtual, `virtua`, framework-native virtualized list components). The library renders only the rows currently in the viewport plus a small overscan buffer, and recycles DOM nodes as the user scrolls. Best for very long lists, complex rows, or when you need precise control over row heights. Pay the cost in JS complexity and a small first-paint hit.
2. **CSS `content-visibility: auto`** with `contain-intrinsic-size`. The browser itself skips render and layout for off-screen blocks. No JS. Best for medium-long lists of similar-sized blocks (article cards, comment threads).

```css
.card {
  content-visibility: auto;
  contain-intrinsic-size: 0 320px; /* width auto, expected height 320px */
}
```

`contain-intrinsic-size` is the height estimate the browser uses while the card is off-screen, so it must be close to the real rendered height; otherwise the scrollbar jumps as cards render. Use the median measured height.

**Infinite scroll: use IntersectionObserver and cursor pagination.**

- IntersectionObserver on a sentinel element at the list's end triggers the next-page fetch. Cheap, debounced, native.
- API uses cursor pagination (`?cursor=<opaque_id>&limit=20`), not offset (`?offset=400`). Cursors are stable across inserts; offsets are not, so the user sees duplicate or skipped rows.
- Cache the loaded pages in memory keyed by cursor. Re-rendering on back-navigation should not refetch.

**Retain scroll on back navigation.**

- Persist scroll position and loaded-page set in `history.state` on every page load. On back navigation (`navigation.type === 'back_forward'` or BFCache miss), restore both.
- Set `<html style="scroll-behavior: auto">` for the restore (smooth scroll defeats the restore).
- A returning user landing back at item 47 of an infinite feed is one of the strongest UX signals; the absence of it (back nav drops you at item 1) is one of the loudest defects.

**Accessibility of virtualized rows:**

- Off-screen rows are not in the accessibility tree (that is the point), but screen readers must still know the list's structure.
- Set `role="grid"` or `role="list"` on the container.
- Set `aria-rowcount="<total>"` on the container (the total, not the rendered count) and `aria-rowindex="<n>"` on each rendered row (1-indexed, the row's position in the full list, not in the rendered window).
- Keyboard navigation must work across the virtualized boundary. Up / down arrow at a window edge must trigger a scroll that loads the next row before focus moves to it; otherwise focus disappears into a recycled node.

## Performance Budgets in CI

Add a budget guard to CI. Two common tools:

1. **Lighthouse CI assertions** (covered in lighthouse.md).
2. **`bundlesize`** or framework-specific budgets:

```json
"budgets": [
  { "type": "initial", "maximumWarning": "120kb", "maximumError": "160kb" },
  { "type": "anyComponentStyle", "maximumWarning": "20kb" }
]
```

3. **`size-limit`** for granular file size checks:

```json
{
  "size-limit": [
    { "path": "dist/main.js", "limit": "90 KB" },
    { "path": "dist/main.css", "limit": "25 KB" }
  ]
}
```

CI fails the PR if budgets are exceeded.

## Real-User Monitoring

Lab numbers (Lighthouse) are necessary but not sufficient. Instrument production:

```html
<script type="module">
  import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'https://unpkg.com/web-vitals@4?module';
  const send = (m) => navigator.sendBeacon('/rum', JSON.stringify(m));
  onLCP(send); onINP(send); onCLS(send); onFCP(send); onTTFB(send);
</script>
```

Track p75 (the metric Google uses for ranking signals) over a 28-day window. Alert when p75 crosses the threshold.

## Common Performance Mistakes

- **Hero carousel.** Each slide is a hero candidate; LCP is unpredictable. Replace with one strong hero or use IntersectionObserver to load slides only when active.
- **Animated gradient backgrounds.** Continuous repaint. Use a static gradient or a CSS-only animation that runs once.
- **Background videos as decoration.** Heavy bytes, heavy CPU, distracting. Replace with a still image or a short looping low-bitrate WebM.
- **Massive sprite sheets.** Decoding cost. Use individual SVGs or a font-icon system.
- **Auto-playing audio.** Browser blocks it; the script keeps trying.
- **Overusing `requestAnimationFrame`.** Each rAF runs every frame. Cancel when off-screen.
- **Long-running setInterval.** Eats battery; replace with on-demand updates.
- **Synchronous storage reads in render path.** `localStorage.getItem` is sync and blocking; cache to a variable.

## See Also

- [lighthouse.md](lighthouse.md) for score-driven audit fixes
- [responsive.md](responsive.md) for layout integrity
- [motion.md](motion.md) for animation costs
