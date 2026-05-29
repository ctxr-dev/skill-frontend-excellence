---
title: Forms and Feedback
purpose: Input-level form discipline (label, type, validation, autocomplete), constraintValidation API, field-level abandonment analytics, address autocomplete depth. Flow-level auth lives in auth.md.
load-when:
  task-keywords: [form, validation, autofill, autocomplete, label, input, select, checkbox, radio, file upload, constraintValidation]
  symptoms: [contrast fail, focus not visible, duplicate id]
prereq: SKILL.md
related: [accessibility.md, ui-ux.md, motion.md, auth.md]
size: ~600 lines
---

# Forms and Feedback

Framework-agnostic patterns for forms that are easy to fill, easy to recover from, and accessible. Forms are where most products earn or lose users.

## Form Anatomy

```
[ Optional: page heading ]
[ Optional: short context: why we're asking ]

[ Field group ]
  [ Label (always visible) ]                [ Optional indicator: required, optional ]
  [ Input ]
  [ Helper text (always when complex) ]
  [ Error message (when invalid) ]

[ ... more field groups ]

[ Submit button ]                            [ Cancel / secondary action ]
```

## Labels

### Always visible

The label must be visible at all times, not just when the field is empty.

- **Wrap or associate**: `<label for="email">Email</label> <input id="email" />` or `<label>Email <input /></label>`.
- **Float labels** (label transitions to small position when focused/filled) are acceptable visually but the label must remain associated with the input.
- **Placeholder is not a label.** The placeholder disappears when typing, and most placeholders fail contrast.

### Position

- **Top-aligned** is the default. Easiest to scan.
- **Left-aligned** for compact dense forms (settings).
- **Right-aligned** rarely; harder to scan.

### Required vs optional

- Mark the smaller set, not the larger. If most fields are required, mark optional ones.
- Use both visual (asterisk) AND text (`required` somewhere visible).
- `aria-required="true"` (or use the native `required` attribute, which implies it).

```html
<label for="email">
  Email <span aria-hidden="true" class="required">*</span>
</label>
<input id="email" type="email" required aria-required="true" />
```

## Input Types

Use the right `type` and `inputmode` for the data:

| Data | type | inputmode | autocomplete |
|------|------|-----------|--------------|
| Email | email | email | email |
| Phone | tel | tel | tel |
| URL | url | url | url |
| Numeric ID, code | text | numeric | one-time-code (for OTP) |
| Money | text | decimal | (use a formatted text input) |
| Date | date | (auto) | bday or other |
| Search | search | search | (none) |
| Password | password | (auto) | new-password / current-password |
| Name | text | text | given-name / family-name / name |
| Address | text | text | street-address, address-line1, postal-code, country |
| Credit card | text | numeric | cc-number / cc-exp / cc-csc / cc-name |

### `autocomplete` is critical

Browsers and password managers use `autocomplete` to fill fields automatically. Without it, users have to type or copy-paste, which they hate.

WHATWG `autocomplete` reference (commonly used):

- `name`, `given-name`, `additional-name`, `family-name`
- `email`, `tel`, `tel-national`
- `street-address`, `address-line1`, `address-line2`, `address-level1` (state), `address-level2` (city), `postal-code`, `country`
- `cc-name`, `cc-number`, `cc-exp`, `cc-csc`, `cc-type`
- `username`, `current-password`, `new-password`, `one-time-code`
- `organization`, `organization-title`
- `bday`, `bday-day`, `bday-month`, `bday-year`

Multi-form pages: prefix with the form purpose (`shipping`, `billing`):

```html
<input autocomplete="shipping street-address" />
<input autocomplete="billing street-address" />
```

### Address autocomplete: structured vs single-line

Address forms are the second-most-abandoned form type after sign-up. Two architectural choices drive completion:

- **Structured (multi-field) form.** Separate fields for `address-line1`, `address-line2`, `address-level2` (city), `address-level1` (state or region), `postal-code`, `country`. The `country` field comes FIRST so downstream fields can adapt (label changes, required-flag changes, regex changes). Browser autofill works field-by-field with the granular `autocomplete` hints. Best for shipping and billing where you need each component for downstream logic (shipping rates, tax, fraud checks).
- **Single-line form.** One `<input autocomplete="street-address">` that holds the entire address. Easier to fill on mobile, harder to parse server-side. Use only when you do not need the components separately (a contact form, a profile note).

**International address shapes vary.** Hard-coding US shape (street, city, state, zip) breaks billions of users:

- Some countries (Ireland, the UAE, Hong Kong before Eircode) have no postal code at all. `postal-code` cannot be `required` for those countries.
- Some countries (Japan, China) write the address from the largest unit to the smallest (prefecture, city, street); the field order in the UI should mirror that for the chosen country.
- Some countries (the UK, India) use `address-level2` (city) plus `address-level1` (county or state) that the user often leaves blank; do not block submission.
- A `country` field that adapts the downstream form is the simplest path to international correctness. Drive the label, required-flag, and regex per country from a single locale config.

**`autocomplete="street-address"` granularity.** The full WHATWG list breaks `street-address` into `address-line1`, `address-line2`, `address-line3`, `address-level1` through `address-level4`, `postal-code`, `country`, `country-name`. The browser autofills at whatever level you offer; declaring `street-address` on a single line is valid AND declaring the broken-down fields is valid. Mixing the two on the same form confuses autofill; pick a level and commit.

**Google Places vs browser autofill heuristics.** Two different sources of address suggestions:

- **Browser autofill** uses the user's saved addresses from their browser or password manager. Cost: zero. Trigger: `autocomplete` attribute matches a known field. Best for returning customers and known users.
- **Google Places Autocomplete (or Mapbox, HERE, Algolia Places)** uses a geocoding service to suggest addresses as the user types. Cost: per-request API fee. Trigger: explicit integration in your JS. Best for first-time customers and to catch typos.

Both can coexist: let the browser autofill run on focus, then surface Places suggestions as the user keeps typing. Do NOT disable browser autofill to force Places (`autocomplete="off"` is widely ignored by browsers and even when honoured it hurts password managers).

### Native vs custom controls

Native first:

- `<input type="date">` is fine on mobile; custom date pickers are appropriate for desktop ranges.
- `<input type="checkbox">` and `<input type="radio">` style with `:checked` selectors plus pseudo-elements; use ARIA pattern only when truly necessary.
- `<input type="range">` for sliders.
- `<select>` for short lists; combobox for long or async.
- `<input type="file">` for uploads; style the trigger with a `<label>` to match design.

Custom controls require:

- Full keyboard support (arrow keys, Enter/Space, Esc).
- ARIA role and state.
- Focus management.
- Touch and mouse parity.

Don't reinvent the date picker unless you have a year of work to invest.

## Validation

### When to validate

- **Don't validate on every keystroke.** It's distracting and often wrong (you haven't typed enough).
- **Validate on blur** (when the user leaves the field). Sufficient time has passed; the user has indicated they're done.
- **Re-validate on submit** as a safety net; the server validates regardless.
- **For password strength meters**, update on keystroke since the user expects live feedback.
- **For confirm-password**, validate when the second field loses focus.

### HTML `constraintValidation` API

Every form control exposes a `ValidityState` object via `input.validity`. Use it to read structured validity flags and to set custom messages, rather than hand-rolling parallel validation state.

Read the validity flags:

- `valueMissing`: `required` is set and the value is empty.
- `typeMismatch`: the value does not match `type` (a `type="email"` with no `@`, a `type="url"` with no scheme).
- `patternMismatch`: the value does not match `pattern`.
- `tooShort` / `tooLong`: outside `minlength` / `maxlength`.
- `rangeUnderflow` / `rangeOverflow`: outside `min` / `max`.
- `stepMismatch`: not aligned with `step`.
- `badInput`: the browser cannot parse the value (a non-number in `type="number"`).
- `customError`: a previous `setCustomValidity()` call set a message.

Set a custom message:

```js
const email = document.querySelector('#email');

email.addEventListener('input', () => {
  if (email.validity.typeMismatch) {
    email.setCustomValidity('Enter an email like name@your-domain.com');
  } else if (email.validity.valueMissing) {
    email.setCustomValidity('Email is required');
  } else {
    email.setCustomValidity(''); // clear; the field is valid
  }
});

email.form.addEventListener('submit', (event) => {
  if (!email.form.checkValidity()) {
    event.preventDefault();
    email.form.reportValidity(); // shows browser UI for invalid fields
  }
});
```

The `invalid` event fires per field when the form fails to validate on submit. Listen for it to render your own custom error UI; never rely on the browser's default tooltip alone (it disappears as soon as the user moves focus, has no contrast guarantees, is not announced by every screen reader, and cannot be styled to match the design system). Pair the native validity flags with your own inline error message that follows the "Error placement" rules above.

### Error placement

- **Inline, below the field.** The error is about THIS field; show it HERE.
- **`aria-invalid="true"` on the input.** Programmatic error state.
- **`aria-describedby`** on the input pointing to the error message id.
- **`role="alert"`** on the error so screen readers announce it.

```html
<label for="email">Email</label>
<input
  id="email"
  type="email"
  required
  aria-invalid="true"
  aria-describedby="email-error"
/>
<p id="email-error" role="alert" class="error">
  Enter a valid email address (example: name@example.com)
</p>
```

### Error message content

- **Cause AND fix.** "Email is required" beats "Validation error". "Enter a valid email address" beats "Invalid".
- **Plain language.** Don't expose backend codes ("ERR_INVALID_INPUT"); translate.
- **Don't blame the user.** "Couldn't save your draft" not "You haven't filled everything in".
- **Stay positive when possible.** "Try a longer password" beats "Password too short".

### Multi-error submission

If the user submits with multiple errors:

1. Move focus to the first invalid field (or to a top-of-form summary).
2. Show a summary at the top with anchor links to each error:

```html
<div role="alert" aria-live="assertive" class="error-summary">
  <h2>3 issues to fix:</h2>
  <ul>
    <li><a href="#email">Enter a valid email</a></li>
    <li><a href="#password">Password must be at least 8 characters</a></li>
    <li><a href="#terms">Accept the terms to continue</a></li>
  </ul>
</div>
```

3. Each invalid field also shows its inline error.

### Server-side errors

After submit, server may reject with errors not caught client-side (email taken, payment failed). Treat them like any other inline error:

- Show inline near the relevant field if known.
- Show a top-of-form alert if the error doesn't map to a field (network failure).
- Provide a recovery action (retry, contact support).
- Preserve user input. Never make them retype.

## Helper Text

Persistent text below the field, before any error, that explains:

- Format expectations ("3 to 30 characters, letters and numbers")
- Why we're asking ("Used for password reset only; never shown publicly")
- Examples ("e.g., +1 555 123 4567")

Place between input and error. When error shows, error replaces or appears below helper.

## Submit Button

### Location

- Primary submit at the bottom of the form, aligned to the form's primary text direction (left in LTR forms with fields stacked left, right in form-aligned-right cases).
- For mobile, full-width is acceptable for primary submit.

### Label

- **Specific verb-noun.** "Create account" beats "Submit". "Save draft" beats "Save".
- **Match the action.** "Send invoice" if that's what happens.

### Loading state

```html
<button type="submit" disabled aria-busy="true">
  <span class="spinner" aria-hidden="true"></span>
  Creating account
</button>
```

- Disable while submitting (prevents double-submit).
- Show spinner inside the button.
- Maintain button width to prevent layout shift.
- Optionally update the label ("Creating account" instead of "Create account").

### Cancel

- Provide a secondary action when the user might back out (cancel, "back").
- Confirm if there are unsaved changes:

```html
<button type="button" onclick="confirmExit()">Cancel</button>
```

```js
function confirmExit() {
  if (formIsDirty()) {
    if (confirm('Discard your changes?')) {
      // navigate away
    }
  } else {
    // navigate away
  }
}
```

## Multi-Step Forms

For long forms, break into steps.

### Stepper

Show progress and current step:

```
[Step 1: Account] -> [Step 2: Profile] -> [Step 3: Payment]
   Done              In progress          Upcoming
```

- Current step visually distinct.
- Completed steps clickable (allow back navigation).
- Upcoming steps not clickable.

### Save state

- Auto-save draft at each step transition.
- Restore on return.
- Allow exit without losing data.

### Validation per step

- Validate the current step on "Next".
- Don't validate steps the user hasn't reached.
- Show validation errors before advancing.

## Long Forms

For very long forms (> 10 fields):

- Group fields with `<fieldset>` + `<legend>`:

```html
<fieldset>
  <legend>Shipping address</legend>
  <!-- fields -->
</fieldset>
```

- Use visual section headings with horizontal lines or background variation.
- Auto-save drafts every 30-60s or on blur of significant fields.
- Show a "Saved 5s ago" microcopy.

### Autosave UX

- Don't interrupt the user's typing with the save indicator.
- Show in a fixed corner ("Saving...", "Saved", "Failed to save - retry?").
- Use `aria-live="polite"` so screen readers announce status changes without interrupting.

## Form Analytics and Field-Level Abandonment

Form-level conversion ("submitted vs viewed") tells you the form is broken; field-level analytics tells you WHICH field. Instrument three events per field and compute the funnel:

- **Focus.** The user reached the field. Logs which fields are even attempted.
- **Blur with value.** The user filled the field and moved on.
- **Blur without value.** The user touched the field, did not fill it, moved on. This is the abandonment signal.
- **Submit attempt with this field invalid.** The user tried to submit and this field rejected.

```js
function instrumentField(field) {
  let focusedAt = 0;
  field.addEventListener('focus', () => {
    focusedAt = performance.now();
    track('field_focus', { name: field.name });
  });
  field.addEventListener('blur', () => {
    const filled = field.value.trim().length > 0;
    track('field_blur', {
      name: field.name,
      filled,
      dwellMs: Math.round(performance.now() - focusedAt),
    });
  });
}

document.querySelectorAll('form input, form select, form textarea').forEach(instrumentField);
```

The funnel surfaces which fields kill conversion. Common findings:

- A `phone` field with 40 percent blur-without-value is the abandonment culprit; consider making it optional or removing it.
- A `birthday` field with high focus-then-leave indicates the field looks invasive; explain why you need it inline.
- A `password` field with high "submit attempt with this field invalid" indicates the strength rule is harsh; surface the rule before submission.
- A field with high re-focus count indicates confusion about format; add helper text.

Send events via `navigator.sendBeacon` so abandonment events survive the unload. Sample if the form sees high traffic. See [observability.md](observability.md) for the RUM pipeline.

## Confirmation and Destructive Actions

### Confirm before destructive

For "Delete account", "Cancel subscription", "Discard draft": require an explicit confirmation.

- Modal with clear title ("Delete account?").
- Body text states consequences ("This permanently deletes your account and all data. This cannot be undone.").
- Two buttons: "Cancel" (primary) and "Delete account" (destructive secondary, danger color).
- For very destructive actions, require typing the resource name to confirm: "Type your account email to confirm".

### Don't confirm trivial actions

- Don't confirm "Save" (the action is non-destructive).
- Don't confirm "Send message" unless the user requested confirm-before-send.
- Don't confirm form resets if "Cancel" already exists.

### Undo

For undoable destructive actions, prefer undo over confirm:

```
[Toast: "Item deleted. Undo (5s)"]
```

Undo is faster, less interruptive, and works with screen readers. Use confirm for actions that genuinely cannot be undone (account deletion, payment).

## File Upload

- Show drop zone (visible on hover/dragover).
- Click-to-browse via styled `<label for="file-input">`.
- Show thumbnail/preview of selected files.
- Show progress bar during upload.
- Allow cancel during upload.
- Show error per file (size, type, network).
- Accept multiple files where appropriate.

```html
<label for="resume" class="dropzone">
  <input id="resume" type="file" accept=".pdf,.doc,.docx" hidden />
  Drag and drop your resume, or click to browse.
  PDF, DOC, or DOCX, up to 5 MB.
</label>
```

Hide the native input, style the label as the drop zone.

## Search Forms

- Single field with magnifier icon.
- Submit on Enter (native `<form>` behavior).
- Optionally submit on type with debounce (300ms).
- Show recent searches when empty.
- Show suggestions as the user types.
- Show clear-input button when populated.
- Show search results in real-time or after submit.

```html
<form role="search" action="/search">
  <label for="q" class="sr-only">Search</label>
  <input id="q" name="q" type="search" autocomplete="off" />
  <button type="submit">Search</button>
</form>
```

`role="search"` on the form is a landmark for screen readers.

## Modern Auth pointer

This file keeps INPUT-level concerns: the `<input>` element, its label, its validation, its autofill hint, its error message. Flow-level auth concerns live in [auth.md](auth.md): passkeys + WebAuthn (`autocomplete="webauthn"`, conditional UI), OAuth redirect UX, magic-link flow, account recovery, session-expiry handling, CAPTCHA / Turnstile placement.

The split: if the question is "how should this input be marked up and validated", look here. If the question is "how should this whole sign-in flow behave", look in `auth.md`. The sign-in form example below stays in this file because it is input-shaped; the recovery story for the user who lost their second factor is flow-shaped and lives in `auth.md`.

## Login and Sign-Up

### Login

```html
<form>
  <label for="username">Email</label>
  <input id="username" name="username" type="email" autocomplete="username" required />

  <label for="current-password">Password</label>
  <input id="current-password" name="password" type="password" autocomplete="current-password" required />

  <button type="submit">Sign in</button>

  <a href="/forgot">Forgot password?</a>
  <a href="/signup">Create account</a>
</form>
```

- Email/username must use `autocomplete="username"` (counterintuitive, but the spec).
- Password must use `autocomplete="current-password"`.
- Always use a `<form>` (not just floating fields), so password managers detect it.

### Sign-up

- New password: `autocomplete="new-password"`.
- Show password strength inline.
- Show "Show / hide" toggle for the password field.
- After submit, send to verification or onboarding, not back to a login screen.

### Password reset

- Email field with `autocomplete="username"`.
- Submit reveals "Check your email" message regardless of whether the email exists (security best practice).
- The reset link page uses `autocomplete="new-password"`.

### One-time codes

- `autocomplete="one-time-code"` so iOS suggests codes from SMS.
- `inputmode="numeric"` for numeric codes.
- `pattern="\d*"` for native validation on numeric codes.
- Auto-submit when the expected number of digits is entered.

## Payment Forms

- Card number: `autocomplete="cc-number"`, `inputmode="numeric"`, `pattern` for digits.
- Expiry: `autocomplete="cc-exp"`, `inputmode="numeric"`.
- CVC: `autocomplete="cc-csc"`, `inputmode="numeric"`, `maxlength="4"`.
- Cardholder name: `autocomplete="cc-name"`.
- Use Stripe Elements / Apple Pay / Google Pay for production. Never collect raw card data.
- Address autofill: `autocomplete="postal-code"` etc.

## Mobile-Specific

### Keyboard

- Set the right `inputmode` and `type` so the right mobile keyboard appears.
- For numeric codes, `inputmode="numeric"` shows the number pad on iOS.
- For dates, `<input type="date">` shows the native date picker on most platforms.

### Avoid auto-zoom

iOS auto-zooms when an input has font-size below 16px. Set inputs to >= 16px to prevent this.

### Touch targets

Inputs at least 44px tall (`height: 44px` or sufficient padding). Same for buttons.

### Sticky submit

For long mobile forms, consider a sticky submit bar at the bottom (with safe-area padding):

```css
.sticky-submit {
  position: sticky;
  bottom: 0;
  padding-bottom: max(16px, env(safe-area-inset-bottom));
}
```

## Form Accessibility

- Every input has a programmatic label.
- Required fields marked.
- Error messages associated via `aria-describedby`.
- Errors announced via `role="alert"` or `aria-live`.
- Focus moves to first invalid field on submit error.
- Group with `<fieldset>` + `<legend>`.
- Use `<form>` so password managers and SR landmarks detect it.

## Common Form Mistakes

- Placeholder as label.
- No `autocomplete` attributes.
- Placeholders that look like real values ("name@example.com") confused with filled state.
- Validating on every keystroke.
- Errors only at the top, no inline indication.
- Generic errors ("Invalid", "Error").
- "Required" indicator on all fields when most are required.
- Submit button labeled "Submit".
- Disabled submit when fields are empty (instead, validate on submit attempt and show errors).
- No loading state on submit; user clicks twice and creates duplicates.
- No autosave on long forms.
- Fields without `type` (default `type="text"` shows the wrong keyboard on mobile).
- Asking for unnecessary data ("Why does signup need my phone?").
- Multi-line text in a single-line input.
- Cancel button styled as primary, submit as secondary.

## Self-Healing for Forms

Before declaring work complete:

- [ ] Every input has a visible, programmatic label
- [ ] Right `type` and `inputmode` for the data
- [ ] `autocomplete` set per WHATWG spec
- [ ] Required fields marked visually + `aria-required`
- [ ] Errors inline, near the field, with cause + fix
- [ ] Errors announced via `role="alert"` or `aria-live`
- [ ] On submit error, focus moves to first invalid field
- [ ] Submit button has loading state, disabled during submission
- [ ] Submit button label is specific (verb-noun)
- [ ] Helper text for complex fields
- [ ] Long forms autosave; "Saved" indicator visible
- [ ] Multi-step forms show progress and allow back navigation
- [ ] Destructive actions confirm or provide undo
- [ ] Mobile: 16px+ font size, 44px+ touch targets
- [ ] `<form>` element used; password manager detects fields
- [ ] Tested with keyboard only, screen reader, and password manager

## See Also

- [accessibility.md](accessibility.md) for input accessibility
- [ui-ux.md](ui-ux.md) for state design (loading, error, success)
- [motion.md](motion.md) for transitions on validation feedback
