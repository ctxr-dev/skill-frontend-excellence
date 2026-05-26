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
- Allow-list the major AI crawler user-agents in `robots.txt` and reference the sitemap, so models that respect robots can fetch:

```
User-agent: GPTBot
User-agent: ClaudeBot
User-agent: anthropic-ai
User-agent: PerplexityBot
User-agent: Google-Extended
User-agent: CCBot
User-agent: Applebot-Extended
Allow: /

Sitemap: https://example.com/sitemap.xml
```

- Parity is the whole game: an engine quotes rendered text and valid structured data. If a fact lives only in an image, only in client-rendered JS, or only in the JSON-LD, it is at risk. State load-bearing facts in server-rendered text.

The check: `llms.txt` exists and lists every canonical page; robots.txt allow-lists the AI user-agents and references the sitemap; the facts an engine would quote appear in server-rendered HTML, not only in images or JS.

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
