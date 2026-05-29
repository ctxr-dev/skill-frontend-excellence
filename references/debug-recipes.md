---
title: Debug Recipes
purpose: Symptom-driven recipes for the eight regressions that recur on every project. Each recipe follows Symptom, Reproduce, Isolate, Hypothesise, Verify so the path from sighting to fix is deterministic.
load-when:
  task-keywords: [debug, recipe, hydration mismatch, INP, CLS, layout overflow, focus trap, font-swap CLS, axe, Lighthouse]
  symptoms: [hydration mismatch, INP regression, CLS regression, focus trap leak, horizontal scroll, viewport overflow, font swap CLS, score dropped, Lighthouse score drop]
prereq: SKILL.md
related: [defects.md, performance.md, observability.md, accessibility.md]
size: ~500 lines
---

# Debug Recipes

Eight recipes for the regressions that recur on every project. Each one fits the same shape: Symptom (what you saw), Reproduce (the smallest path back to it), Isolate (turn the suspect off), Hypothesise (the canonical root causes ranked by frequency), Verify (the metric or assertion that says it is fixed). Pick the recipe by symptom; do not run a recipe whose symptom you have not actually observed.

The recipes assume the standard verification stack: a headless browser of your choice (Puppeteer, Playwright, or equivalent), Lighthouse, the `web-vitals` library (or `web-vitals/attribution` where stated), DevTools (Performance, Rendering, Coverage, Animations, Lighthouse panels), and `axe` for accessibility checks. Framework names appear only as parenthetical examples.

## Hydration mismatch

**Symptom.** A console warning fires on first paint that the server-rendered DOM did not match what the client tried to render. Visible tells: a brief flicker as the client re-renders, event handlers that fail on first click (the listener attached to the discarded tree), or text content that flips after a frame.

**Reproduce.**

1. Hard-reload the page with cache disabled (DevTools Network, "Disable cache" ticked).
2. Open the Console BEFORE reload so the warning is captured.
3. Confirm the warning fires on every cold load, not just one in five. A flaky mismatch is almost always a date or random-number drift; a deterministic mismatch is structural.
4. Note the exact element path the warning points at. Most frameworks log the parent component and the divergent child.

**Isolate.**

1. View source (Cmd+U, View, Page Source) and search for the divergent element in the raw HTML the server sent.
2. Compare to the Elements panel after hydration. Note three classes of divergence: tag mismatch (`<span>` server, `<div>` client), attribute drift (a class or `data-*` attribute different), and content drift (text differs).
3. Disable client-side state hydration for the suspect subtree (most frameworks expose a "render on client only" or "suppress hydration warning" escape hatch). If the warning vanishes, the subtree is the suspect.

**Hypothesise.** Ranked by frequency:

1. **Locale or timezone drift.** The server formatted a date in UTC; the client formatted it in the user's locale. Fix: format on the server with an explicit locale and timezone, or render a placeholder server-side and fill in client-side after mount.
2. **`window` or `document` accessed during render.** A conditional that branches on `typeof window !== "undefined"` rendered one tree on the server and another on the client. Fix: render the same tree both places, then patch in an effect after mount.
3. **Random IDs generated per render.** A component that calls `Math.random()` or `crypto.randomUUID()` during render produces a different value on each side. Fix: use a stable id source (the framework's `useId` equivalent, a deterministic hash of props, or a prop passed from above).
4. **Third-party script mutates the DOM before hydration.** A consent banner, analytics tag, or extension inserted a node between server send and client hydrate. Fix: render the third party AFTER hydration completes, or wrap the host element in a stable shell the hydrator can ignore.
5. **Conditional render based on `localStorage` or `cookie`.** The server cannot read `localStorage`; if the client uses it to pick a tree, the trees diverge. Fix: move the decision to a cookie the server can read, or render the neutral tree first and patch after mount.
6. **HTML the parser silently normalises.** A `<p>` containing a `<div>` (forbidden content model) is auto-closed by the browser, producing a tree the client cannot match. Fix: validate the markup with the HTML validator; rewrite to a legal content model.

**Verify.**

1. Cold reload three times in a row; the warning must not fire on any of them.
2. Click the first interactive element within 500ms of paint; it must respond on the first click (no discarded-tree handler).
3. Record a Lighthouse run; INP attribution must not point at the suspect subtree as the slow event target.
4. If the project uses RUM, the hydration error count for the affected route should drop to zero over the next 24 hours.

## INP regression

**Symptom.** A surface that previously felt responsive now lags after input. Field metric: 75th-percentile INP rose above 200ms (the WCV threshold) or above the project's own bar.

**Reproduce.**

1. Pick the exact interaction the field data points at: tap a button, type into an input, scroll a list. Field data without attribution is a smell; insist on it.
2. Throttle the CPU 4x in DevTools Performance and replay the interaction five times. Confirm the lag reproduces under throttle. If it does not, the regression is field-specific (device, network, or third party); record a real-device session.
3. Disable browser cache and replay; some INP regressions only surface when a script must be parsed cold.

**Isolate.**

1. Install `web-vitals/attribution` (or the equivalent observer that exposes `PerformanceEventTiming.target` and the `interactionId`). The attribution payload names the target element and the slowest script.
2. Record a Performance trace covering the interaction. Identify the long task that overlaps the input. Note the script URL and function name.
3. Walk back from the long task: which event handler started it, which library frame is on the call stack, which network request blocked the response.
4. Disable the suspect script (Network "Request blocking" entry) and replay. If INP returns to baseline, the script is the suspect.

**Hypothesise.** Ranked by frequency:

1. **A third-party script grew.** Analytics, A/B test, chat widget, or tag manager shipped a new build that costs more main-thread time. Fix: defer, gate behind interaction, or remove.
2. **A handler ships a synchronous compute on the input path.** Sort, parse, format, or recompute a derived list on every keystroke. Fix: move the work behind a microtask boundary (`scheduler.yield`, `requestIdleCallback`, or a worker), debounce, or precompute.
3. **A render cascade.** One state change triggers re-render of a tree large enough to blow the budget. Fix: lift the state, memoise, or split the tree at the boundary where the change actually matters.
4. **Long Animation Frames stack.** A scroll or pointer listener does work every frame; the input lands in the gap and waits. Fix: subscribe with `{ passive: true }`, throttle to `requestAnimationFrame`, or move the work off the main thread.
5. **Hydration straggles.** The component hydrates on the input itself; the first interaction pays the hydration cost. Fix: hydrate earlier (visible-on-viewport), or render the surface server-only and skip hydration entirely.

**Verify.**

1. Replay the interaction five times with CPU 4x throttle; the slowest event must come in under the project's INP bar.
2. RUM (`web-vitals` with attribution) shows 75p INP under 200ms for the route over the next 7 days at minimum population.
3. The Lighthouse TBT row for the page does not regress; the long task that caused the regression no longer appears in the trace.

## CLS root-cause hunt

**Symptom.** Lighthouse reports CLS > 0.1 (mobile) or > 0.05 (desktop). The score dropped after a recent deploy.

**Reproduce.**

1. Run Lighthouse against the affected URL in a private window with a cold cache (Application, Clear storage).
2. Open the Lighthouse report and scroll to "Avoid large layout shifts." Note every element listed and its individual shift contribution. The largest one is the suspect.
3. Open the Performance panel, start a recording, reload, stop after the page settles. Switch to the "Experience" lane; every layout shift draws a red marker.

**Isolate.**

1. Click the largest shift marker in the Performance panel. The bottom pane shows the node that shifted and the node that pushed it.
2. Take a screenshot at the start of the recording and at the marker timestamp. Diff visually: what appeared between the two frames?
3. Enable Rendering, Layout Shift Regions. Reload; the shift regions paint in blue. The visible blue blob is the culprit.
4. Walk back from the culprit: was it injected late (font, image, ad, embed), or did it grow late (text reflow, async-loaded copy)?

**Hypothesise.** Ranked by frequency:

1. **Image without dimensions.** An `<img>` with no `width` and `height` attributes reserves zero space until it loads. Fix: declare both attributes, or set `aspect-ratio` on the parent.
2. **Web font swap.** The fallback and the webfont have different metrics; the swap pushes everything below the change. Fix: see the Font-swap CLS recipe below.
3. **Late-injected banner, cookie consent, or promo.** A node appears at the top of the document after first paint; everything moves down. Fix: render an empty reserved-height shell on the server and fill it on the client, or render the banner below the fold.
4. **Embed (video, iframe, social, map) loads without reserved space.** Fix: wrap in a fixed-`aspect-ratio` container.
5. **Animations that move width, height, top, left, or margin.** An entrance animation that grows from 0 to natural height shifts everything below. Fix: animate `transform: scaleY()` or `opacity` instead; reserve final height up front.
6. **Async content swap.** A skeleton with one height swaps for content of a different height. Fix: size the skeleton to the realistic content height; reuse the same container.

**Verify.**

1. Re-run Lighthouse in a private window with cold cache; the "Avoid large layout shifts" row must report less than 0.1 (mobile) and less than 0.05 (desktop).
2. The Performance recording shows no red shift marker after the initial paint.
3. The reserved-space fix shows the layout settled by the time the LCP element paints (no late nudge below it).

## Accessibility false positive

**Symptom.** An `axe` rule fires on an element, but a manual screen-reader and keyboard test does not reproduce the failure. You believe the markup is correct.

**Reproduce.**

1. Run `axe` again with a fixed seed (same page, same viewport, same `axe` version). The failure must be deterministic. If it flakes, the page is mutating between scan start and assertion; capture a stable snapshot first.
2. Read the rule's description on the Deque rule page. The description lists the exact assertion the rule makes (for example, "every `<button>` must have an accessible name").
3. Verify against the spec the rule cites (WCAG SC, ARIA Authoring Practices, HTML5 spec). The rule is a heuristic over the spec; the spec is the ground truth.

**Isolate.**

1. In DevTools Accessibility panel, inspect the flagged element. Check the computed Name, Role, State, and Description. If the computed values satisfy the spec, the rule is firing on a heuristic that does not apply.
2. Reproduce the user task with a real screen reader (VoiceOver, NVDA, TalkBack) and keyboard-only navigation. Confirm the user can complete the task without confusion.
3. Compare to the WAI-ARIA Authoring Practices reference example for the same pattern. If your markup matches the reference, the heuristic is wrong about your case.

**Hypothesise.** Ranked by frequency:

1. **Custom widget with a name supplied by the platform.** A `<select>` styled as a custom component carries a programmatic name from its `<label>`, but the rule looks at the visual wrapper. The user is fine; the rule reads the wrong node.
2. **Decorative element flagged as missing alt.** An icon used as visual ornament with `aria-hidden="true"` is correctly hidden; if a rule still flags it, the rule does not understand `aria-hidden` on the specific element.
3. **Dynamic content invalidates the snapshot.** The element under test is removed and re-inserted between scan and assertion. The rule fires on the stale node.
4. **A shadow DOM boundary the rule does not traverse.** The accessible name comes from a slotted node; the rule reads only the host. Mark the host with `aria-label` redundantly if the audit tool requires it.
5. **A genuinely incorrect markup pattern that happens to work for one assistive tech.** VoiceOver's tolerance is not a defence; NVDA or TalkBack may still fail. Confirm on at least two screen readers before declaring a false positive.

**Resolve.** If you can show on at least two screen readers that the user task succeeds, AND the spec is satisfied, the failing rule is a false positive for this case.

1. Add an `axe` ignore at the smallest scope (the specific selector or rule on the specific element), not a global suppression.
2. Comment the ignore inline with: the rule id, the spec citation that says the markup is correct, the screen readers verified, the date, and the reviewer initials.
3. Re-run `axe` and confirm only the intended ignore is silenced; the rule still fires on other elements.

**Verify.**

1. Manual screen-reader and keyboard pass on the route: the task completes without confusion.
2. `axe` returns zero violations excluding the documented ignore.
3. The next reviewer can read the ignore comment and understand why it is there without asking.

## Layout overflow

**Symptom.** The page scrolls horizontally on mobile (375 CSS pixels wide). The defects sweep flags `viewport-bleed` with a `scrollWidth` greater than `innerWidth`.

**Reproduce.**

1. Open the page in DevTools, Device Toolbar, iPhone preset (375 wide).
2. Confirm horizontal scroll. Drag the document right; note which content reveals.
3. Resize the viewport up by 10 CSS pixels at a time until the scroll vanishes. Note the breakpoint at which overflow appears (often a fixed-width child of a flex or grid parent).

**Isolate.** The canonical technique: outline every element and look for the one that protrudes.

```css
* { outline: 1px solid red !important; }
```

1. Inject the rule via DevTools (Styles, add to `<html>`). Every element draws a red box.
2. Scroll right slowly; the offending element is the one whose box extends past the viewport.
3. Inspect that element. Compute its width, padding, and margin. Compare to its parent's content box.
4. As an alternative isolation, run the geometry sweep from defects.md, which flags any element whose `scrollWidth` exceeds its `clientWidth` while `overflow-x` is `visible`.

**Hypothesise.** Ranked by frequency:

1. **Fixed-width child of a percentage parent.** A `width: 600px` inside a `width: 100%` parent that is smaller than 600 wins. Fix: `max-width: 100%`, or `width: 100%` with a `max-width: 600px`.
2. **Long unbreakable string.** A URL, email, or token with no spaces overflows its container. Fix: `overflow-wrap: anywhere` on the parent, or `word-break: break-word`.
3. **Image without `max-width: 100%`.** A wide image escapes its container. Fix: declare `max-width: 100%; height: auto` on the image.
4. **`width: 100vw` inside a padded container.** `100vw` includes the scrollbar and the parent's padding; the result extends past the viewport. Fix: use `width: 100%` (which respects the parent), or compute the gap.
5. **Unstyled `<iframe>` or `<video>`.** Default intrinsic width is the source's natural size, often wider than the viewport. Fix: `max-width: 100%; width: 100%`.
6. **Table without `table-layout: fixed`.** A `<table>` sizes columns by content; one long cell stretches the table past the viewport. Fix: `table-layout: fixed; width: 100%; word-break: break-word`.
7. **Negative margin or transform.** A decorative card or hero with `margin-left: -2rem` to extend past its container also extends past the viewport on small screens. Fix: clamp the negative margin to viewport-aware values, or remove on small breakpoints.

**Verify.**

1. The page does not scroll horizontally at 320, 375, and 425 CSS pixels wide.
2. The geometry sweep returns zero `viewport-bleed` issues.
3. No element's `scrollWidth` exceeds `document.scrollingElement.clientWidth`.

## Focus trap leak

**Symptom.** A modal or dialog is open, but Tab moves focus out to background content. Users can interact with elements that should be inert; the screen reader reads the background as well as the dialog.

**Reproduce.**

1. Open the dialog. Press Tab repeatedly. Watch the focus ring.
2. Confirm that focus eventually lands on a background element (the page header, a link in the article body, a button in the footer).
3. Note whether focus also reaches the dialog's own close button. If yes, the trap is partial (escape only); if no, the trap is absent.

**Isolate.**

1. In the Elements panel, find the node marked `aria-modal="true"` (or the dialog component root).
2. Find the node marked `inert` or `aria-hidden="true"` for the background. If neither marker is present, no trap is in place; this is the absent-trap case.
3. Run this in the Console to enumerate the tab order: walk all focusable elements and log which are reachable.

```js
const focusable = "a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex='-1'])";
[...document.querySelectorAll(focusable)]
  .filter(el => el.offsetParent !== null)
  .map(el => ({ tag: el.tagName, text: (el.textContent || el.value || "").trim().slice(0, 40) }))
  .forEach(row => console.log(row));
```

4. If background elements appear in the list while the dialog is open, the inert boundary is wrong.

**Hypothesise.** Ranked by frequency:

1. **`inert` applied to the wrong ancestor.** The dialog renders as a sibling of `<main>`, but the project marked `<main>` inert; the header and footer remain interactive. Fix: mark every sibling of the dialog inert, not just one.
2. **The dialog is a descendant of the inert region.** Marking `body` inert traps the dialog too. Fix: render the dialog outside the inert subtree, or remove the dialog from the inert subtree when it opens.
3. **`contenteditable` inside the dialog.** A rich-text editor inside the dialog steals focus from the trap library. Fix: detect editable nodes and add them explicitly to the trap's allow-list.
4. **A third-party widget injects elements outside the dialog.** A toast, tooltip, or autocomplete popover renders as a portal at body level. Fix: mark the third-party container inert when the dialog opens, or render the dialog and the third party in the same portal root.
5. **The trap library disabled `Tab` interception during a focus event.** Some libraries pause the trap if focus moves to a node they did not create. Fix: subscribe to `focusin` at the document level and bounce focus back if it leaves the dialog.
6. **A native `<dialog>` element used without `showModal()`.** Calling `show()` instead of `showModal()` skips the platform's focus trap. Fix: use `showModal()`.

**Verify.**

1. Tab through the open dialog at least twice the number of focusable elements; focus must cycle within the dialog and never reach background content.
2. Shift+Tab from the first focusable element returns to the last, not to the background.
3. Esc closes the dialog and returns focus to the trigger.
4. A screen reader reading "from the top" while the dialog is open must read only the dialog content.

## Lighthouse flake triage

**Symptom.** Two runs of Lighthouse against the same URL score wildly differently: 99 then 85. The team cannot agree whether the page passed.

**Reproduce.**

1. Run Lighthouse five times in a row from the same machine, with cache disabled, in a private window, on the same network. Record all five scores.
2. If the spread is greater than five points across the five runs, the page or the run environment is flaky.
3. Note which audit category drives the spread (Performance is the usual suspect; Accessibility, Best Practices, and SEO are deterministic).

**Isolate.**

1. **Throttling settle time.** Some emulated networks need a few seconds to stabilise. Run the first Lighthouse pass after a 5-second warm-up; do not score it.
2. **Hot vs cold cache.** Lighthouse defaults to a cold cache; a Service Worker or a stale `localStorage` flag can survive. Open Application, Clear storage, before each run.
3. **Network variability.** Wi-Fi, VPN, or a flaky upstream produces variance Lighthouse cannot smooth. Run from a wired connection or a CI runner.
4. **Third-party variance.** An analytics script or A/B test ships different code on different runs. Block third parties (`Request blocking` or a `--block-url-patterns` flag) and see if the score stabilises.
5. **Animations or videos auto-playing.** Continuous activity holds the main thread; Lighthouse measures the activity, not the steady-state page. Disable auto-play media for the run.

**Hypothesise.** Ranked by frequency:

1. **Third-party scripts vary per run.** Different ads, different A/B buckets, different feature flags. Score difference greater than five points across runs.
2. **The page does not reach a stable state.** A polling timer, animation, or live region keeps the main thread busy. Lighthouse never sees the quiet period it needs.
3. **The runner is shared.** A CI machine running multiple jobs introduces variance. Pin the runner type or run in a sandbox.
4. **The page depends on time of day.** A cron, a daily refresh, or a market-hours conditional renders different content. Pin the request time.

**The median-of-three workflow.** Run Lighthouse three times back-to-back; report the median score for each audit category. Reject any individual run that scores more than 10 points off the median (likely a network or third-party spike). Document the workflow in the project's `pre-launch.md` checklist.

**Verify.**

1. Three consecutive runs land within five points of each other on every audit category.
2. The median score meets the project's bar.
3. CI runs the median-of-three workflow; the dashboard records the median, not the single run.

## Font-swap CLS

**Symptom.** FCP is fine, LCP is fine, but CLS is above 0.1. The shift happens after first paint; visually, the text reflows when the webfont arrives.

**Reproduce.**

1. Throttle the network to "Slow 4G" in DevTools so the font swap is visible to the eye, not invisibly fast.
2. Reload with cache disabled. Watch the text: the fallback font paints first, then the webfont swaps in, and lines reflow (line breaks shift, paragraphs grow or shrink).
3. The CLS row in Lighthouse points at the heading or body text node.

**Isolate.**

1. Confirm `font-display: swap` is in use (not `block`, which delays paint instead of shifting it). If `block` is used, switching to `swap` may move the cost to FCP; choose deliberately.
2. Identify the fallback font (the next entry in the `font-family` stack). On macOS this is often the system serif or sans; on Windows it is Segoe UI or Arial; on Linux it varies.
3. Measure both fonts' metrics. Use a font inspection tool (FontDrop, fontview, or the Browser Font panel) to record: ascent, descent, line gap, x-height, cap height.

**Hypothesise.** Ranked by frequency:

1. **Fallback metrics differ from webfont metrics.** The line-box height changes when the webfont arrives; everything below shifts. Fix: declare a `@font-face` for the fallback with metrics-override descriptors.
2. **The webfont is variable but loaded as multiple files.** The fallback metrics target one weight; another weight loads and shifts. Fix: use one variable font file; tune the metrics-override for the typical weight.
3. **`size-adjust` not set.** Two fonts at the same `font-size` render at different visual sizes because their internal proportions differ. Fix: measure the x-height ratio and apply `size-adjust`.

**The metrics-override workflow.**

1. Download both the webfont and the chosen fallback (the actual files, not the OS reference).
2. Open both in a font inspector. Record `unitsPerEm`, `ascent`, `descent`, `lineGap`, `xHeight`, `capHeight` for each.
3. Compute the four override values:
   - `ascent-override`: `(webfont.ascent / webfont.unitsPerEm) / (fallback.ascent / fallback.unitsPerEm) * 100%`
   - `descent-override`: same ratio for descent
   - `line-gap-override`: same ratio for line gap
   - `size-adjust`: `(webfont.xHeight / webfont.unitsPerEm) / (fallback.xHeight / fallback.unitsPerEm) * 100%`
4. Declare a `@font-face` for the fallback with these overrides:

```css
@font-face {
  font-family: "Webfont Fallback";
  src: local("Arial");
  ascent-override: 92.5%;
  descent-override: 24.3%;
  line-gap-override: 0%;
  size-adjust: 105.7%;
}

:root {
  font-family: "Webfont", "Webfont Fallback", sans-serif;
}
```

5. The fallback now occupies the same visual box as the webfont; the swap does not shift.

**Verify.**

1. With network throttled to Slow 4G, reload three times; the visible reflow on swap disappears.
2. Lighthouse CLS for the affected page drops under 0.1.
3. The Performance recording's Experience lane shows no shift after FCP for any text node.

## See also

- [defects.md](defects.md) for the symptom-to-fix lookup and the geometry sweep
- [performance.md](performance.md) for the LCP, INP, CLS depth treatments these recipes assume
- [observability.md](observability.md) for the RUM, source-maps, and INP-attribution wiring that makes field reproduction possible
- [accessibility.md](accessibility.md) for the focus-trap, screen-reader, and contrast rules the recipes call on
