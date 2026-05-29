---
title: Authentication Flows
purpose: Flow-level authentication patterns: passkeys and WebAuthn, OAuth redirect UX, magic links, session expiry, account recovery, CAPTCHA placement, sign-in / sign-up structure, cross-tab session sync, and Storage Access API for embedded auth.
load-when:
  task-keywords: [auth, authentication, login, signup, passkey, WebAuthn, OAuth, magic link, session, account recovery, CAPTCHA, Turnstile, Storage Access API]
  symptoms: [auth redirect loop, passkey not offered, focus not visible, focus trap leak]
prereq: SKILL.md
related: [forms.md, embed-patterns.md, security.md, accessibility.md]
size: ~500 lines
---

# Authentication Flows

Framework-agnostic patterns for authentication FLOWS. The rules here govern redirects, sessions, recovery, second factors, and embedded sign-in. Input-level concerns (label, validation, autofill, error placement) belong in `forms.md`. Cross-link, do not duplicate.

## Why This File Exists

The sign-in form has two layers of concerns that age at different speeds.

- `forms.md` handles INPUT-level concerns. Label, `autocomplete`, `aria-invalid`, error placement, multi-error focus return, password manager detection. These rules are stable.
- `auth.md` handles FLOW-level concerns. Passkey ceremonies, OAuth redirect state, session refresh, recovery codes, CAPTCHA escalation, cross-tab sync, embedded sign-in under Storage Access API. These rules churn with the web platform.

Treat them as a pair. If you change the label markup, you edit `forms.md`. If you change what happens after submit, you edit this file.

## Passkeys and WebAuthn

Passkeys are the modern default for new sign-in flows. They eliminate the phishing surface that passwords and SMS codes share, and they remove the password reset funnel entirely for users who enrol.

### Offer passkeys inline, not as a separate flow

The classic mistake: a "Sign in with passkey" button next to "Sign in with password", as if they were peer choices. This buries the modern option. The correct UX is conditional UI: the username field itself offers the passkey when the browser holds one for this origin.

Principle: surface the passkey above the username field as an inline suggestion, not as a sibling flow.

Check: open the sign-in page with a registered passkey present. The password manager popup offers the passkey at the username field, not after submit.

### Conditional UI markup

```html
<form id="signin">
  <label for="username">Email</label>
  <input
    id="username"
    name="username"
    type="email"
    autocomplete="username webauthn"
    required
  />
  <label for="current-password">Password</label>
  <input
    id="current-password"
    name="password"
    type="password"
    autocomplete="current-password"
  />
  <button type="submit">Sign in</button>
</form>
```

The `webauthn` token in `autocomplete` is the signal. Without it, the browser will not offer the passkey at this field.

### The conditional get call

```js
async function startConditionalPasskey() {
  if (!('credentials' in navigator)) return;
  if (!PublicKeyCredential.isConditionalMediationAvailable) return;
  const available = await PublicKeyCredential.isConditionalMediationAvailable();
  if (!available) return;

  const options = await fetch('/auth/passkey/challenge').then((r) => r.json());
  try {
    const cred = await navigator.credentials.get({
      publicKey: options,
      mediation: 'conditional',
    });
    await fetch('/auth/passkey/verify', {
      method: 'POST',
      body: JSON.stringify(cred),
      credentials: 'include',
    });
    location.assign('/');
  } catch (err) {
    // user dismissed the autofill popup, fall through to password
  }
}

document.addEventListener('DOMContentLoaded', startConditionalPasskey);
```

The `mediation: 'conditional'` flag is what makes the call non-modal. It waits in the background; the browser surfaces it through the autofill popup. A normal `navigator.credentials.get` call without conditional mediation pops a modal, which is the wrong UX for sign-in.

### Registration (creating a passkey)

`navigator.credentials.create` runs after the user is already authenticated by another method (password, magic link, or social). Trigger it from a deliberate "Set up a passkey" affordance in account settings, never silently on first sign-in.

Check: a new user signs in with a password, lands in the app, and sees a one-time inline prompt (not a modal) offering to enrol a passkey. Dismissing it is one click. Accepting it triggers `create`.

### Passkey support floor

`navigator.credentials.get` with `mediation: 'conditional'` is supported in current Chromium, Safari 16+, and Firefox 122+. Feature-detect (`isConditionalMediationAvailable`) and fall back to the password field on older browsers without a layout shift.

## OAuth Redirect UX

OAuth at the frontend level is three pages: your sign-in page, the provider's consent screen, and your callback page. The flow-level rules govern what happens between them.

### Authorization Code with PKCE only

Implicit flow and password grant are deprecated. The modern frontend flow is Authorization Code with PKCE. The frontend generates a code verifier, derives a code challenge, sends the challenge to the provider, and exchanges the returned code (plus the verifier) for tokens at the token endpoint.

Check: the redirect URL contains `code_challenge` and `code_challenge_method=S256`. The callback exchange POST includes `code_verifier`. No `response_type=token` anywhere.

### The state parameter is required, not optional

Generate a cryptographically random `state` per redirect, store it in `sessionStorage` (not `localStorage`), and verify it on callback. Mismatched state means cancel the flow and surface an error.

```js
function startOAuth(provider) {
  const state = crypto.randomUUID();
  const verifier = generateVerifier(64);
  sessionStorage.setItem('oauth.state', state);
  sessionStorage.setItem('oauth.verifier', verifier);
  const url = new URL(`/oauth/${provider}/authorize`, ORIGIN);
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', sha256base64url(verifier));
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('redirect_uri', `${ORIGIN}/oauth/callback`);
  location.assign(url);
}
```

### Redirect URI rules

- One callback path per provider, registered exactly with the provider. No wildcards.
- The callback is a plain page with no third-party scripts, no analytics, and no advertising tags. It runs in the trust boundary of your auth.
- The callback page exchanges the code, clears the state and verifier from `sessionStorage`, and redirects onward.

Check: the OAuth callback URL is on the allow-list, returns only first-party assets, and does not fire analytics until after the session is established.

### Error states surfaced from the provider

The provider returns errors on the callback query string. Handle the canonical set explicitly.

| `error` value | User-facing message |
|---|---|
| `access_denied` | "Sign-in cancelled. Try again or use another method." |
| `consent_required` | Redirect back to the authorize endpoint with `prompt=consent`. |
| `login_required` | Redirect back to the authorize endpoint with `prompt=login`. |
| `invalid_scope` | Engineering bug; log and show a generic error. |
| `server_error`, `temporarily_unavailable` | "Provider is having issues. Try again in a minute." |

Check: each of the five errors above renders a distinct, plain-language message. None of them surface raw provider strings.

### Token storage rules

- Never store access tokens or refresh tokens in `localStorage`. Cross-site scripting reads everything in `localStorage`.
- Store the session in an `httpOnly`, `Secure`, `SameSite=Lax` (or `Strict` where the flow allows) cookie set by your backend.
- If the frontend must hold a token for an API call (rare), keep it in memory in a closure for the page session only. Drop it on reload.

Check: open DevTools Application tab after sign-in. `localStorage` and `sessionStorage` contain no token, no JWT, no refresh token. The session cookie is `httpOnly` and the `Secure` flag is set.

## Magic Link UX

Magic links remove the password from the sign-in surface entirely. They are useful for low-friction sign-up and infrequent sign-in, and they are a clean fallback when the user lost a passkey.

### Expiry and single-use

- Magic link expires under 15 minutes from issuance. Longer is a credential.
- Single use; the link invalidates on first successful exchange and on a second attempt.
- The link redeems a short-lived session token; it does not itself become the session.

Check: copy the magic link, redeem it, then attempt the same link a second time. Second attempt rejects with a clear "Link already used" message and offers to send a new one.

### Second-device friendly handoff

Most users open email on phone, then want to sign in on desktop. The link MUST handle the cross-device case.

- The magic-link landing page presents two affordances. "Continue on this device" (the default) and "Use on another device" (the handoff).
- The handoff shows a short numeric code (six or eight digits) and a QR code. The waiting tab on the original device polls a short endpoint and unlocks when the code is consumed.

Check: open the magic-link email on a phone, choose "Use on another device", type the code on a desktop tab that was waiting. Both flows complete without re-entering the email.

### The "open on different device" trap

If the user clicks the link on a device they did not initiate the sign-in from, the session must NOT silently sign them in on that new device. The link redeems a session on the device that initiated, not on the device that clicked. The cross-device flow above is the explicit consent path.

## Session Expiry Handling

Frontends fail at session expiry more often than at sign-in. The user sits in a tab for an hour, returns, clicks a button, and gets a silent 401 or a redirect loop.

### 401 interception pattern

Wrap your fetch layer in a single interceptor. On 401, attempt one refresh, then either retry the original request or escalate to the sign-in screen.

```js
async function fetchWithAuth(input, init = {}) {
  const res = await fetch(input, { ...init, credentials: 'include' });
  if (res.status !== 401) return res;

  const refreshed = await refreshSession();
  if (!refreshed) {
    location.assign(`/signin?next=${encodeURIComponent(location.pathname)}`);
    return res;
  }
  return fetch(input, { ...init, credentials: 'include' });
}

async function refreshSession() {
  const res = await fetch('/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  });
  return res.ok;
}
```

Check: throttle the network in DevTools to "Offline", make a request, return online, retry. The flow does not produce a redirect loop or stack two refresh calls.

### Refresh-token rotation

The refresh token issued by your backend should rotate on every use. Reuse of an old refresh token signals a stolen credential; the backend revokes the family. The frontend's job is to keep the rotation atomic: one refresh in flight at a time.

```js
let refreshInFlight = null;
function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = fetch('/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    }).then((r) => r.ok).finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}
```

Check: trigger ten concurrent requests against an expired session. Exactly one `/auth/refresh` call goes out, the other nine wait.

### Idle notification (soft expiry)

For sensitive apps, surface a soft-expiry warning before hard expiry kicks in. A small banner: "You have been idle. Sign back in to continue." The banner offers a one-click re-auth without losing the current page state.

- Soft expiry: client-side timer counts user inactivity. Trigger at 75 percent of the session window.
- Hard expiry: server returns 401. The interceptor handles it as above.

Check: leave a tab idle past the soft threshold. A non-blocking banner appears. Clicking it re-auths in place (passkey conditional UI surfaces in the modal) without losing form input.

### Soft expiry vs hard expiry

- Soft expiry: user gets a warning, can re-auth in place, no work lost.
- Hard expiry: session is gone, full redirect to sign-in with a `next` param that returns to the original page.

Both must exist. Hard-only is the source of the "I lost my draft" complaint.

## Account Recovery Beyond Password Reset

Password reset is the easy case. The hard cases: lost passkey, lost second factor, lost email access, lost phone.

### Recovery codes

At enrolment for any second factor, issue ten one-time recovery codes. The user copies them, prints them, or saves them to a password manager. Each code is single-use and replaces the second factor for one sign-in.

Check: a user enrols a passkey or TOTP and immediately sees ten codes, a one-click "Copy all" affordance, a "Print" affordance, and a "Save as .txt" affordance. The flow blocks until the user confirms ("I have saved my codes").

### Trusted-device prompt

For sign-in from a familiar device, offer "Trust this device for 30 days". The trust survives in a long-lived first-party cookie. From a trusted device, the second factor is skipped; from any other device, it is required.

Check: sign in from device A with "Trust this device" checked. Sign in from device B and the second factor prompts. Sign in from device A again within 30 days, no second factor.

### Identity verification flow

When all factors are lost, the user enters a manual verification flow. The frontend's job is to make this a calm, clear path, not a wall.

- One step at a time: email confirmation, identity document (where the product warrants it), human review window stated up front ("Most reviews complete in 24 hours").
- A single, visible status page the user can return to ("Your recovery request is in review since Monday at 2:14 PM").
- A defined SLA in the UI, not in the help center.

Check: a user with no remaining factors lands on a recovery flow that tells them, within one screen, what they need and how long it will take. No buried links.

### Lost second factor specifically

The most common recovery: I have my password, I lost my phone with the TOTP app or the passkey.

- Offer recovery codes first.
- If recovery codes are also gone, escalate to email verification PLUS a holding period (24 to 72 hours) before the second factor is reset. The holding period is the protection against an attacker who already has the password.

Check: simulate "lost phone, no recovery codes". The UI explains the holding period, sends a confirmation email, and tells the user exactly when the reset will complete.

## CAPTCHA Placement and Accessibility

CAPTCHA exists to stop automated abuse, not to harass legitimate users. The default posture is invisible challenge first, visible challenge only on suspicion.

### Never on the first interaction

A user landing on the sign-in page should see the username field, not a CAPTCHA widget. Add the challenge only when behaviour signals risk: failed attempts from this IP, known-bad fingerprint, anomalous device.

Check: a fresh sign-in page renders without a CAPTCHA. The CAPTCHA appears only after a failed attempt or a server-flagged risk score.

### Placement in the focus order

When the CAPTCHA does appear, it goes BEFORE the submit button in the focus order. Tab from the password field, the CAPTCHA receives focus, Tab again, the submit button receives focus.

Check: keyboard-only sign-in. Tab order is username, password, CAPTCHA, submit. No focus jumps backward, no focus traps.

### Invisible-CAPTCHA UX trap

Invisible CAPTCHAs (Turnstile, hCaptcha invisible, reCAPTCHA v3) run on submit. The trap: the submit button reports loading, the CAPTCHA fails silently, and the form sits with no error.

Surface the failure explicitly. The interceptor must convert a CAPTCHA failure into the same inline error pattern any other validation uses (see `forms.md`).

Check: force a CAPTCHA failure (block the third-party domain in DevTools). The submit attempt produces an inline error within two seconds, not a stuck spinner.

### Provider choice and the Privacy Pass preview

Cloudflare Turnstile, hCaptcha, and reCAPTCHA all expose accessible widgets, but the accessibility floor varies. Turnstile and hCaptcha lead on the no-puzzle path for trusted browsers (Privacy Pass, Private Access Tokens). Prefer the providers that can run zero-interaction for the common case.

Check: in a clean browser profile, the CAPTCHA resolves without a visible puzzle for 95 percent of attempts. The 5 percent that escalate present an accessible audio fallback and a visible refresh affordance.

### Accessibility floor for the widget

- Visible focus ring on the widget container.
- Keyboard-operable challenge (Space, Enter, arrow keys).
- Audio fallback for visual puzzles.
- `aria-describedby` on the submit button pointing at the CAPTCHA status text when a challenge is in progress.

Check: navigate the CAPTCHA with the keyboard only, then with VoiceOver / NVDA only. Both can complete the flow.

## Sign-In Form Structure

The sign-in form is the highest-converting form in most products. The structure rules below are non-negotiable.

### Single submit, autofocus the first field

- One `<form>` element. One submit button.
- `autofocus` on the username field for the sign-in route (not on other routes).
- No off-form floating fields. Password managers will not detect them.

Check: open the sign-in page. Cursor is in the username field. Pressing Enter from either field submits the form.

### No Tab traps

The form contains exactly the fields plus the submit and recovery links. Social sign-in options sit ABOVE the form so they are first in the tab order; recovery links sit BELOW so they are last.

Check: Tab from page load. Order is "Skip to content", social options, username, password, submit, "Forgot password", "Create account". No order surprises.

### Error summary at the top after submit

On a multi-error submit, render a summary at the top of the form, focus the summary, and link each item to its field. The pattern is documented in `forms.md`. The flow-level rule is: the summary appears AND the first invalid field is also focusable from the summary link.

Check: submit with three invalid fields. Focus moves to the summary; pressing Enter on the first summary link moves focus to the first invalid field.

### Focus the first invalid field on single-error submit

When only one field is invalid, skip the summary and move focus directly to the invalid field. The inline error renders below the field as specified in `forms.md`.

Check: submit with only the email invalid. Focus is on the email field, the inline error is visible, no summary appears.

## Sign-Up Progressive Disclosure

The wall-of-fields sign-up form is dead. Modern sign-up reveals one or two fields at a time and only asks for what the next step needs.

### Email first, then password

Step 1 collects email and only email. The submit button reads "Continue". The server returns whether this email is new (sign-up) or existing (sign-in fallback) and the form transitions to step 2 in place, without a route change.

Check: enter a new email, click Continue. The same page transitions to a password field with a strength meter, no navigation. The browser back button returns to the email step.

### Terms of service consent

Required, single checkbox, placed directly above the submit button with the agreement text visible. Avoid the "by clicking submit you agree" pattern; it fails consent law in several jurisdictions and is bad UX.

```html
<label>
  <input type="checkbox" required name="terms" />
  I agree to the Terms of Service and Privacy Policy.
</label>
<button type="submit">Create account</button>
```

Check: submitting without the checkbox shows an inline error pointing at the checkbox, not a generic "agree to terms" error.

### Strength meter without theatre

Show a strength bar that maps to the actual requirements (length, character classes, common-password check). Do NOT use moving emoji, animated fire icons, or congratulatory copy.

- Three to five bars across, monochrome with a single accent color.
- Status text underneath ("Strong enough", "Add a longer word", "Avoid common passwords").
- Strength check runs client-side against a small bloom filter of common passwords AND server-side on submit.

Check: type a known weak password ("password123"). The meter immediately calls it out as common. No animation.

## Cross-Device and Cross-Tab Session Sync

Users open three tabs of your app. They sign in on one. The other two need to know.

### BroadcastChannel API

```js
const auth = new BroadcastChannel('auth');

function signalSignedIn(user) {
  auth.postMessage({ type: 'signed-in', user });
}

function signalSignedOut() {
  auth.postMessage({ type: 'signed-out' });
}

auth.onmessage = (event) => {
  if (event.data.type === 'signed-in') {
    location.reload();
  } else if (event.data.type === 'signed-out') {
    location.assign('/signin');
  }
};
```

Check: sign in on tab A. Tab B reloads within a second and shows the signed-in state. Sign out on tab A. Tab B redirects to sign-in.

### "You signed in on another tab" reload

For routes where state matters (a form in progress, a draft), prefer a non-disruptive banner: "You signed in on another tab. Refresh to continue." The user clicks once; the draft is preserved through the reload by the same draft-recovery pattern used elsewhere (see `forms.md`).

Check: sign in on tab A while tab B has a form with unsaved input. Tab B shows the banner, not an automatic reload. Clicking refresh preserves the input.

### Storage events as the fallback

`BroadcastChannel` is not available in all WebView contexts. Fall back to the `storage` event on a sentinel key.

```js
window.addEventListener('storage', (e) => {
  if (e.key === 'auth.signal' && e.newValue) {
    const msg = JSON.parse(e.newValue);
    if (msg.type === 'signed-out') location.assign('/signin');
  }
});

function signalSignedOut() {
  localStorage.setItem('auth.signal', JSON.stringify({ type: 'signed-out', t: Date.now() }));
}
```

Check: in a WebView without `BroadcastChannel`, the storage-event path produces the same cross-tab behavior.

## Storage Access API for Embedded Sign-In

Third-party cookies are deprecated. Embedded sign-in widgets (your own auth running in an iframe on a partner site) must request storage access on a user gesture.

### The ceremony

1. The embedded widget renders a click target ("Sign in").
2. The user clicks.
3. On click, the widget calls `document.requestStorageAccess()`.
4. The browser may prompt; on grant, the iframe gets first-party storage for this origin.
5. The widget runs the sign-in flow.

```js
button.addEventListener('click', async () => {
  try {
    if ('requestStorageAccess' in document) {
      await document.requestStorageAccess();
    }
    await runSignInFlow();
  } catch (err) {
    showFallback();
  }
});
```

### Never call requestStorageAccess without a user gesture

The browser denies the call outside a click handler. The widget must render the button first; the call goes inside the click handler.

Check: load the embedded widget. The button is visible immediately. `requestStorageAccess` is not in the network or call stack until the user clicks.

### CHIPS for partitioned cookies

Where the widget needs a long-lived session but the host does not warrant top-level access, use partitioned cookies (CHIPS). The cookie carries `Partitioned`, lives per top-level site, and survives across reloads on the same host without third-party scope.

Check: in DevTools, the widget's session cookie shows `Partitioned: true` and a `Partition Key` matching the host site.

### Fallback: pop the auth out of the iframe

If storage access is denied, open the sign-in in a new top-level window with `window.open`, complete the flow there, and post the result back to the embed via `postMessage` (see `embed-patterns.md`).

Check: deny storage access. The widget transitions to a "Sign in in a new window" affordance. Clicking opens a top-level window; closing it returns the embed to a signed-in state.

## Anti-Patterns

- Storing access tokens or refresh tokens in `localStorage`. Cross-site scripting reads them.
- Implicit-flow OAuth. The token leaks in the URL fragment.
- A "Sign in with passkey" button as a sibling to "Sign in with password". Bury the password; surface the passkey inline.
- Magic links that expire after 24 hours. That is a credential.
- Silent redirect loops on 401. Always escalate to sign-in with a `next` param.
- CAPTCHA on the first interaction. Add only on suspicion.
- "By signing in you agree to terms". Make consent explicit and visible.
- Strength meters that animate. Theatre wastes the user's time.
- Cross-tab sign-in that auto-reloads a tab with unsaved input. Show a banner; let the user choose.
- Embedded sign-in that calls `requestStorageAccess` on page load. The browser denies it; the UX dies.

## Self-Healing for Authentication

Before declaring an auth flow complete:

- [ ] Passkey conditional UI offered above the username field, not as a separate flow
- [ ] `autocomplete="username webauthn"` on the username input
- [ ] OAuth uses Authorization Code with PKCE; no implicit flow anywhere
- [ ] OAuth `state` and `code_verifier` stored in `sessionStorage`, cleared on callback
- [ ] Tokens never in `localStorage`; session in `httpOnly`, `Secure` cookies
- [ ] Magic link expires under 15 minutes and is single-use
- [ ] Magic link supports cross-device handoff (numeric code or QR)
- [ ] 401 interception with single-flight refresh, no redirect loops
- [ ] Soft-expiry banner before hard expiry, no lost work
- [ ] Recovery codes issued at second-factor enrolment, ten codes, copy / print / save affordances
- [ ] Trusted-device option present and respected
- [ ] Lost-second-factor path includes a documented holding period
- [ ] CAPTCHA is invisible by default; visible only on suspicion; appears BEFORE submit in tab order
- [ ] CAPTCHA failure surfaces as an inline error within two seconds
- [ ] Sign-in form has a single submit, autofocus on the first field, no Tab traps
- [ ] Multi-error submit shows summary at top, focuses first invalid field via summary link
- [ ] Sign-up progressively discloses (email, then password); browser back works
- [ ] Terms of service consent is an explicit checkbox above submit
- [ ] Password strength meter is functional, not theatrical
- [ ] `BroadcastChannel` cross-tab signal in place, with `storage` event fallback
- [ ] Storage Access API requested only inside a user click handler
- [ ] CHIPS partitioned cookies in use for embedded session, or pop-out fallback if denied

## See also

- [forms.md](forms.md) for input-level concerns (label, validation, autofill, error placement)
- [embed-patterns.md](embed-patterns.md) for postMessage handshake, viewport reporting, theme adoption
- [security.md](security.md) for CSP, COOP, COEP, CORP, Trusted Types, Permissions-Policy
- [accessibility.md](accessibility.md) for focus management, ARIA, live regions
