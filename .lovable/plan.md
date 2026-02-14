
# PostHog Product Analytics Integration

## Overview
Add PostHog as a dedicated product analytics layer alongside the existing Sentry observability stack. PostHog handles events, funnels, and retention. Sentry continues to own crashes, session replays, and performance tracing -- no overlap.

## New Files

### `src/lib/analytics/posthog.ts` -- Single source of truth
- Reads `VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST` (defaults to `https://app.posthog.com`)
- Guards against double-init (important with React StrictMode)
- Only enables in staging/production by default (dev opt-in via `VITE_POSTHOG_DEV_ENABLED=true`)
- Exports a thin wrapper API:
  - `analytics.init()` -- called once in `main.tsx`
  - `analytics.identify(user)` -- called on login (sends id, role, plan -- no email/phone)
  - `analytics.track(name, props?)` -- manual event capture
  - `analytics.screen(name, props?)` -- screen view with platform + app version
  - `analytics.reset()` -- called on logout, resets distinct_id
- Privacy config passed to `posthog.init()`:
  - `autocapture: true` (clicks/navigation only)
  - `capture_pageview: false` (we handle it manually via router)
  - `mask_all_text: false` (not session replay -- that's Sentry)
  - `sanitize_properties` callback to strip any property matching `token`, `password`, `authorization`, `secret`, `otp`, `credit_card`
  - `property_denylist` for sensitive super properties
  - Only allowed user traits: `role`, `plan`, `created_at`, `platform`

### `src/hooks/useScreenTracking.ts` -- SPA route tracker
- Uses `useLocation()` from React Router
- On route change, calls `analytics.screen()` with route path, route name, platform, and app version
- Deduplicates consecutive identical paths (prevents double-fires)
- Mounted inside `AnimatedRoutes` in `App.tsx`

### `src/hooks/useCapacitorAnalytics.ts` -- Native lifecycle events
- Only runs when `Capacitor.isNativePlatform()` is true
- Listens to `@capacitor/app` `appStateChange`:
  - `isActive: true` -> tracks `App Resumed` with platform + network status
  - `isActive: false` -> tracks `App Backgrounded`
- Includes platform (ios/android), app version, and connection type
- Mounted inside `NativeLifecycleManager` in `App.tsx`

## Modified Files

### `src/main.tsx`
- Import and call `analytics.init()` before rendering (after web vitals, before Sentry idle-load)

### `src/App.tsx`
- Add `useScreenTracking()` hook inside `AnimatedRoutes`
- Add `useCapacitorAnalytics()` hook inside `NativeLifecycleManager`

### `src/contexts/AuthContext.tsx`
- On `SIGNED_IN` / `INITIAL_SESSION`: call `analytics.identify({ id, role })`
- On `SIGNED_OUT`: call `analytics.reset()`
- Track `Login`, `Logout`, `Signup Completed` events at the appropriate points in `signIn`, `signOut`, `signUp`

### `src/pages/Auth.tsx`
- Track `Signup Started` when user switches to the signup tab
- Track `Login` attempt (success/failure) -- complements the AuthContext tracking

### `src/pages/Admin.tsx`
- Add one more test button: "Test Analytics Event" that calls `analytics.track("Analytics Test", { source: "admin" })` and shows a toast

### `vite.config.ts`
- Add `posthog-js` to `manualChunks` under a new `analytics` chunk to keep bundle lean

## Standard Events Tracked

| Event | Where |
|---|---|
| `App Opened` | `main.tsx` (on init) |
| `Screen Viewed` | `useScreenTracking` (every route change) |
| `Signup Started` | `Auth.tsx` (tab switch) |
| `Signup Completed` | `AuthContext` (after successful signUp) |
| `Login` | `AuthContext` (after successful signIn) |
| `Logout` | `AuthContext` (signOut) |
| `App Resumed` | `useCapacitorAnalytics` (native only) |
| `App Backgrounded` | `useCapacitorAnalytics` (native only) |
| `CTA Clicked` | Available via `analytics.track()` for key buttons as needed |

## Privacy & Security Defaults

- `autocapture` enabled for clicks/navigation but input values are NOT captured (PostHog default when `mask_all_text` is not relevant -- autocapture does not capture input values by default)
- `sanitize_properties` strips any property key matching sensitive patterns before it leaves the browser
- `analytics.identify()` only sends: `id`, `role`, `platform`, `created_at` -- no email, phone, or tokens
- PostHog is completely disabled when `VITE_POSTHOG_KEY` is not set (safe no-op wrapper)

## Dependencies

- `posthog-js` (new install, ~30KB gzipped, loaded in its own chunk)

## Technical Details

- No database changes needed
- No edge functions needed
- PostHog key is a **publishable** client-side key (safe to store in env vars, same as the existing Supabase anon key)
- The wrapper pattern (`analytics.track()` instead of raw `posthog.capture()`) ensures all events go through privacy sanitization and makes it trivial to swap providers later

## Environment Variables Needed

| Variable | Required | Default |
|---|---|---|
| `VITE_POSTHOG_KEY` | Yes | (none -- analytics disabled if missing) |
| `VITE_POSTHOG_HOST` | No | `https://app.posthog.com` |
| `VITE_POSTHOG_DEV_ENABLED` | No | `false` |
