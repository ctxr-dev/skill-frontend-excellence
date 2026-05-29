---
title: UI/UX Principles
purpose: Framework-agnostic interaction patterns for modals, popovers, tooltips, navigation, hit targets, state coverage, undo, and notification timing. The functional companion to design.md.
load-when:
  task-keywords: [UI, UX, interaction, modal, popover, dialog, drawer, sheet, menu, tooltip, snackbar, toast, popover API, inert, touch target, hit target, navigation, loading state, error state, empty state]
  symptoms: [popover not dismissing, scroll lock side shift, focus trap leak, focus not visible, inert leak, rubber-band scroll]
prereq: SKILL.md
related: [design.md, accessibility.md, forms.md, motion.md]
size: ~620 lines
---

# UI/UX Principles

Framework-agnostic patterns for interfaces that feel professional, predictable, and considered. Distilled from Apple Human Interface Guidelines, Material Design, NN/g research, and accumulated production practice.

## The Hierarchy of UX Concerns

When a UI is "off" but you can't say why, walk this list top-down. The first thing that fails is what's wrong.

1. **Can the user perceive it?** (Contrast, size, position, language.)
2. **Can the user understand it?** (Vocabulary, hierarchy, affordance.)
3. **Can the user operate it?** (Touch target, keyboard, focus, gesture, feedback.)
4. **Does the user trust it?** (Consistency, predictability, recovery, transparency.)
5. **Does it feel good?** (Polish, motion, sound, haptics, density.)

Steps 1-3 are correctness. Step 4 is reliability. Step 5 is craft.

## State Coverage (the most-skipped quality bar)

Every screen and component must have intentional designs for all of these states:

| State | When | What to show |
|-------|------|--------------|
| Empty | No data yet | Specific, helpful message + primary action to fix it. Never a blank space. |
| Loading | Async fetch in progress | Skeleton screen for >300ms loads, spinner for shorter. Match the eventual layout. |
| Success | Action completed | Brief confirmation (toast, inline check, color flash). Move on quickly. |
| Error | Action failed | Cause + how to fix + recovery action. Never just "Something went wrong". |
| Partial | Some data, some loading | Render what you have, skeleton the rest. |
| Disabled | Action not available | Visually distinct (40-50% opacity), cursor not-allowed, programmatically disabled, optional explanation. |
| Read-only | Visible but not editable | Visually distinct from both editable AND disabled. |
| Stale | Data is older than fresh | Indicate freshness (timestamp, "updated 5m ago"), offer refresh. |
| Offline | No network | Disable network-dependent actions, show offline indicator, queue mutations if possible. |
| Unauthorized | User lacks permission | Explain why, link to upgrade or request access. Never silently disable. |
| Limit reached | Quota exhausted | Explain the limit, show progress, link to upgrade. |
| Initial / first-run | New user | Reduced surface, onboarding hints, sample data. |
| Successful state with no further action | Done | Brief celebration, clear next step. |

A new feature that ships with only the "happy path" state is half-built.

### Cross-page consistency

State coverage is per-component, but components live on multiple pages. A component is not done when its states work on one page; it is done when the same states behave the same way on every page that hosts it. For shared widgets (cards, CTAs, headers, forms, modals), every state on every route must match the canonical contract.

When a state behaves differently on two routes, the cause is almost always the same: page-local CSS, duplicated markup, or a near-duplicate component. Fix the contract, not the page. Extraction discipline, the canonical contract, and drift detection live in [components.md](components.md). The cross-page audit procedure lives in [audit-workflow.md](audit-workflow.md).

### Mobile drawer scroll lock

A mobile drawer (slide-out nav, bottom sheet, full-screen menu) must lock body scroll while open and restore the prior scroll position on close. Without lock, the underlying page scrolls behind the drawer and the user loses their place. Without restore, the user lands at the top after dismissing.

The lock is body-level: setting `overflow: hidden` on the document root is the standard pattern. The restore is captured at open time and reapplied via `window.scrollTo` on close. Drawer scroll lock failure is one of the standard checks in the geometry sweep; see [defects.md](defects.md).

## Touch and Pointer Interaction

### Hit targets

| Platform | Minimum |
|----------|--------|
| iOS / Web on touch | 44x44 CSS pixels (matches WCAG 2.5.5 Target Size Enhanced, Level AAA, from WCAG 2.1) |
| Android | 48x48 dp |
| Web on pointer | 24x24 CSS pixels minimum (WCAG 2.5.8 Target Size Minimum, Level AA, added in WCAG 2.2), 44x44 strongly recommended |

For icon-only buttons that look smaller, expand the hit area:

```css
.icon-btn {
  width: 24px;
  height: 24px;
  padding: 10px; /* total 44x44 hit area */
  background-clip: content-box;
}
```

Apply the 44px (or 48px) minimum to STANDALONE controls: buttons, toggles, menu triggers, icon buttons, form controls, and call-to-action links. Inline text links are different. Under WCAG 2.5.8 (target size, AA, 24px), links inside a sentence, breadcrumb trails, and footer text-link lists are exempt from the larger target size because they flow with text. Do not inflate them to 44px tall: a 44px breadcrumb row or 44px in-prose link reads as broken. Give inline links a small comfortable hit area (a little vertical padding) and reserve the strict 44px for standalone controls.

### Spacing between targets

Minimum 8 px gap between adjacent interactive targets. This prevents mistaps on touch and gives focus rings room to breathe.

### Hover, press, focus, active

Every interactive element has four observable states:

| State | When | Visual change |
|-------|------|--------------|
| Resting | No interaction | The base style |
| Hover | Pointer over (not touch) | Subtle elevation, color shift, or underline |
| Focus | Keyboard or programmatic focus | Visible ring, 2-4px, contrast 3:1 against surface |
| Active / pressed | Mouse down or touch | Slight inset/scale (0.97 transform), darker background, depressed shadow |
| Disabled | Action unavailable | 40-50% opacity, cursor not-allowed, no hover/active response |

Touch devices skip hover. Don't put critical info in a hover-only tooltip.

### Cursor

- `cursor: pointer` on every clickable element. Anti-pattern: `<button>` with default cursor.
- `cursor: text` on text inputs. Native, but don't override.
- `cursor: not-allowed` on disabled.
- `cursor: grab` / `grabbing` on draggables.
- `cursor: zoom-in` / `zoom-out` for image zoom.
- `cursor: help` for elements with `title` or tooltip.

### Press feedback timing

Visual response within 80-150ms of press. Below 80ms feels disconnected (too instant). Above 200ms feels laggy.

- On mobile, suppress the default grey tap-highlight flash once, globally: `:where(a, button, summary, [role="button"], [tabindex]) { -webkit-tap-highlight-color: transparent; }`. The `:focus-visible` ring (which you already provide) is the intended affordance; the native flash just looks unfinished. Do this only when a proper focus style exists.

### Click vs tap vs hover

- **Click/tap**: primary actions only.
- **Hover**: never the only path to an action. Hover-reveal is fine for affordance but the action must also be reachable on touch (long-press, kebab menu, or always-visible).
- **Long-press**: secondary action on touch. Always provide a non-gesture alternative.
- **Right-click**: context menu only. Always provide an equivalent button or kebab menu.

### Pointer and gesture conflicts on scroll containers

A horizontal carousel inside a vertically scrolling page, a pinch-zoom canvas, or a swipeable card stack all sit on top of a scrolling document. Without explicit gesture allocation the browser will fight your handlers (scroll-jacking, page-pull-to-refresh, accidental navigation swipe).

- Declare `touch-action` per gesture intent. `touch-action: pan-y` on a horizontal swiper lets the page handle vertical scroll while your code owns horizontal. `touch-action: none` disables browser gestures entirely (use only on canvas / pan-zoom surfaces).
- `overscroll-behavior: contain` on scrolling regions stops scroll chaining into the parent (the classic "scrolled the modal, then the body scrolled too" bug).
- `overscroll-behavior: none` on `<html>` or `<body>` suppresses pull-to-refresh and the iOS rubber-band bounce, useful for app-shell layouts. Do not apply globally on content sites; users rely on the bounce as feedback.
- Test: scroll a horizontal reel near the top of a long page on mobile. Pull-to-refresh must not fire, vertical scroll must continue past the reel, and the reel must not steal vertical drag.

## Visual Hierarchy

Hierarchy is what tells the user where to look and in what order. Build it from these tools, in this priority:

1. **Size**: bigger = more important.
2. **Weight**: bolder = more important.
3. **Contrast**: higher contrast against the background = more important.
4. **Position**: top and left (in LTR) read first.
5. **Color**: warm and saturated draws the eye; muted recedes.
6. **Whitespace**: isolation makes things feel important.
7. **Motion**: anything that moves draws attention.

Anti-patterns:

- Five things shouting at once. The eye doesn't know where to land.
- Equal weight on everything. Nothing is important.
- Color alone for hierarchy. Fails for colorblind users and in monochrome contexts.
- Borders everywhere. Borders compete with content.

### The "primary action" rule

Each screen has exactly one primary CTA. Secondary actions are visually subordinate (outline, ghost, text-only). Tertiary actions are even quieter (link or icon only). Destructive actions are visually separated AND use a danger color but are not primary unless the screen is built for that destructive purpose.

### F-pattern and Z-pattern

For sparse, hero-driven layouts: Z-pattern scan (top-left -> top-right -> diagonal -> bottom-right). Common placement: brand top-left, primary nav top-right, primary CTA bottom-right of the hero section.

For text-heavy layouts: F-pattern (left edge dominant scan). Important info on the leading edge. Sub-headings every 200-400px to provide scan anchors.

## Density

Density is the ratio of information to space.

- **Low density**: hero-driven, single-focus surfaces. Generous whitespace, large type, one focus per section.
- **Medium density**: balanced application screens, mid-length content. Fits the majority of routine UI.
- **High density**: data tables, code editors, professional tools. Tight spacing, smaller type (still >= 14px), maximum information per pixel.

Match density to the user's task. A real-time trading terminal is high-density; a single-focus reading view is not. Mixing densities within the same surface feels wrong.

Rules:

- Within one density mode, be consistent.
- Provide a "compact / cozy / comfortable" toggle for data-heavy apps.
- Never sacrifice contrast or hit target for density.

## Layout and Spacing

### Spacing scale

Use a multiplicative scale, not arbitrary values. Common scales:

- **4-pt scale**: 0, 4, 8, 12, 16, 24, 32, 48, 64, 96 (Material Design).
- **8-pt scale**: 0, 8, 16, 24, 32, 48, 64 (a coarser variant).

Tailwind's default uses 4-pt. shadcn/ui uses 4-pt. Apple HIG uses 8-pt with halves at 4. Pick one and never deviate.

Anti-pattern: padding values like 7, 13, 17, 22. They feel random and break rhythm.

### Component spacing tiers

| Tier | Value | Use |
|------|-------|-----|
| Inline | 4-8 | Inside a tag/badge/icon-text pair |
| Tight | 8-12 | Inside a button, input, or card |
| Comfortable | 16 | Between siblings inside a card |
| Section | 24-32 | Between cards or rows in a list |
| Block | 48-64 | Between major sections of a page |
| Page | 96-128 | Around the page edge on large viewports |

### Whitespace as a tool

Whitespace groups related things and separates unrelated things. Use it intentionally, not residually.

The Gestalt law of proximity: things close together read as related. Items far apart read as separate. If two pieces of UI feel related but look unrelated, reduce the space. If two pieces feel unrelated but look unified, increase the space.

## Typography in UI

(See [design.md](design.md) for the type aesthetic. This section is the functional rules.)

### Sizes

| Use | Mobile | Desktop |
|-----|--------|---------|
| Body | 16px | 16px |
| Body small / caption | 14px | 14px |
| Body large / lead | 18-20px | 18-20px |
| H6 | 16px | 16px |
| H5 | 18px | 18-20px |
| H4 | 20-22px | 22-24px |
| H3 | 22-26px | 24-30px |
| H2 | 28-32px | 32-40px |
| H1 | 32-40px | 40-64px |
| Display (hero) | 40-56px | 56-96px |

Body text below 16px on mobile triggers iOS auto-zoom on focus (annoying). Avoid.

### Line height

- Body: 1.5-1.75
- Headings: 1.1-1.3 (tighter)
- Buttons: 1 (single line) or 1.2

### Line length

- Optimal: 60-75 characters per line.
- Mobile: 35-60.
- Desktop: cap at 75.
- Use `max-width: 65ch` (or similar) on long-form content.

### Letter spacing

- Body: default.
- All-caps eyebrow text: +0.05em to +0.1em.
- Display headings: -0.01em to -0.02em (slight tighten).

## Color in UI

(See [design.md](design.md) for palette construction. This section is the semantic system.)

### Semantic tokens

Never use raw hex in components. Use semantic tokens:

| Token | Purpose |
|-------|--------|
| `--color-background` | Page background |
| `--color-surface` | Card / elevated surface |
| `--color-surface-muted` | Quieter surface (inset, secondary) |
| `--color-foreground` | Primary text |
| `--color-foreground-muted` | Secondary text |
| `--color-foreground-subtle` | Tertiary text, hints |
| `--color-border` | Resting border |
| `--color-border-strong` | Border on focus or emphasis |
| `--color-primary` | Brand action |
| `--color-primary-foreground` | Text on primary |
| `--color-success` | Positive state |
| `--color-warning` | Caution |
| `--color-danger` | Destructive / error |
| `--color-info` | Neutral information |
| `--color-focus-ring` | Focus indicator |

Map these tokens for both light and dark mode. Components reference tokens, never raw values.

### Dark mode

- Don't invert. Design dark mode independently.
- Use desaturated, lighter tonal variants of the brand color.
- Surfaces in dark mode are typically `#0c0c10` or `#111` (not pure black). Pure black on OLED creates harsh contrast.
- Borders in dark mode are typically lighter than the surface (e.g., `rgba(255,255,255,0.08-0.12)`).
- Test contrast in dark mode separately. The 4.5:1 ratios are different.

## Iconography

### Source

- Use one icon set per product. Don't mix Heroicons + Lucide + Feather.
- SVG only. Never emoji as structural icons. Never PNG.
- Variable icons (Heroicons mini/outline/solid) are fine across hierarchy levels but consistent within a level.

### Sizing

- 16px (xs): inline with body text or in tight UI.
- 20px (sm): default in buttons and inputs.
- 24px (md): nav items, section headers.
- 32px+ (lg): hero/feature illustrations.

### Stroke width

- Outline icons: 1.5px or 2px stroke. Pick one and stay.
- Filled icons: no stroke.
- Don't mix outline and filled in the same hierarchy level.

### Color

- Match the surrounding text or use a token (`--color-foreground-muted`).
- For status (success, warning, danger), use semantic color tokens.
- Always pair status icons with text or a label. Color alone is not enough.

### Alignment

- Icons in buttons align to the text baseline.
- Icons in inputs align to the input's vertical center.
- Icons in lists align to the same x as adjacent rows.

## Buttons

### Hierarchy

| Level | Visual | Use |
|-------|--------|-----|
| Primary | Filled, brand color | One per screen. The primary action. |
| Secondary | Outlined or quiet filled | Alternative paths. |
| Tertiary | Text-only or ghost | Low-stakes actions. |
| Destructive primary | Filled, danger color | Only on screens explicitly built for the destructive action (delete confirmation). |
| Destructive secondary | Outlined, danger color | Listed alongside other actions. |
| Icon-only | Icon, no text | Compact UI. Always include `aria-label`. |

### Anatomy

- Minimum 44x44 touch area.
- Padding: 12-16 horizontal, 8-12 vertical (small); 16-24 horizontal, 10-12 vertical (medium); 24-32 horizontal, 12-16 vertical (large).
- Border radius: tied to your style language. Pick a scale and use it.
- Icon spacing from text: 8 px.

### States

- Resting, hover, focus, active, disabled, loading.
- Loading: replace icon with a spinner OR add a spinner before/after text. Disable the button. Maintain width to prevent layout shift.
- Disabled: 40-50% opacity, cursor not-allowed, programmatically disabled.

## Forms (functional principles)

(See [forms.md](forms.md) for the deep dive.)

- Visible label for every input. Placeholder is not a label.
- Error inline, near the field, with cause + fix.
- Validate on blur, not on every keystroke.
- After submit error, focus the first invalid field.
- Mark required fields (asterisk + `aria-required="true"`).
- Use the right `type` and `autocomplete` attributes.
- Group related fields with `<fieldset>` + `<legend>`.
- Long forms autosave drafts.
- Multi-step forms show progress.

## Modals and Overlays

### Modal

- Reserved for blocking decisions (confirmation, login, critical data entry).
- Always escapable: Esc, backdrop click, close button.
- Focus trapped inside; restored on close.
- Background `inert` or `aria-hidden`.
- Backdrop scrim 40-60% black for legibility.
- Animate from trigger when possible (scale + fade).
- Scroll-lock without a sideways jump: when you set `overflow: hidden` on the body to lock background scroll, the vertical scrollbar disappears and the page widens by its width, shifting fixed and centered content sideways. Reserve that width: `const gap = window.innerWidth - document.documentElement.clientWidth; document.body.style.paddingRight = gap + "px"`. Restore `overflow` and `paddingRight` on close. The gap is 0 on overlay-scrollbar systems, so this is safe everywhere.

#### `<dialog>` and `inert` done right

The HTML `<dialog>` element is the platform's answer to "build a modal correctly". It gives you focus management, Escape-to-close, the top layer (so z-index does not matter), and a real backdrop pseudo-element. The two modes are not interchangeable.

- `dialog.showModal()` is the modal mode. The browser makes the rest of the document inert automatically (no manual `inert` needed on background), traps focus, intercepts Escape, and renders the backdrop. Use this for confirmation, login, critical data entry.
- `dialog.show()` (or `<dialog open>`) is non-modal. No backdrop, no focus trap, the rest of the page stays interactive. Use this for a non-blocking inspector, a transient picker, an in-page side panel. Do not pair it with `inert` on the background; that would be a modal in everything but name.
- `inert` belongs on the single ancestor that contains everything you want to silence (typically the root layout container, with `<dialog>` outside it). Do not sprinkle `inert` on individual elements one by one; you will miss focusable nodes and create the "inert leak" symptom (a stray button still tabbable behind a modal).
- Programmatic `dialog.open = true` is a trap: it skips all the modal behavior (no backdrop, no focus, no Escape). Always call `showModal()` for modal intent.
- Test: open the dialog, Tab through every control, confirm focus never escapes; press Escape, confirm the dialog closes and focus returns to the trigger.

### Sheet / drawer

- Use for non-blocking secondary content (filters, details, settings).
- Slide from edge (left/right for navigation, bottom for mobile contextual).
- Same focus and escape rules as modal.
- Confirm before dismissing if there are unsaved changes.

### Popover / tooltip

- Tooltip: hover-reveal of supplementary info. Plain text. No interactive content.
- Popover: click-reveal of richer content. Can contain interactive elements.
- Both must be keyboard-accessible and dismissible (Esc, click outside).

Wire BOTH dismissal paths on every menu, popover, and disclosure: Escape, and a pointer outside the element. Use `pointerdown` (not `click`) for the outside-dismiss listener: it fires before focus moves and before a `click` that might re-toggle the trigger, and it is more reliable on touch. Add the listener only while the overlay is open and remove it on close. Escape returns focus to the trigger.

#### Native HTML Popover API

The `popover` attribute (Baseline 2024, broad support in Chrome, Safari, Firefox) replaces almost every hand-rolled focus-trap + click-outside + Escape combo. It is the default choice for new popovers, menus, and disclosures.

```html
<button popovertarget="filters">Filters</button>
<div id="filters" popover>
  <p>Filter content here.</p>
</div>
```

What you get for free:

- Top-layer rendering, so the popover sits above every stacking context. No `z-index` arms race.
- Light-dismiss: a click outside the popover, or pressing Escape, closes it. The browser handles both.
- Focus return: when the popover closes, focus returns to the invoker.
- `popover="manual"` for popovers you want to control yourself (still in the top layer, no light-dismiss).

Use the native API first. Reach for a JS focus-trap library only when you need a behaviour the platform does not provide (e.g., a non-closing tour step, or a popover anchored across a scrolling iframe boundary).

#### CSS Anchor Positioning (progressive enhancement)

CSS Anchor Positioning lets the popover position itself relative to its trigger without JavaScript. It is the upgrade path; today's support floor is Chrome 125+, with Safari and Firefox not yet shipping.

```css
.trigger { anchor-name: --filters-anchor; }

#filters {
  position-anchor: --filters-anchor;
  top: anchor(bottom);
  left: anchor(start);
  position-try-fallbacks: flip-block, flip-inline;
}
```

Progressive-enhancement framing: the popover must work without anchor positioning. Ship a JS portal + Floating UI (or equivalent positioning library) as the fallback, gate the CSS path on `@supports (anchor-name: --x)`, and treat anchor positioning as a free win on browsers that support it. Do not ship anchor-only positioning until the support floor includes Safari and Firefox stable.

#### Tooltip dismissal and `aria-describedby` timing

WCAG 1.4.13 (Content on Hover or Focus) requires three properties from every tooltip:

- **Hoverable.** The user can move the pointer onto the tooltip itself without it disappearing. Required for users with motor difficulties and for users who need to read longer tooltips at low vision.
- **Dismissible.** Escape (or a similarly easy gesture) closes the tooltip without moving pointer focus. Required so a tooltip never permanently obscures content under it.
- **Persistent.** The tooltip stays open while the trigger remains focused or hovered. Do not auto-dismiss on a timer.

`aria-describedby` on the trigger should point at the tooltip's `id` only while the tooltip is visible to assistive tech. Setting `aria-describedby` permanently on a trigger whose tooltip element is `display: none` results in screen readers either announcing nothing or stuttering through stale content. Add and remove the attribute as the tooltip opens and closes, or use the native Popover API and let the browser handle the relationship.

### Toast / snackbar

- Brief notification of system events.
- Auto-dismiss in 3-5s for non-critical; persist for critical with explicit dismiss.
- Don't steal focus. Use `aria-live="polite"` (or `assertive` only for blocking errors).
- Maximum one or two on screen at a time. Stack newer below older or replace.

## Navigation

### Patterns

| Pattern | Use |
|---------|-----|
| Top app bar | Primary global navigation (web/desktop) |
| Bottom tab bar | Top-level navigation on mobile (max 5 items) |
| Side drawer / sidebar | Secondary nav, deep hierarchy, large screens |
| Hamburger menu | Mobile when bottom nav doesn't fit; not for primary on desktop |
| Breadcrumbs | Hierarchy 3+ levels deep |
| Tabs | Switching between related views of the same context |
| Segmented control | Two to four mutually exclusive options |
| Stepper / wizard | Multi-step linear flows |

### Rules

- Show the user where they are. Active tab/route highlighted.
- Predictable back: browser back, swipe-back (iOS), system back (Android) all do the same thing.
- Preserve scroll and state on back navigation.
- Deep linking: every screen has a URL. Sharing a link works.
- Don't mix navigation patterns at the same hierarchy level (don't have tabs + sidebar + bottom nav all primary).
- Persistent: core nav reachable from deep pages.
- Adaptive: large screens prefer sidebar; small screens use bottom/top.
- Destructive actions (delete account, sign out) visually separated from regular nav.

## Loading and Async

### Show feedback within 100ms

Any user action that triggers async work needs feedback within 100ms or the user assumes nothing happened. Visual: button state change, immediate spinner, optimistic UI.

### Skeleton screens vs spinners

| Duration | Pattern |
|----------|---------|
| < 300ms | Nothing. The result will appear. |
| 300ms - 1s | Spinner or progress indicator. |
| 1s+ | Skeleton screen matching the eventual layout. |
| 5s+ | Progress indicator (percent or step count) + estimated remaining. |
| 10s+ | Allow user to leave or background the operation. |

### Optimistic UI

For high-confidence operations (like a heart, save a draft), update the UI immediately and reconcile on response. Roll back on error with a clear message.

### Rate limiting and debouncing

- Search input: debounce 200-300ms.
- Auto-save: debounce 500-1000ms.
- Window resize: throttle 100-200ms.
- Scroll: throttle 16ms (one frame) for animation, longer for analytics.

## Empty States

The empty state is content. Treat it as a designed surface.

- **Specific message.** "No items yet" beats "No data".
- **Why it's empty.** State the condition that fills it: "Items appear here once you create one."
- **Primary action.** Offer the action that resolves the empty state, e.g., "Create item".
- **Optional illustration.** Match the brand. Don't use a generic stock illustration.

Anti-patterns:

- Blank space.
- "No results found" with no follow-up.
- A hopeful illustration with no action.

## Error Recovery

- Cause AND fix, in plain language. "Email address is required" beats "Validation error". "Couldn't connect to server, check your network and try again" beats "Network error".
- Provide the recovery action (retry button, edit field, contact support link).
- Don't blame the user. "We couldn't save your draft" not "You didn't save".
- Preserve user input on error. Never make them retype.
- For 404 / 500: brand-consistent design, search box if applicable, link home, link to support, optionally a delightful detail (don't overdo).

### Undo and redo beyond the toast

A toast with an "Undo" button is the minimum bar for destructive actions. For surfaces where the user composes (editors, canvas tools, multi-step forms, data tables with inline edits), a real undo / redo system is part of the contract.

- **Command pattern.** Every state change is a Command object with `do()` and `undo()` methods. The handler that mutates state always goes through a command, never direct mutation. This is the only design that scales past a couple of toggles.
- **History stack.** Push executed commands onto a stack; pop and call `undo()` to reverse. Keep a forward stack of undone commands for redo. Clear the redo stack on any new command (the standard editor invariant).
- **Global keyboard hook.** Cmd+Z (Ctrl+Z on Windows / Linux) for undo, Cmd+Shift+Z (or Ctrl+Y) for redo, listening at the document level. Skip when focus is inside a native `<input>` or `<textarea>` so the browser's built-in undo continues to handle text editing.
- **ARIA announcement.** Use a polite live region to announce "Undid: delete row" so screen reader users get the same feedback sighted users get from the toast.
- **Persistence boundary.** Decide whether undo crosses save (most editors say no: a save is the commit point and the history clears). State the boundary in the UI.
- **Bound the history.** Cap at 50 to 200 commands depending on memory cost. Drop the oldest when full.

## Notifications and Badges

- Use sparingly. Notification fatigue is real.
- Numeric badges for unread/pending counts. Cap at 99+ for sanity.
- Dot badges for "something new" without count.
- Clear notifications when the user has acknowledged them.
- Group similar notifications (5 likes from 5 people = "5 people liked your post").
- Provide a notification preferences page.

### Notification permission timing

The native push permission prompt is a one-shot resource. A "Deny" verdict on first load is usually irreversible without the user digging into browser settings, and most users never do. Treat the prompt as something you spend, not something you ask.

- **Never on load.** A permission prompt within the first 5 seconds of arriving is the canonical dark pattern. Browsers (Safari, Firefox) now block prompts that fire without a user gesture.
- **After value demonstration.** Ask only after the user has taken an action that implies they want updates: subscribed to a channel, started a chat, opted into alerts, finished onboarding a long-running job. The user must see why notifications would help before you ask.
- **In-app preview before native prompt.** Show an in-app dialog explaining the value ("Get notified when your build finishes") with a primary "Enable" button. Only then call `Notification.requestPermission()`. This pre-prompt lets you defer the irreversible browser prompt and gives the user one rejection that is not permanent.
- **Provide a settings re-entry point.** Users who declined once need a path to re-enable. Surface notification preferences in account settings with copy that explains how to re-enable in the browser if the site was permanently blocked.

## Search

- Search box prominent: top of page or in the global header.
- Show recent searches when empty.
- Show suggestions while typing (debounced).
- Show results in real-time or with a clear submit button.
- Empty result state: "No results for [query]" + spelling check + alternate suggestions.
- Search filters: visible, removable individually, with a "clear all".
- Recent and saved searches.

## Data Tables

- Sortable columns indicate current sort with an arrow icon and `aria-sort`.
- Sticky header on long tables.
- Row selection with checkboxes (with select-all in header).
- Bulk actions appear when one or more rows selected.
- Inline actions on hover (desktop) or always-visible (touch).
- Pagination or infinite scroll, never both.
- Empty state when no rows.
- Loading skeleton matching the table structure.

## Settings and Preferences

- Group related settings.
- Use the right control: toggle for boolean, radio for one-of-N, checkbox for any-of-N, dropdown for many-of-N, slider for continuous.
- Apply on change, not on submit. (Confirm only if the change is destructive.)
- Show the saved state ("Saved 2s ago" microcopy).
- Reset to default per setting; never a global "reset all".

## Toolbars and Action Bars

- Group actions by relationship.
- Show only top 3-5 actions; overflow into kebab menu.
- Destructive actions in the overflow menu unless they're the primary action of the screen.
- Tooltip on icon-only actions.

## Onboarding

- Don't onboarding-dump. Show value first, teach as needed.
- Use empty states to teach (one feature per empty state).
- Use coachmarks sparingly: only for novel patterns the user can't discover.
- Skippable. Always.
- Resumable. The user can return to onboarding from settings.

## Sample Data and First-Run Experience

For surfaces that come alive only after the user contributes data (data tools, editors, analytics views):

- Provide a sample dataset or demo workspace so the user sees the surface working before contributing real data.
- Make it easy to switch between sample and real data.
- The surface should be useful without 30 minutes of setup.

## Microcopy

The text in the UI is part of the design.

- **Concrete, not abstract.** "Save draft" not "Save". "Delete user" not "OK".
- **Active voice.** "Choose a plan" not "A plan must be chosen".
- **Present tense.** "Settings saved" not "Settings have been saved".
- **No jargon for end users.** Write to the user's vocabulary.
- **Consistent.** "Sign in" everywhere, not "Log in" / "Sign in" / "Login" mixed.
- **Honest.** "We can't process this card" not "Something went wrong".
- **Brief.** Cut adjectives. "Saving" not "Now saving your changes".

## Localization

- Don't bake English-specific assumptions into layouts. German is 30% longer; Japanese can be 60% shorter.
- Use logical CSS properties (`margin-inline-start`, `padding-block`) for RTL support.
- Date, time, number, currency: format via `Intl.*` APIs, not custom code.
- Pluralization: use ICU MessageFormat or the framework equivalent.
- Translatable strings extracted to a single source. Never inline string concatenation for translatable text.

## Common UX Mistakes

- Hover-only actions on touch devices.
- Modals without focus traps or Esc to close.
- Tooltips with critical information.
- Required fields not marked.
- Error messages without a fix.
- Loading states that disappear before the user perceives them.
- Empty states that are blank.
- Disabled buttons that don't say why.
- Confirmation dialogs for non-destructive actions.
- No confirmation for destructive actions.
- Auto-advancing carousels with no pause.
- Carousels at all. (They have low engagement; static heroes outperform.)
- Modal interrupting the user's task.
- Toast that disappears before the user can read it.
- Hamburger menu on a desktop hero where horizontal space is plentiful.
- Search results that change layout shape on every query.

## Self-Healing for UX

Before declaring work complete:

- [ ] Every screen has empty, loading, success, error, and disabled state designs
- [ ] Every interactive element has hover, focus, active, disabled states with visible focus
- [ ] Touch targets >= 44x44 with 8px gaps
- [ ] One primary CTA per screen
- [ ] Visual hierarchy: scan the page; the most important thing is the largest/boldest
- [ ] Density matches the user's job
- [ ] Spacing follows the chosen scale; no random values
- [ ] Iconography: one set, one stroke width, consistent sizes
- [ ] Modals: focus trapped, Esc closes, focus restored
- [ ] Forms: labeled, validated on blur, error inline + accessible
- [ ] Navigation: where am I, how do I get back, all key screens deep-linkable
- [ ] Loading: feedback within 100ms, skeleton at 300ms
- [ ] Microcopy: concrete, active, present tense, no jargon
- [ ] Tested on smallest target viewport, 200% zoom, dark mode, reduced motion, keyboard only

## See Also

- [design.md](design.md) for aesthetic and brand expression
- [forms.md](forms.md) for form-specific patterns
- [motion.md](motion.md) for state transitions
- [data-viz.md](data-viz.md) for tables and charts
