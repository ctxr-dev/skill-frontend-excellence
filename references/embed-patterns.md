---
title: Embed Patterns (Host and Guest)
purpose: Embed-as-host and embed-as-guest patterns for iframes. Sandboxing, allow-lists, viewport coupling, theme inheritance, postMessage handshakes, viewport reporting, top-window navigation, origin verification, and cross-origin isolation impact.
load-when:
  task-keywords: [embed, iframe, sandbox, postMessage, host, guest, widget, third-party widget, frame-ancestors, Permissions-Policy, cross-origin isolation, COOP, COEP, CORP, Storage Access API]
  symptoms: [third-party script slow, viewport overflow, broken on Safari, broken on Firefox]
prereq: SKILL.md
related: [security.md, auth.md, performance.md, accessibility.md]
size: ~450 lines
---

# Embed Patterns (Host and Guest)

Framework-agnostic patterns for embedding and being embedded. Every modern site is BOTH: it embeds third-party widgets (maps, video, payment, support chat, analytics dashboards), AND its own widgets get embedded somewhere (partner sites, customer dashboards, documentation portals). The rules for each role differ.

## Why This Matters

A page that embeds a third-party iframe has a host's responsibilities: sandbox the guest, allow only the capabilities it needs, isolate its storage, validate every message it sends back. A page whose widget runs inside someone else's iframe has a guest's responsibilities: report viewport, adopt theme, verify origin on every inbound message, fall back gracefully when storage is partitioned.

Get the roles confused and you ship XSS surface (host treating guest as trusted) or a widget that only works on your own domain (guest assuming first-party storage).

The rules in this file are split into three sections: HOST, GUEST, and CROSS-CUTTING (the rules that apply to both sides).

## Embed as HOST: You Embed Third-Party

You render an iframe pointing at someone else's origin. The frame may contain code you cannot audit at request time. Your job is to bound its capabilities.

### Sandboxing third-party iframes

The `sandbox` attribute is an opt-in trust model. With no value, the iframe has zero capabilities: no scripts, no forms, no top-level navigation, no same-origin treatment of its own origin.

Add capabilities only as the embedded content requires them.

| Flag | Grants |
|---|---|
| `allow-scripts` | The iframe may run JavaScript. |
| `allow-same-origin` | The iframe may treat its own origin as same-origin (cookies, storage). |
| `allow-forms` | The iframe may submit forms. |
| `allow-popups` | The iframe may open new windows. |
| `allow-popups-to-escape-sandbox` | Opened windows are not themselves sandboxed. |
| `allow-top-navigation` | The iframe may navigate the top window. |
| `allow-top-navigation-by-user-activation` | Top navigation only inside a user gesture. |
| `allow-modals` | The iframe may show `alert`, `confirm`, `prompt`. |
| `allow-storage-access-by-user-activation` | The iframe may call `requestStorageAccess`. |

### The minimum-trust set

For a typical third-party widget (a script-driven UI from a partner you mostly trust):

```html
<iframe
  src="https://widget.example/partner"
  sandbox="allow-scripts allow-same-origin"
  loading="lazy"
  title="Partner widget"
></iframe>
```

This gives the widget what it needs to run and persist its own state, nothing more. No forms, no popups, no top navigation, no modals.

Check: load the embed with the network panel filtering on the guest origin. Confirm the guest can do its job. Then open the Console and confirm `window.top.location.href` is unreadable from the guest.

### When to drop `allow-same-origin`

For untrusted third-party content (user-submitted embeds, advertising creatives, sandboxed previews), drop `allow-same-origin`. The iframe still runs scripts but its origin is treated as `null`; it cannot read its own cookies or storage. This is the right posture for any content that could be hostile.

Check: an untrusted preview iframe cannot read its own `document.cookie` (returns empty string) and cannot reach into your top-window storage either.

### Allow-list via `allow` attribute

The `allow` attribute delegates Permissions-Policy features to the iframe. Without explicit delegation, the iframe cannot access camera, microphone, geolocation, payment, autoplay, or fullscreen, even if its own origin would normally allow them.

```html
<iframe
  src="https://map.example/embed"
  allow="geolocation 'self' https://map.example"
  sandbox="allow-scripts allow-same-origin"
></iframe>
```

Allow only the features the widget actually needs. A support chat iframe does not need camera; a video conferencing widget does.

Check: enumerate every iframe on the page. For each, confirm the `allow` list contains only the capabilities the widget requires. A bare `<iframe>` with no `allow` is the correct default.

### Viewport coupling

Iframes do not size to their content automatically. Three options, in order of preference:

1. **Fixed height.** The iframe has a known size and stays there. Best for badges, ratings, small status widgets.
2. **Internal scrolling.** The iframe is a window into a scrollable region. Acceptable for embedded apps, ugly for content.
3. **Resize via postMessage.** The guest reports its content height, the host adjusts. This is the only way to make an embedded form or article feel native.

The resize-via-postMessage pattern is documented in the GUEST section under "Viewport reporting".

### Theme inheritance

CSS custom properties do not cross the iframe boundary. A `--color-bg` on the host page is invisible to the guest. Two paths:

1. **Theme via URL parameter.** Pass `theme=dark` or a color in the iframe `src`. Coarse, but simple and cacheable.
2. **Theme via postMessage.** The host sends a `theme` message after load; the guest applies it. Finer-grained and reactive to host theme changes.

For the postMessage handshake, see the GUEST section under "Theme adoption".

Check: switch the host theme. The embedded iframe updates without a reload.

### Cross-origin storage post-3PCD

After third-party cookie deprecation, an iframe gets its own storage partition keyed by the top-level site. The guest's cookies on `widget.example` from your site do NOT match its cookies on the same domain from a different host site.

Implications:

- A widget that expects a shared session across multiple host sites cannot rely on its own cookies.
- The guest must request storage access via the Storage Access API on a user gesture (see `auth.md`).
- For widgets you control on both sides, use partitioned cookies (CHIPS) so the cookie carries `Partitioned` and lives per top-level site without third-party scope.

Check: in DevTools Application, the embedded widget's cookie shows a `Partition Key` matching the host top-level site, not a blank or shared partition.

### CSP `frame-src` discipline

The host page's Content Security Policy `frame-src` directive declares which origins may be embedded. Default to a strict allow-list:

```text
Content-Security-Policy: frame-src 'self' https://map.example https://widget.example;
```

- Never `frame-src *` in production.
- One directive listing every legitimate embed source, no more.
- When you remove a third-party embed, remove its origin from `frame-src` in the same commit.

Check: the deployed CSP `frame-src` lists exactly the iframe origins the page actually uses. No leftovers from removed widgets.

## Embed as GUEST: Your Widget Gets Embedded

Your widget runs inside someone else's iframe. The host page controls almost everything: the surrounding chrome, the theme, the viewport, the storage partition. Your job is to be a polite, robust guest.

### postMessage handshake protocol

The guest and host communicate via `postMessage`. Define a small, versioned protocol and enforce it on every message.

```js
const HOST_ORIGIN = 'https://host.example';
const PROTOCOL_VERSION = 1;

function send(type, payload) {
  window.parent.postMessage(
    { protocol: 'partner-widget', version: PROTOCOL_VERSION, type, payload },
    HOST_ORIGIN,
  );
}

window.addEventListener('message', (event) => {
  if (event.origin !== HOST_ORIGIN) return;
  const msg = event.data;
  if (!msg || msg.protocol !== 'partner-widget') return;
  if (msg.version !== PROTOCOL_VERSION) return;

  switch (msg.type) {
    case 'theme': applyTheme(msg.payload); break;
    case 'resize-request': send('viewport', getViewport()); break;
    default: /* unknown type, ignore */
  }
});

send('ready', { version: PROTOCOL_VERSION });
```

The four discipline rules:

1. Verify `event.origin` is the expected host on every inbound message.
2. Discriminate messages by an explicit `protocol` field (so other widgets on the host page do not collide).
3. Negotiate version. If the host is on a newer protocol than the guest, ignore unknown types rather than guessing.
4. Send `ready` once on init so the host knows it can begin sending theme and configuration.

Check: in the embedded context, every inbound `message` event handler returns immediately for any origin other than the configured host.

### Viewport reporting

The guest announces its content height so the host can size the iframe. Use `ResizeObserver` on the document body or the widget root.

```js
const root = document.getElementById('widget-root');
const ro = new ResizeObserver(() => {
  send('viewport', { height: root.scrollHeight, width: root.scrollWidth });
});
ro.observe(root);

window.addEventListener('load', () => {
  send('viewport', { height: root.scrollHeight, width: root.scrollWidth });
});
```

Pair this with the host listening for `viewport` messages and setting the iframe height accordingly:

```js
const iframe = document.querySelector('iframe.partner');
window.addEventListener('message', (e) => {
  if (e.origin !== 'https://widget.example') return;
  if (e.data.type === 'viewport') {
    iframe.style.height = `${e.data.payload.height}px`;
  }
});
```

Check: open the embed. As content loads (images, async data), the iframe resizes to the content height without internal scrollbars.

### Theme adoption

The guest accepts a `theme` message and maps it to CSS custom properties on its own root.

```js
function applyTheme(theme) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme)) {
    root.style.setProperty(`--${key}`, value);
  }
}
```

Define a small, stable set of theme tokens (background, foreground, primary, border, radius, font-family). Document them as the contract. Refuse to read theme from anything other than a verified postMessage; never sniff the host's stylesheet.

Check: send a `theme` message with `--color-bg: #111`. The widget background updates without a reload.

### Account-linked vs anonymous embed flows

Some embeds need to know who the user is on the host site (saved preferences, account-bound state). Others do not.

- **Anonymous embed.** No login, no cross-site identity, no third-party cookies needed. This is the easy path.
- **Account-linked embed.** The widget needs the user's identity on the widget's own service. Two patterns:
  - Host passes a short-lived token via postMessage after a successful host-side auth check.
  - The widget runs its own sign-in inside the iframe via Storage Access API plus partitioned cookies (CHIPS). See `auth.md`.

Check: identify which mode each embed is in. Anonymous embeds make zero auth calls. Account-linked embeds either accept a host token on init or run their own gated sign-in.

### Width responsiveness without media queries

Inside an iframe, the viewport is the iframe's box, not the host viewport. Media queries break in subtle ways: `@media (min-width: 600px)` answers "is the iframe at least 600px", not "is the host page at least 600px". Use container queries instead.

```css
.widget {
  container-type: inline-size;
}

@container (min-width: 480px) {
  .widget-header { font-size: 1.25rem; }
  .widget-actions { flex-direction: row; }
}
```

The widget queries its own container. If the host shrinks the iframe to 320px or expands it to 800px, the widget reflows correctly.

Check: resize the host browser window. The widget reflows at its own breakpoints, not at the host viewport's breakpoints.

## Cross-Cutting Concerns

The rules below apply to both host and guest.

### `X-Frame-Options` vs CSP `frame-ancestors`

Two HTTP headers control whether a page may be embedded. `X-Frame-Options` is the legacy header (`DENY`, `SAMEORIGIN`, `ALLOW-FROM`). CSP `frame-ancestors` is the modern replacement.

Rules:

- Set `frame-ancestors` on every page that should not be framed.
- `frame-ancestors 'self'` permits embedding only on the same origin (the modern `SAMEORIGIN`).
- `frame-ancestors 'none'` blocks embedding entirely (the modern `DENY`).
- `frame-ancestors https://partner.example` permits embedding only on the listed origin.
- When both headers are present and disagree, CSP wins in modern browsers.

For sign-in pages, payment pages, and any page where clickjacking matters, send `frame-ancestors 'none'`. For the rest of the site, set the policy explicitly even when the answer is `'self'`. Default-deny beats default-allow.

Check: the sign-in and payment routes return `Content-Security-Policy: frame-ancestors 'none'`. Other routes return an explicit `frame-ancestors` directive listing the legitimate embedders.

### Top-window navigation from a sandboxed iframe

A sandboxed iframe cannot navigate the top window by default. The browser ignores `window.top.location = ...` and `<a target="_top">` clicks from sandboxed content. To allow it:

- `allow-top-navigation` permits any top navigation. Use only for fully trusted content.
- `allow-top-navigation-by-user-activation` requires a user gesture. Use this for widgets that need to navigate away on a click (sign-out, expand-to-fullscreen).
- Never combine `allow-scripts allow-same-origin allow-top-navigation` without `by-user-activation` on untrusted content. That is the classic clickjacking surface.

Check: a sandboxed widget with only `allow-scripts allow-same-origin` cannot navigate the host away. Adding `allow-top-navigation-by-user-activation` enables top navigation only inside click handlers.

### postMessage origin verification

The single most important rule for cross-frame messaging: NEVER process a `message` event without checking `event.origin`.

```js
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://expected-origin.example') return;
  // safe to read event.data
});
```

Common mistakes that produce XSS:

- Checking `event.source` instead of `event.origin`. The source is a window reference; an attacker can race a different window into the slot.
- Allow-listing by `endsWith('.example.com')`. An attacker registers `evilexample.com` and matches.
- Skipping the check on outbound messages. `postMessage(data, '*')` broadcasts to any origin that ends up in the slot. Always specify the expected target origin.

Check: grep the codebase for every `addEventListener('message')` and every `postMessage(`. Each handler has an `event.origin` check before reading `event.data`. Each `postMessage` call passes an explicit target origin, not `*`.

### Cross-origin isolation impact on embeds

If the host page is cross-origin isolated (sends `Cross-Origin-Opener-Policy: same-origin` plus `Cross-Origin-Embedder-Policy: require-corp` or `credentialless`), its embedded resources must opt in.

- A cross-origin guest must send `Cross-Origin-Resource-Policy: cross-origin` (or compatible CORS headers) or the host will refuse to embed it.
- The guest sees `crossOriginIsolated === true` and gains access to `SharedArrayBuffer` and high-resolution timers.
- If the guest cannot satisfy COEP, the host loses cross-origin isolation OR the embed breaks. Choose the one you want, not both.

Check: on a cross-origin-isolated host, every embedded resource returns either CORS headers or `Cross-Origin-Resource-Policy: cross-origin`. The host page's `crossOriginIsolated` is `true` in DevTools.

For the full COOP / COEP / CORP picture, see `security.md`.

### Iframe loading discipline

Lazy-load iframes that are below the fold. They are the heaviest single resource on most pages.

```html
<iframe
  src="https://widget.example/embed"
  loading="lazy"
  title="Customer support chat"
  sandbox="allow-scripts allow-same-origin"
></iframe>
```

The `title` attribute is required for accessibility. Screen readers announce iframes by title; a missing title falls back to "frame", which tells the user nothing.

Check: every iframe on a page has a meaningful `title`. Every iframe below the fold has `loading="lazy"`. Confirm with the Network panel: lazy iframes do not request until the user scrolls near them.

### Accessibility of embedded content

Embedded content is part of the page from the user's perspective, even if it lives in a separate document.

- The iframe `title` describes what is inside ("Map of office locations", "Customer support chat", not "iframe" or the widget vendor's brand).
- The iframe focus indicator must be visible. Browsers focus the iframe on Tab; the host CSS controls the outline on the `<iframe>` element itself.
- Keyboard focus enters the iframe on Tab, then continues inside the iframe. Tab out the bottom returns to the host's tab order. The host MUST NOT trap focus around the iframe.
- For dialog-like embeds, the guest's own focus trap applies inside the iframe; the host's outer dialog still owns the escape behavior.

Check: tab through a page with an embedded iframe. Focus enters the iframe with a visible outline, tabs through internal controls, and exits the iframe cleanly. No focus traps at the boundary.

### Resource hints for known embeds

For embeds that will load on most page visits, give the browser a head start.

```html
<link rel="preconnect" href="https://widget.example" crossorigin />
<link rel="dns-prefetch" href="https://widget.example" />
```

- `preconnect` for the iframe origin AND any third-party origins the iframe pulls from (CDN, analytics, fonts). One `preconnect` per origin, no more than four total.
- `dns-prefetch` as a cheap fallback on older browsers.
- Do NOT preload the iframe document itself; that costs more than it saves.

Check: open Network throttled to "Fast 3G". Confirm the third-party iframe origin's connection is open before the iframe element starts requesting.

### Common embed regressions

| Symptom | Cause | Fix |
|---|---|---|
| Embed renders but is unstyled | Host's CSP `frame-src` allows the iframe but the guest's CSS host is blocked | Add the CSS origin to `frame-src` AND the guest's own CSP |
| Embed appears, no theme | Host did not send the `theme` message OR the guest does not handle the message type | Verify the postMessage handshake; log received types |
| Embed grows but never shrinks | Guest uses `scrollHeight` for resize; deleted content does not shrink the value | Switch to `getBoundingClientRect().height` or observe a known wrapper |
| Embed is blank on Safari | Third-party cookies blocked; guest requires same-origin storage | Request storage access on user gesture; fall back to top-level pop-out |
| Embed signs the user out on host theme change | Theme handler reloads the iframe | Apply theme via CSS custom properties only, never via reload |
| Console error: "Refused to display in a frame" | Embedded page sends `X-Frame-Options: DENY` or `frame-ancestors 'none'` | Cannot fix from the host; the guest must allow the host as an ancestor |

Check: walk through this table during pre-launch for every third-party embed.

## Anti-Patterns

- `sandbox=""` followed by adding flags until "it works". Start from the minimum, justify each flag.
- `sandbox` with `allow-scripts allow-same-origin allow-top-navigation` on untrusted content. Clickjacking surface.
- `postMessage(data, '*')` outbound. Specify the target origin.
- Skipping `event.origin` checks inbound. XSS surface.
- `endsWith('.example.com')` origin checks. Use exact match against an allow-list.
- Iframe with no `title`. Inaccessible.
- Sniffing the host's stylesheet to copy theme. Use the documented handshake.
- Using media queries inside an embedded widget. Use container queries.
- Lazy-loading the iframe but eagerly loading its `preconnect`. Defer both or neither, consistent.
- `frame-src *` in production CSP. Allow-list only.
- Assuming first-party storage inside an iframe. Plan for partitioning.
- Reloading the iframe to apply a theme change.

## Self-Healing for Embed Patterns

Before declaring embed work complete:

- [ ] Every third-party iframe has a `sandbox` attribute with the minimum required flags
- [ ] Every third-party iframe has an `allow` attribute listing only required Permissions-Policy features
- [ ] Every iframe has a meaningful `title` for screen readers
- [ ] Below-the-fold iframes use `loading="lazy"`
- [ ] CSP `frame-src` lists exactly the origins actually embedded
- [ ] CSP `frame-ancestors` set on every embeddable page; `'none'` on sign-in and payment
- [ ] postMessage handshake versioned; guest sends `ready` on init
- [ ] Every `message` listener verifies `event.origin` against an exact allow-list
- [ ] Every `postMessage` call passes an explicit target origin, never `*`
- [ ] Guest reports viewport via `ResizeObserver`; host applies height on `viewport` messages
- [ ] Guest accepts `theme` messages; maps to CSS custom properties without reload
- [ ] Guest uses container queries for responsiveness, not viewport media queries
- [ ] Cross-origin guests send appropriate `Cross-Origin-Resource-Policy` for isolated hosts
- [ ] Top-window navigation from a sandboxed iframe requires `allow-top-navigation-by-user-activation`
- [ ] Storage Access API requested only inside a user gesture; CHIPS or pop-out fallback documented
- [ ] Focus enters and exits the iframe cleanly; no traps at the boundary
- [ ] Preconnect hints in place for known third-party embed origins

## See also

- [security.md](security.md) for CSP, COOP, COEP, CORP, Trusted Types, Permissions-Policy
- [auth.md](auth.md) for Storage Access API, CHIPS, sign-in inside an embed
- [performance.md](performance.md) for iframe lazy-loading, preconnect budgets, third-party script discipline
- [accessibility.md](accessibility.md) for focus management, ARIA, keyboard navigation
