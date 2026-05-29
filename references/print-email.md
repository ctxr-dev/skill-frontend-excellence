---
title: Print and Email
purpose: Two constrained surfaces shipped from every product: print stylesheets for invoices and receipts, and email HTML for transactional and marketing messages. Both demand a different rulebook from the screen.
load-when:
  task-keywords: [print, email, "@page", page-break, transactional email, Outlook]
  symptoms: [score dropped, broken on Safari, dark mode broken]
prereq: SKILL.md
related: [design.md, ui-ux.md, accessibility.md, seo.md]
size: ~380 lines
---

# Print and Email

The screen is not the only surface a web product ships. Invoices print. Receipts print. Summaries get exported as PDF. Transactional email lands in clients that have not changed their rendering engine in 15 years. These surfaces are first-class outputs that deserve first-class discipline.

## Why This Exists

Two reasons to take both surfaces seriously.

First, print: transactional invoices, receipts, summaries, statements, and order confirmations are real surfaces. Users print them, save them as PDFs, fax them (still, somehow), attach them to expense reports. A page that renders cleanly on screen but cuts a line item across a page break, drops the header, or hides the total in a `display: none` section is broken.

Second, email: email HTML is the most-constrained shipping environment in mainstream development. Outlook 2007 still renders with the Word HTML engine. Gmail strips `<style>` blocks above a size threshold. Apple Mail mostly behaves but adds its own dark-mode quirks. A layout that uses flex, grid, or modern CSS reliably breaks in at least one major client. The rule is closer to "HTML 4 plus inline CSS" than to "HTML5 with caveats".

The principle: design for the destination surface, not for the screen you wrote it on.

## Print Stylesheets

### `@media print` discipline

Every print-relevant page has a `@media print` block that hides the chrome and exposes the content. The minimum:

```css
@media print {
  nav, header, footer, aside,
  .banner, .share-button, .floating-action,
  .skip-link, .cookie-consent, .toast-region {
    display: none !important;
  }

  body {
    color: #000;
    background: #fff;
    font-size: 11pt;
    line-height: 1.4;
  }

  main {
    max-width: none;
    padding: 0;
  }
}
```

What to hide: navigation, search bars, share buttons, floating action buttons, cookie banners, toast regions, social proof badges, anything below-the-fold that does not relate to the printed artifact.

What to show: full URLs in links so the printed page is self-documenting:

```css
@media print {
  a[href]:not([href^="#"]):not([href^="javascript:"])::after {
    content: " (" attr(href) ")";
    font-size: 90%;
    color: #555;
  }
}
```

Skip the URL suffix for fragment links (`#section`), `mailto:`, and `tel:` because the surface text already conveys the destination.

### `@page` rules

The `@page` at-rule controls page size, margins, and layout outside the content box. Set defaults for the document:

```css
@page {
  size: A4;
  margin: 20mm 18mm;
}
```

For US-letter sources, replace `size: A4` with `size: letter`. For landscape layouts (wide tables, charts), use `size: A4 landscape`.

### Page-break control

The modern property names are `break-before`, `break-after`, and `break-inside`. The older `page-break-*` family still works and is widely supported, but new code should use the modern names:

```css
@media print {
  h1, h2 { break-after: avoid; }
  table, figure, .invoice-row { break-inside: avoid; }
  .invoice-summary { break-before: page; }
}
```

Use `break-inside: avoid` on any visually-coherent unit that should not split across pages: invoice line items, addresses, signature blocks, table rows, captioned figures.

### Color in print

By default, browsers strip background colors and images when printing to save ink. For surfaces where the color is meaningful (status badges, brand bars, signature blocks), force the color through:

```css
@media print {
  .status-paid {
    background: #d4edda;
    color: #155724;
    color-adjust: exact;
    print-color-adjust: exact;
  }
}
```

The standard property is `print-color-adjust`. The older `color-adjust` was the same property under the previous name; ship both for compatibility with older Firefox.

Caveat: forcing background colors does not guarantee the user's printer reproduces them. Plan the design so the printed page is still readable in monochrome. The colored badge still says "Paid" in text; do not rely on color alone to convey state. Cross-link: accessibility.md WCAG 1.4.1 (use of color).

### Headers, footers, and page numbers

The `@page` rule accepts pseudo-classes for first-page and even/odd-page differentiation:

```css
@page {
  size: A4;
  margin: 18mm;

  @top-right {
    content: counter(page) " / " counter(pages);
    font-size: 9pt;
    color: #666;
  }
}

@page :first {
  @top-right { content: ""; }
}

@page :left {
  margin-left: 22mm;
}

@page :right {
  margin-right: 22mm;
}
```

Browser support for `@page` margin boxes (`@top-right`, `@bottom-center`, etc.) is uneven. Chromium honours the page counter; Firefox honours much of the syntax; Safari covers a subset. For invoices that must render identically across browsers, use a server-side PDF generator (headless Chromium, Prince, WeasyPrint) rather than relying on the user's browser print pipeline.

### Avoiding orphans and widows

An orphan is a single line at the bottom of a page that should have stayed with the next page's paragraph. A widow is a single line at the top of a page that should have stayed with the previous page's paragraph. Both look like layout bugs to the reader.

```css
@media print {
  p, li {
    orphans: 3;
    widows: 3;
  }
}
```

The browser will push or pull lines to ensure at least three lines stay together at each page break. Three is the conventional minimum; for body-heavy documents (legal, contracts) consider four.

### Print preview as the source of truth

DevTools provides a Print emulation mode that renders the page as if it were going to print, without sending pages to the spooler:

1. Open DevTools.
2. Open the command menu (Cmd+Shift+P on macOS, Ctrl+Shift+P on Windows/Linux).
3. Run "Show Rendering".
4. Set "Emulate CSS media type" to "print".

This is faster than the print dialog and shows page boundaries via the actual print preview. Run the emulation on every invoice, receipt, and report template before shipping.

Check: open the print preview, scroll through every page, confirm headers and totals are visible, confirm no line items split across pages, confirm full URLs appear next to text-link references.

## Email HTML Constraints

Email is a separate environment from the web. The rules below are not stylistic preferences; they are the floor for messages that render correctly across major clients.

### Why email is a different animal

The major rendering environments and what they break:

| Client | Engine | What you lose |
|---|---|---|
| Outlook 2007 to 2019 (Windows) | Word HTML engine | flex, grid, modern CSS, background images on most elements, `<style>` partly stripped |
| Outlook 365 (Windows) | Word HTML engine | Same as above |
| Outlook for Mac | WebKit | Mostly fine |
| Outlook.com (web) | Modern engine | Mostly fine, some `<style>` stripping |
| Gmail (web, app) | Modern, but `<style>` stripped above size threshold | Inline CSS only is safe; media queries supported in `<style>` if it survives |
| Apple Mail (macOS, iOS) | WebKit | Mostly fine; dark-mode auto-inversion |
| Yahoo, AOL, ProtonMail | Mixed | Inline CSS, no JS, sandboxed |
| Mobile Gmail (Android, iOS) | Webview | Inline CSS plus responsive media queries |

The intersection of "works everywhere" is small. Optimize for that intersection.

### Table-based layouts

Layout is done with `<table>` elements, not `<div>` plus flex or grid. The outer wrapper is a single-cell table that centers the content. Inner sections are nested tables. This pattern reads as the 2005 web because that is what the most-restricted clients support:

```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td>
            <!-- header -->
          </td>
        </tr>
        <tr>
          <td>
            <!-- body -->
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

Add `role="presentation"` on every layout table so screen readers do not announce them as data tables. Cross-link: accessibility.md table semantics.

### Inline CSS only

Most clients strip or partially strip `<style>` blocks. Inline every style on the element itself:

```html
<td style="padding: 16px; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.4; color: #1a1a1a;">
  Body copy goes here.
</td>
```

Write the template with `class="..."` attributes for readability, then run a build-time CSS inliner that converts classes into inline `style="..."` declarations. Common tools: Juice (Node), Premailer (Ruby, has a CLI), Maizzle (Tailwind-based), MJML (compiles a higher-level syntax to inlined HTML). The class names you write are for the inliner; the shipped HTML has inline styles only.

Keep one `<style>` block at the top of the document for media queries (responsive breakpoints, dark-mode overrides) since some clients honour media queries inside `<style>` even when they strip layout selectors.

### Width: 600 pixels canonical

The dominant canonical max-width for email layout is 600 pixels. Wider designs break in narrow client preview panes; narrower designs waste reading space. Stay at 600 unless the content (a wide invoice table) demands more, in which case test in every client before shipping.

Mobile responsiveness is achieved by `display: block` on table cells inside a media query:

```html
<style>
  @media (max-width: 600px) {
    .stack { display: block !important; width: 100% !important; }
  }
</style>
```

```html
<td class="stack" width="300" style="vertical-align: top; padding: 12px;">
  Left column
</td>
<td class="stack" width="300" style="vertical-align: top; padding: 12px;">
  Right column
</td>
```

At narrow viewports, the two cells stack vertically because each becomes a full-width block. At wide viewports, they stay side by side.

### Dark-mode media query support

Apple Mail honours `prefers-color-scheme`. Outlook on Windows inverts the design with its own algorithm (often badly). Gmail mostly does not honour the media query.

The pattern: design the email to be legible in both dark and light, then add a `prefers-color-scheme: dark` block for clients that honour it:

```html
<style>
  :root { color-scheme: light dark; }
  @media (prefers-color-scheme: dark) {
    .bg { background: #1a1a1a !important; }
    .text { color: #fafafa !important; }
    .border { border-color: #444 !important; }
  }
</style>
```

For Outlook on Windows, set `<meta name="color-scheme" content="light dark">` and accept that some clients will partially invert. Test in Litmus or Email on Acid before shipping a sensitive template.

### Outlook conditional comments

Outlook on Windows respects MSO-specific conditional comments. Use them for VML fallbacks when the design needs background images or buttons that Outlook would otherwise strip:

```html
<!--[if mso]>
<v:rect xmlns:v="urn:schemas-microsoft-com:vml" fillcolor="#1a1a1a" stroke="f" style="width: 200px; height: 48px;">
  <v:textbox inset="0,0,0,0">
<![endif]-->
<a href="https://your-domain/cta" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
  Confirm
</a>
<!--[if mso]>
  </v:textbox>
</v:rect>
<![endif]-->
```

The VML block renders the button as a vector shape in Outlook; modern clients ignore the comment and render the standard anchor. The result is a button that looks correct in both worlds.

### Image hosting

Three rules:

1. Use absolute URLs (`https://cdn.your-domain/img/logo.png`) for every image. Email clients do not have a base path.
2. Never put a transparent PNG over a colored background as a layered visual. Outlook adds a small black border on transparent edges that ruins the design. Either bake the background into the image or use a solid PNG.
3. Every `<img>` has `alt` text that conveys meaning even if the image never loads. Many clients block images by default until the user opts in.

Image dimensions:

- Set `width` and `height` attributes on the `<img>` element so the layout reserves space before the image loads.
- Use 2x resolution images and scale down with the attributes so the design stays crisp on Retina displays.
- Hard cap any single image at 100 KB; total payload at 500 KB. Larger payloads trip spam filters and get truncated in Gmail (which clips messages over 102 KB).

### Tracking pixels: when ethical, when not

The 1x1 transparent tracking pixel is the conventional way to measure email opens. It is ethical for transactional and explicitly opted-in marketing. It is dubious for cold outreach and unsolicited messages.

The standard pattern:

```html
<img src="https://your-domain/o/pixel.gif?msg=abc123" width="1" height="1" alt="" style="display: block; border: 0;">
```

Respect signals that the recipient has opted out of tracking:

- The `Sec-GPC: 1` request header (Global Privacy Control) indicates the user has signaled opt-out via their browser or mail client. Drop the tracking record on the server when present.
- Treat unsubscribe and tracking-opt-out as a single setting from the user's perspective. Honouring one but not the other is a defect, not a clever distinction.

### Transactional vs marketing envelope

Two different products with different rules:

| Envelope | What it is | Consent | Footer |
|---|---|---|---|
| Transactional | Order confirmation, password reset, invoice, receipt, account notification | Implied by the user's action | Brief footer, support contact, account link |
| Marketing | Newsletter, promo, announcement, drip campaign | Explicit opt-in (GDPR), opt-out option (CAN-SPAM) | Full mailing address, one-click unsubscribe, preferences link |

Mixing the two is a regulatory exposure. A transactional message that promotes other products becomes a marketing message and inherits the marketing consent rules. Keep transactional messages focused on the transaction; route promotional content through the marketing envelope with its own consent and unsubscribe machinery.

Three regulatory floors to know:

1. **CAN-SPAM (US)**: opt-out required, sender identification required, accurate subject lines, physical mailing address in the footer.
2. **GDPR (EU/UK)**: explicit opt-in for marketing, granular consent, easy withdrawal, data-access requests honoured.
3. **CASL (Canada)**: explicit opt-in for marketing, identification and unsubscribe required, retained consent records.

These are floors, not ceilings. Treat them as the minimum. The user-respect bar (no dark patterns, honour preferences immediately, one-click works the first time) is higher.

## See also

- [design.md](design.md) for the typography and color decisions that translate into print color and email type scale.
- [ui-ux.md](ui-ux.md) for the unsubscribe and preference UX, plus the notification etiquette that governs marketing consent.
- [accessibility.md](accessibility.md) for use-of-color rules that apply equally to printed status badges and color-coded email content.
- [seo.md](seo.md) for the structured-data sibling case where machines parse the markup: cross-link for canonical URL discipline on web versions of printed and emailed artifacts.
