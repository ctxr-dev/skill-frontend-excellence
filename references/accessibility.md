# Accessibility Mastery

WCAG 2.2 AA is the working bar. AAA where reasonable. Lighthouse + axe + manual keyboard + screen reader is the verification stack. Framework-agnostic.

## The Four POUR Principles (WCAG)

1. **Perceivable**: information must be presentable in ways users can perceive.
2. **Operable**: interface components must be operable.
3. **Understandable**: information and operation must be understandable.
4. **Robust**: content must be robust enough to be interpreted by current and future user agents, including assistive technologies.

Every rule below maps to one of these.

## Semantic HTML First

ARIA is the polyfill, semantics are the standard. The single biggest accessibility win is using the right element.

| Use this | Not this |
|----------|---------|
| `<button>` | `<div onclick>` |
| `<a href>` | `<span onclick>` (for navigation) |
| `<nav>` | `<div class="nav">` |
| `<main>` | `<div id="main">` |
| `<header>` / `<footer>` | `<div class="header">` |
| `<section>` with heading | bare `<div>` |
| `<article>` for self-contained content | `<div>` |
| `<aside>` for tangentially related | `<div class="sidebar">` |
| `<form>` with `<label>` | `<div>` with floating placeholder |
| `<input type="email">` | `<input type="text" pattern>` |
| `<details>`/`<summary>` | div + click handler |
| `<dialog>` (with HTMLDialogElement API) | div with role="dialog" + custom focus trap |
| `<table>` for tabular data | div grid |
| `<ul>`/`<ol>` for lists | div with line breaks |
| `<time datetime>` | `<span>` |
| `<address>` for contact info | `<div>` |

The native element gives you keyboard, focus, semantics, and screen reader support automatically.

## ARIA Rules (when semantics aren't enough)

### The Five ARIA Rules

1. If you can use a native element, use the native element.
2. Don't change native semantics unless necessary (`<button role="link">` is suspicious).
3. All interactive ARIA elements must be keyboard-accessible.
4. Don't use `role="presentation"` or `aria-hidden="true"` on a focusable element.
5. All interactive elements must have an accessible name.

### Common ARIA patterns and their accessible name source

| Pattern | Accessible name |
|---------|----------------|
| Button with text | The text content |
| Icon-only button | `aria-label="..."` |
| Link with text | The text content |
| Link with image only | `<img alt="...">` or `aria-label` on the link |
| Input | `<label for="id">` or `aria-labelledby="id"` or (last resort) `aria-label` |
| Disclosure | Use `aria-expanded="true"` or `aria-expanded="false"` on the trigger |
| Tab | `role="tab"`, `aria-selected`, `aria-controls` referencing the panel |
| Modal | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` referencing the title |
| Tooltip | `aria-describedby` on the trigger pointing to the tooltip |
| Live region | `aria-live="polite"` (or `assertive` for urgent), `role="status"` for non-interrupting |
| Alert | `role="alert"` (implies `aria-live="assertive"`) |
| Listbox | `role="listbox"`, `aria-activedescendant` for current option |
| Combobox | `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-autocomplete` |

### `aria-label` vs `aria-labelledby` vs `aria-describedby`

- `aria-label`: short string. Use only when no visible text exists.
- `aria-labelledby`: references existing on-page text by id. Preferred over `aria-label` because it stays in sync with visible UI.
- `aria-describedby`: supplemental description (helper text, error message). Announced after the label.

## Color and Contrast

### Targets (WCAG AA)

| Element | Minimum ratio |
|---------|--------------|
| Body text (< 18px regular or < 14px bold) | 4.5:1 |
| Large text (>= 18px regular or >= 14px bold) | 3:1 |
| UI components and graphical objects (icons that convey meaning, focus rings, form borders) | 3:1 |

WCAG AAA (preferred where reasonable):

| Element | Minimum ratio |
|---------|--------------|
| Body text | 7:1 |
| Large text | 4.5:1 |

### Verification

- Browser DevTools color picker shows the live ratio for the current foreground vs computed background.
- Test in light AND dark mode independently. Inverting a palette rarely preserves contrast.
- Test with `prefers-contrast: more` if your design system supports it.

### Common contrast traps

- `text-slate-400` on white background fails 4.5:1.
- `text-slate-400` on `bg-slate-950` passes; on `bg-slate-900` it's marginal.
- Placeholder text (`color: gray`) often fails. Treat placeholders as decorative; never put critical info there.
- Disabled state contrast does not need to meet 4.5:1, but should still be perceivable.
- Brand colors over photographic backgrounds need a scrim or darkening overlay.

### Color is never the only signal

Pair color with text, icon, or pattern. Examples:

- Required field: red asterisk + the word "required" in helper text.
- Error: red border + error icon + error message.
- Status: colored dot + status word.
- Chart series: color + pattern/dash + label.

## Keyboard

### Every interactive element must be:

1. **Reachable** by Tab in a logical order.
2. **Operable** by Enter, Space, or arrow keys per the WAI-ARIA Authoring Practices.
3. **Visible** when focused (focus ring with 3:1 contrast against the surface).

### Tab order

- Use natural document order. Avoid `tabindex` > 0 (it overrides natural order and creates surprising flows).
- `tabindex="0"` makes a non-focusable element focusable.
- `tabindex="-1"` makes an element programmatically focusable (e.g., for moving focus into a modal) but not in tab order.

### Keyboard shortcuts per pattern

| Pattern | Keys |
|---------|------|
| Button | Enter or Space |
| Link | Enter |
| Checkbox | Space |
| Radio group | Arrow keys move within group, Tab moves out |
| Tabs | Arrow keys move between tabs (if focus follows), Tab moves to panel |
| Combobox | Arrow keys, Enter to select, Esc to close |
| Menu / menubar | Arrow keys, Enter to activate, Esc to close |
| Modal | Esc to close, Tab loops within, focus restored on close |
| Slider | Arrow keys for fine, Page Up/Down for coarse, Home/End for min/max |
| Tree | Arrow keys, Enter/Space to activate, Right to expand, Left to collapse |

Implement what users expect; don't invent new patterns.

### Focus management

- On modal open: move focus to the modal (typically the close button or the first form field). Save the previously-focused element. On close, restore focus to it.
- On route change (SPA): move focus to the main heading or to a `<main tabindex="-1">` so screen readers announce the new page.
- After form submission with errors: move focus to the first invalid field (or to a summary at the top with anchor links to each error).
- After form submission success: move focus to the success message and announce it via `role="status"`.

### Focus visibility

- Never `outline: none` without a replacement.
- Use `:focus-visible` (not `:focus`) so mouse users don't see a ring when clicking, but keyboard users always do.
- Focus ring requirements: 2-4px, contrast 3:1 against both the surface and the resting state of the element.

## Screen Reader

### Test on at least one combination

- VoiceOver on macOS / iOS (Cmd+F5 to toggle).
- NVDA on Windows (free).
- TalkBack on Android.
- JAWS on Windows (paid; only test if your audience needs it).

### What to verify

1. **Page structure announced correctly.** Headings, landmarks (`main`, `nav`, `aside`, `footer`), section labels.
2. **Reading order matches visual order.** Read the page top-to-bottom with the screen reader; the order should match what you see.
3. **Interactive controls have names and roles announced.** "Submit, button" not "Submit, clickable element".
4. **State changes are announced.** Adding an item to a cart should announce the new state (live region or focus move).
5. **Errors are announced** via `role="alert"` or `aria-live="assertive"` for blocking errors, `aria-live="polite"` for advisories.

### `aria-live` regions

- `aria-live="polite"` for non-blocking updates (toast, sync status, autosave). Announced when the SR finishes its current utterance.
- `aria-live="assertive"` for blocking errors only. Interrupts the SR.
- `role="status"` is `aria-live="polite"` + `aria-atomic="true"`.
- `role="alert"` is `aria-live="assertive"` + `aria-atomic="true"`.
- The element must be present in the DOM at page load for SRs to monitor it. Inserting it later sometimes fails.

## Heading Hierarchy

- One `<h1>` per page (the page's primary intent).
- Sequential descent: H1 -> H2 -> H3. Never skip a level.
- Headings describe sections; not used for typography.
- Section landmarks (`<section>`) should be labeled by their heading: `<section aria-labelledby="hero-title"><h2 id="hero-title">...</h2></section>`.

## Forms

### Every input has a programmatic label

```html
<!-- Best -->
<label for="email">Email</label>
<input id="email" type="email" autocomplete="email" required />

<!-- Acceptable when wrapping is impractical -->
<label>Email <input type="email" /></label>

<!-- Last resort -->
<input type="email" aria-label="Email" />
```

`placeholder` is not a label. Placeholders disappear when the user types and have low contrast by default.

### Input attributes you almost always want

- `type` matching the data: `email`, `tel`, `url`, `number`, `search`. This affects mobile keyboards and validation.
- `autocomplete` per the WHATWG list (`given-name`, `email`, `street-address`, `cc-number`, `one-time-code`, etc.). This is critical for mobile UX and password managers.
- `inputmode` to override the keyboard without changing semantics: `numeric` for codes, `decimal` for prices.
- `required`, `min`, `max`, `pattern` for native validation.
- `aria-invalid="true"` when invalid; `aria-describedby` pointing to the error message.

### Error handling

- Show errors inline, near the field.
- Use `role="alert"` or `aria-live="polite"` so SRs announce them.
- The error message must say cause AND fix. "Email is required" is OK; "Enter your work email" is better.
- For multi-error submission, show a summary at the top with anchor links to each invalid field.
- After submit error, move focus to the first invalid field.

### See [forms.md](forms.md) for the deep dive.

## Images and Media

### Alt text

- **Decorative image**: `alt=""` (empty string is required; missing alt is worse).
- **Functional image** (icon button): describe the action, not the image. `<button><img alt="Close" src="x.svg" /></button>`.
- **Informational image**: describe what conveys information to the user. Be concise; prefer 8-12 words.
- **Complex image** (chart, diagram): short alt + long description nearby (`figure` + `figcaption` or `aria-describedby` to a hidden description).
- **Logo image**: `alt="Brand"` not `alt="Brand logo"` (the word "logo" is redundant).
- **CSS background images**: should be decorative only. Anything informational should be an `<img>`.

### Video

- Provide captions (`<track kind="captions">`) for any spoken content.
- Provide a transcript for long-form video.
- Provide audio description for video where visual information is critical.
- Don't autoplay with sound.
- Don't autoplay-loop a hero video without a pause control.

### Audio

- Provide a transcript.
- Don't autoplay.

## Motion and Reduced Motion

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

This is the floor. Better practice: actually remove non-essential animation rather than just shortening it.

For essential motion (loading spinner, video playback), keep it but consider:

- Whether a static skeleton is sufficient.
- Whether the user can pause.

## Dynamic Type / Zoom

- Use relative units (`rem`, `em`, `%`) for font size, line height, padding. Avoid `px` for type.
- Test at 200% browser zoom: layout should remain usable, no horizontal scroll, no clipped content.
- Test with `font-size: 24px` set on `<html>`: components should scale.
- Don't disable user zoom (`user-scalable=no` and `maximum-scale=1` are forbidden).

## Touch and Hit Targets

- Minimum 44x44 CSS pixels (iOS HIG) or 48x48 dp (Material Design).
- Minimum 8 px spacing between adjacent targets.
- For small icons, expand the hit area with padding or `::before` extension while keeping the visual size small.

Apply the 44px (or 48px) minimum to STANDALONE controls: buttons, toggles, menu triggers, icon buttons, form controls, and call-to-action links. Inline text links are different. Under WCAG 2.5.8 (target size, AA, 24px), links inside a sentence, breadcrumb trails, and footer text-link lists are exempt from the larger target size because they flow with text. Do not inflate them to 44px tall: a 44px breadcrumb row or 44px in-prose link reads as broken. Give inline links a small comfortable hit area (a little vertical padding) and reserve the strict 44px for standalone controls.

## Language

- `<html lang="en">` (or your locale, e.g., `lang="en-US"`, `lang="ja"`).
- `lang="..."` on inline elements when language changes mid-content: `<span lang="fr">déjà vu</span>`.
- `dir="rtl"` on `<html>` for right-to-left languages, with logical properties (`margin-inline-start`) so layout adapts.

## Lang, Main, and Skip Link

Three structural basics that every route must satisfy. They are cheap to verify and expensive to discover broken in production. The multi-page audit Phase 14 ([audit-workflow.md](audit-workflow.md)) checks all three.

- [ ] `<html lang>` is present and valid (e.g., `lang="en"`, `lang="en-US"`, `lang="ja"`).
- [ ] Exactly one primary `<main>` per route. Nested `<main>` elements break landmark navigation.
- [ ] A skip link is the first focusable element on the page, hidden until focused, jumps to `<main>`, and does not create viewport overflow while hidden.

The skip-link "no overflow while hidden" requirement is the most-skipped of the three. The `position: absolute; left: -9999px` pattern works only when paired with a focus state that brings the link back on-screen without growing the page. Use the standard `.sr-only-focusable` pattern below.

Progressive enhancement covers the primary nav too: a JS-driven mobile menu must leave its links reachable without JavaScript (a `<noscript>` fallback nav or static links that enhance). See [responsive.md](responsive.md), "The mobile nav must survive without JavaScript".

## Skip Links

A skip link is the first focusable element on the page, hidden until focused, that jumps to `<main>`.

```html
<a href="#main" class="sr-only-focusable">Skip to main content</a>
...
<main id="main" tabindex="-1">...</main>
```

```css
.sr-only-focusable {
  position: absolute;
  left: -9999px;
}
.sr-only-focusable:focus {
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 1000;
  padding: 0.5rem 1rem;
  background: white;
  color: black;
  border: 2px solid currentColor;
}
```

## Modal and Dialog

### Native `<dialog>` (preferred)

```html
<dialog id="confirm">
  <h2>Confirm action</h2>
  <p>Are you sure?</p>
  <form method="dialog">
    <button value="cancel">Cancel</button>
    <button value="confirm">Confirm</button>
  </form>
</dialog>
<button onclick="document.getElementById('confirm').showModal()">Open</button>
```

`<dialog>` with `showModal()` provides:

- Auto focus management (focus moves into the dialog).
- Esc to close.
- Backdrop element you can style (`::backdrop`).
- Inert background (modal pattern).

### Custom modal

If you must build one (rich content, framework-managed), implement:

- `role="dialog"` (or `alertdialog` for blocking errors), `aria-modal="true"`.
- `aria-labelledby` pointing to the title.
- Focus trap: Tab and Shift+Tab loop within the modal.
- Esc closes.
- On open, focus moves to the modal (close button or first field).
- On close, focus returns to the trigger.
- Background is `inert` (or has `aria-hidden="true"` and `tabindex="-1"` plus `pointer-events: none`).

## Common Accessibility Mistakes

- `<div onClick>` instead of `<button>`. Loses keyboard, focus, semantics.
- `<a href="#">` for buttons. Use `<button>`.
- `placeholder` as label. Disappears when typing.
- `aria-label` on a button that already has visible text. Overrides the visible text.
- `aria-hidden="true"` on a focusable element. Creates a "ghost" focus.
- `outline: none` without a replacement. Removes keyboard focus indication.
- Custom dropdown without arrow-key support.
- Modal without focus management.
- Toast that announces every minor event with `aria-live="assertive"`. Use `polite`.
- Loading spinner without an accessible name (`aria-label="Loading"` on the spinner element).
- Drag-and-drop without a keyboard alternative.

## Self-Healing for Accessibility

After any change, verify:

- [ ] Lighthouse Accessibility = 100
- [ ] axe DevTools shows zero violations
- [ ] Tab through the full page; everything reachable, no traps
- [ ] Esc closes any open modal/menu
- [ ] Screen reader pass on the primary user flow (VO or NVDA)
- [ ] Light AND dark mode contrast checked separately
- [ ] 200% browser zoom: layout intact, no horizontal scroll
- [ ] `prefers-reduced-motion` respected
- [ ] Forms: every input labeled, errors announced, focus moves to first invalid field on submit
- [ ] Modals: focus trapped, Esc closes, focus restored on close
- [ ] Images: alt text present, decorative images have `alt=""`
- [ ] Headings: one H1, sequential, no skipped levels
- [ ] Color is never the only signal

## See Also

- [forms.md](forms.md) for form-specific accessibility
- [motion.md](motion.md) for reduced-motion implementation
- [ui-ux.md](ui-ux.md) for state and interaction patterns
