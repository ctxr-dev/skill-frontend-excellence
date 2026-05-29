---
title: Frontend Testing Discipline
purpose: Pre-merge gate discipline. The frontend test pyramid, visual regression, accessibility automation, perf budgets in CI, type-only check gates, contract tests, lighthouse-ci wiring. The pre-merge counterpart to audit-workflow.md's post-build polish loop.
load-when:
  task-keywords: [testing, visual regression, axe-core, pa11y, size-limit, bundlesize, lighthouse-ci, contract test, type check, gate, verification, CI]
  symptoms: [score dropped, bundle size grew, contrast fail, focus not visible, hydration mismatch]
prereq: SKILL.md
related: [lighthouse.md, observability.md, pre-launch.md, audit-workflow.md]
size: ~500 lines
---

# Frontend Testing Discipline

Tests are the pre-merge gate. Audit-workflow is the post-build polish loop. Both run, neither replaces the other. This file is the gate: what to test, how to budget the categories, and how to wire the CI so a red gate blocks the merge instead of the deploy.

Framework-agnostic. Patterns described at the standard level (snapshot diffing, accessibility tree validation, bundle size assertion). Runner names appear only as concrete examples of tools that implement the pattern.

## The Frontend Test Pyramid

Five categories. Each catches a different class of regression. Budget the count per category; spend the budget on the highest-leverage tests in each.

| Category | Scope | Typical count | What it catches |
|----------|-------|---------------|-----------------|
| Unit | Pure functions, hooks, utilities | Hundreds | Logic regressions, edge cases, refactor breakage |
| Integration | A component plus its immediate collaborators | Dozens to low hundreds | Wiring bugs, prop contracts, state flow |
| Visual | Rendered component or page at fixed viewport | Dozens per surface | Style drift, layout regression, theme breakage |
| End-to-end | Full app, real browser, scripted user flow | Single digits to low dozens per surface | Cross-surface flows, real-browser quirks, integration with auth, payment, etc. |
| Contract | API request and response shape | One per consumed endpoint | Backend drift, schema breakage, type-only safety |

The pyramid is a budget shape. Unit tests are cheap to run and cheap to write. End-to-end tests are slow and flaky and expensive to maintain. Add tests at the lowest level that catches the regression class.

### What each catches

- **Unit.** Pure-function correctness. A change to the price formatter breaks the test. Run on every save. Sub-second feedback.
- **Integration.** A form component plus its validation library plus its state store. Catches "the form submits but the validation passes when it should fail" class bugs that pure-unit tests miss.
- **Visual.** The button moved 3 pixels because someone changed a shared spacing token. The dark-mode background drifted because a CSS variable was reassigned. Catches what unit tests cannot see.
- **End-to-end.** The login flow ends at a 500. The checkout button is disabled because a real API call returned an unexpected shape. Catches surface integration, not component logic.
- **Contract.** The backend changed a field name. Unit and integration mocks still pass. End-to-end caught it but flakily. Contract test caught it deterministically.

Check: every PR touches at least one test. The test category matches the change category (component edit changes a visual test; logic edit changes a unit or integration test). PR review questions a change that adds production code without a test.

## Visual Regression Testing

The visual category is the one most teams skip and most regressions slip through. Three tools, each with a different tradeoff.

### Playwright snapshots (toHaveScreenshot)

Built into Playwright. Captures a PNG at a fixed viewport, diffs against a committed baseline, fails the test when the pixel diff exceeds a threshold.

```js
import { test, expect } from '@playwright/test';

test('homepage hero', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('home-hero.png', {
    fullPage: false,
    mask: [page.locator('[data-volatile="true"]')],
    threshold: 0.2,
    maxDiffPixelRatio: 0.001,
  });
});
```

Three things this gets right:

1. **Mask volatile regions.** Timestamps, animated avatars, ad slots: anything that legitimately varies. Masked regions are filled with a solid color before diffing.
2. **Viewport pin.** Set `use.viewport` per project so the snapshot is reproducible. Default to 1280x720 desktop and 375x667 mobile; add others when a surface has a known breakpoint at risk.
3. **Threshold tuning.** `threshold` is per-pixel color tolerance. `maxDiffPixelRatio` is total-pixel tolerance. Set both. Tune per surface; do not use one global value.

Strengths: zero extra infrastructure, baseline in git, fast feedback. Weaknesses: baseline-on-git means binary diffs in PRs, and font rendering differs across OS, so CI and local runs disagree unless you pin the OS (Playwright's docker image).

Check: visual tests run in a containerised CI environment with a pinned OS image. Baselines are reviewed in PRs (look at the diff PNG that Playwright writes alongside the failure).

### reg-suit (git-aware history)

reg-suit is open source. It stores baselines in cloud storage (S3, GCS) keyed by git ref. Each PR builds its snapshots, fetches the base-branch baseline, diffs, posts the result as a PR comment with side-by-side images.

Strengths: snapshots live outside git (no binary bloat), history-aware (always diffs against the actual base, not a stale commit), PR comments give reviewers a visual diff link.

Weaknesses: requires a cloud storage bucket and credentials in CI.

### Chromatic (hosted, design-system focus)

Chromatic is a hosted service from the Storybook team. Built around component stories: every story gets a snapshot per relevant variant (viewport, theme, locale).

Strengths: best fit for design-system maintenance, fan-out across variants is automatic, PR review UI is purpose-built for visual diffs, change-acceptance is a click.

Weaknesses: hosted (cost, vendor coupling), Storybook coupling (your team has to maintain stories for everything you want diffed).

### pixelmatch (raw)

The lowest-level option. Two PNGs in, a diff PNG and a count out. Use when you need a one-off custom pipeline (a screenshot of a generated chart, a server-rendered email) that the higher-level tools cannot model.

Check: every customer-facing surface has at least one visual test. New surfaces get a visual test in the same PR that ships them. Visual diffs are reviewed by a human before the baseline updates.

## Accessibility Automation in CI

Accessibility lint catches the mechanical violations. It does not replace a manual screen-reader pass; it raises the floor.

### @axe-core/playwright

```js
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('homepage a11y', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .disableRules(['color-contrast'])  // only if your design system has documented overrides
    .analyze();
  expect(results.violations).toEqual([]);
});
```

Run on every route in CI. Fail the build on any violation. Disable rules only with a documented reason and a tracked issue.

What it catches: missing alt text, missing form labels, duplicate ids, ARIA mismatches, contrast under 4.5:1 (when not disabled), `<html>` without `lang`, headings out of order, missing landmark roles. About 30 percent of WCAG can be detected mechanically; this is that 30 percent.

What it does not catch: meaningful alt text (axe accepts `alt=""` as valid), correct heading hierarchy (axe checks ordering, not semantic structure), focus order, screen-reader announcement quality, dynamic content updates.

Check: every route has an axe test that asserts zero violations. Disabled rules are enumerated in a config file with a comment per rule. Manual axe in DevTools is part of the pre-launch checklist (`pre-launch.md`).

### pa11y-ci

```bash
pa11y-ci --sitemap https://your-domain.example/sitemap.xml --threshold 0
```

Runs HTML_CodeSniffer (the same engine as the older WAVE tool) against a sitemap. Different rule set than axe; the overlap is high but not total. Add as a second-opinion gate when the site has strict accessibility requirements.

### Lighthouse a11y as a CI gate

```bash
lhci autorun --collect.url=https://staging.your-domain.example
```

With assertions configured to require `categories:accessibility:score >= 0.95` (target 1.0). Catches some violations the others miss (contrast in computed styles after JS runs).

Check: at least two a11y tools run in CI (axe plus one of pa11y or Lighthouse). All assert zero violations or a documented baseline that decreases over time, never increases.

## Performance Budgets in CI

A performance budget is a number, asserted on every PR, that fails the merge if the bundle exceeds it. Without a budget, every PR is one regression closer to a slow site.

### size-limit (JS / CSS gzipped)

```json
{
  "size-limit": [
    { "path": "dist/assets/index-*.js", "limit": "90 KB", "gzip": true },
    { "path": "dist/assets/index-*.css", "limit": "20 KB", "gzip": true },
    { "path": "dist/assets/vendor-*.js", "limit": "120 KB", "gzip": true }
  ]
}
```

Run as a CI job. PR comment shows current vs limit vs delta. Block merge when limit is exceeded.

Strengths: simple, mature, integrates with most bundlers, supports the `--why` flag that names the dependency that pushed the bundle over.

Limitations: file-pattern based. If your route splits change names, the patterns need updating.

### bundlesize (the newer, route-aware variant)

For route-based code splitting, bundle the per-route chunks separately and assert per-route budgets:

```json
{
  "bundlesize": [
    { "path": "dist/route-home-*.js", "maxSize": "60 KB", "compression": "gzip" },
    { "path": "dist/route-product-*.js", "maxSize": "80 KB", "compression": "gzip" },
    { "path": "dist/route-checkout-*.js", "maxSize": "100 KB", "compression": "gzip" }
  ]
}
```

Route-level budgets are stricter than total-app budgets and catch a different regression: a heavy library imported on a route that did not need it.

### INP CrUX gate via PageSpeed Insights API

Lab budgets miss field INP regressions. A CI job that queries CrUX p75 INP for the production origin, compares to a baseline, and fails the deploy on a regression of more than 50ms is the field-side gate:

```bash
curl -s "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://your-domain.example&strategy=mobile&key=$PSI_KEY" \
  | jq -e '.loadingExperience.metrics.INTERACTION_TO_NEXT_PAINT_MS.percentile <= 200'
```

This gates on the rolling 28-day CrUX p75. The signal lags (28-day window) but it is the only field-INP gate that does not require a private RUM pipeline.

Check: CI has at least one bundle-size gate (size-limit or bundlesize) and at least one field-perf gate (CrUX query). Budgets are defined per route, not just per app. Budget changes are reviewed in PRs.

## Type-Only Check Gates

Static analysis catches a class of regressions that runtime tests miss.

### tsc --noEmit

```bash
npx tsc --noEmit --project tsconfig.json
```

Type-checks every file in the project without producing output. Run as a separate CI job (faster feedback than the bundler), assert zero errors.

Strict mode flags worth turning on: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`. Each catches a class of real bug.

Check: `tsc --noEmit` runs in CI. The project's `tsconfig.json` has `strict: true`. New strict flags are turned on one at a time with a clean-up PR per flag.

### Biome / ESLint

Static analysis beyond types. Catches dead code, hooks-rules violations, accessibility lint, react-specific traps, import-cycle warnings.

```bash
npx biome check src/
# or
npx eslint --max-warnings 0 src/
```

Run with `--max-warnings 0` so warnings are treated as errors. New warnings tracked to closure within the sprint they appear.

Check: lint runs in CI. Warnings count is monitored and trends down over time. Ignored rules are enumerated in the config with a comment per rule.

## Contract Tests

The contract between frontend and backend is a recurring source of regressions. Two patterns help.

### Pact (consumer-driven contracts)

The frontend (consumer) writes a contract describing the requests it makes and the responses it expects. The backend (provider) verifies the contract against its own implementation in its own CI. Both sides publish to a shared broker.

```js
// Consumer side (frontend test)
provider.addInteraction({
  state: 'a user exists',
  uponReceiving: 'a request for the user profile',
  withRequest: { method: 'GET', path: '/api/users/1' },
  willRespondWith: {
    status: 200,
    body: { id: 1, name: like('Alice'), email: like('alice@example.com') },
  },
});
```

When the backend changes a field name without updating the contract, the backend's CI fails. The frontend learns about the breakage at PR time, not at deploy time.

Strengths: catches schema drift deterministically, no shared mock to maintain.

Weaknesses: requires coordination with the backend team (they must run Pact verification in their CI).

### Schema validation on responses

A lower-coordination alternative: the frontend declares the response schema (Zod, Valibot, JSON Schema, OpenAPI) and validates every response at runtime in development. Failures log to the error tracker.

```js
const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
});

const response = await fetch('/api/users/1');
const parsed = UserSchema.safeParse(await response.json());
if (!parsed.success) reportError({ type: 'schema-mismatch', issues: parsed.error.issues });
```

Catches schema drift in production with attribution. Lower discipline than Pact, lower coordination cost.

Check: every consumed API endpoint has either a Pact contract or a runtime schema validation. Schema mismatches in production trip an alert (see observability.md).

## lighthouse-ci GitHub Action Wiring

Lighthouse-ci is the highest-leverage perf gate. Wire it into the PR loop so a regression blocks the merge.

### The action snippet

```yaml
name: lighthouse-ci
on: pull_request
jobs:
  lhci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - name: run lhci
        uses: treosh/lighthouse-ci-action@v12
        with:
          urls: |
            https://staging.your-domain.example/
            https://staging.your-domain.example/product
            https://staging.your-domain.example/checkout
          uploadArtifacts: true
          temporaryPublicStorage: true
          configPath: ./lighthouserc.json
```

The settings that matter:

1. **`urls`.** One per representative surface. Cover home, a content route, and a flow-critical route (checkout, sign-up).
2. **`uploadArtifacts: true`.** Saves the raw Lighthouse JSON as a build artefact. Failures are reproducible in the PR review.
3. **`temporaryPublicStorage: true`.** Posts a public-viewer URL to the PR comment. Reviewer clicks the link and sees the full Lighthouse report.
4. **`configPath`.** The assertion config (see below).

### The assertion config

```json
{
  "ci": {
    "collect": { "numberOfRuns": 5, "settings": { "preset": "desktop" } },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:best-practices": ["error", { "minScore": 0.95 }],
        "categories:seo": ["error", { "minScore": 0.95 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 1800 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["error", { "maxNumericValue": 200 }],
        "interactive": ["warn", { "maxNumericValue": 3500 }]
      }
    }
  }
}
```

`numberOfRuns: 5` reduces flake; the action reports the median. Adjust the thresholds to your surface; the values above are sensible defaults for a modern marketing or product site.

### PR comment integration

The action posts a comment with score deltas:

```text
Lighthouse scores

| Category      | / | /product | /checkout |
|---------------|---|----------|-----------|
| Performance   | 96 (-1) | 94 (-2) | 91 (=) |
| Accessibility | 100 (=) | 100 (=) | 100 (=) |
| Best Practices| 100 (=) | 100 (=) | 100 (=) |
| SEO           | 100 (=) | 100 (=) | 100 (=) |
```

Reviewer sees the trend at a glance. Regressions get fixed in the same PR.

Check: every PR shows the Lighthouse summary as a comment within 5 minutes of the build completing. Score regressions block the merge. The action's public-viewer URL is opened during PR review.

## Testing vs Audit Workflow

Two complementary disciplines, often conflated.

### Testing: the pre-merge gate

Testing answers "does this change break what already works?". Runs in CI on every PR. Output is binary: pass or fail. Fast feedback (minutes). Drives the merge decision.

What testing catches:

- Logic regression (unit, integration)
- Style drift (visual)
- Surface flow break (end-to-end)
- Accessibility violation (axe, Lighthouse a11y)
- Performance budget breach (size-limit, Lighthouse perf assertion)
- Schema drift (contract)

### Audit workflow: the post-build polish loop

Audit-workflow (`audit-workflow.md`) answers "is the deploy actually as good as we want it to be?". Runs on a staging or production deploy, route by route. Output is a list of findings with severity and owner. Slower feedback (hours). Drives the polish backlog.

What audit catches:

- Visual quality regressions invisible to fixed-viewport snapshots (real device rendering, real OS font stacks)
- Real-world performance regressions invisible to lab Lighthouse (real network, real device CPU)
- Accessibility issues only a human screen-reader run can catch (meaningful alt text, correct heading semantics)
- SEO drift (canonical drift, broken structured data, sitemap freshness)
- Cross-browser quirks (Firefox-only, Safari-only)
- Brand polish (motion timing, copy tone, illustration consistency)

### The split

| Property | Testing | Audit |
|----------|---------|-------|
| When | Every PR | Per deploy or per cadence |
| Output | Pass / fail | Findings list |
| Feedback | Minutes | Hours |
| Scope | Changed code | Entire surface |
| Decision | Block merge | Schedule polish work |
| Coverage | Mechanical | Includes judgement |

Run both. Pre-merge tests are the gate. Audit-workflow is the polish loop. Neither replaces the other. A site with comprehensive tests and no audits ships mechanically correct code that looks shabby. A site with audits and no tests ships polished code that regresses every release.

Check: the team's release process documents both gates. Tests are mandatory; audits are scheduled. Audit findings feed into the next sprint as issues, not into emergency hotfixes.

## See also

- [lighthouse.md](lighthouse.md) for the audit row mapping that the Lighthouse-ci assertions reference
- [observability.md](observability.md) for the post-deploy field-data signals that complement pre-merge tests
- [pre-launch.md](pre-launch.md) for the evidence manifest that consumes the CI artefacts
- [audit-workflow.md](audit-workflow.md) for the post-build polish loop that complements pre-merge gates
