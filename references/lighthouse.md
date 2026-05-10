# Lighthouse Mastery

A complete playbook for hitting and holding the top of the Lighthouse curve. Framework-agnostic. Every audit listed below is reachable from `lighthouse --output=json` or the Chrome DevTools "Lighthouse" panel.

## Score Targets (recap)

| Category | Performance (mobile) | Performance (desktop) | A11y | Best Practices | SEO |
|----------|---------------------|----------------------|------|----------------|-----|
| Universal target | >= 95 | >= 99 | 100 | 100 | 100 (or n/a if `noindex`) |

A score of 99 hides one or two regressions; only 100 means "no audits failed". For Best Practices, Accessibility, and SEO, demand 100 unless an audit is genuinely inapplicable. For Performance, hold the bar at 95 mobile and 99 desktop. A given surface may consciously relax the Performance bar (e.g., a heavy interactive tool that legitimately ships more JS), but the relaxation should be a recorded, justified exception, not a default.

## How Lighthouse Computes Performance

The performance score is a weighted sum of the lab metrics, scaled against the HTTPArchive distribution of the public web. The current weights (Lighthouse 11+):

| Metric | Weight | What it measures |
|--------|-------:|------------------|
| Largest Contentful Paint (LCP) | 25% | When the largest visible element finished painting |
| Total Blocking Time (TBT) | 30% | Time the main thread was blocked by long tasks during load |
| Cumulative Layout Shift (CLS) | 25% | Total visible layout shift during the lifetime of the page view |
| First Contentful Paint (FCP) | 10% | When the first text or image painted |
| Speed Index (SI) | 10% | How quickly content visually populated |

Implications:

- TBT (30%) is the single largest lever. Reducing main-thread time during load yields the largest score gains.
- LCP and CLS together are 50% of the score. The LCP element and any late-arriving content are the two highest-leverage targets.
- FCP and SI together are only 20%. Optimizing them without fixing TBT/LCP/CLS will plateau.
- INP is reported but does not currently affect the lab Performance score. It does affect real-user CrUX data and Search Console.

## Run Lighthouse Properly

The most common cause of "Lighthouse keeps failing" is running it wrong.

### Always run against a production build

Dev servers ship unminified, unoptimized assets and dev-only React (or equivalent) instrumentation. A dev-mode Lighthouse run is not informative.

```
# Generic pattern
<framework-build-command>
<framework-start-prod-server> --port 3001 &
npx lighthouse "http://localhost:3001/<path>" \
  --output=json --output=html \
  --output-path=/tmp/lh-mobile \
  --chrome-flags="--headless=new --no-sandbox --disable-gpu" \
  --only-categories=performance,accessibility,best-practices,seo \
  --quiet
```

### Always run mobile and desktop independently

```
# Mobile (default preset: simulated 4G, Moto G Power, 5.6x CPU throttle)
npx lighthouse "http://localhost:3001/<path>" --output=json --output-path=/tmp/lh-mob.json \
  --chrome-flags="--headless=new --no-sandbox --disable-gpu" --quiet

# Desktop (preset: native viewport, 0x throttle for CPU, 40ms RTT)
npx lighthouse "http://localhost:3001/<path>" --output=json --output-path=/tmp/lh-desk.json \
  --preset=desktop --chrome-flags="--headless=new --no-sandbox --disable-gpu" --quiet
```

Mobile uses 4x CPU throttle and a slow 4G network profile. Most regressions show up here first. Desktop uses no throttle.

### Pin Chrome for reproducibility

Local Chrome updates can shift scores by 2-5 points. For CI, use a pinned Chrome (`@puppeteer/browsers` or Playwright's bundled Chromium). Set `CHROME_PATH` explicitly:

```
export CHROME_PATH="$(find ~/Library/Caches/ms-playwright -name 'Google Chrome for Testing' -type f 2>/dev/null | head -1)"
```

### Run multiple times and take the median

Lighthouse has natural variance of 2-4 points per run. For any decision, run at least 3 times and use the median. Lighthouse CI's `numberOfRuns: 3` (or 5) is the standard.

### Check from a real cold cache

Pass `--throttling-method=devtools` (or `provided`) only when comparing against real network conditions. The default `simulated` mode is fine for relative regression checks.

## Failing Audit -> Fix Map

The following table maps every common failing Lighthouse audit to the underlying cause and the concrete fix. Items are grouped by category and ordered by frequency.

### Performance audits

| Audit (id) | Symptom | Root cause | Fix |
|-----------|---------|------------|-----|
| `largest-contentful-paint-element` | LCP element is slow | The biggest element in the viewport is text or an image that loads late | Identify it. If image: add `fetchpriority="high"`, declare `width`/`height`, serve responsive `srcset`, prefer AVIF/WebP, never lazy-load it. If text: ensure the font that renders it loads with `font-display: swap` and is preloaded. Pre-render the section server-side. |
| `render-blocking-resources` | Stylesheet or script blocks first paint | Synchronous `<link rel="stylesheet">` or `<script>` in head | Inline critical CSS (under 14 KB), defer the rest with `<link rel="preload" as="style" onload="this.rel='stylesheet'">` or `media="print" onload="this.media='all'"`. Move scripts to `defer` or `async`. |
| `unused-css-rules` | > 20 KB unused CSS | Global stylesheet, full Tailwind preflight, or vendor framework CSS | Run a production CSS purge (Tailwind/UnoCSS purge, PurgeCSS, css-modules tree-shake). Split CSS by route. Inline only above-the-fold rules. |
| `unused-javascript` | > 40 KB unused JS | Imported library where only one function is used; whole-module imports | Use named imports, replace heavy libs with native APIs (date-fns -> Intl.DateTimeFormat, lodash -> ES built-ins). Audit with `source-map-explorer` or `webpack-bundle-analyzer`. |
| `total-byte-weight` | Page exceeds ~1.6 MB total | Unoptimized images, unused JS, untreeshaken vendor | Compress images (AVIF/WebP), code-split, treeshake, drop polyfills for evergreen browsers (`browserslist: ['>0.5%', 'not dead', 'not op_mini all']`). |
| `efficient-animated-content` | GIFs detected | A GIF is animated and unoptimized | Replace with `<video autoplay muted loop playsinline preload="metadata">` serving WebM + MP4, or with WebP/AVIF animated. |
| `modern-image-formats` | JPEGs/PNGs served | Asset pipeline emits legacy formats | Add an AVIF/WebP step. Serve via `<picture>` with `<source type="image/avif">`, `<source type="image/webp">`, then `<img>` fallback. |
| `uses-optimized-images` | Images larger than necessary | No compression at the build step | Run lossy compression (mozjpeg quality 75-82, oxipng lossy, AVIF quality 50-65). Strip metadata. |
| `uses-responsive-images` | Image larger than its rendered box | One size for all viewports | Add `srcset` with at least 3 widths (e.g., 480w, 960w, 1440w) and an explicit `sizes` attribute. |
| `offscreen-images` | Below-the-fold images load eagerly | Missing `loading="lazy"` | Add `loading="lazy"` to all below-the-fold `<img>`. Never lazy-load the LCP element. |
| `uses-text-compression` | Text assets uncompressed | Server not negotiating compression | Enable Brotli at the edge (CDN), fallback to gzip. Verify with `curl -H "Accept-Encoding: br,gzip" -I`. |
| `uses-rel-preload` | Critical request discovered late | Late-discovered font, hero image, or critical script | Add `<link rel="preload" as="font" type="font/woff2" crossorigin>` or `as="image"` for the LCP image. Limit preloads to genuinely critical resources. |
| `font-display` | Invisible text during font load | `font-display` not set, defaulting to `block` | Set `font-display: swap` on body fonts and `font-display: optional` on display fonts when LCP risk exists. |
| `uses-long-cache-ttl` | Static assets cached < 1 year | CDN/edge cache headers too short | Static immutable assets get `Cache-Control: public, max-age=31536000, immutable`. HTML gets `s-maxage=300, stale-while-revalidate=86400` or similar. |
| `legacy-javascript` | Polyfills for evergreen browsers | Babel preset shipping ES5 to modern browsers | Set `target: 'es2020'` or higher. Use module/nomodule pattern only if you actively support legacy. |
| `bootup-time` | JS execution > 2s on mobile | Heavy hydration, large initial bundle, sync work in main bundle | Code-split, defer non-critical hydration (islands architecture, lazy hydration), move heavy work to web workers. |
| `mainthread-work-breakdown` | Long tasks > 50ms | Single bundle parsing, heavy framework init, sync layout reads | Split bundles, defer hydration, batch reads/writes, move to `requestIdleCallback`. |
| `dom-size` | DOM > 1500 nodes | Mega-pages, virtualized lists not virtualized, ad/embed bloat | Virtualize lists with 50+ items. Lazy-render off-screen sections. Strip dead containers. |
| `third-party-summary` | Third parties take > 250ms main thread | Ads, analytics, chat widgets, embeds | Audit and remove. Lazy-load chat (`requestIdleCallback`). Use first-party proxy for analytics where possible. Use `partytown` to move third-party JS to a worker. |
| `cumulative-layout-shift` | CLS > 0.1 | Images/iframes without dimensions, late-loaded fonts, late-injected content (banners, ads) | Declare width/height on every `<img>`, `<iframe>`, `<video>`. Reserve space with `aspect-ratio`. Use `font-display: optional` + `size-adjust` to prevent FOUT shifts. Never inject above-the-fold content after first paint. |
| `non-composited-animations` | Animation triggered layout/paint | Animating `width`, `height`, `top`, `left`, `margin` | Refactor to `transform` (`translate3d`, `scale`) and `opacity`. |
| `uses-passive-event-listeners` | Touch/wheel listeners block scroll | `addEventListener('touchstart', fn)` without `{ passive: true }` | Add `{ passive: true }` to scroll-side listeners. |
| `no-document-write` | `document.write` detected | Legacy third party | Remove. Replace with async DOM manipulation. |

### Accessibility audits

Lighthouse runs the axe-core ruleset. Failing any rule drops the score below 100. The score is binary on most rules.

| Audit | Root cause | Fix |
|-------|-----------|-----|
| `color-contrast` | Foreground/background ratio below 4.5:1 (or 3:1 for large) | Darken foreground or lighten/darken background. Verify with `getComputedStyle` ratio in DevTools. Test light AND dark modes independently. |
| `image-alt` | `<img>` without `alt` | Add `alt="..."` describing the image. Decorative images get `alt=""` (empty string, not missing). |
| `label` | Form control without label | Wrap with `<label>` or use `for`/`id` association. `aria-label` is acceptable when a visible label is genuinely impossible. |
| `link-name` | Link with no discernible name | Provide visible text or `aria-label`. Icon-only links must have `aria-label`. |
| `button-name` | Button with no discernible name | Same as link-name. |
| `aria-required-attr` / `aria-valid-attr-value` | Invalid ARIA usage | Validate against the ARIA 1.2 spec. Prefer native semantics over ARIA. |
| `heading-order` | Skipped heading level | Use sequential h1 -> h2 -> h3. Never use a heading for styling. |
| `html-has-lang` | Missing `<html lang="...">` | Set the document language. |
| `html-lang-valid` | Invalid lang code | Use a valid BCP 47 code (`en`, `en-US`, `de-DE`). |
| `meta-viewport` | Missing or zoom-disabled viewport | `<meta name="viewport" content="width=device-width, initial-scale=1">`. Never use `user-scalable=no` or `maximum-scale=1`. |
| `tabindex` | Positive tabindex (`tabindex="3"`) | Use natural document order. `tabindex="0"` and `tabindex="-1"` are fine. Positive values break expected tab flow. |
| `duplicate-id` | Two elements share the same `id` | IDs must be unique. |
| `bypass` | No skip link | Add `<a href="#main" class="sr-only-focusable">Skip to content</a>` as the first focusable element. |
| `aria-hidden-focus` | Focusable element inside `aria-hidden` | Don't focus into hidden subtrees. Move focus or remove `aria-hidden`. |
| `frame-title` | `<iframe>` without `title` | Provide `title` describing the frame's purpose. |
| `list` | `<ul>`/`<ol>` containing non-`<li>` children | Restructure markup. |
| `td-headers-attr`, `th-has-data-cells` | Data table without proper header association | Use `<th scope="col">` and `<th scope="row">`. For complex tables, use `headers="..."`. |

### Best Practices audits

| Audit | Cause | Fix |
|-------|-------|-----|
| `is-on-https` | Page or any sub-resource over HTTP | Force HTTPS at the edge with HSTS. Audit mixed content (`https://` page loading `http://` sub-resources). |
| `errors-in-console` | JS errors at load | Fix the errors. Lighthouse fails on any console error. |
| `image-aspect-ratio` | Image rendered at distorted aspect ratio | Honor the natural aspect ratio or use `object-fit: cover/contain`. |
| `image-size-responsive` | Image natural size much smaller than rendered | Serve a higher-resolution source. |
| `notification-on-start` | Notification permission requested without user gesture | Move to a user-initiated trigger. |
| `geolocation-on-start` | Geolocation requested without user gesture | Same. |
| `paste-preventing-inputs` | `onpaste="return false"` | Remove. Users must be able to paste. |
| `inspector-issues` | DevTools-flagged issues | Open Issues panel, fix each. |
| `csp-xss` | Missing or weak CSP | Add a Content-Security-Policy with `default-src`, `script-src`, `style-src`, `img-src`, `connect-src`. Use nonces for inline. |
| `valid-source-maps` | Source maps not served or not valid | Serve `.map` files for first-party JS to aid debugging (consider whether this exposes intellectual property). |
| `no-unload-listeners` | `unload` event listener | Replace with `pagehide` or `visibilitychange`. |
| `deprecations` | Deprecated API used | Replace per the deprecation message. |

### SEO audits

| Audit | Cause | Fix |
|-------|-------|-----|
| `document-title` | Missing `<title>` | Add a unique, intent-matching title (50-60 chars). |
| `meta-description` | Missing `<meta name="description">` | Add a unique 140-160 char description with the primary intent term and a value proposition. |
| `http-status-code` | Non-200 status | Fix the route. |
| `link-text` | Generic link text ("click here", "read more") | Replace with descriptive anchor text. |
| `crawlable-anchors` | Anchors with `javascript:void(0)` or no `href` | Use real `href` values. SPAs should still emit href on link components. |
| `is-crawlable` | `noindex` or robots block | Remove the block on indexable pages. |
| `robots-txt` | robots.txt malformed or unreachable | Validate, ensure it returns 200 and references the sitemap. |
| `image-alt` | Missing alt | See accessibility. |
| `hreflang` | Invalid hreflang | Use valid codes; ensure mutual hreflang on all locale variants. |
| `canonical` | Missing or incorrect canonical | Self-referencing canonical on the indexable URL. |
| `structured-data` | (manual) | Validate via Rich Results Test; add JSON-LD per the schema.org type that matches the page. |

## Setting Up CI Gates

Lighthouse CI (`@lhci/cli`) is the standard way to enforce thresholds in CI. A minimal `lighthouserc.json`:

```
{
  "ci": {
    "collect": {
      "startServerCommand": "npm run start -- -p 3001",
      "url": [
        "http://localhost:3001/",
        "http://localhost:3001/<key-route-1>",
        "http://localhost:3001/<key-route-2>"
      ],
      "numberOfRuns": 3,
      "settings": { "preset": "desktop" }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.99 }],
        "categories:accessibility": ["error", { "minScore": 1.00 }],
        "categories:best-practices": ["error", { "minScore": 1.00 }],
        "categories:seo": ["error", { "minScore": 1.00 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.05 }],
        "total-blocking-time": ["error", { "maxNumericValue": 100 }]
      }
    },
    "upload": { "target": "temporary-public-storage" }
  }
}
```

Run a separate mobile config with `preset: 'mobile'` (default) and lower thresholds (0.95 perf). Run both as required CI gates.

## Diagnosing Score Drops

When Lighthouse drops 5+ points between runs:

1. Open the new and old reports side by side.
2. Compare each metric numerically. Identify the metric that moved.
3. For LCP: check the LCP element id. Did it change? Did the asset get bigger?
4. For TBT: check the long-tasks panel in the Performance trace. Identify the new long task by its source URL.
5. For CLS: check the "Layout Instability" filmstrip. Identify the shifting element.
6. For FCP: check whether new render-blocking resources were added.

Variance happens. A 2-3 point swing is noise. A 5+ point swing is a regression.

## Field vs Lab

Lighthouse runs in a controlled lab. Real users see different results (CrUX, Search Console). Always cross-reference:

- Lighthouse (lab): catches regressions before deploy.
- CrUX (field): real user 28-day p75. This is what Search Console uses for ranking signals.
- Web Vitals JS (`web-vitals` library): real-time field telemetry, sent to your own pipeline.

Pass the lab AND the field. INP especially shows up in the field but not the lab; instrument it in production.

## Common Misconceptions

- "Lighthouse desktop is always 100." False. Heavy hydration, oversized images, and broken meta still tank desktop scores.
- "We can fix it later." Performance debt compounds. Add a budget guard now.
- "It's only a public-facing surface." Public-facing surfaces are the entry point for organic search and shape first impressions. They directly affect CrUX and rankings.
- "We minified, we're fine." Minification reduces bytes by ~30%. The bigger lever is what you ship at all (treeshake, code-split, defer hydration).
- "We have a CDN, that's enough." A CDN moves bytes faster; it does not parse, hydrate, or render faster. The client work is the bottleneck.

## See Also

- [performance.md](performance.md) for the deep dive on each performance lever
- [accessibility.md](accessibility.md) for the deep dive on accessibility audits
- [seo.md](seo.md) for the deep dive on SEO audits
- [pre-launch.md](pre-launch.md) for the final verification checklist
