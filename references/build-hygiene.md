---
title: Build Hygiene
purpose: Bundle, tree-shake, code-split, and audit dependencies so every shipped kilobyte is accounted for and the JS budget is auditable, not aspirational.
load-when:
  task-keywords: [build, tree-shaking, dependency, sideEffects, lockfile, dead code, code splitting, bundle]
  symptoms: [bundle size grew, slow page, score dropped, LCP regression]
prereq: SKILL.md
related: [performance.md, security.md, observability.md, testing.md]
size: ~400 lines
---

# Build Hygiene

Every kilobyte in the shipped bundle is paid for: by the user's network, by the CPU that parses it, by the main thread that runs it. Bundle hygiene turns that cost into an auditable line item.

## Why Bundle Hygiene Matters

The JS budget is real. On a mid-range Android, every 30 KB of gzipped JavaScript adds roughly 50 ms to parse-and-compile and another 100 to 200 ms to execute under cold-start conditions. A 90 KB compressed budget for the initial route, the target in this skill, has room for about 270 KB of decompressed code: enough for a small framework plus the route's logic, not enough for an unused chart library.

Two patterns to refuse:

- "Budgets are aspirational." If a budget is not gated in CI, it is a wish. See testing.md for `size-limit` and `bundlesize` gating.
- "It is only one more dependency." One real project audit found an unused export pulled in by a barrel re-export accounted for 14 KB of the initial bundle. The package was a dependency of a dependency; nobody was reading it; tree-shaking should have removed it; a side-effects misdeclaration kept it in.

The discipline: every dependency has a line item, every line item has an owner, every owner can defend the bytes.

## Tree-Shaking at Depth

Tree-shaking is dead-code elimination performed by the bundler on ESM imports. It only works when three preconditions hold: ES modules end-to-end, accurate `sideEffects` declarations, and static (analyzable) imports.

### ESM-only imports

CommonJS resists tree-shaking because the module shape is not statically known until execution. A `require('lodash')` pulls every export. A `import { debounce } from 'lodash-es'` pulls only `debounce` and its transitive imports if `lodash-es` ships ESM (it does).

Three checks:

1. Every `package.json` you author has `"type": "module"` or every authored file uses `.mjs`.
2. Every dependency you bring in has an `"exports"` map with an `"import"` condition, not just `"require"`.
3. The build output does not include `require(` calls in shipped code (search the production bundle).

### `sideEffects: false` in `package.json`

A package marked `"sideEffects": false` tells the bundler that importing it for type-checking or named-export retrieval has no observable side effect, so unused imports can be dropped:

```json
{
  "name": "your-pkg",
  "type": "module",
  "sideEffects": false
}
```

If some files do have side effects (a CSS import, a polyfill registration, a global mutation), declare them explicitly:

```json
{
  "sideEffects": ["**/*.css", "./src/polyfills.js"]
}
```

The default (no `sideEffects` field) is the worst case: the bundler must assume every import is load-bearing and ship everything reachable.

### The three traps

1. **Re-export barrels.** A `src/index.js` of the form `export * from './a'; export * from './b';` forces the bundler to walk every transitive module to determine reachability. If one of them has a side effect or resists analysis, the entire barrel is included. Prefer deep imports (`import { foo } from 'pkg/foo'`) over barrel imports (`import { foo } from 'pkg'`) for any non-trivial library.
2. **Default exports.** A module that exports only a default object resists property-level shaking: the bundler cannot prove that consuming code uses only one property. Convert default exports to named exports for any module that contains more than one logical export.
3. **Dynamic property access.** Code like `lib[methodName]()` or `import(`./${variable}.js`)` prevents the bundler from statically determining which exports are reached. Tree-shaking falls back to including everything. Replace dynamic access with switch statements or named lookups when possible.

Check: build a production bundle, open the bundle analyzer, search for any package that is supposedly imported only for one function. If the bundle contains the rest of the package, one of the three traps is in play.

## `sideEffects` Declarations and How to Verify

Two levels of declaration: the package level (`package.json`) and the file level (a build-tool comment).

### Package-level

The `sideEffects` field in `package.json` is the most important declaration. Set it correctly for every package you author:

| Pattern | `sideEffects` value |
|---|---|
| Pure utility library, no globals | `false` |
| Library with one polyfill entry, otherwise pure | `["./src/polyfills.js"]` |
| Library that registers global event listeners on import | omit (forces pessimistic inclusion) |

### File-level

Bundlers respect comments that mark a file as side-effect-free:

```javascript
/*#__PURE__*/
```

Use the `/*#__PURE__*/` annotation on factory calls so the bundler can drop them if the result is unused:

```javascript
export const validator = /*#__PURE__*/ buildValidator(SCHEMA);
```

Without the annotation, `buildValidator(SCHEMA)` is presumed to have side effects and stays in the bundle even if `validator` is never imported.

### How to verify

Three tools, one workflow:

1. **Bundle analyzer** (`webpack-bundle-analyzer`, `rollup-plugin-visualizer`, `esbuild --analyze`, `vite-bundle-visualizer`). Run as part of every production build. Eyeball the largest squares.
2. **Source map explorer**. Trace each kilobyte of the production bundle back to the source file that produced it. Surprises (unrelated packages showing up) point at side-effect leaks.
3. **Diff between releases**. Snapshot the bundle composition on every release; flag any dependency that grew by more than 5 KB or any new dependency over 10 KB.

## Code-Splitting Strategy

The goal is to ship only the code the current view needs. Three granularities, picked per scenario.

### Route-level

One chunk per route, loaded on navigation. This is the default for every modern framework (React Router, Vue Router, SvelteKit, SolidStart, Astro) and the highest-leverage split available.

Check: open the network tab on the landing route. The number of JS requests should match the framework runtime plus the route entry, not the whole app.

### Component-level

A heavy widget (rich-text editor, chart, code editor, file viewer) loaded lazily when the user first reaches a view that needs it. Use the platform `import()` with a Suspense or loading boundary:

```javascript
async function openEditor() {
  const { Editor } = await import('./editor.js');
  mount(Editor);
}
```

Component-level splits earn their cost when the widget is over 30 KB compressed and used by fewer than half of route visitors. Below that threshold, the split adds latency without saving bytes for the typical user.

### Interaction-level

Code loaded when the user signals intent: hover, focus, intersection with viewport. The pattern:

```javascript
const trigger = document.querySelector('#open-modal');
let loaded = false;
trigger.addEventListener('pointerenter', async () => {
  if (loaded) return;
  loaded = true;
  await import('./modal.js');
});
```

For below-the-fold widgets, use IntersectionObserver to load when the viewport approaches:

```javascript
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      import(entry.target.dataset.module);
      observer.unobserve(entry.target);
    }
  }
}, { rootMargin: '200px' });
```

### The decision matrix

| Scenario | Strategy |
|---|---|
| Per-route view | Route-level split (default) |
| Heavy widget, used by some visitors | Component-level lazy |
| Below-the-fold widget, used by many | Interaction-level (intersection) |
| Modal opened by a button | Interaction-level (hover or focus) |
| Hot path used by everyone | Bundle eagerly (no split) |
| Auth-gated module | Route-level + auth check |

## Dependency-Cost Discipline

Every `npm install <pkg>` is a budget decision. Three checkpoints before the install.

### Bundlephobia gating

Before adding any production dependency, look up its bundlephobia (or equivalent) size. Reject any dependency that ships more than 30 KB minified-and-gzipped without a clear, defended reason. Reject any dependency that ships more than 100 KB without a one-paragraph justification in the PR.

### `npm install --dry-run` size check

Before merging, run `npm install --dry-run <pkg>` and inspect the transitive tree. A direct dependency that pulls 40 transitive dependencies is a different proposition from one that pulls two. Treat the transitive count as part of the cost.

### The "one dep doubled the bundle" failure mode

A common pattern: a developer adds one date library to format two timestamps, the library imports its own locale data eagerly, the locale data is 200 KB, the bundle doubles. The smell: a single utility need that adds tens of kilobytes.

Three responses, in order of preference:

1. Use the platform (`Intl.DateTimeFormat`, `Intl.NumberFormat`, `Intl.RelativeTimeFormat`). See i18n.md for the catalog.
2. Pick a slimmer alternative that scoped imports. The variant of a date library that supports tree-shaken plugin loading beats the variant that imports every locale at module load.
3. Write the utility yourself. Five lines of `String.prototype.padStart` beat 30 KB of dependency in many cases.

Check: every dependency added in the last sprint has a comment in the PR explaining why the platform was not enough.

## Lockfile Hygiene

The lockfile is the source of truth for reproducible builds. Treat it with the same discipline as the schema.

### Lockfile in version control

Always commit `package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock`. A repo without a committed lockfile produces different bundles on every CI run; performance regressions become unattributable.

### Never `npm install` in CI

CI uses `npm ci` (or `pnpm install --frozen-lockfile`, `yarn install --immutable`). These commands install exactly what the lockfile pins and fail if `package.json` and the lockfile disagree. Plain `npm install` mutates the lockfile, which means CI can install a different version than the developer tested.

```yaml
- run: npm ci
```

Three checks:

1. Search the CI config for `npm install` (without `ci`). Every occurrence is a defect.
2. The CI job fails if the lockfile is dirty after install (`git diff --exit-code package-lock.json`).
3. The lockfile is reviewed in every PR that touches `package.json`. Reviewers ignore the lockfile diff at their peril.

### The `npm audit` budget

Set a vulnerability threshold and gate CI on it:

```text
npm audit --audit-level=high --omit=dev
```

Reject high and critical vulnerabilities in production dependencies. Track and triage moderate vulnerabilities on a known cadence (weekly or sprint-aligned). Dev dependencies are filtered out because they do not ship to users.

Cross-link: security.md covers the broader supply-chain story including Subresource Integrity for third-party scripts.

## Dead-Code Elimination

Dead code is code the bundler can prove is unreachable. Unreferenced-but-imported code is code that the bundler thinks might be reachable because of side-effect declarations. They look similar; they have different fixes.

### Minifier configuration

Modern minifiers (`terser`, `swc`, `esbuild` in minify mode) do dead-branch elimination as part of compression. Verify in CI:

- The production build has `NODE_ENV` set to `production` so dev-only branches drop out.
- The minifier configuration enables `dead_code`, `unused`, `pure_funcs`, and `passes: 2` (terser) or the framework equivalent.
- Production builds do not contain string literals from dev-only code paths (search the bundle for known dev-only error messages).

### Dead-code vs unreferenced-but-imported

A dead branch (`if (false) { ... }`) is dropped by the minifier. An unreferenced import (`import './polyfill';` where the polyfill registers nothing the rest of the code reaches) cannot be dropped without an accurate `sideEffects` declaration: from the bundler's point of view, the side effect is the whole point of the import.

The fix differs:

| Pattern | Fix |
|---|---|
| Dead branch | Trust the minifier; verify the branch is gone in the prod bundle. |
| Unreferenced import with side effects | Either remove the import or accurately scope `sideEffects` so it can be dropped when unused. |
| Imported export, never read | Verify the package has `sideEffects: false`; if not, file an upstream issue or patch. |

## `import()` Analysis

The bundler determines lazy chunks by walking every `import()` expression at build time. The shape of the expression matters.

### What the bundler can analyze

```javascript
import('./modal.js');                 // Static path: produces one chunk.
import(`./views/${viewName}.js`);     // Template with a literal head: produces one chunk per matching file.
import(routeModule);                  // Pure variable: bundler cannot analyze; falls back to one big chunk or fails.
```

Prefer the first two forms. Avoid the third in production code; it defeats the purpose of code-splitting.

### Webpack magic comments

Webpack accepts inline directives that name the chunk and signal preload or prefetch intent:

```javascript
import(/* webpackChunkName: "editor" */ './editor.js');
import(/* webpackPrefetch: true */ './settings.js');
import(/* webpackPreload: true */ './critical-modal.js');
```

`webpackChunkName` produces stable file names (useful for cache hit rate). `webpackPrefetch` adds `<link rel="prefetch">` so the browser fetches the chunk when idle. `webpackPreload` adds `<link rel="preload">` for immediately-needed chunks.

### Equivalents in other bundlers

| Bundler | Chunk naming | Preload signal |
|---|---|---|
| Webpack | `/* webpackChunkName */` | `/* webpackPreload */` |
| Vite (Rollup) | `chunkFileNames` config | Manual `<link>` tag |
| Rollup | `output.chunkFileNames` | Manual `<link>` tag |
| esbuild | `chunkNames` config | Manual `<link>` tag |
| Parcel | Automatic | Manual `<link>` tag |

For bundlers without inline preload directives, add the resource hint to the document head:

```html
<link rel="prefetch" href="/assets/editor.abc123.js" as="script">
```

## Source Maps for Builds

Source maps make production stack traces readable without shipping unminified code to users.

### Separate hidden source maps

Three patterns; the right one for production:

| Pattern | What it does | When |
|---|---|---|
| Inline source maps (`//# sourceMappingURL=data:`) | Embeds the map in the bundle | Dev only; never production |
| Public source maps (`//# sourceMappingURL=file.js.map`) | Map sits next to the bundle, browser fetches it | OK for open-source; leaks source for proprietary |
| Hidden source maps (no comment, build emits the map) | Map is built but not referenced; upload to error tracker | Production for proprietary code |

The production pattern: build hidden source maps, upload them to the error-tracking service as part of the deploy, never serve them from the origin. The error tracker symbolicates stack traces; users see a minified bundle but the team sees real frames.

Build configuration:

```text
# Webpack
devtool: 'hidden-source-map'

# Vite
build.sourcemap: 'hidden'

# Rollup
sourcemap: 'hidden'

# esbuild
sourcemap: 'external'
```

Upload step in CI (Sentry, Datadog, Bugsnag, Rollbar all support similar):

```text
sentry-cli sourcemaps upload --release "$VERSION" ./dist
```

Cross-link: observability.md covers the full error-capture pipeline including the source-map upload step.

## Polyfill Discipline

Polyfills cost bytes. Ship the minimum needed for the supported browsers, never more.

### `browserslist` as the source of truth

The single source of truth for which browsers to support lives in `package.json`:

```json
{
  "browserslist": [
    ">0.2%",
    "not dead",
    "not op_mini all"
  ]
}
```

Every build tool (PostCSS, Babel, Autoprefixer, ESLint browser-compat plugin) reads this list. Keep one list; do not duplicate it per tool.

Audit the resolved list at least once per quarter:

```text
npx browserslist
```

Confirm the list still matches business reality: drop browsers below 0.2 percent usage, drop unsupported browsers from the vendor.

### `core-js` minimum-target subsets

Configure `core-js` with the same `browserslist`:

```json
{
  "presets": [["@babel/preset-env", {
    "useBuiltIns": "usage",
    "corejs": { "version": "3.36", "proposals": false }
  }]]
}
```

`useBuiltIns: "usage"` adds only the polyfills the code actually uses. The alternatives (`"entry"`, the global import) are bigger and rarely justified.

### Modern and legacy bundles

The two-bundle pattern (sometimes called differential serving) ships a modern bundle to modern browsers and a transpiled legacy bundle to older ones:

```html
<script type="module" src="/assets/modern.js"></script>
<script nomodule src="/assets/legacy.js"></script>
```

Pay the build complexity only when the legacy share is over 10 percent of traffic and the modern bundle saves over 20 KB compressed. Below those thresholds, ship one transpiled bundle and move on.

Check: production bundle for modern browsers does not include `Array.prototype.flat` polyfill, generator runtime, or async-await transforms. If it does, the `browserslist` is wider than the audience.

## See also

- [performance.md](performance.md) for the budget framing, render strategies, and the asset-loading rules that bundle hygiene feeds.
- [security.md](security.md) for Subresource Integrity, supply-chain considerations, and dependency vulnerability gates.
- [observability.md](observability.md) for the hidden source-map upload and the error-tracking pipeline that depends on it.
- [testing.md](testing.md) for `size-limit` and `bundlesize` gating, lighthouse-ci, and the CI checks that make bundle budgets auditable.
