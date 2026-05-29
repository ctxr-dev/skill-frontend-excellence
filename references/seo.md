---
title: SEO Playbook
purpose: On-page and technical SEO, indexability, structured data, AI answer engines, hreflang, pagination signals, third-party-cookie deprecation impact, image and video sitemaps, CrUX mapping.
load-when:
  task-keywords: [SEO, indexing, canonical, sitemap, robots, structured data, JSON-LD, hreflang, Open Graph, meta description, title tag, AEO, GEO, llms.txt, CrUX, Storage Access API]
  symptoms: [score dropped, canonical mismatch, noindex with sitemap]
prereq: SKILL.md
related: [lighthouse.md, performance.md, accessibility.md, observability.md]
size: ~600 lines
---

# SEO Playbook

On-page and technical SEO that hits Lighthouse 100 and earns rankings. For AI search optimization (AEO/GEO/LLMO) and programmatic SEO at scale, treat this as the foundation; specialized strategies build on top.

## Priority Order

1. **Crawlability and indexation.** If Google can't find or can't index it, nothing else matters.
2. **Technical foundations.** Speed, mobile, HTTPS, structure.
3. **On-page optimization.** Title, description, headings, content, internal links.
4. **Content quality.** E-E-A-T, depth, intent match.
5. **Authority and links.** Off-page; outside the scope of this skill.

## Indexability

### Robots.txt

Lives at `/robots.txt`. Returns 200. Format:

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /private/

Sitemap: https://example.com/sitemap.xml
```

Common mistakes:

- Disallowing `/_next/` or `/static/` (blocks asset crawl, hurts rendering)
- Disallowing the entire site by accident (`Disallow: /`)
- Forgetting the `Sitemap:` line

### XML Sitemap

Lives at `/sitemap.xml` (or `/sitemap-index.xml` for large sites with sub-sitemaps). Lists only:

- Canonical URLs
- 200-status URLs
- Indexable URLs (no `noindex`)
- URLs the site actually owns (no third parties)

For large sites, split into sub-sitemaps of 50,000 URLs each, referenced from `sitemap-index.xml`.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2026-05-08</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

`changefreq` and `priority` are advisory; Google mostly ignores them. `lastmod` is honored when accurate.

Submit to Search Console. Verify it's accessible from `robots.txt`.

### Image and video sitemap extensions

The sitemap protocol has dedicated extensions for image and video URLs. For sites where images or videos are first-class content (gallery, recipe, product, news, video platform), these extensions materially improve discovery in Google Images and Google Video.

```xml
<url>
  <loc>https://your-domain.com/article/topic-deep-dive</loc>
  <image:image>
    <image:loc>https://your-domain.com/images/topic-hero.jpg</image:loc>
    <image:title>Topic hero illustration</image:title>
    <image:caption>Diagram showing the relationship between A and B.</image:caption>
  </image:image>
  <video:video>
    <video:thumbnail_loc>https://your-domain.com/images/topic-thumb.jpg</video:thumbnail_loc>
    <video:title>Topic walkthrough</video:title>
    <video:description>Five-minute walkthrough of the topic.</video:description>
    <video:content_loc>https://your-domain.com/video/topic.mp4</video:content_loc>
    <video:duration>312</video:duration>
  </video:video>
</url>
```

Required header on the `<urlset>`: `xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"` and `xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"`. Up to 1,000 image entries per page URL. Required video fields: `thumbnail_loc`, `title`, `description`, plus one of `content_loc` or `player_loc`.

Build the image and video sitemap from the SAME source the page uses (the CMS field, the structured data), so the sitemap and the rendered media stay in sync. A drifted image sitemap (pointing at images the page no longer uses) gets coverage warnings in Search Console.

### Meta Robots

Per page:

```html
<meta name="robots" content="index, follow" />
```

Use `noindex, nofollow` on:

- Pages behind authentication
- Internal search result pages with no indexable value
- Duplicate or near-duplicate pages
- Thin content (tags, archives, pagination beyond page 1 in some cases)
- Print stylesheets and embed-only pages

X-Robots-Tag HTTP header is equivalent and works for non-HTML resources (PDFs, images):

```
X-Robots-Tag: noindex, nofollow
```

Pair the two signals: when a page is `noindex` (a duplicate, an alternate, a thin or utility page), also EXCLUDE it from the sitemap. A `noindex` page still listed in the sitemap is a mixed signal (you are asking Google to crawl what you told it not to index) and shows up as a "Submitted URL marked noindex" issue in Search Console. Indexable pages: `index` plus listed in the sitemap. Non-indexable pages: `noindex` plus absent from the sitemap.

### AI Answer Engines (AEO / GEO)

Generative search (ChatGPT, Claude, Perplexity, Google AI overviews) is now a real discovery and citation surface. Make the site quotable, not just rankable.

- Publish `/llms.txt`: a short overview of what the site is plus a flat index of the canonical pages (title and URL per line). This is the AI-era analog of a sitemap for humans-plus-models.
- Optionally publish `/llms-full.txt`: the load-bearing facts an answer engine will quote verbatim (what the product does, the numbers, the pricing, the data model), in plain prose. Keep it consistent with the rendered pages and the structured data.
- Make sure the major AI crawler user-agents are NOT blocked in `robots.txt`, and reference the sitemap, so models that respect robots can fetch. For most sites they are already covered by your `User-agent: *` rules, so you do NOT need a dedicated group. Mind the precedence rule: a named user-agent group fully REPLACES the `*` group for that agent (the rules do not merge), so a dedicated AI group must REPEAT every `Disallow` you still want enforced. A blanket `Allow: /` in a named group silently exposes the `/api/` or `/private/` paths your `*` group disallows. Add a dedicated group only to set DIFFERENT rules than `*` (for example to opt a model in or out), and mirror your real disallows when you do:

```
# Only needed if these agents need DIFFERENT rules than User-agent: *.
# A named group REPLACES the * group for that agent, so repeat your Disallows.
User-agent: GPTBot
User-agent: ClaudeBot
User-agent: PerplexityBot
User-agent: Google-Extended
User-agent: CCBot
User-agent: Applebot-Extended
Disallow: /api/
Disallow: /private/
Allow: /

Sitemap: https://example.com/sitemap.xml
```

- Parity is the whole game: an engine quotes rendered text and valid structured data. If a fact lives only in an image, only in client-rendered JS, or only in the JSON-LD, it is at risk. State load-bearing facts in server-rendered text.

The check: `llms.txt` exists and lists every canonical page; robots.txt does not block the AI user-agents and references the sitemap; the facts an engine would quote appear in server-rendered HTML, not only in images or JS.

### Canonical Tag

Every indexable page has a self-referencing canonical:

```html
<link rel="canonical" href="https://example.com/pricing" />
```

Rules:

- The URL is absolute, including protocol and domain.
- Lowercased, with the consistent trailing-slash convention you've chosen.
- Without tracking params (utm, fbclid, gclid).
- For paginated lists: each page canonicals to itself; do not canonicalize page 2 to page 1.
- For filter/facet variants of a category page: canonicalize variants to the unfiltered root only when the filter doesn't change indexable content.

### Pagination signals (post `rel=prev/next` deprecation)

Google deprecated `rel=prev` and `rel=next` as indexing signals in 2019, but the question of how to mark up paginated lists still trips teams up. Current Google guidance:

- **Self-canonical every paginated page.** Page 2 of `/blog` carries `<link rel="canonical" href="https://your-domain.com/blog?page=2">`. Do NOT canonicalize page 2 to page 1; that drops the page-2 content from the index entirely.
- **Each paginated page is indexable.** No `noindex` on page 2 onwards. The exception is when page-N pages add no incremental value (a long-tail search result with thin matches); then `noindex` and exclude from sitemap.
- **Internal-link signal replaces the deprecated rel attributes.** Each paginated page links to its siblings via visible "Page N of M" navigation: previous, next, first, last, and a small range around the current page. Use real `<a href>` tags, not buttons that fire JS pagination, so crawlers follow them.
- **The canonical URL parameter shape must be stable.** `/blog?page=2` and `/blog/page/2` and `/blog/2` are different URLs to Google; pick one and 301 the others. The sitemap lists every paginated page or none (a sitemap that lists only page 1 leaves Google to discover deep pages by crawl alone).

## Titles and Descriptions

### Title Tag

```html
<title>Page topic - Brand</title>
```

Rules:

- Unique per page across the entire site.
- 50-60 characters before truncation in the SERP. Measure the RENDERED length, not the raw HTML source. Decode entities first: `&amp;` is one character in the SERP, not five; `&#39;` is one, not five. A naive `.length` on the raw `<title>` over-counts any title with entities and triggers false "too long" fixes. In an automated check, decode entities (or read `document.title`) before comparing to 60.
- Primary intent term near the beginning when natural.
- Brand name at the end (separator: pipe `|` or hyphen). Some sources advise omitting the brand on home/category pages where the SERP already attaches it.
- No keyword stuffing, no all caps, no emoji unless the brand allows.

Common failures:

- Same title on every page.
- Title longer than 60 chars (truncated).
- Title that reads like a slug (`pricing-page-brand`).
- Auto-generated `Home | Brand` on every page.
- Templated overflow: a `[slug]` or detail-page template that appends `" | Brand"` onto an already-descriptive title pushes most instances past 60 chars, so Google rewrites the title in the SERP (you lose control of it). Drop the brand suffix on templated and detail pages; keep the brand only where the base title is short (home, top-level hubs). Measure the longest realistic generated title, not a short example.

### Meta Description

```html
<meta name="description" content="One sentence stating what this page covers and the value the reader gets, in plain language, with one explicit or implicit call to action." />
```

Rules:

- Unique per page.
- 140-160 characters.
- Primary intent term used naturally.
- Clear value proposition.
- Implicit or explicit call to action.

## Heading Structure

- One `<h1>` per page. The H1 is the primary intent.
- Sequential `<h2>` -> `<h3>` -> ... no skipped levels.
- Headings describe content, not styling.
- Sections labeled by their heading via `aria-labelledby` for accessibility (also reinforces structure for some bots).

```html
<main>
  <h1>Page primary intent (one H1)</h1>
  <section aria-labelledby="section-1">
    <h2 id="section-1">First section heading</h2>
    ...
  </section>
  <section aria-labelledby="section-2">
    <h2 id="section-2">Second section heading</h2>
    <h3>Sub-section</h3>
    ...
  </section>
</main>
```

## URL Structure

- Lowercase.
- Hyphen-separated.
- Descriptive, keyword-rich where natural.
- No tracking params in the canonical.
- Consistent trailing-slash policy across the site.
- Short. Prefer `/topic/specific-slug` over `/2026/05/08/post-id-123`.
- Stable. Once published, URLs don't change. If a URL must change, return 301 from the old to the new.

## Open Graph and Twitter Cards

Every public page exposes:

```html
<meta property="og:type" content="website" />
<meta property="og:title" content="Page topic - Brand" />
<meta property="og:description" content="..." />
<meta property="og:url" content="https://example.com/page-path" />
<meta property="og:image" content="https://example.com/og/page.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:site_name" content="Brand" />
<meta property="og:locale" content="en_US" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="..." />
<meta name="twitter:description" content="..." />
<meta name="twitter:image" content="https://example.com/og/page.png" />
<meta name="twitter:site" content="@brand" />
```

Set `og:type` per page type, do not hardcode it: `article` on articles, blog posts, and detail pages (product, case study, item); `website` on the home page and section hubs. Article-typed pages should also carry `article:published_time` and `article:modified_time` when available.

Image rules:

- 1200x630 PNG or JPEG.
- Under 5 MB. Aim for under 500 KB.
- Text in the image legible at thumbnail size.
- Avoid rendering critical info only in the image; the description should stand on its own.

### Generating per-template OG images

Hand-designing one OG image per page does not scale. Generate them at build time so every page ships a distinct, on-brand 1200x630 image.

- Pipeline: render a template to SVG (for example with `satori`, which lays out a small subset of HTML and CSS), then rasterize the SVG to PNG (for example with `resvg`). Run it at build time as a prerendered endpoint per template, so there is zero runtime cost and it works on static hosts.
- Font gotcha: the SVG text layout step needs a `ttf`, `otf`, or `woff` font. It cannot read `woff2`. Variable-font packages often ship `woff2` only, so source a `woff` or `ttf` explicitly.
- Bundler gotcha: a native-addon rasterizer must be marked external to the bundler (the SSR external list plus the dependency-optimizer exclude list), or the build fails trying to bundle a binary.
- A single designed static image is a fine default and home-page image; generate per-template images for the long tail (articles, items, detail pages).
- Keep the output under 500 KB and ensure the text is legible at thumbnail size (the existing image rules still apply).

## Structured Data (JSON-LD)

Add to `<head>`. One `<script type="application/ld+json">` block per type, or a graph block with multiple types.

### Organization (site-wide, on home and about)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Brand",
  "url": "https://example.com",
  "logo": "https://example.com/logo.png",
  "sameAs": [
    "https://twitter.com/brand",
    "https://github.com/brand",
    "https://linkedin.com/company/brand"
  ]
}
</script>
```

### WebSite with SearchAction (home only)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "url": "https://example.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://example.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
</script>
```

### BreadcrumbList (every interior page)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://example.com" },
    { "@type": "ListItem", "position": 2, "name": "Section", "item": "https://example.com/section" },
    { "@type": "ListItem", "position": 3, "name": "Current page" }
  ]
}
</script>
```

Build this JSON-LD from the SAME ordered array that renders the visible breadcrumb UI, so the structured data and the on-page trail can never disagree (mismatched breadcrumbs are a common Rich Results warning). Emit it on every interior page that shows a breadcrumb, including legal and utility pages that have one.

### Article (blog posts, news)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "...",
  "description": "...",
  "image": "https://...",
  "datePublished": "2026-05-08",
  "dateModified": "2026-05-09",
  "author": { "@type": "Person", "name": "...", "url": "..." },
  "publisher": { "@type": "Organization", "name": "Brand", "logo": { "@type": "ImageObject", "url": "..." } },
  "mainEntityOfPage": "https://..."
}
</script>
```

### FAQPage (FAQ sections)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Question text exactly as displayed?",
      "acceptedAnswer": { "@type": "Answer", "text": "Answer text exactly as displayed." }
    }
  ]
}
</script>
```

Only use FAQPage when the FAQ is genuinely on the page and visible to users. Note on SERP features: Google rolled back FAQ rich results (limited, then effectively retired for most sites between 2023 and 2026) and retired HowTo rich results (2023). Keep `FAQPage` and `HowTo` markup when it is accurate and parity-correct, because it is still valid and it feeds AI answer engines, but do not plan around them as winnable rich-result features. The highest-ROI structured data for most sites today is Organization, WebSite, BreadcrumbList, Article, Product or SoftwareApplication, and VideoObject.

### Product / SoftwareApplication / HowTo / Recipe / Event / etc.

Use the schema.org type that best matches the page content. Validate every JSON-LD with the Rich Results Test before declaring it complete.

### Never fabricate structured data

Structured data is a claim Google can verify and penalize. Emit only what is real:

- No invented `aggregateRating` or `review`. Add a rating object only when real, on-site or first-party reviews back it. Fabricated ratings risk manual action and are stripped when they do not match visible content.
- `sameAs` lists only profiles that actually exist and belong to the entity. Build it from a real list and emit nothing when the list is empty (do not ship placeholder social URLs).
- Emit `WebSite` `SearchAction` only when a working search endpoint exists at the `target` URL. Google requires the search to function; a `SearchAction` pointing at a non-existent search is a defect, not an enhancement.
- Parity rule: every value in the JSON-LD should be derivable from visible page content. If it is not on the page, it does not belong in the markup.

### Validation

- **Rich Results Test** (https://search.google.com/test/rich-results) renders JS, finds JSON-LD, and shows what Google can extract.
- **Schema.org Validator** (https://validator.schema.org/) for structural validation.
- The Lighthouse SEO category does not validate JSON-LD content; use the dedicated tools.

## Image SEO

- Descriptive file names: `topic-comparison-chart.png`, not `IMG_2034.png`.
- `alt` text describing the image (for accessibility AND SEO).
- Compress to AVIF/WebP per [performance.md](performance.md).
- For images that are themselves content (infographics, charts), provide a long-form description nearby.
- For decorative images, `alt=""`. Search engines understand this signal.

## Internal Linking

- Every important page should be reachable within 3 clicks of the home page.
- Use descriptive anchor text. Not "click here", "read more", "learn more". Use the destination's title or a topical phrase.
- Avoid orphan pages (no internal links pointing to them).
- Avoid over-linking (every navigation item duplicated 5x in body).
- Use a hub-and-spoke model: cluster pages link to a central topical hub.

## Hreflang (Multilingual)

For each locale variant of a page, list all variants including the page itself:

```html
<link rel="alternate" href="https://example.com/pricing" hreflang="en" />
<link rel="alternate" href="https://example.com/de/pricing" hreflang="de" />
<link rel="alternate" href="https://example.com/ja/pricing" hreflang="ja" />
<link rel="alternate" href="https://example.com/pricing" hreflang="x-default" />
```

Rules:

- Mutual: every variant lists every other variant.
- Self-referencing: each variant lists itself.
- `x-default` for the unmatched/default version.
- Use valid BCP 47 codes (`en`, `en-US`, `de`, `pt-BR`).

### URL strategy: ccTLD vs subdirectory vs subdomain

Google treats each URL strategy differently for geo signals. Pick once and stay.

| Strategy | Example | Geo signal | Tradeoffs |
|----------|---------|-----------|-----------|
| ccTLD | `your-brand.de`, `your-brand.jp` | Strongest country signal (the TLD itself geo-targets) | Highest cost (separate domain, separate SEO authority per TLD), needed for jurisdictions that require local presence |
| Subdirectory | `your-brand.com/de/`, `your-brand.com/ja/` | No automatic country signal; set via Search Console international targeting (where still available) or via `hreflang` | Cheapest; the parent domain's authority flows down; preferred default for most sites |
| Subdomain | `de.your-brand.com`, `ja.your-brand.com` | Treated as a separate site by Google; geo signal via Search Console settings | Mid cost; authority partially inherits; harder to maintain consistent UX |

A common mistake is mixing strategies (one ccTLD, several subdirectories, and a subdomain that nobody remembers building). Audit the inventory before adding the next locale.

### `Content-Language` vs `hreflang`

Two related signals; they do different jobs:

- `Content-Language: en-US` HTTP header (and `<meta http-equiv="content-language">` and `<html lang>`) declares the language of the CURRENT page. Useful for content-negotiation proxies and screen readers, but Google does not use it as a primary SERP-targeting signal.
- `hreflang` declares the FULL SET of language and region variants for a page. Google uses `hreflang` to decide which variant to surface to which user in the SERP. This is the SERP-targeting signal.

When the two disagree (a page has `<html lang="en">` and `hreflang="de"` pointing at itself), Google trusts `hreflang`. Set both correctly so the page is consistent.

### Geo-IP redirects are a policy violation

Auto-redirecting based on the user's IP location is a Google policy violation: Googlebot crawls from US IPs, so it never sees the localized variants and may de-rank or de-index them.

- Show a banner offering the localized variant; do not force-redirect.
- Persist the user's locale choice in a cookie or in the URL; the next visit honours the choice.
- For multi-region commerce (currency, shipping), let the user pick the region from a visible control; do not infer-and-redirect.

## Mobile-Friendly

- Responsive design (no separate `m.` site).
- `<meta name="viewport" content="width=device-width, initial-scale=1">`.
- No horizontal scroll at 320px width.
- Touch targets >= 44x44 CSS pixels.
- Body text >= 16px on mobile (avoids iOS auto-zoom).
- Same content as desktop (mobile-first indexing).

## Page Speed (CrUX, not Lighthouse)

Search Console uses CrUX (Chrome User Experience Report) p75 over 28 days for the Page Experience signal. Lighthouse is a lab proxy; CrUX is the real signal.

Targets (CrUX p75):

- LCP <= 2.5s: "Good"
- INP <= 200ms: "Good"
- CLS <= 0.1: "Good"

A page can have a Lighthouse 95 in the lab and still be "Needs Improvement" in CrUX if real users have slower devices/networks. Instrument the field with `web-vitals` and track p75.

### Search Console Page Experience and CrUX mapping

Search Console's Page Experience report and the Core Web Vitals report both pull from CrUX. Two operational details matter when you ship a fix and wait for credit:

- **28-day rolling p75.** CrUX aggregates the trailing 28 days of real-user data. A fix shipped today shows up incrementally; full credit lands about 28 days later when the pre-fix window has rolled off. Plan releases accordingly: the dashboard you stare at after a ship is mostly your old code for a month.
- **CrUX origins map to URL groups, not to individual URLs.** Search Console groups URLs by template (homepage, article, product page) and reports CWV per group. Two pages can share a group even when they look different to a human. When debugging "why is this page still Needs Improvement", check which group it belongs to in the report; the group's p75 is what triggers the warning, and the fix has to land on enough pages in the group to move the p75.
- **The PageSpeed Insights API exposes the same CrUX data per URL and per origin.** Pull it daily into your observability stack so you can watch the trend without waiting for the Search Console UI to refresh. See [observability.md](observability.md) for the field-monitoring pipeline.

## Third-Party-Cookie Deprecation Impact

Chrome's third-party cookie deprecation (3PCD), reversed and re-staged through 2024 to 2026, has already moved Safari and Firefox to no-3PC by default. Plan for it as the baseline.

### What breaks when 3PCs are blocked

- **Cross-domain analytics.** GA4, Adobe Analytics, and similar that relied on third-party cookies to stitch user sessions across your subdomains or partner domains lose stitching. First-party measurement (server-side tagging, GA4 Measurement Protocol, first-party `_ga` cookie set on your domain) still works.
- **A/B testing platforms.** Optimizely, VWO, and similar that set assignment cookies as third parties lose stable assignment across sessions. Move assignment to a first-party cookie set by your server, or to a server-rendered query parameter.
- **Cross-domain embeds.** YouTube, Vimeo, Twitter, social embeds that depend on third-party cookies for logged-in state, view tracking, or recommendations degrade. The embed still loads; personalization does not.
- **Federated auth iframes.** OAuth and SSO flows that rely on a third-party cookie to identify the user (silent re-auth, single-sign-on session bridge) break. The user has to re-authenticate. See "Storage Access API + CHIPS" below for the migration path.
- **Cross-site retargeting and conversion attribution.** Display ads, retargeting pixels, last-click attribution across domains all lose fidelity. Use Privacy Sandbox APIs (Topics, Protected Audience, Attribution Reporting) where available.

### What still works

- **First-party cookies on your own origin.** The browser still trusts cookies set by the same registrable domain the user is visiting.
- **Server-side analytics.** Logs, server-side GA4 via the Measurement Protocol, edge-collected events with a first-party cookie carrier.
- **First-party identifiers in URLs.** Magic-link tokens, signed query parameters, server-rendered IDs.

### Storage Access API and CHIPS

Two browser features unlock specific cross-site cookie use cases without going back to a fully tracking world:

- **Storage Access API.** A third-party iframe (your help-widget, your auth iframe) calls `document.requestStorageAccess()` in response to a user gesture; the browser prompts the user to grant access; granted access lets the iframe read and write its own cookies. Use this for federated auth iframes and consented embeds. The first-time UX is a permission prompt, so design for the friction. See [auth.md](auth.md) for the auth-flow integration.
- **CHIPS (Cookies Having Independent Partitioned State).** A `Set-Cookie` with the `Partitioned` attribute creates a partitioned cookie: the browser stores a separate cookie per top-level site that embeds the third party. Useful for session state on a third-party widget (your support chat, your embed) that needs to remember "I am logged in on THIS host site" without cross-site tracking. The cookie is invisible to other top-level sites that embed the same third party, so it cannot be used for cross-site identification.

```http
Set-Cookie: __Host-session=abc; Path=/; Secure; HttpOnly; SameSite=None; Partitioned
```

Sites that host embedded surfaces (a SaaS dashboard that users embed into their own intranets, a chat widget) should adopt `Partitioned` cookies now; the same widget code then works across both legacy and post-3PCD browsers.

## Content Quality (E-E-A-T)

Google's quality raters apply the E-E-A-T framework:

- **Experience**: first-hand experience visible (case studies, original screenshots, "I tested this and...").
- **Expertise**: author has demonstrable subject knowledge.
- **Authoritativeness**: cited by others, recognized in the space.
- **Trustworthiness**: accurate facts, transparent business, contact info, privacy policy, secure (HTTPS).

For YMYL (Your Money Your Life) topics (medical, legal, financial), expertise and trustworthiness signals are critical:

- Author bios with credentials.
- Editorial policy.
- Sources cited inline.
- Updated/published dates.
- Contact and "About" pages.

For non-YMYL, expertise is still useful but not as strict.

## Render primary content on the server

Search crawlers and AI crawlers index what is in the HTML response. Text that only appears after client-side hydration (inside an island, a partial-hydration region, or any JS-only render) may never be indexed and is invisible to crawlers that do not execute JS.

- Server-render (SSR or SSG) all primary content and any text inside interactive components, then hydrate for interactivity.
- Verify by viewing source (not the DevTools DOM, which shows post-JS state) or by loading with JavaScript disabled. Every load-bearing sentence, price, and heading must be present.
- A partially-hydrated widget that renders only its active state in static HTML (for example a toggle showing one of three values) is acceptable for the visible state, but put the full set of facts somewhere server-rendered (a static list, an sr-only block, or the structured data and prose).

## Common SEO Mistakes

- Same title on every page.
- Same description on every page.
- No canonical (or canonical pointing to a different URL by mistake).
- Multiple H1s per page.
- Skipped heading levels.
- Important content hidden behind JS that doesn't render server-side.
- Important content in images without alt text.
- Slow LCP because the hero image isn't optimized.
- CLS because of late-loading hero or font swap.
- Internal links with anchor text "click here" or "read more".
- Sitemap listing 404 or `noindex` URLs.
- robots.txt blocking CSS or JS (Google needs to render the page).
- `noindex` on a page Google should index (typo or stale config).
- Tracking params in the canonical (creates infinite duplicates).
- Migrating URLs without 301 redirects.
- Blocking the staging domain in robots.txt while allowing production by mistake.

## Pre-Publish SEO Checklist

For every public-visible page:

- [ ] Unique `<title>` 50-60 chars
- [ ] Unique `<meta name="description">` 140-160 chars
- [ ] One `<h1>` matching primary intent
- [ ] Sequential headings, no skipped levels
- [ ] Self-referencing `<link rel="canonical">`
- [ ] `<meta name="robots" content="index, follow">` if indexable; `noindex` if not
- [ ] Open Graph tags (og:title, og:description, og:image, og:url, og:type)
- [ ] Twitter card tags
- [ ] Lang attribute on `<html>`
- [ ] Structured data validated via Rich Results Test (where applicable)
- [ ] Image alt text on every meaningful image
- [ ] Internal links use descriptive anchor text
- [ ] Page reachable from home in <= 3 clicks
- [ ] Listed in sitemap.xml (if indexable)
- [ ] HTTPS, no mixed content
- [ ] Mobile-friendly (responsive, viewport meta, no horizontal scroll)
- [ ] CrUX p75 LCP/INP/CLS in "Good" zone (verify after 28 days of traffic)
- [ ] No render-blocking content critical to indexing (Google renders JS, but slowly; SSR/SSG preferred for primary content)

## See Also

- [lighthouse.md](lighthouse.md) for the SEO category audits in detail
- [performance.md](performance.md) for Core Web Vitals optimization
- [accessibility.md](accessibility.md) for the accessibility/SEO overlap (alt text, headings, labels)
