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
