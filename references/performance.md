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
   - Serve as AVIF (primary) and WebP (fallback). Compression: AVIF q=50-65, WebP q=75-82.
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

| Strategy | When to use | Pros | Cons |
|----------|------------|------|------|
| Static (SSG) | Content that rarely changes per request | Cheapest, fastest, cacheable forever at edge | Stale until rebuild |
| Incremental Static (ISR) | Mostly-static with periodic updates | Edge speed + freshness | Build complexity |
| Server-rendered (SSR) | Per-request or per-user content | Always fresh | Compute cost, slower TTFB |
| Streaming SSR | Surfaces with slow data dependencies | First byte fast, content streams in | Framework support varies |
| Client-side (CSR / SPA) | Highly interactive, indexability not required | Rich interactions | Worst TTFB, worst SEO |
| Islands (partial hydration) | Mostly-static with interactive widgets | Best of both worlds | Newer pattern |
| Resumability (Qwik) | Maximum INP | Near-zero hydration cost | Newer ecosystem |

Decide per surface: when content is the same for everyone and changes infrequently, prefer SSG / ISR with islands. When content is per-request or per-user, prefer SSR or streaming SSR. Reach for full CSR / SPA only when the surface is genuinely application-like and indexability is not a concern.

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

### Lazy loading

- `loading="lazy"` on every `<img>` and `<iframe>` below the fold.
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
