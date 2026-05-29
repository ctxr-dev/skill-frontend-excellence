---
title: Security Beyond CSP
purpose: Frontend security headers, isolation primitives, supply-chain hygiene, and secrets discipline. CSP at depth, Trusted Types, SRI, COOP / COEP / CORP, Permissions-Policy, Referrer-Policy, frame-ancestors, dependency audits.
load-when:
  task-keywords: [security, CSP, COOP, COEP, CORP, cross-origin isolation, SRI, Trusted Types, Permissions-Policy, Referrer-Policy, frame-ancestors, dependency]
  symptoms: [score dropped, third-party script slow, broken on Safari, broken on Firefox]
prereq: SKILL.md
related: [lighthouse.md, build-hygiene.md, embed-patterns.md, pre-launch.md]
size: ~500 lines
---

# Security Beyond CSP

Lighthouse Best Practices flags the obvious holes (mixed content, no CSP, broken HTTPS). The real surface is wider. This file covers the headers, policies, and process disciplines that keep a frontend defensible after the audit passes.

Framework-agnostic. Every rule is a principle plus a concrete check, named at the standard level (CSP directive, header, browser API), not at the library level.

## Threat Model Overview

Start with the threats your site actually faces. Five categories cover almost every real frontend incident.

### DOM-based XSS

Untrusted strings flow into a dangerous sink (`innerHTML`, `eval`, `document.write`, `setAttribute('on*', ...)`, `<script>.src`). Even with server-side escaping, client code routinely reintroduces the hole through templating, URL hash parsing, postMessage handlers, and analytics tag injection.

Check: every dynamic write to a script-executing sink must be wrapped in a Trusted Types policy or a sanitiser (DOMPurify). Greppable: `grep -rnE 'innerHTML\s*=|outerHTML\s*=|document\.write\(|eval\(|new Function\(' src/` returns a known, audited list.

### Man-in-the-middle (MITM)

A network attacker injects, observes, or modifies traffic. Mitigations are HSTS, HTTPS everywhere (no mixed content), and upgrade-insecure-requests in CSP.

Check: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` is present on every HTML response. Site is on the HSTS preload list (https://hstspreload.org).

### Clickjacking

A third party frames your origin and tricks users into clicking through. Mitigations are `frame-ancestors` (CSP) and SameSite cookies.

Check: `Content-Security-Policy: frame-ancestors 'none'` (or an explicit allow-list) is present. `X-Frame-Options` is allowed as a redundant belt-and-braces header but is superseded by `frame-ancestors`.

### Supply chain

A dependency, build tool, or CDN you trust ships a malicious update. The 2018 event-stream incident, the 2024 polyfill.io takeover, the recurring npm token thefts: the pattern is the same. The mitigations are integrity pinning, lockfile discipline, dependency review, and provenance.

Check: every third-party script you load from a CDN has an `integrity="sha384-..."` attribute, or you self-host it. `npm ci --ignore-scripts` succeeds in CI. `npm audit --omit=dev` returns 0 high or critical findings, or each one has a tracked waiver.

### Secrets exfiltration

A secret (API key, OAuth token, signing key) ends up in client-shipped code, in browser storage, or in a URL. The leak is silent: secrets land in HAR captures, in error-tracker payloads, in CDN logs, in screenshots.

Check: `grep -rIE 'sk_live|sk_test|AKIA|ghp_|xox[abp]-' dist/` returns nothing. Source maps in production are uploaded privately, never published on the public CDN (see observability.md).

## CSP at Depth

Content-Security-Policy is the highest-leverage frontend security header. It is also the easiest to deploy badly. Three flavours, in order of preference.

### Build-time script hashes (static hosts)

When your build outputs a fixed set of inline scripts (rare in modern frameworks) or a fixed set of external scripts, compute their SHA-256 hashes at build time and emit them as `'sha256-<base64>'` source expressions.

```text
Content-Security-Policy: default-src 'self';
  script-src 'self' 'sha256-AbC123...' 'sha256-DeF456...';
  style-src 'self' 'sha256-GhI789...';
  img-src 'self' data: https://images.your-cdn.example;
  font-src 'self' data:;
  connect-src 'self' https://api.your-domain.example;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  object-src 'none';
  upgrade-insecure-requests;
```

Strengths: no per-request work, cacheable header, no nonce-rotation cost. Best for static hosts (S3, R2, GitHub Pages, Vercel static, Cloudflare Pages).

Check: every `<script>` tag the browser executes resolves to one of the hashes in the CSP. Open DevTools Console after a deploy; zero CSP violations.

### Nonces (dynamic hosts)

When the server renders HTML per request and inline scripts vary, mint a fresh cryptographic nonce per request and reflect it on each `<script nonce="..."></script>` plus the CSP header.

```text
Content-Security-Policy: default-src 'self';
  script-src 'self' 'nonce-Rk9yLW5vbi1jb29sLW5vbmNlcw==' 'strict-dynamic';
  ...
```

Strengths: works with framework streaming, no build-time computation. `'strict-dynamic'` is the modern companion: it grants trust transitively to scripts loaded by an already-nonced script, so you do not need to enumerate every dependency.

Check: the nonce is generated per request from a cryptographic RNG (Node `crypto.randomBytes(16).toString('base64')`, not `Math.random()`), is at least 128 bits, and is never reused.

### `'unsafe-inline'` as documented fallback

If a third party demands inline event handlers (analytics tags, A/B-test snippets) and refuses to support nonces, document the exemption in a security note, narrow the directive (`script-src-elem` only, not `script-src-attr`), and plan removal.

Check: every `'unsafe-inline'` in production CSP has a tracked issue and an owner. Lighthouse `csp-xss` audit (see lighthouse.md) flags the weakness; the audit's red badge is acceptable only with a written waiver.

### Report-only mode for rollout

Deploy a new CSP with `Content-Security-Policy-Report-Only:` for two weeks. Collect violations via the Reporting API (see observability.md). Iterate. Promote to enforcing only when the violation stream is clean.

## Trusted Types

CSP blocks the loading of malicious scripts. Trusted Types blocks the dynamic creation of new injection sinks. They compose.

### The directive

```text
Content-Security-Policy: require-trusted-types-for 'script'; trusted-types default dompurify;
```

After this header is enforcing, every assignment to `Element.innerHTML`, `HTMLScriptElement.src`, `eval()`, `setTimeout(string)`, etc. throws a TypeError unless the value is a `TrustedHTML`, `TrustedScript`, or `TrustedScriptURL` minted by a named policy.

### The policy

```js
// Run early, before any code that touches innerHTML.
if (window.trustedTypes && trustedTypes.createPolicy) {
  trustedTypes.createPolicy('default', {
    createHTML: (input) => DOMPurify.sanitize(input, { RETURN_TRUSTED_TYPE: true }),
    createScript: () => { throw new Error('inline script forbidden'); },
    createScriptURL: (input) => {
      const url = new URL(input, location.origin);
      if (url.origin !== location.origin) throw new Error('cross-origin script forbidden');
      return url.toString();
    },
  });
}
```

Three checks the policy enforces:

1. Every HTML sink runs through DOMPurify (or your sanitiser of choice). Audited list, no exceptions.
2. Inline script creation is rejected outright. If the codebase needs it, it gets a named policy with reviewed allow-rules.
3. Script-URL loads are restricted to same-origin. Cross-origin needs an explicit second policy and a reason.

### Browser support

Chromium and Edge full support. Firefox and Safari evaluate via the polyfill (`@webcomponents/webcomponentsjs` and `trusted-types` package). Deploy report-only first to catch unintended sinks; promote to enforcing after the violation stream is clean.

Check: `trustedTypes.defaultPolicy` is defined at page load. The CSP header includes `require-trusted-types-for 'script'`. The Reporting API endpoint (see observability.md) receives zero violations for two weeks before promotion.

## Subresource Integrity (SRI)

When you load a script from a CDN you do not control, the CDN can swap the file. SRI pins the bytes.

### The attribute

```html
<script
  src="https://cdn.your-vendor.example/widget-1.2.3.js"
  integrity="sha384-abc123...xyz789"
  crossorigin="anonymous"
></script>
```

Two requirements:

1. The CDN must serve `Access-Control-Allow-Origin: *` (or an explicit origin). Without CORS, the browser cannot read the body to verify the hash.
2. `crossorigin="anonymous"` opts the script into CORS so the integrity check runs.

### When to use SRI

Use SRI when self-hosting is genuinely impossible: a vendor demands their CDN URL for license enforcement, or a script is too large to redeploy on every release. Most scripts should be self-hosted instead; SRI is a fallback.

Check: every `<script src="https://...">` that points off-origin has an `integrity` attribute. CI fails the build when a third-party script is added without one. Greppable: `grep -rnE '<script[^>]+src="https?://' dist/` returns only entries with `integrity=`.

### Refresh on vendor update

A pinned hash blocks the vendor from shipping fixes. Track the vendor's release notes, recompute the hash on every version bump, and treat the integrity update like any other dependency upgrade (PR, review, deploy).

## COOP, COEP, CORP, and Cross-Origin Isolation

The cross-origin isolation triad unlocks `SharedArrayBuffer`, high-precision `performance.now()`, and OffscreenCanvas in workers. It also blocks a class of cross-origin side-channel attacks (Spectre family).

### COOP: Cross-Origin-Opener-Policy

`Cross-Origin-Opener-Policy: same-origin` severs the link between your window and any cross-origin window that opened it. The opener cannot script your DOM through `window.opener`. Required for cross-origin isolation.

### COEP: Cross-Origin-Embedder-Policy

`Cross-Origin-Embedder-Policy: require-corp` requires every cross-origin subresource (images, scripts, iframes) to opt in via CORP or CORS. Stops drive-by loading of resources that have not consented to being embedded by you.

### CORP: Cross-Origin-Resource-Policy

`Cross-Origin-Resource-Policy: same-origin` (or `same-site`, or `cross-origin`) on a response tells the browser which origins are allowed to embed it. Servers you control should send this on every static asset.

### The triad

To enable cross-origin isolation, all three must align:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: same-origin
```

When set, `self.crossOriginIsolated === true` in the page. `SharedArrayBuffer` becomes constructible. `performance.now()` returns microsecond precision. `OffscreenCanvas` transfers cleanly to workers.

### The cost

Cross-origin isolation breaks naive embeds. Any iframe, image, font, or script from a third-party origin without CORP or CORS will fail to load. Plan the migration:

1. Inventory every cross-origin resource. Add CORP to the ones you control. Add CORS + `crossorigin` attribute to the ones you do not.
2. Replace embeds you cannot fix with same-origin proxies.
3. Deploy COOP and COEP in report-only mode (`Cross-Origin-Opener-Policy-Report-Only`, `Cross-Origin-Embedder-Policy-Report-Only`). Watch the Reporting API for two weeks.
4. Promote to enforcing.

Check: `self.crossOriginIsolated` is `true` on every route that needs `SharedArrayBuffer` or high-precision timers. The Reporting API receives zero `coep` or `coop` violation reports for a full deploy cycle before flipping enforcing.

## Permissions-Policy

`Permissions-Policy` gates browser-feature access by origin. Default-deny then opt in.

### The header

```text
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(),
  usb=(), serial=(), bluetooth=(), magnetometer=(), gyroscope=(), accelerometer=(),
  fullscreen=(self), picture-in-picture=(self), autoplay=(self),
  interest-cohort=()
```

Empty parentheses `()` mean no origin (including self) can use the feature. `(self)` means the top-level document can. `(self "https://trusted.example")` adds an allow-listed origin.

### Defaults to deny

Every feature your site does not use should be denied. A future XSS that calls `navigator.geolocation.getCurrentPosition` then fails silently instead of leaking the user's location. A compromised third-party iframe cannot ask for the camera.

### Iframe propagation

`Permissions-Policy` inherited by iframes is controlled by the `allow` attribute on the iframe element:

```html
<iframe src="https://embed.your-vendor.example" allow="camera 'none'; microphone 'none'"></iframe>
```

Check: top-level `Permissions-Policy` header denies every feature the site does not use. Every iframe `allow` attribute is an explicit allow-list, not an empty default.

## Referrer-Policy

`Referrer-Policy` controls what the browser sends in the `Referer` request header on outbound navigation and subresource loads.

### Modern default

```text
Referrer-Policy: strict-origin-when-cross-origin
```

Behaviour:

1. Same-origin requests get the full URL (path and query).
2. Cross-origin HTTPS requests get only the origin (scheme + host + port).
3. HTTPS to HTTP requests get nothing.

This is the W3C default since 2020 and the right starting point for almost every site.

### When to override

Use `no-referrer` on sensitive pages (auth flows, reset-password) where even the origin is privacy-leaking. Use `same-origin` for embedded admin tools that must never leak referrer to any external service.

Check: response headers include `Referrer-Policy: strict-origin-when-cross-origin` (or a stricter policy). No page sets `unsafe-url` (full URL on every request) without a documented reason.

## frame-ancestors (Clickjacking)

`frame-ancestors` in CSP supersedes the older `X-Frame-Options` header. It is CSP-level: same delivery, same enforcement model, more expressive.

### Default deny

```text
Content-Security-Policy: frame-ancestors 'none';
```

Pages that should never be framed (the entire site, in most cases) get `'none'`. Pages designed to be embedded (a public widget) get an explicit allow-list.

### Allow-list

```text
Content-Security-Policy: frame-ancestors 'self' https://partner.example https://*.your-domain.example;
```

`X-Frame-Options: DENY` may stay as a redundant header for ancient clients but adds no protection beyond `frame-ancestors 'none'`.

Check: top-level `Content-Security-Policy` includes `frame-ancestors`. The directive matches the site's framing intent (typically `'none'`). Pages designed to be embedded have a written allow-list reviewed quarterly.

## Third-Party Script Supply Chain

The biggest frontend security incidents of the last decade were supply chain. Tooling can shift the slope.

### Lockfile review

Every dependency change lands in a lockfile diff. Review it like code:

1. Look for newly added transitive dependencies. A small direct addition can pull in hundreds of transitives.
2. Look for version-range widening. A `^` bump from 1.2.0 to 1.9.0 is a different review than a `~` bump from 1.2.0 to 1.2.3.
3. Look for ownership changes. The npm registry exposes maintainer history; `npm view <pkg>` includes `maintainers`.

Check: PRs that modify `package.json` always modify the lockfile in the same commit. CI fails when only one of them changes. Manual reviewers read the lockfile diff, not just the manifest.

### Dependency auditing

Run `npm audit --omit=dev` or `pnpm audit --prod` on every PR. Treat high and critical findings as blocking. Track moderate findings with an owner and a deadline. Triage waivers explicitly; do not let the audit output become noise.

Tooling beyond `npm audit`: Snyk, GitHub Dependabot, Socket.dev for runtime behaviour analysis (postinstall scripts, network calls). Pick one, run it, act on the output.

### Integrity-pinned releases

When you ship a frontend library to other teams, publish with provenance (`npm publish --provenance` since npm 9.5). Consumers can verify the package came from your GitHub Actions workflow, not from a stolen token.

Check: published packages on the npm registry show a green provenance badge. Releases come from CI, not from developer laptops.

### The npm-token-stolen mitigations

When a maintainer's npm token leaks, the attacker publishes a poisoned patch version that compromises every install. Three mitigations stack:

1. **2FA on every publisher account.** npm enforces this for the top 500 packages and you can enforce it project-wide via `npm access set 2fa=publish`.
2. **Granular tokens.** Publish from tokens scoped to a single package, with an expiry. Rotate quarterly.
3. **Integrity pinning in consumers.** Lockfile hashes (`integrity` in `package-lock.json`) protect installations after the lockfile is created. CI uses `npm ci` (strict lockfile check), never `npm install`.

Check: `npm ci --ignore-scripts` in CI. Lockfile is committed. Publishing tokens have 90-day expiry. Provenance is on.

## Secrets in Frontend Code

Frontend code is shipped to every user. There are no secrets in it.

### The rule

Anything in the JS bundle, the HTML, the env-injected build-time variables, or the runtime config is public. Treat it as published.

API keys, signing secrets, OAuth client secrets, database passwords, internal service tokens: none of these belong in a frontend bundle. Publishable keys (Stripe pk_*, Mapbox pk.*, Sentry DSN) are designed for client exposure; secret keys (sk_*) are not.

Check: `grep -rIE 'sk_live|sk_test|AKIA|ghp_|xox[abp]-|password|passwd' dist/` returns nothing. Build-time env var injection allowlist is reviewed: only `PUBLIC_*` or `NEXT_PUBLIC_*` (or your framework equivalent) prefixed variables are embedded.

### When a secret ships

A secret in a public commit is leaked the moment it is pushed. Two cleanup options, with different cost shapes:

1. **Rotate immediately, leave the git history.** Generate a new key, deploy it, revoke the old one within the hour. The old key in history is now a museum exhibit, not a credential. This is almost always the right answer.
2. **Rewrite git history with `git filter-repo` (or BFG).** Removes the secret from every reachable commit, forces every clone to be redone, breaks every open PR. Justifiable only when the secret cannot be rotated (a key embedded in a published-immutable artefact, a credential bound to a long-lived contract).

In both cases: rotate first. History rewrite is a separate, slower decision.

Check: incident playbook for leaked secret documents the rotation contact for every credential type. Mean time to rotate is under one hour. Postmortem captures the leak source and the prevention (pre-commit hook, secret scanner in CI).

### Pre-commit secret scanning

Run a secret scanner at the pre-commit hook (gitleaks, trufflehog) and in CI. Block the commit and the PR when a credential pattern hits. Maintain an allow-list for genuine false positives (test fixtures, example keys).

Check: pre-commit hook runs the scanner. PR CI runs it on the full diff. Repos with historical leaks have been scanned and the leaks tracked to closure.

## Dependency Cost at Audit Time

Security and performance overlap on dependencies. Every transitive add is a new supply-chain entry and a new bundle line item. The audit-time question is: does this dependency earn its place?

For each major dependency, the audit captures:

1. **Bytes.** Bundle Phobia, or local `size-limit` measurement. Above 10 KB gzipped, the dependency needs justification.
2. **Maintenance.** Last release date, open-issue count, single-maintainer risk. A dependency with a sole maintainer and no release in 18 months is a supply-chain risk waiting to be exploited.
3. **License.** SPDX identifier, compatibility with your distribution license.
4. **Alternatives.** Could a 30-line same-file utility replace it? Could the platform replace it (`Intl.NumberFormat` instead of numeral.js, native `fetch` instead of axios)?

Cross-link: build-hygiene.md covers tree-shaking, sideEffects pitfalls, and code-splitting; that is the bundle side. This file is the security side. They share findings.

Check: dependency review is a recurring quarterly task. Output is a list of dependencies to remove, to replace, or to pin tighter. The audit feeds into the prelaunch evidence manifest (see pre-launch.md).

## Headers Quick Reference

Every production HTML response should include at least these headers. Tune the values to your site; do not omit any of them without a written reason.

```text
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; ... ; frame-ancestors 'none'; ...
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: same-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), ...
Referrer-Policy: strict-origin-when-cross-origin
X-Content-Type-Options: nosniff
```

Check: `curl -sI https://your-domain.example | grep -iE 'strict-transport|content-security|cross-origin|permissions-policy|referrer-policy|x-content-type'` lists all eight. Each value matches the intended policy. The `pre-launch.md` evidence manifest records the curl output as an artefact.

## See also

- [lighthouse.md](lighthouse.md) for the Best Practices audit row mapping (csp-xss, valid-source-maps, no-vulnerable-libraries)
- [build-hygiene.md](build-hygiene.md) for dependency cost discipline at bundle time
- [embed-patterns.md](embed-patterns.md) for cross-origin isolation interactions with iframes
- [pre-launch.md](pre-launch.md) for the headers gate in the evidence manifest
