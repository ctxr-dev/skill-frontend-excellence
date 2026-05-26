# Common Visual Defects and Geometry Checks

A symptom-to-fix lookup for visible defects, plus a canonical programmatic geometry sweep that runs against every audited route at both capture viewports. Use this file when something looks wrong and you want the standard fix, or when you want a deterministic check that catches issues screenshots can miss.

## How to Use

1. Identify the symptom on the rendered page or in a screenshot.
2. Look it up in the defect table below.
3. Apply the standard fix at the right layer (component, page, or design token).
4. Re-run the geometry sweep on the affected route at both audit viewports.
5. Re-capture before-and-after screenshots and confirm the fix did not regress neighbors.

The defect table is one big table by design: one search lands you on the symptom regardless of which topic it might also live under. Topical references point readers here rather than restating the table.

## Defect Lookup Table

| Defect | Likely cause | Fix |
|--------|--------------|-----|
| Button shifts oddly on hover | Parent and child both transform | Disable child transform inside the animated card or move the transform to one layer |
| Dark line after sticky header | Border/shadow/background mismatch between header and section top | Normalize header border, shadow, and section top background so the seam is invisible |
| Dropdown not centered | Absolute position tied to item edge | Use `left: 50%`, `transform: translateX(-50%)`, clamp width on small screens |
| Mobile dropdown off-canvas | Desktop hover rule overrides mobile rule | Add a media-specific override and constrain the dropdown to the viewport |
| Card row uneven heights | Content-dependent heights with no stretch | Use grid stretch, flex column, `height: 100%`, and stable `min-height` |
| Only nested CTA clickable | Card visually behaves as a link but the anchor wraps only the CTA | Make the full card an anchor, or use a button-card pattern with a stretched pseudo-element on the title link; never nest anchors, which is invalid HTML per the `<a>` content model |
| Duplicate arrows | CSS pseudo-element arrow plus a text or icon arrow | Choose one arrow source and suppress the other by component class |
| Pricing implies wrong plan | Ambiguous trial or setup wording on shared cards | State paid plan terms and fees plainly; remove repeated misleading phrases |
| Social icons too far apart or too small | Independent margins and small hit boxes | Use fixed 44px boxes and `gap` |
| Cross or check icon off-center | Pseudo-element dimensions mismatch the icon box | Use a square icon box with absolutely centered pseudo-elements, or inline SVG |
| Mobile horizontal scroll | Hidden off-canvas element, wide image, long unbreakable word, or `100vw` misuse | Inspect `scrollWidth`; constrain media; use `min-width: 0` on grid children; avoid `width: 100vw` inside padded containers |
| Low-quality page versus reference | Thin sections, repeated template copy, generic stock images | Add useful sections, vary copy, use relevant images, tighten hierarchy |
| Same widget looks different across pages | Duplicated markup, page-local CSS, no component contract | Extract a shared component or normalize markup and classes to one contract; see [components.md](components.md) |
| Many card variants without purpose | Ad hoc class combinations applied page by page | Define named variants in the component and map old usages into them |
| Integration or logo tiles inconsistent in size | Each page hand-codes image and card rules | Create one logo tile component with a fixed image box, label treatment, and grid behavior |
| CTA bands vary randomly | Page-specific final sections | Create one final-CTA component with explicit variants for centered, split, compact, or gradient |
| Focus ring clipped | Parent uses `overflow: hidden` with insufficient padding | Move the ring to an `outline` (which paints outside the box) or add internal padding so the ring fits |
| Focus ring invisible on dark surfaces | Single-color ring chosen for light mode only | Use a ring color with 3:1 contrast against both surface and resting element state, in both light and dark mode |
| Hero image causes CLS | Missing intrinsic `width` and `height` | Declare width and height as attributes; reserve space with `aspect-ratio` |
| Late-loading hero image hurts LCP | Hero image is `loading="lazy"` or behind hydration | Use `loading="eager"` and `fetchpriority="high"` on the hero LCP image only |
| Webfont flash on first paint | `font-display: block` or no `font-display` set | Use `font-display: swap` for body and `optional` for display; preload at most one critical weight |
| Unstyled flash on hydration | Critical CSS not inlined | Inline above-the-fold CSS under 14 KB so it fits in the first round trip |
| Button label truncates on mobile | Fixed width or `white-space: nowrap` with insufficient room | Constrain by `max-width`, allow wrap, or shorten the label |
| Form validation appears late | Validation runs on every keystroke, then debounces | Validate on blur for new errors; clear errors live as the user types |
| Modal scrolls with the page | Body scroll not locked when modal is open | Lock body scroll on open and restore on close. Compensate for the scrollbar width or the page shifts sideways: measure `gap = window.innerWidth - document.documentElement.clientWidth`, set `body { overflow: hidden }` plus `padding-right: gap` while open, and restore both on close. On overlay-scrollbar systems `gap` is 0, so there is no shift. Also restore the scroll position. |
| Modal traps keyboard but not screen reader | Background is interactive in the accessibility tree | Mark background `inert` (or `aria-hidden="true"` plus `pointer-events: none`) while modal is open |
| Skip link overflows the viewport while hidden | `position: absolute; left: -9999px` can still extend the document layout box, or the focus state inherits the off-screen position | Use the modern `clip-path: inset(100%)` plus `position: absolute; width: 1px; height: 1px; overflow: hidden` pattern when hidden; switch to `clip-path: inset(0); position: fixed; top: 1rem; left: 1rem` on `:focus` |
| Tables overflow on mobile | Fixed-width table without scroll wrapper | Wrap in a scroll container with `overflow-x: auto`, or transform to cards below the breakpoint |
| Empty state is blank | No specific message and no primary action | Add a specific message, the condition that fills it, and a primary action that resolves it |

## Programmatic Geometry Sweep

The geometry sweep catches defects that are easy to miss in a screenshot pass: sub-44 hit targets buried in long pages, hidden text overflow on edge cases, viewport bleed from a single rogue element, duplicate arrows that read fine in isolation but stack across siblings.

Run from a headless browser of your choice (Puppeteer, Playwright, or equivalent). The snippet below uses only standard DOM and CSSOM APIs:

```js
const issues = await page.evaluate(() => {
  const out = [];
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.display !== "none"
      && cs.visibility !== "hidden" && parseFloat(cs.opacity) > 0;
  };
  const nameFor = (el) =>
    el.tagName.toLowerCase()
    + (el.className
        ? "." + String(el.className).trim().split(/\s+/).slice(0, 3).join(".")
        : "");

  if (document.scrollingElement.scrollWidth > window.innerWidth + 1) {
    out.push({ type: "viewport-bleed", value: document.scrollingElement.scrollWidth, viewport: window.innerWidth });
  }

  for (const el of document.querySelectorAll("body *")) {
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2 && cs.overflowX === "visible") {
      const text = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80);
      if (text && !["HTML", "BODY", "MAIN", "SECTION"].includes(el.tagName)) {
        out.push({ type: "text-overflow", selector: nameFor(el), text });
      }
    }
  }

  for (const el of document.querySelectorAll("a, button, input, select, textarea, [role='button'], .btn")) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 44 || r.height < 44) {
      out.push({ type: "small-target", selector: nameFor(el), width: Math.round(r.width), height: Math.round(r.height) });
    }
  }

  for (const el of document.querySelectorAll("a, .btn-text")) {
    const text = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (/→\s*→|›\s*›|»\s*»/.test(text)) out.push({ type: "duplicate-arrow", text });
  }

  return out;
});
```

The sweep returns nine check categories. Run it on every audited route at both capture viewports.

| # | Check | Triggers when |
|---|-------|---------------|
| 1 | Viewport bleed | `document.scrollingElement.scrollWidth` exceeds `window.innerWidth` by more than 1 px |
| 2 | Visible text overflow | An element's `scrollWidth` exceeds its `clientWidth` by more than 2 px while `overflow-x` is `visible` |
| 3 | Small interactive target | A visible interactive element measures less than 44 by 44 CSS pixels |
| 4 | Duplicate arrow | A link or text-button label contains stacked arrow glyphs (`→ →`, `› ›`, `» »`) |
| 5 | Pricing or card clickable mismatch | A card visually behaves as a link but only an inner CTA is the anchor (extend the sweep with a per-project selector list) |
| 6 | Header or dropdown centering | The dropdown's horizontal center is more than 4 px from its trigger center (extend with the per-project selector) |
| 7 | Mobile drawer scroll lock | Body scroll is not locked while the drawer is open (extend with a per-project trigger sequence) |
| 8 | Focus state presence | A keyboard-focusable element produces no visible outline change on focus (extend with a per-project focus drive) |
| 9 | Project-specific extension | Open slot for negative letter-spacing, banned colors, or any rule the project standardizes on |

The base snippet covers checks 1 through 4 directly. Checks 5 through 8 require selectors and triggers specific to the project under audit; add them to the same `evaluate` call. Check 9 is the slot for any rule the project enforces on top of the standard nine.

Filter false positives only when you can explain them: hidden off-canvas content, intentionally overflowing dropdown internals that do not affect the page viewport, or a tap target that is intentionally part of a larger ancestor hit area. Document the filter so the next run does not re-discover it.

The small-target check (interactive element under 44 by 44) must EXEMPT inline text links, or it floods with false positives. The base snippet above does NOT do this yet; extend its small-target loop to skip ANCHORS (`<a>`) whose computed `display` is `inline` or `inline-block` and that sit in running text, a breadcrumb, or a footer text-link list, per the WCAG 2.5.8 inline exception. Constrain the exemption to anchors on purpose: buttons and menu triggers default to `inline-block` and often live inside an `<li>`, so a broader rule would wrongly exempt genuinely too-small standalone controls. After the extension, every standalone control (button, toggle, CTA, icon button, menu trigger, form control) is still flagged. Minimal conditional at the top of the small-target `for...of` loop (use `continue`, not `return`, or you exit the whole `page.evaluate` callback): `const cs = getComputedStyle(el); if (el.tagName === "A" && (cs.display === "inline" || cs.display === "inline-block") && el.closest("p, nav[aria-label*='breadcrumb' i], footer")) continue;`.

## Programmatic Content and Markup Sweep

The geometry sweep above catches visual defects. This companion sweep catches content, markup, and SEO defects that a screenshot cannot show: a missing canonical, a second H1, a title that is too long, an unparseable JSON-LD block, an image with no alt, an orphan page, a duplicate id. Run it over the BUILT HTML (the shipped output, not the dev server) on every route.

It complements, it does not replace, the Rich Results Test (which validates JSON-LD content against Google's rules). This sweep only checks that the markup is present and parseable.

```js
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const DIST = process.argv[2] || "dist";
const files = [];
(function walk(d){ for (const e of readdirSync(d)) {
  const p = join(d, e);
  statSync(p).isDirectory() ? walk(p) : p.endsWith(".html") && files.push(p);
}})(DIST);

const decode = (s) => s
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"');

const problems = [];
const linkedTo = new Set();
const pages = [];

for (const f of files) {
  const rel = f.replace(DIST, "");
  const s = readFileSync(f, "utf8");
  const robotsTag = (s.match(/<meta\b[^>]*\bname=["']robots["'][^>]*>/i) || [])[0] || "";
  const noindex = /noindex/i.test(robotsTag);
  pages.push(rel.replace(/index\.html$/, "").replace(/\.html$/, "") || "/");

  const h1 = (s.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) problems.push(`H1=${h1} ${rel}`);

  const title = decode((s.match(/<title>([^<]*)<\/title>/) || [])[1] || "");
  if (!noindex && (title.length < 50 || title.length > 60)) problems.push(`TITLE ${title.length} ${rel}`);

  const descTag = (s.match(/<meta\b[^>]*\bname=["']description["'][^>]*>/i) || [])[0] || "";
  const desc = (descTag.match(/\bcontent=["']([^"']*)/i) || [])[1] || "";
  if (!noindex && (desc.length < 140 || desc.length > 160)) problems.push(`DESC ${desc.length} ${rel}`);

  if (!noindex && !/rel=["']canonical["']/.test(s)) problems.push(`NO-CANONICAL ${rel}`);
  if (!noindex && !/property=["']og:title["']/.test(s)) problems.push(`NO-OG ${rel}`);

  for (const m of s.matchAll(/<img\b[^>]*>/g)) if (!/\salt=/.test(m[0])) problems.push(`IMG-NO-ALT ${rel}`);
  if (/href=["']#["']/.test(s)) problems.push(`DEAD-ANCHOR ${rel}`);

  const ids = [...s.matchAll(/\sid=["']([^"']+)["']/g)].map((m) => m[1]);
  const seen = new Set(), dup = new Set();
  for (const id of ids) { if (seen.has(id)) dup.add(id); seen.add(id); }
  if (dup.size) problems.push(`DUP-ID ${rel}: ${[...dup].join(", ")}`);

  for (const m of s.matchAll(/<script type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch (e) { problems.push(`BAD-JSONLD ${rel}: ${e.message}`); }
  }

  for (const m of s.matchAll(/href=["'](\/[^"'#?]*)/g)) linkedTo.add(m[1].replace(/\/$/, "") || "/");
}

for (const p of pages) {
  const norm = p.replace(/\/$/, "") || "/";
  if (norm !== "/404" && !linkedTo.has(norm)) problems.push(`ORPHAN ${norm}`);
}

console.log(problems.length ? problems.join("\n") : "NO PROBLEMS");
```

A run is clean when it prints `NO PROBLEMS`. Tune the length thresholds to the project's title and description bars. The `decode()` helper is intentionally minimal (it covers the five most common entities only); a title carrying `&nbsp;`, `&#x27;`, `&#8217;`, or any other entity it does not list will still over-count against the hard 50 to 60 length check, so swap in a complete entity decoder (a small library, or read `document.title` in a DOM context) before trusting the length numbers in real tooling. The sweep uses only Node and string parsing, so it needs no browser; pair it with the geometry sweep (which needs a headless browser) for full coverage. Filter a false positive only when you can explain it (a deliberately noindex utility page, an intentional single-instance id), and document the filter.

## Per-Check Thresholds

The thresholds below align with the North Star Targets in the entry SKILL.md and the touch-target rule in [ui-ux.md](ui-ux.md). They do not introduce new bars; they make the bars measurable.

| Check | Threshold | Source |
|-------|-----------|--------|
| Capture viewports | `1440x900` desktop, `375x812` mobile | [responsive.md](responsive.md) breakpoints table |
| Touch target minimum | 44 by 44 CSS pixels | Rule 29 in SKILL.md, [ui-ux.md](ui-ux.md) hit targets table |
| Horizontal overflow tolerance | 0 px on mobile, 0 px on desktop | [responsive.md](responsive.md) |
| Duplicate arrow count | 0 across all visible labels | This file, defect table |
| Dropdown centering tolerance | 4 px from trigger center | This file, geometry sweep |
| Focus ring contrast | 3:1 against surface and resting state | [accessibility.md](accessibility.md) contrast targets |
| LCP image declared dimensions | Both `width` and `height` present | Rule 1 in SKILL.md, [performance.md](performance.md) |

A run is "clean" when every check returns zero issues at both capture viewports.

## Acceptance

A polish pass is not complete until:

- The geometry sweep returns zero issues on every audited route at `1440x900` and `375x812`.
- Every defect found in the lookup table has been fixed at the right layer (component, page, or design token).
- Re-captured screenshots show the fix and no regression on neighbors.

Until then, the work is not done. Do not present an incomplete visual pass as complete.

## See Also

- [audit-workflow.md](audit-workflow.md) for the full multi-page audit procedure
- [components.md](components.md) for component contracts and drift detection
- [accessibility.md](accessibility.md) for focus, contrast, and skip-link patterns
- [responsive.md](responsive.md) for capture viewports and breakpoints
- [performance.md](performance.md) for LCP, font, and image strategy
