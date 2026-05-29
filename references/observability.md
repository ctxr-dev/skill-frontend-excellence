---
title: Frontend Observability
purpose: Post-deploy production practice. Source maps in production, error capture surfaces, sampled RUM, INP field attribution, Reporting API, CrUX trend tracking, session replay tradeoffs, alert thresholds, synthetic monitoring.
load-when:
  task-keywords: [observability, RUM, monitoring, error capture, source maps, INP attribution, Reporting API, error boundary, CrUX, Long Animation Frames, LoAF, performance]
  symptoms: [score dropped, INP regression, LCP regression, slow page, slow interaction]
prereq: SKILL.md
related: [performance.md, lighthouse.md, debug-recipes.md, pre-launch.md]
size: ~500 lines
---

# Frontend Observability

Lighthouse measures a deploy. Observability measures users. The two answer different questions and one does not substitute for the other. This file is the post-deploy practice: what to capture, how to capture it without burning user CPU, and where to set the alert thresholds.

Framework-agnostic. Patterns named at the standard level (`PerformanceObserver`, `Reporting-Endpoints` header, `sendBeacon`). Vendor names appear only as concrete examples (Sentry, Datadog, etc.) of products that implement the pattern.

## Source Maps in Production

Production code is minified. Without source maps, every error is an opaque stack of `t.a is not a function`. With public source maps, you have shipped your codebase to attackers. The right answer is private upload.

### The private-upload pipeline

Build the bundle with hidden source maps. Upload the maps to your error tracker out of band. Strip the public-facing source-map URL from the bundle.

```text
# Webpack / Rspack
devtool: 'hidden-source-map'

# Vite / Rollup
build.sourcemap: 'hidden'

# esbuild
sourcemap: 'external'  // plus a script step to strip the //# sourceMappingURL= comment
```

The `hidden` variant emits `.map` files alongside the bundle but does not append a `//# sourceMappingURL=` comment. The browser never fetches them. Your error tracker fetches them through its upload pipeline (Sentry CLI, Datadog `datadog-ci sourcemaps upload`, Rollbar `rollbar-cli sourcemaps upload`, Bugsnag `bugsnag-source-maps`).

Check: `curl -sI https://your-cdn.example/static/main.<hash>.js.map` returns 403 or 404. The bundle contains no `//# sourceMappingURL=` comment. Error-tracker dashboard shows symbolicated stacks. Production HTML does not link to `.map` files.

### Source-map response header (alternative)

When self-hosting the error tracker and the map server is on a different origin, the `SourceMap:` HTTP response header on the JS resource can point at the map URL. Restrict the map URL to your error-tracker IPs at the edge (Cloudflare WAF rule, AWS WAF, nginx IP allow-list).

```text
GET /static/main.abc123.js
SourceMap: https://maps.internal.your-domain.example/main.abc123.js.map
```

Check: the map URL returns 200 only for the error-tracker's egress IP range; everything else returns 403. The IP range is documented and refreshed on every vendor update.

### Never ship maps on the public CDN

A `main.js.map` on the public CDN is a published source code disclosure. It includes original file paths, comments, and (often) inline-bundled secrets that the build evaluated. Mistake mode: build with `devtool: 'source-map'` (the default in many configs), deploy to the same path as the bundle, browser loads them as a friendly developer-experience touch.

Check: pre-deploy script asserts no `*.map` files in the public output directory, or asserts they are excluded from the CDN upload manifest. CI fails when the assertion fails.

## Error Capture Surfaces

A JS error is reported to your tracker through one of four hooks. Wire all four; each catches a different surface.

### window.onerror

```js
window.addEventListener('error', (event) => {
  reportError({
    message: event.message,
    source: event.filename,
    line: event.lineno,
    column: event.colno,
    stack: event.error?.stack,
    type: 'uncaught',
  });
});
```

Catches synchronous uncaught errors from any script on the page, including inline. Mandatory baseline.

### unhandledrejection

```js
window.addEventListener('unhandledrejection', (event) => {
  reportError({
    message: event.reason?.message ?? String(event.reason),
    stack: event.reason?.stack,
    type: 'unhandled-rejection',
  });
});
```

Catches Promise rejections that never had a `.catch`. In modern apps this is more than half of all reported errors (every async fetch, every async event handler).

Check: a deliberate `Promise.reject(new Error('test'))` from DevTools console arrives in the error tracker within the expected sampling rate.

### Error boundaries (component-tree pattern)

When the UI framework supports a component-tree boundary (Error Boundary in component frameworks, top-level routing guard in router frameworks), wire a boundary at every route and at every dangerous subtree (a chart, a third-party widget, a markdown renderer). The boundary renders a fallback UI and forwards the error.

Pattern (framework-agnostic principle): a parent component declares "if my subtree throws during render or commit, catch the error here, render this fallback UI, report the error". The library shape varies; the contract is identical.

Check: every route has a boundary that renders a recovery UI without a full-page crash. Boundary errors arrive in the tracker with the route name and the subtree identifier. A deliberate throw in a subtree does not blank the page.

### ReportingObserver

```js
const observer = new ReportingObserver((reports) => {
  for (const report of reports) {
    reportError({
      type: report.type,           // 'deprecation' or 'intervention'
      message: report.body.message,
      source: report.body.sourceFile,
      line: report.body.lineNumber,
    });
  }
}, { buffered: true });
observer.observe();
```

Catches browser-level deprecations and interventions: features removed from the platform, slow scripts the browser stopped, autoplay blocked. These never throw and never log to the console outside DevTools. The Reporting API surfaces them programmatically.

Check: the observer is registered before any third-party script runs. Reports for `deprecation` and `intervention` types reach the tracker. The dashboard groups reports by source file for actionability.

## Sampled RUM

Lab numbers do not predict field numbers. Real-user monitoring is the only way to know what users experience.

### web-vitals + attribution

The `web-vitals` library (Google, MIT) is the standard. The `web-vitals/attribution` entry point adds per-metric debugging context (the LCP element, the INP event target, the CLS source).

```js
import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals/attribution';

const queue = [];
const flush = () => {
  if (queue.length === 0) return;
  navigator.sendBeacon('/rum', JSON.stringify(queue.splice(0)));
};

const send = (metric) => {
  queue.push({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    id: metric.id,
    attribution: metric.attribution,
    nav: performance.getEntriesByType('navigation')[0]?.type,
    cls: metric.name === 'CLS' ? metric.entries.length : undefined,
  });
};

onLCP(send); onINP(send); onCLS(send); onFCP(send); onTTFB(send);

addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush();
});
addEventListener('pagehide', flush);
```

Three things this gets right:

1. **`sendBeacon` plus `visibilitychange`.** The only reliable flush for the BFCache and tab-close case. `fetch` with `keepalive: true` is a backup but loses entries when the browser kills the request.
2. **Queue and batch.** One beacon per page session, not one per metric. Reduces beacon overhead.
3. **Attribution payload.** When INP is bad on a page, the attribution object names the event target, the handler script, and the blocking time. Without this, you have a number and no lead.

Check: the rum endpoint receives entries with `attribution` populated. The site's RUM dashboard ranks pages by p75 INP and lists top contributing elements per page.

### Sample rate

Sample to a percentage that keeps cost manageable. For high-traffic sites: 10 to 25 percent is plenty for trend tracking. For low-traffic sites: 100 percent. The sample decision happens once per session (`Math.random() < 0.1`), stored in a session-scoped variable, applied to all metrics for that session.

Check: sample rate is documented. Beacon volume per day is tracked as a cost line item. Sample rate is reviewed when traffic grows by more than 5x.

## INP Field Attribution Recipe

INP regressions in the lab are often invisible. INP regressions in the field are the leading score-dropped cause for 2024+ Core Web Vitals. Attribution is the only way to fix what you cannot reproduce.

### The two observers

```js
const slowEvents = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration < 200) continue;
    queue.push({
      type: 'slow-event',
      name: entry.name,
      duration: entry.duration,
      processingStart: entry.processingStart,
      processingEnd: entry.processingEnd,
      target: entry.target?.tagName + (entry.target?.id ? `#${entry.target.id}` : ''),
    });
  }
});
slowEvents.observe({ type: 'event', durationThreshold: 200 });

const loaf = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.blockingDuration < 50) continue;
    queue.push({
      type: 'loaf',
      duration: entry.duration,
      blockingDuration: entry.blockingDuration,
      scripts: entry.scripts.map((s) => ({
        invoker: s.invoker,
        sourceURL: s.sourceURL,
        sourceFunctionName: s.sourceFunctionName,
        forcedStyleAndLayoutDuration: s.forcedStyleAndLayoutDuration,
      })),
    });
  }
});
loaf.observe({ type: 'long-animation-frame', durationThreshold: 50 });
```

The `event` observer reports every event whose total duration crossed your INP threshold. The `long-animation-frame` observer (LoAF, Chrome 123+) reports every animation frame longer than 50ms with the actual script attribution: which script, which function, how much time was spent forcing layout. Together these pin down the cause of any field-INP issue.

### Mapping field INP to root cause

The attribution sequence:

1. Web-vitals reports INP value, rating, and the slow event entry (target, handler script).
2. The LoAF observer, fired around the same time, names the scripts that ran in the blocking frame.
3. Cross-reference by timestamp: the slow event plus the LoAF entries in the same animation frame are the same incident.
4. The `scripts[].sourceURL` and `scripts[].sourceFunctionName` give the file and function name. With source maps uploaded (see above), the dashboard resolves to original code.

Check: the dashboard, queried with "show me all field INP entries above 500ms in the last week", returns a ranked list grouped by `attribution.eventTarget` plus `scripts[].sourceFunctionName`. The top entries are actionable: a specific handler in a specific file.

## Reporting API

The Reporting API standardises browser-to-server delivery of CSP violations, deprecation warnings, intervention reports, and network errors. It runs in parallel to your error tracker and catches things JS cannot see.

### Configuring the endpoint

```text
Reporting-Endpoints: default="https://reports.your-domain.example/", csp-endpoint="https://csp.your-domain.example/"
Content-Security-Policy: default-src 'self'; ...; report-to csp-endpoint;
Document-Policy: ...; report-to=default
NEL: {"report_to":"default","max_age":604800}
```

The `Reporting-Endpoints` header (replacing the older `Report-To` header from 2024 onward) names the destinations. CSP, NEL (Network Error Logging), Document-Policy, and Permissions-Policy violations each route to one of the named endpoints.

### What the endpoint receives

Reports arrive as POSTed JSON arrays, content-type `application/reports+json`. Each report has `type`, `url`, `user_agent`, `body`, and a timestamp. Categories:

1. **csp-violation.** A blocked load or inline execution. Body contains `blocked-uri`, `effective-directive`, `original-policy`.
2. **deprecation.** A feature scheduled for removal. Body contains the deprecation id, message, and source.
3. **intervention.** A feature the browser disabled (e.g., autoplay, slow script). Body contains the intervention id.
4. **network-error.** A failed resource load (DNS failure, TLS error, HTTP error). Body contains protocol, method, status code.

Check: endpoints receive reports within minutes of a deploy that violates an unrolled-out policy. CSP report stream is monitored during a CSP rollout and goes silent before promotion to enforcing.

### Browser support

Chromium and Edge ship the full API. Firefox supports CSP reporting and a subset of NEL. Safari ships CSP reporting through the older `report-uri` directive (keep it alongside `report-to` for coverage).

## CrUX and PageSpeed Insights

The Chrome User Experience Report (CrUX) is Google's public dataset of real-user performance from Chrome users with opt-in field data sync. CrUX is the data Google uses for the Core Web Vitals ranking signal. The PageSpeed Insights API exposes it per origin and per URL.

### Origin-level p75 over 28 days

```bash
curl -s "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://your-domain.example&strategy=mobile&key=YOUR_KEY" \
  | jq '.loadingExperience.metrics'
```

Returns p75 LCP, INP, CLS, FCP, TTFB for the origin (or the URL if there is enough traffic). The window is rolling 28 days. The categories are `FAST`, `AVERAGE`, `SLOW`.

### Gating CI on a regression

Run the PSI query on every deploy. Compare to a baseline (the previous deploy's values, or a 28-day-old snapshot). Fail the deploy if any metric crosses from `FAST` to `AVERAGE` or worse, or if p75 INP grows by more than 50ms week-over-week.

Check: CI has a "perf budget" job that pulls CrUX and asserts the budget. The budget is documented per route in `pre-launch.md` evidence. Regression alerts go to the on-call rotation.

### CrUX limitations

CrUX requires opt-in Chrome users. Low-traffic origins return `null`. Authenticated routes (behind login) never appear. For these, RUM is the only signal; CrUX cannot help.

## Session Replay Tradeoffs

Session replay (Sentry Replay, FullStory, LogRocket, Hotjar, PostHog) records the DOM, the network, and user input so engineers can scrub through a real session. Powerful for diagnosis, expensive in privacy surface.

### What it costs

1. **Bytes.** Recording libraries are 30 to 100 KB gzipped on the wire. Some defer initialisation; even the deferred bundle is non-trivial.
2. **CPU.** Continuous DOM diffing and serialisation. Modest, but measurable in INP if the page is already close to the threshold.
3. **Storage.** Sessions are minutes of mutation logs. At 1 percent sampling on a million-session day, replay storage cost is real.
4. **Privacy / GDPR surface.** The recording is personal data. Subject to right-of-access, right-to-erasure, lawful-basis disclosure, data-processing agreements.

### PII redaction

The library's defaults are not safe enough. Configure:

1. **Default block.** Treat every input, textarea, contenteditable, and `[data-pii]` element as masked by default. Opt in to capture for fields that are demonstrably safe.
2. **Network redaction.** Redact request bodies and response bodies for endpoints that touch user data. Keep headers minus Authorization and Cookie.
3. **URL redaction.** Strip query strings containing tokens (`?access_token=`, `?reset=`).
4. **Console redaction.** Redact log lines that match known PII patterns (emails, credit-card-like, JWT-like).

Check: a deliberate session with a fake email and a fake card number is recorded and then replayed; both fields appear as redacted placeholders. The data processing agreement with the vendor names the PII categories captured and the retention.

### Sample, do not capture everything

Replay on 100 percent of error sessions and 1 percent of clean sessions. The first gives you reproductions of bug reports; the second gives a statistical sample of regular usage.

## Alert Thresholds

Observability without alerts is a museum exhibit. Set thresholds, page the on-call when they trip.

### Page load failure rate

The fraction of navigations that never reach a usable state (white screen, network failure, uncaught error in initial render).

| Threshold | Action |
|-----------|--------|
| < 0.5% | Healthy |
| 0.5% to 1% | Warning, investigate within a day |
| > 1% | Page on-call, treat as incident |

Measure: count navigations where `PerformanceNavigationTiming.loadEventEnd > 0` against total navigations. Or count distinct sessions with no successful page view against distinct sessions that started one.

### JS error rate per session

The fraction of sessions that emit at least one uncaught error or unhandled rejection.

| Threshold | Action |
|-----------|--------|
| < 1% | Healthy |
| 1% to 3% | Warning, file an issue |
| > 3% | Page on-call |

### INP p75 vs CWV bar

CWV bar for INP is 200ms. Alert when origin p75 INP crosses 200ms (regression from passing) or grows by more than 20 percent week-over-week.

### CWV passing rate per route

Group routes by template (home, product, checkout). For each, the passing rate is the fraction of sessions where all three CWVs (LCP, INP, CLS) hit the "Good" threshold. A drop in passing rate is the leading indicator of a deploy regression before CrUX picks it up.

Check: alerts route to a paging system (PagerDuty, Opsgenie). Each alert has a runbook in `debug-recipes.md`. Alert fatigue is reviewed monthly.

## Synthetic Monitoring vs RUM

Synthetic and RUM measure different things. A robust observability story uses both.

### What synthetic catches

- Availability (the page returned 200 from a probe location).
- Lab-Lighthouse performance under controlled conditions.
- Regression of a critical user flow (login, checkout) under a fixed browser, fixed network.
- Third-party dependency outages (your CDN is down before any user reports it).

Tools: Checkly, Pingdom, New Relic Synthetics, Datadog Synthetics, custom Lighthouse-CI runs against a staging URL.

### What RUM catches

- Real-user device distribution (the long tail of slow Android devices on 3G).
- Field-INP regressions invisible in the lab.
- Regional performance variance (your CDN's PoP placement vs your user distribution).
- Real-user error rates (the third-party widget that crashes only on iOS Safari 17.2).

### The split

| Question | Use |
|----------|-----|
| Is the site up? | Synthetic |
| Did the latest deploy regress the home-page LCP? | Synthetic + RUM |
| Are users on slow Android phones suffering? | RUM |
| Did a third-party script start throwing yesterday? | Synthetic + RUM |
| What is the field INP distribution on the checkout page? | RUM |
| Did the staging deploy break the login flow? | Synthetic |

Run both. The cost of synthetic is fixed per probe; the cost of RUM is proportional to traffic. Budget accordingly.

Check: synthetic checks run every 5 minutes against the top three routes from at least three geographies. RUM captures every CWV and every error from at least 10 percent of sessions. Both feed the same on-call dashboard.

## See also

- [performance.md](performance.md) for the lab-side instrumentation (DevTools Performance, Lighthouse, perf budgets) that pairs with field RUM
- [lighthouse.md](lighthouse.md) for `valid-source-maps`, `errors-in-console`, and the audit rows that map to observability hygiene
- [debug-recipes.md](debug-recipes.md) for the named diagnosis loops that consume the observability data
- [pre-launch.md](pre-launch.md) for the observability gate in the evidence manifest
