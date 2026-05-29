---
title: PWA and Offline
purpose: Decide when a Progressive Web App pays back the engineering cost, then implement service workers, offline shells, install prompts, push, and background sync without stranding users on stale builds.
load-when:
  task-keywords: [PWA, offline, service worker, SW, install prompt, push, background sync, manifest]
  symptoms: [score dropped, slow page, third-party script slow]
prereq: SKILL.md
related: [performance.md, observability.md, pre-launch.md, security.md]
size: ~450 lines
---

# PWA and Offline

A Progressive Web App is not a checkbox. It is a contract with the user: the surface stays useful when the network does not, updates roll out without breaking the open tab, and the device treats the site like an application. Pay this cost only when the surface earns it.

## When to Invest in PWA

Three decision rules. If none apply, ship a fast website and move on.

1. **Cross-session reuse.** Users return to the same surface within seven days more than 30 percent of the time. A landing page that converts once and never re-engages does not pay back a service worker.
2. **Install desire.** Users would benefit from a launcher icon and a window that is not a browser tab (kiosk surfaces, internal tools, daily-use consumer apps, productivity tools). If the answer is "they would never install this", do not ship `manifest.json`.
3. **Offline-essential surface.** Some part of the workflow must keep working without connectivity: reading saved content, drafting a message, viewing already-loaded data, recording a measurement. If everything requires the server, offline support is theatre.

The anti-pattern: turning a static marketing site into a PWA because the audit gives points for it. The cost (service worker maintenance, kill-switch infrastructure, install prompt UX, push permission etiquette) outweighs the benefit (negligible).

When two of the three rules apply, treat PWA as a first-class capability with its own pre-launch gate (see pre-launch.md).

## Service Worker Lifecycle

A service worker is a separate JavaScript context with its own lifecycle, not a script that runs on the page. Understand the lifecycle or strand active tabs on a stale build.

### The three lifecycle events

1. **`install`.** Fires once per service-worker version, the first time the browser sees a new file. Use it to precache the app shell and any version-pinned assets. The worker is not yet controlling pages.
2. **`activate`.** Fires after `install` succeeds and any old worker has stopped controlling clients. Use it to clean up old caches. The worker is now eligible to control pages.
3. **`fetch`.** Fires for every network request from a controlled page. The worker decides cache, network, or both.

### The canonical update flow

The default lifecycle protects open tabs from sudden breakage: a new worker waits until every controlled page closes before it activates. That is correct, but it means users on long-lived tabs run an outdated cache until they close the tab.

```javascript
// In the service worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open('shell-v3').then((cache) => cache.addAll(SHELL_URLS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => Promise.all(
        keys.filter((k) => k !== 'shell-v3' && k !== 'runtime-v1')
            .map((k) => caches.delete(k))
      )),
      self.clients.claim()
    ])
  );
});
```

On the page, prompt the user before reloading so unsaved input is not lost:

```javascript
navigator.serviceWorker.register('/sw.js').then((reg) => {
  reg.addEventListener('updatefound', () => {
    const next = reg.installing;
    next.addEventListener('statechange', () => {
      if (next.state === 'installed' && navigator.serviceWorker.controller) {
        showUpdateBanner(() => next.postMessage({ type: 'SKIP_WAITING' }));
      }
    });
  });
});

navigator.serviceWorker.addEventListener('controllerchange', () => {
  window.location.reload();
});
```

Check: open the surface in two tabs, deploy a new worker, observe one banner per tab, accept on one, confirm the other tab reloads cleanly without losing user input that was guarded.

## Offline Shell Pattern

The app shell is the minimum HTML, CSS, and JavaScript needed to render the application chrome (top bar, navigation, empty content slot) without any server data. Cache it at `install` time so the surface paints offline on first navigation.

### What to precache

- The shell HTML (a single document or a per-route entry document).
- Critical CSS bundled with the shell.
- Application logo and any chrome icons.
- Fallback offline page for routes that need network data.
- A small set of recently used dynamic assets if the surface depends on them.

Hard cap the shell at 500 KB compressed. Anything heavier means the user pays the cost on every install and every update.

### Runtime caching with `stale-while-revalidate`

For assets that change but tolerate a one-version-stale read (typical for most static resources), serve from cache first and refresh in the background:

```javascript
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.destination === 'image' || request.destination === 'style') {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open('runtime-v1');
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || fetchPromise;
}
```

### Navigation Preload for first-render speed

When a navigation request hits the service worker, the worker startup can add 100 to 400 ms before the fetch begins. Navigation Preload starts the fetch in parallel with worker startup:

```javascript
self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.registration.navigationPreload &&
    self.registration.navigationPreload.enable()
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      const preloaded = await event.preloadResponse;
      if (preloaded) return preloaded;
      return fetch(event.request).catch(() => caches.match('/offline.html'));
    })());
  }
});
```

Check: cold-start the app on a throttled connection, measure first navigation. Compare with and without preload enabled. The win is real on slow CPU and slow networks.

## Caching Strategies Cookbook

Five named strategies. Pick one per resource class, never per request inside a class.

### Cache-first

Return cache if present, otherwise fetch and cache. Best for immutable, versioned assets (`/assets/main.abc123.js`, fonts, icons).

```javascript
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  const cache = await caches.open('immutable-v1');
  cache.put(request, response.clone());
  return response;
}
```

### Network-first

Try network, fall back to cache. Best for HTML and per-request JSON where freshness matters more than offline.

```javascript
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open('runtime-v1');
    cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    return cached || caches.match('/offline.html');
  }
}
```

### Stale-while-revalidate

Return cache immediately, refresh in background. Best for non-critical images, theme assets, infrequently-updated JSON.

### Network-only

Always fetch, never cache. Best for analytics beacons, authentication endpoints, anything where stale answers are dangerous.

### Cache-only

Always return cache. Best for shell-precached resources where the build pipeline guarantees freshness on deploy.

### The decision matrix

| Resource class | Strategy |
|---|---|
| Versioned static (`abc123.js`, `abc123.css`) | Cache-first |
| Shell HTML | Cache-first with periodic background revalidation |
| Per-request HTML | Network-first with offline fallback |
| Read-mostly API JSON | Stale-while-revalidate |
| Write API (POST, PUT, DELETE) | Network-only (queue for Background Sync) |
| User avatars, thumbnails | Stale-while-revalidate |
| Analytics, telemetry | Network-only |
| Auth tokens, session endpoints | Network-only |

## Manifest Correctness for Installability

The browser installs your site when the user opens it on a supported platform, the user has engaged with the site, and the manifest passes every required field. Miss one field, no install prompt.

### Required fields

- `name`: full application name (45 characters or fewer).
- `short_name`: launcher label (12 characters or fewer; longer truncates).
- `icons`: at least one 192x192 PNG and one 512x512 PNG. The 512 must be square and look correct after the platform applies its own mask (Android maskable, iOS rounded corner).
- `start_url`: where the launcher opens. Absolute path (`/?source=pwa`) so tracking distinguishes installed traffic.
- `display`: one of `standalone`, `fullscreen`, `minimal-ui`. `standalone` for most apps; `fullscreen` only for games or kiosks.
- `theme_color`: matches the top window-chrome color the device renders.
- `background_color`: shown while the app shell loads (the splash screen).
- `id`: a stable identifier so the browser does not treat your `start_url` change as a new application. Set this once and never change it.

### Example

```json
{
  "name": "Product Name",
  "short_name": "Product",
  "id": "/",
  "start_url": "/?source=pwa",
  "display": "standalone",
  "theme_color": "#1a1a1a",
  "background_color": "#fafafa",
  "icons": [
    { "src": "/icons/192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Check: open the surface in Chrome DevTools, Application tab, Manifest. Every error and warning is a defect.

## Install Prompt Timing

`beforeinstallprompt` fires when the browser decides the site is installable. Default behaviour is to show a small browser-chrome prompt. The pattern: capture the event, suppress the default, surface an install affordance only after the user has clearly engaged.

```javascript
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event;
  document.querySelector('#install-button').hidden = false;
});

document.querySelector('#install-button').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  document.querySelector('#install-button').hidden = true;
});
```

### The value-demonstration rule

Show the install affordance only after the user has reached a moment of value: completed a workflow, saved an item, returned for a second session. The first-load install banner is a defect.

### Never block content

The install affordance is a small button or a dismissible chip. It is not a modal, a takeover, or an overlay that blocks reading. Users who dismiss it once should not see it again that session.

Check: open the surface as a new user, perform the first meaningful action, observe the affordance appear afterward, dismiss it, navigate, confirm it stays dismissed.

## Push Permission Timing

The browser permission prompt for push notifications is a one-shot grant. If the user denies it, the surface cannot ask again without the user manually re-enabling the permission in browser settings. Treat the prompt as a precious resource.

### Never on first load

Asking on first load earns the deny. The user has no signal that notifications would be valuable; the safe answer is no. Track the grant rate by entry point: first-load prompts grant under 5 percent; in-context prompts grant 40 to 70 percent.

### Ask after a clear value action

The pattern: the user takes an action that obviously benefits from notifications (subscribes to a thread, saves a search, sets a reminder). The affordance to enable notifications appears as part of the follow-up.

### The in-app preview UX

Before calling `Notification.requestPermission()`, show an in-app modal that previews exactly what the notifications will look like and what triggers them. Only when the user confirms the in-app modal do you call the real permission API. This is two prompts but the second one almost always passes.

```javascript
async function offerPush() {
  const inAppConfirmed = await showPushPreviewModal();
  if (!inAppConfirmed) return;
  const permission = await Notification.requestPermission();
  if (permission === 'granted') await subscribeToPush();
}
```

Check: run a permission-grant funnel in analytics. The in-app preview should lift grant rate by 3x to 10x relative to a cold prompt.

## Background Sync

Background Sync queues a request when connectivity drops and replays it when the network returns. Best for write operations that must eventually succeed (sending a message, posting a comment, recording a measurement).

```javascript
// On the page
async function sendWithRetry(payload) {
  try {
    await fetch('/api/messages', { method: 'POST', body: JSON.stringify(payload) });
  } catch (err) {
    await saveToIDB('outbox', payload);
    const reg = await navigator.serviceWorker.ready;
    await reg.sync.register('flush-outbox');
  }
}

// In the service worker
self.addEventListener('sync', (event) => {
  if (event.tag === 'flush-outbox') {
    event.waitUntil(flushOutbox());
  }
});
```

Background Sync browser support is uneven (Chrome and Edge yes, Firefox and Safari no as of 2026). For unsupported browsers, the fallback pattern is a foreground retry queue with `online` event listening.

Check: load the surface, switch to airplane mode, perform a write, return online, confirm the write completes without user intervention.

## Service Worker Kill-Switch

A service worker that ships with a bug can take a site down for every returning user until the bug is fixed and a new worker takes over. Ship the kill-switch on day one.

### The deployable unregister page

A static HTML page at a known URL (`/unregister-sw`) that runs:

```html
<!DOCTYPE html>
<meta charset="utf-8">
<title>Reset Storage</title>
<script>
  (async () => {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    document.body.textContent = 'Done. You can close this tab.';
  })();
</script>
```

Serve this page with `Clear-Site-Data: "cache", "cookies", "storage"` for the strongest reset:

```text
Clear-Site-Data: "cache", "cookies", "storage"
```

### Respect `?nosw=1`

The active service worker checks the URL on every navigation. If `?nosw=1` is present, it unregisters itself and falls through to the network:

```javascript
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.searchParams.has('nosw')) {
    self.registration.unregister();
    return;
  }
});
```

### Never cache the service worker file itself

Serve `/sw.js` with `Cache-Control: no-cache, max-age=0, must-revalidate`. A long-cached worker file means a buggy worker stays alive long after the fix lands.

```text
Cache-Control: no-cache
```

Check: deploy a worker with a deliberate fault, confirm the kill-switch page recovers a stuck client, confirm `?nosw=1` recovers without manual cache clear.

## Web Share API

`navigator.share()` opens the platform share sheet (iOS share sheet, Android share intent, Windows share UI) so the user picks the target. Prefer this over a custom share menu when targets are known to the platform but unpredictable to your code.

```javascript
async function share(payload) {
  if (!navigator.share) return fallbackShareMenu(payload);
  try {
    await navigator.share({
      title: payload.title,
      text: payload.summary,
      url: payload.url
    });
  } catch (err) {
    if (err.name !== 'AbortError') reportShareFailure(err);
  }
}
```

When to prefer over a custom menu: any share button on iOS or Android. The platform sheet is faster, knows the user's frequent contacts, and respects accessibility settings.

When to keep a custom menu: surfaces where the share has side effects in your app (sharing creates a server-side record, sharing changes permissions on the document). Then the share menu is part of the workflow, not a handoff to the OS.

Check: tap the share affordance on iOS Safari and Android Chrome; the native sheet should open in under 200 ms.

## File System Access API

The File System Access API (`window.showOpenFilePicker`, `showSaveFilePicker`, `showDirectoryPicker`) gives the surface durable handles to user-chosen files and folders without round-tripping through downloads. Available in Chromium browsers (Chrome, Edge, Opera) since 2020; Firefox and Safari fall back to the upload-and-download pattern. Reach for it when the app is an editor (text, image, code) and the workflow benefits from save-in-place; gate it behind feature detection and ship a download fallback for unsupported browsers.

## See also

- [performance.md](performance.md) for caching headers, resource hints, and the bundle budgets that govern the precache size.
- [observability.md](observability.md) for instrumenting service-worker errors, push grant rates, and offline-render telemetry.
- [pre-launch.md](pre-launch.md) for the PWA pre-launch gates: kill-switch deployed, manifest valid, install prompt timing reviewed.
- [security.md](security.md) for `Clear-Site-Data` headers, scope-isolation rules, and the service-worker supply-chain considerations.
