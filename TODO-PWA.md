# PWA TODO

Goal: Make LevelUp installable as a polished iPhone Home Screen app, with optional offline support and reliable notifications.

## Phase 1 — Installable iPhone app

- [x] Add production PNG app icons:
  - [x] `192x192` manifest icon
  - [x] `512x512` manifest icon
  - [x] `180x180` Apple touch icon
  - [x] Include compatible `any` and `maskable` icon purposes
- [x] Add an explicit manifest `id` and `scope`.
- [x] Add Apple web-app metadata, including the app title and status-bar style.
- [x] Add an iPhone installation guide explaining Share → Add to Home Screen → Open as Web App.
- [x] Hide the installation guide when the app is already running in standalone mode.
- [ ] Confirm the production deployment is served over HTTPS. *(Manual deployment check.)*
- [ ] Test installation and launch behavior on a physical iPhone. *(Manual device check.)*
- [ ] Verify the Home Screen icon, app name, theme color, safe areas, and standalone layout. *(Manual device check.)*
- [ ] Verify JSON export/import between Safari and the installed Home Screen app, since their local storage may be separate. *(Manual device check.)*

Implementation status: complete. Lint and the production build pass; the remaining items require the deployed app and a physical iPhone.

Estimated effort: 2–4 hours.

## Phase 2 — Offline support

- [ ] Decide which screens and assets must remain available offline.
- [ ] Add and register a service worker.
- [ ] Cache the app shell and required static assets.
- [ ] Add a clear offline fallback/error state.
- [ ] Define a safe cache-versioning and update strategy.
- [ ] Confirm locally stored progress remains usable offline.
- [ ] Test first launch, repeat launch, offline launch, reconnection, and deployment updates.
- [ ] Add appropriate service-worker security and cache-control headers.

Estimated effort: an additional 0.5–1.5 days.

## Phase 3 — Reliable notifications

- [ ] Replace the current in-page timer notification with Web Push for reminders that must work after iOS suspends or closes the app.
- [ ] Register the service worker for push events.
- [ ] Request notification permission only after a direct user action.
- [ ] Create and store push subscriptions on the server.
- [ ] Add server-side reminder scheduling and push delivery.
- [ ] Handle notification clicks and route users back into the appropriate app screen.
- [ ] Add unsubscribe and notification-preference controls.
- [ ] Test permission denial, revocation, expired subscriptions, Focus modes, and notifications while the app is closed.
- [ ] Verify behavior on an installed Home Screen app running iOS 16.4 or newer.

Estimated effort: an additional 2–5 days.

## Recommended order

1. Complete Phase 1 first; it provides the main installable-app experience with low complexity.
2. Add Phase 2 only if using LevelUp without a network connection is important.
3. Treat Phase 3 as a separate feature because reliable background reminders require both a service worker and server-side delivery.
