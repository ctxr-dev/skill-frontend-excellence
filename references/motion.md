---
title: Motion and Animation
purpose: Framework-agnostic guidance on motion that conveys meaning, performs at 60fps, respects user preferences, and uses the modern platform primitives (View Transitions, WAAPI, scroll-driven, @starting-style).
load-when:
  task-keywords: [motion, animation, transition, easing, View Transitions, scroll-driven, WAAPI, will-change, "@starting-style", reduced motion]
  symptoms: [INP regression, slow interaction, CLS regression, score dropped]
prereq: SKILL.md
related: [performance.md, accessibility.md, ui-ux.md, design.md]
size: ~660 lines
---

# Motion and Animation

Framework-agnostic principles for motion that conveys meaning, performs at 60fps, and respects user preferences.

## Why Motion

Motion is a tool, not decoration. It exists to:

1. **Communicate cause and effect.** A button press triggers a state change; the motion confirms it.
2. **Maintain spatial continuity.** Where did this element come from? Where does it go?
3. **Direct attention.** Animate what the user should look at next.
4. **Express brand personality.** Spring bounces feel playful; linear fades feel refined.

If a motion doesn't serve one of these, remove it.

## The Four Properties of UI Motion

| Property | Default | Range |
|----------|--------|-------|
| Duration | 200-250ms (UI), 300-400ms (modal/page transition) | 100-500ms; rarely above 500ms in UI |
| Easing | `ease-out` for entering, `ease-in` for exiting | Linear forbidden in UI |
| Trigger | User action or state change | Time alone (idle) is decorative |
| Interruptibility | Always interruptible | Never block input |

## Duration

| Interaction | Duration |
|-------------|----------|
| Hover, focus, press feedback | 100-150ms |
| Toggle, switch | 150-200ms |
| Disclosure, accordion | 200-300ms |
| Tab change, segmented control | 150-250ms |
| Modal/sheet entrance | 250-350ms |
| Modal/sheet exit | 200-250ms (faster than entrance) |
| Page/route transition | 300-400ms |
| Onboarding sequence | 400-600ms per beat |
| Skeleton shimmer | 1500ms loop, low contrast |

Above 500ms feels slow in UI. Reserve for one-off cinematic moments.

Exit motions should be 60-70% of entrance duration. The user already saw the content arrive; getting it out of the way faster feels responsive.

## Easing

Easing curves give motion personality.

| Curve | Use |
|-------|-----|
| `ease-out` (`cubic-bezier(0, 0, 0.2, 1)`) | Entering. Element decelerates as it arrives. |
| `ease-in` (`cubic-bezier(0.4, 0, 1, 1)`) | Exiting. Element accelerates as it leaves. |
| `ease-in-out` (`cubic-bezier(0.4, 0, 0.2, 1)`) | State change in place. Symmetric. |
| `ease` (`cubic-bezier(0.25, 0.1, 0.25, 1)`) | Default; usable but generic. |
| Spring | Playful or characterful. Use a physics-based library. |
| `linear` | NEVER for UI motion. Reserved for continuous loops (loading spinners) and progress bars. |

Material Design 3 standard curves (consider these defaults):

- Standard: `cubic-bezier(0.2, 0, 0, 1)`
- Decelerated (entering): `cubic-bezier(0, 0, 0, 1)`
- Accelerated (exiting): `cubic-bezier(0.3, 0, 1, 1)`
- Emphasized: `cubic-bezier(0.2, 0, 0, 1)` (longer durations, more dramatic)

Apple-style spring curves (CSS):

- Soft snap: `cubic-bezier(0.34, 1.56, 0.64, 1)` (slight overshoot, soft return)
- Quick snap: `cubic-bezier(0.4, 1.5, 0.5, 1)` (quicker overshoot)
- Reduced motion: `cubic-bezier(0.4, 0, 0.2, 1)` (no overshoot)

For genuinely physics-based motion, use a library (Motion / Framer Motion, React Spring, GSAP). Spring physics with stiffness, damping, mass produces natural-feeling motion that handcrafted bezier curves rarely match.

### CSS `linear()` for spring approximations

The `linear()` easing function (Baseline 2024) takes a list of stops and interpolates linearly between them, which lets you approximate a spring (or any arbitrary curve) in pure CSS, without a library and without the JS cost of a physics simulation.

```css
.bounce {
  transition: transform 600ms linear(
    0, 0.009, 0.035, 0.078, 0.137, 0.21, 0.296, 0.394, 0.502,
    0.62, 0.745, 0.876, 1, 1.062, 1.114, 1.156, 1.186, 1.207,
    1.217, 1.219, 1.213, 1.2, 1.18, 1.156, 1.13, 1.103, 1.078,
    1.056, 1.039, 1.024, 1.014, 1.007, 1.003, 1.001, 1
  );
}
```

You do not write these stops by hand. Generate them once from a spring (stiffness, damping, mass) with a tool like `linear()` generator, then paste into CSS. The result: spring-physics motion that runs on the compositor with no main-thread cost, and that respects `prefers-reduced-motion` through the normal CSS path. Use this in place of hand-rolled cubic-bezier-fit-to-spring (which never quite matches) and in place of JS spring libraries for the common "snap with overshoot" feel.

## What to Animate (and what NOT to animate)

### Animate

- `transform` (translate, rotate, scale)
- `opacity`
- `filter` (sparingly)
- `clip-path` (modern browsers)

These compositor-only properties run on the GPU and don't trigger layout or paint. They hold 60fps.

### NEVER animate

- `width`, `height`, `top`, `left`, `right`, `bottom`, `margin`, `padding`, `font-size`
- `box-shadow` size (only opacity is cheap)
- Anything that changes layout for surrounding elements

These trigger layout, then paint, then composite. Each is expensive. Animating them at 60fps is impossible on most devices.

For "expanding" or "collapsing" elements, use `transform: scale()` plus `clip-path`, or use the `view-transition` API for layout transitions.

### When you must animate layout

Use FLIP (First, Last, Invert, Play):

1. Measure the element's First position.
2. Apply the change.
3. Measure the Last position.
4. Compute the Invert transform.
5. Animate transform from inverted to identity (Play).

Libraries like Motion's layout animations and React's `useLayoutEffect` patterns implement this for you.

For full route or DOM transitions, the new `view-transition` API is the right tool.

## Web Animations API

CSS animations are the right default for declarative, repeatable motion. The Web Animations API (`element.animate()`, `Animation`, `getAnimations()`) is the right tool the moment motion becomes stateful, interruptible, dynamic, or coordinated across elements at runtime.

```js
const anim = card.animate(
  [{ transform: 'translateY(20px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }],
  { duration: 400, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'forwards' }
);

anim.onfinish = () => anim.commitStyles();
```

What WAAPI does that CSS cannot:

- **Interruptible.** `anim.pause()`, `anim.cancel()`, `anim.reverse()`, `anim.playbackRate = 0.5`. Interrupting a CSS animation cleanly requires class juggling and timing hacks.
- **Coordinated.** `getAnimations()` returns every running animation on the page. Use it to pause every motion on a route change, or to drive a "are we still animating?" gate.
- **Stateful.** `commitStyles()` writes the current animation values to the element's inline style, so finishing an animation leaves the element in its end state without `fill: forwards` quirks. Essential for animations whose start state depends on the previous animation's end.
- **Dynamic keyframes.** Pass arbitrary computed keyframe objects, including values you computed from the DOM measurement two lines earlier. CSS animations cannot accept runtime-computed values.

Reach for WAAPI when:

- You need to start an animation, then interrupt it on a user gesture (cancel on click, reverse on hover-out, pause during a drag).
- You are running a FLIP layout animation and the keyframes depend on measured before / after positions.
- You need to coordinate animations across multiple elements with shared timing or a single global controller.

Stay with CSS animations for: hover effects, static reveals, skeleton loops, simple modal entrances, anything where the same animation always plays the same way.

## Reduced Motion

Always respect `prefers-reduced-motion: reduce`. The "global stomp" pattern is the floor:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Better practice: tier your animations.

- **Essential** (a loading spinner conveying activity, a progress bar showing percent): keep, even with reduced motion.
- **Helpful** (a slide-in modal, a fade-in card): replace with instant transitions.
- **Decorative** (parallax, scroll-triggered reveals, hero text staggered animations): remove entirely.

```css
.hero-letters span {
  opacity: 0;
  transform: translateY(20px);
  animation: rise 600ms ease-out forwards;
}

@media (prefers-reduced-motion: reduce) {
  .hero-letters span {
    opacity: 1;
    transform: none;
    animation: none;
  }
}
```

For JS animations, check the user preference:

```js
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!prefersReduced) {
  // Run the animation
}
```

## Choreography

When multiple elements animate, choreograph them. Don't let everything animate at once.

### Stagger

For lists or grids, stagger entries by 30-50ms. The user sees a sequence rather than a flash.

```css
.list > * {
  animation: rise 400ms ease-out backwards;
}

.list > *:nth-child(1) { animation-delay: 0ms; }
.list > *:nth-child(2) { animation-delay: 50ms; }
.list > *:nth-child(3) { animation-delay: 100ms; }
/* etc */
```

Or programmatically:

```js
items.forEach((item, i) => {
  item.style.animationDelay = `${i * 50}ms`;
});
```

Cap stagger at 8-10 items so the last item isn't obviously waiting.

### Sequence

For a hero load: heading first, then sub-heading, then CTAs, then image. Each beat 100-200ms after the previous start.

### Co-ordinated entry/exit

Modal: backdrop fades in (200ms), then dialog scales up + fades in (250ms). On exit: dialog scales down + fades out (180ms), then backdrop fades out (150ms).

## Scroll-Triggered Motion

### CSS-only (preferred)

Modern CSS supports scroll-driven animations:

```css
.fade-in-on-scroll {
  opacity: 0;
  transform: translateY(20px);
  animation: rise 600ms ease-out forwards;
  animation-timeline: view();
  animation-range: entry 0% cover 30%;
}

@keyframes rise {
  to { opacity: 1; transform: translateY(0); }
}
```

Browser support is improving. With `IntersectionObserver` as fallback, this covers most cases.

### `animation-timeline: scroll()` for scroll-progress

`view()` (above) ties an animation to an element entering or leaving the viewport. `scroll()` ties an animation to the scroll position of a scroll container itself, from 0 percent (top) to 100 percent (bottom). Both are Baseline 2024.

Canonical uses for `scroll()`:

- **Reading progress bar.** A bar that fills as the user scrolls the article. Zero JS.

```css
.progress {
  position: fixed; top: 0; left: 0; height: 3px;
  background: var(--brand);
  transform-origin: left;
  animation: fill linear;
  animation-timeline: scroll(root);
  animation-range: 0% 100%;
}

@keyframes fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
```

- **Sticky-fade header.** Header background opacity rises from 0 to 1 over the first 100 to 200px of scroll, giving the header a transparent state on hero and an opaque state on body. No scroll listener.
- **Section-position indicator.** A side-nav dot that moves down a vertical track as the page scrolls.

Use `scroll()` for "where in the document am I" effects. Use `view()` for "is this element visible" effects. Both run on the compositor at 60fps and respect `prefers-reduced-motion` through the standard CSS path.

### Intersection Observer (universal)

```js
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });

document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
```

Then in CSS:

```css
.reveal {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 600ms ease-out, transform 600ms ease-out;
}

.reveal.in-view {
  opacity: 1;
  transform: translateY(0);
}
```

### Anti-patterns

- Every section animates as you scroll. The page feels like it's still loading when you reach the bottom.
- Parallax on every section. Disorienting. Often hurts CLS.
- Long animations triggered by scroll. The user has already moved past the trigger point.

Animate selectively. One or two key sections per page.

## Page Transitions

For SPA route changes:

```css
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 200ms;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

::view-transition-old(root) {
  animation-name: fade-out;
}

::view-transition-new(root) {
  animation-name: fade-in;
}
```

For shared element transitions (e.g., a card in a list expands into a detail view):

```css
.card-image {
  view-transition-name: card-image;
}

.detail-image {
  view-transition-name: card-image;
}
```

The browser automatically morphs between them.

For frameworks without `view-transition` support, libraries like Motion provide layout animations.

### Cross-document View Transitions (MPA)

Same-document View Transitions (the SPA case above) ship in every Chromium-based browser and Safari. The cross-document variant, which animates between two full-document navigations (the multi-page app case), is the newer release: Chrome 126+ and Safari 18+. Firefox is rolling it out; treat it as progressive enhancement.

A single line of CSS opts the whole site into automatic cross-page transitions:

```css
@view-transition {
  navigation: auto;
}
```

That is it. No JS, no router integration, no framework. The browser captures the outgoing document, fetches and parses the incoming one, then crossfades the two as the new page renders. Shared element transitions across the page boundary work the same way: matching `view-transition-name` values on the outgoing and incoming pages auto-morph between them.

```css
.product-image { view-transition-name: product-hero; }
```

Constraints to know:

- Same-origin only. The browser will not transition across origins.
- Both navigations must opt in (`@view-transition { navigation: auto }` in the CSS of both pages).
- Firefox without support degrades to a normal navigation, no transition. The page still works.

Use this for static sites, server-rendered apps, and any MPA where the perceived-instant feeling of an SPA was the reason teams chose a client-side router. Cross-doc View Transitions remove that reason.

## Loading and Progress Indicators

### Spinner

For < 1s waits. Linear rotation, infinite, 800-1000ms per revolution.

```css
@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  animation: spin 800ms linear infinite;
}
```

Add `aria-label="Loading"` (or wrap in a container with one).

### Skeleton screen

For 300ms+ waits. Match the eventual layout. Animate a subtle shimmer.

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--surface-muted) 0%,
    var(--surface) 50%,
    var(--surface-muted) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1500ms ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

Mark with `aria-busy="true"` and `aria-live="polite"` so SRs announce when content arrives.

### Progress bar

For determinate progress. Animate `transform: scaleX()` from 0 to 1, not `width`.

```css
.progress-bar {
  transform-origin: left;
  transform: scaleX(0);
  transition: transform 200ms linear;
}

.progress-bar.at-50 { transform: scaleX(0.5); }
```

## Hover and Press Effects

### Button hover

Subtle: shift background by one tone, change border, raise by 1-2px.

```css
.btn {
  transition: transform 150ms ease-out, background 150ms ease-out;
}

.btn:hover {
  transform: translateY(-1px);
  background: var(--primary-hover);
}

.btn:active {
  transform: translateY(0) scale(0.98);
}
```

### Card hover

Lift slightly, subtle shadow change.

```css
.card {
  transition: transform 200ms ease-out, box-shadow 200ms ease-out;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-elevated);
}
```

### Press scale

For tappable cards/buttons: subtle 0.95-0.98 scale on press, restore on release.

```css
.btn:active {
  transform: scale(0.97);
  transition-duration: 50ms;
}
```

Mobile: rely on `:active`. The browser handles touch feedback.

## Modal/Sheet Entrance

### Open-from-closed transitions (`@starting-style`)

Transitioning an element that toggles between `display: none` and `display: block` (the natural state for popovers, dialogs, and toasts) used to require JS choreography because `display` is a discrete property and `none` to `block` has no animatable intermediate. Three modern features fix this; together they are now the canonical way to animate popovers and dialogs open from closed.

- `@starting-style { ... }` declares the styles the element takes the moment it enters the DOM (or transitions out of `display: none`). The browser interpolates from the starting-style values to the active styles.
- `transition-behavior: allow-discrete` lets the browser animate discrete properties (including `display`) over the transition duration instead of snapping at the boundaries.
- `transition: display ...` combined with the two above means `display: none` to `display: block` actually plays the transition.

```css
[popover] {
  opacity: 0;
  transform: scale(0.96);
  transition:
    opacity 200ms ease-out,
    transform 200ms ease-out,
    display 200ms allow-discrete,
    overlay 200ms allow-discrete;
}

[popover]:popover-open {
  opacity: 1;
  transform: scale(1);
}

@starting-style {
  [popover]:popover-open {
    opacity: 0;
    transform: scale(0.96);
  }
}
```

This is Baseline-modern (Chrome, Safari, Edge; Firefox shipping). Use it for popovers, dialogs, dropdowns, toasts, tooltips, and any element whose lifetime is "absent or present" rather than "always present, sometimes visible". The fallback on a browser without `@starting-style` is an instant snap, which degrades gracefully.

### Modal (centered)

```css
.modal {
  opacity: 0;
  transform: scale(0.95);
  transition: opacity 200ms ease-out, transform 200ms ease-out;
}

.modal.open {
  opacity: 1;
  transform: scale(1);
}

.modal-backdrop {
  opacity: 0;
  transition: opacity 200ms ease-out;
}

.modal-backdrop.open {
  opacity: 1;
}
```

Order: backdrop fades in, then modal fades + scales in (50ms after).

### Sheet (slides from edge)

```css
.sheet-bottom {
  transform: translateY(100%);
  transition: transform 250ms cubic-bezier(0.32, 0.72, 0, 1);
}

.sheet-bottom.open {
  transform: translateY(0);
}
```

`translateY(100%)` puts it just below the visible area. iOS bottom sheets use a slight overshoot; the cubic-bezier above approximates that feel.

### Dropdown/popover

```css
.popover {
  opacity: 0;
  transform: translateY(-4px) scale(0.97);
  transform-origin: top;
  transition: opacity 150ms ease-out, transform 150ms ease-out;
  pointer-events: none;
}

.popover.open {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}
```

## Toast/Snackbar

Slide in from edge + fade. Auto-dismiss after 3-5s.

```css
.toast {
  transform: translateY(100%);
  opacity: 0;
  transition: transform 300ms cubic-bezier(0.32, 0.72, 0, 1), opacity 200ms ease-out;
}

.toast.show {
  transform: translateY(0);
  opacity: 1;
}

.toast.hide {
  transform: translateY(100%);
  opacity: 0;
}
```

## Hero Animations

A well-orchestrated hero entrance can carry the entire page. Examples:

### Staggered text rise

Each word or letter rises and fades in sequentially.

```css
.hero-words span {
  display: inline-block;
  opacity: 0;
  transform: translateY(0.5em);
  animation: rise 600ms cubic-bezier(0.2, 0, 0, 1) forwards;
}

.hero-words span:nth-child(1) { animation-delay: 100ms; }
.hero-words span:nth-child(2) { animation-delay: 180ms; }
.hero-words span:nth-child(3) { animation-delay: 260ms; }
/* etc */

@keyframes rise {
  to { opacity: 1; transform: translateY(0); }
}
```

Cap at 8-10 items. Beyond that, the animation feels slow.

### Image reveal

A clip-path reveal that wipes from one edge.

```css
.hero-image {
  clip-path: inset(0 100% 0 0);
  animation: reveal 800ms cubic-bezier(0.6, 0, 0, 1) 200ms forwards;
}

@keyframes reveal {
  to { clip-path: inset(0 0 0 0); }
}
```

### Subtle parallax on hero

The hero image drifts slowly as the user scrolls; capped to a few pixels:

```css
.parallax-hero {
  transform: translateY(0);
  transition: transform 100ms linear;
}
```

```js
window.addEventListener('scroll', () => {
  const offset = Math.min(window.scrollY * 0.3, 100);
  document.querySelector('.parallax-hero').style.transform = `translateY(${offset}px)`;
});
```

Throttle to 16ms (one frame).

Anti-pattern: full-page parallax on every section. Disorienting and CLS-risky.

## Continuous / Ambient Motion

Subtle ongoing motion gives a page life. Use sparingly.

### Slow gradient shift

```css
.ambient-bg {
  background: linear-gradient(120deg, #color1, #color2, #color3);
  background-size: 200% 200%;
  animation: shift 30s ease-in-out infinite;
}

@keyframes shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
```

### Floating decoration

A small element drifts up/down 4-8px continuously.

```css
.floating {
  animation: float 4s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
```

### When to disable

Continuous motion drains battery. Disable when:

- The page is not in the active tab (`document.visibilitychange`).
- The user prefers reduced motion.
- The element is off-screen.

```js
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    entry.target.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused';
  });
});
```

## Motion Budget and Measurement

Motion is a budget like JS, CSS, and images. The budget is the main-thread work each animation costs and the total frames-per-second the page sustains. Measure, do not guess.

### DevTools Animations panel

Chrome DevTools has a Performance > Animations panel that captures every running animation, names them, and shows timing, easing, and which thread they run on. Open it during a page load or a route transition; anything that is not compositor-only (transform, opacity, filter) shows up in red. Use it as the first stop when an interaction feels sluggish.

The Performance panel itself remains the source of truth. Record an interaction, look for Long Animation Frames (LoAF) and tasks > 50ms, find the animation's stack frames. A 60fps motion has a 16.7ms frame budget; any frame past that drops below 60fps. Two consecutive long frames are perceptible.

### `will-change` hygiene

`will-change` tells the browser to promote an element to its own compositor layer ahead of an animation, eliminating the layer-creation pause when the animation starts. Misused, it inflates GPU memory and makes the page slower.

Rules:

- Declare `will-change` ONLY immediately before the animation starts (on hover-intent, on the pointer-down that begins a drag, on the keypress that opens a panel). Add via class or `style.willChange = '...'` at the trigger.
- Remove `will-change` as soon as the animation ends (on `animationend`, `transitionend`, or the WAAPI `Animation.finished` promise resolve). Leaving it on permanently consumes memory and can degrade other animations.
- Never apply `will-change: transform` globally to large element classes (e.g., every card). The browser allocates a separate layer for each one.
- Animate `transform` and `opacity` (composited) and you rarely need `will-change` at all. Animate anything that triggers layout and `will-change` does not save you; rewrite the animation.

### Profiling a 60fps drop

When motion feels janky on a slower device:

1. Throttle CPU to 4x or 6x in DevTools Performance settings to reproduce on a fast machine.
2. Record an interaction that includes the animation.
3. Look at the frame chart. Any red bars are long frames.
4. Open the long frame; find the task taking the most time (often layout, paint, or a script call inside a JS-driven animation).
5. Move to a composited property, or move JS work off the main thread, or shorten the animation.
6. Re-record to confirm the frame chart is green.

A target: every motion holds 60fps on the throttled profile. A page that holds 60fps on a 4x throttled CPU will hold it on the median real device.

## INP and Animation

INP is impacted by animations that block the main thread. Composited-only animations (transform, opacity) don't impact INP. Layout-triggering animations and JS-driven animations can.

If INP regresses after adding animation:

- Check if the animation triggers layout. Move to transform/opacity.
- Check if a JS animation is running on every frame. Use CSS animations or `web-animations-api` instead.
- Check if the animation runs during page load. Defer until after `load`.

## CLS and Animation

Animations that change element size cause layout shift. Avoid.

If you must animate size, use `transform: scale()` (compositor-only) and accept that it's a visual approximation.

For accordion/disclosure, pre-measure the content height and animate `max-height` to that exact value. Or use `interpolate-size: allow-keywords` (modern CSS) plus `transition: height` (now possible to animate to `auto`).

## Common Motion Mistakes

- Using `linear` for UI transitions.
- Animating `width`, `height`, `top`, `left`.
- 800ms+ durations on common UI.
- Animations that block input (modal opening can't be cancelled mid-animation).
- Different durations for opening and closing the same component.
- Decorative animation on every section.
- Parallax that causes CLS.
- Hover-only effects with no touch equivalent.
- `prefers-reduced-motion` ignored.
- Animating during page load on the LCP element.
- Continuous animation on a hero, draining battery.
- Spinner with no `aria-label`.
- Skeleton without `aria-busy`.

## Self-Healing for Motion

Before declaring work complete:

- [ ] All animations use `transform` and/or `opacity` (no layout-triggering)
- [ ] Durations 100-500ms with intentional choice per interaction
- [ ] Easing chosen per direction (ease-out for in, ease-in for out)
- [ ] Exit faster than entrance (60-70%)
- [ ] `prefers-reduced-motion` removes or shortens non-essential motion
- [ ] No animation blocks user input (modals are interruptible)
- [ ] Loading states have skeleton at 300ms, spinner before, progress for determinate
- [ ] Spinner / skeleton have accessible names / `aria-busy`
- [ ] Stagger capped at 8-10 items
- [ ] Continuous motion paused when off-screen and tab inactive
- [ ] No animation regresses LCP, INP, or CLS

## See Also

- [performance.md](performance.md) for animation cost
- [accessibility.md](accessibility.md) for reduced motion
- [ui-ux.md](ui-ux.md) for state transitions
