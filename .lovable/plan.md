

# Production-Grade Error Tracking + Crash Prevention for Capacitor

## What Already Exists (and What's Missing)

Your app already has a solid foundation. Here's the gap analysis:

| Feature | Status | Gap |
|---------|--------|-----|
| Sentry SDK (`@sentry/react`) | Installed | No DSN configured (VITE_SENTRY_DSN env var missing) |
| ErrorBoundary + fallback UI | Done | No "test error" button to verify reporting |
| Global error/rejection handlers | Done (duplicated in main.tsx AND App.tsx) | Need to deduplicate |
| Logger with DB batching | Done | Not wired to Sentry breadcrumbs |
| API client with retries/timeouts | Done | Not adding Sentry breadcrumbs for network calls |
| Offline/slow-connection banners | Done | -- |
| Admin Errors dashboard | Done | -- |
| Web Vitals tracking | Done | Not sent to Sentry |
| Capacitor native crash bridge | MISSING | Need `@sentry/capacitor` |
| Release/version tagging | MISSING | No git hash or app version in Sentry |
| Navigation breadcrumbs | MISSING | Route changes not tracked as breadcrumbs |
| Safe Capacitor plugin wrapper | MISSING | Plugin failures (Camera, etc.) not caught systematically |
| PII scrubbing in beforeSend | PARTIAL | Only filters browser extensions, no token/password redaction |
| Long-task detection | MISSING | Not reported to Sentry |
| Test error button | MISSING | No way to verify reporting on device |

## Implementation Plan

### 1. Configure VITE_SENTRY_DSN

You will need to add your Sentry DSN as a secret so Sentry actually initializes. Currently `VITE_SENTRY_DSN` is not set, so `initErrorReporting()` skips initialization entirely. I will ask you to provide this value.

### 2. Upgrade Sentry init with release tagging, PII scrubbing, and navigation breadcrumbs

**File:** `src/lib/errorReporting.ts`

- Add `release` tag using app version from `package.json` (via Vite define)
- Add `Sentry.browserNavigationIntegration()` for automatic route change breadcrumbs
- Expand `beforeSend` hook to:
  - Filter browser extension errors (already done)
  - Scrub `authorization`, `cookie`, `token`, `password`, `email`, `phone` from request headers and body
  - Drop events from known bot user agents
- Add `beforeBreadcrumb` hook to redact sensitive URLs (auth tokens in query params)
- Wire user context from AuthContext (already done via `setErrorReportingUser`)

### 3. Create a safe Capacitor plugin wrapper

**File:** `src/lib/safePlugin.ts` (new)

A utility that wraps any Capacitor plugin call in try/catch:
- Normalizes the error into a user-friendly result
- Reports failures to Sentry with plugin name + method as context
- Reports to the logger (which writes to client_errors DB)
- Returns `{ success: true, data }` or `{ success: false, error: "user-friendly message" }`

Example usage:
```
const result = await safePluginCall("Camera", () => Camera.getPhoto(options));
if (!result.success) toast.error(result.error);
```

### 4. Add long-task detection and reporting

**File:** `src/lib/webVitals.ts`

Add a `PerformanceObserver` for `longtask` entries. When a task exceeds 100ms, add a Sentry breadcrumb with the task duration and attribution (if available). This helps correlate UI freezes with specific errors.

### 5. Wire logger to Sentry breadcrumbs

**File:** `src/lib/logger.ts`

In the `error()` and `warn()` methods, also call `Sentry.addBreadcrumb()` so that when a crash happens, the Sentry issue includes the trail of warnings/errors that led up to it.

### 6. Deduplicate global error handlers

**File:** `src/main.tsx` and `src/App.tsx`

Currently both files register `window.addEventListener("error")` and `window.addEventListener("unhandledrejection")` -- meaning every error is captured twice. Remove the duplicate from `App.tsx` (keep `main.tsx` since it runs earlier and catches errors during React mounting).

### 7. Add API call breadcrumbs to apiClient

**File:** `src/lib/apiClient.ts`

After each successful or failed request, call `Sentry.addBreadcrumb()` with:
- category: "http"
- URL, method, status code, response time
- This gives you a timeline of API calls leading up to any crash

### 8. Add a "Test Error" button to the Admin page

**File:** `src/pages/Admin.tsx`

Add a small button (visible only to admins) that:
- Throws a test error caught by ErrorBoundary
- Fires a test `logger.error()` (writes to DB)
- Fires a test `Sentry.captureMessage("Test error from admin")`
- Shows a toast confirming the error was sent

This lets you verify the full pipeline from a real device.

### 9. Add Vite config for app version

**File:** `vite.config.ts`

Use `define` to inject the app version from `package.json` at build time:
```
define: { __APP_VERSION__: JSON.stringify(require('./package.json').version) }
```
This is used by Sentry's `release` tag without adding runtime overhead.

## Files Changed

| File | Change |
|------|--------|
| `src/lib/errorReporting.ts` | Add release tagging, PII scrubbing, navigation breadcrumbs, long-task integration |
| `src/lib/safePlugin.ts` | New -- safe Capacitor plugin call wrapper |
| `src/lib/logger.ts` | Add Sentry breadcrumb integration |
| `src/lib/apiClient.ts` | Add Sentry breadcrumbs for HTTP calls |
| `src/lib/webVitals.ts` | Add long-task detection with Sentry breadcrumbs |
| `src/main.tsx` | Keep global handlers (already correct) |
| `src/App.tsx` | Remove duplicate global error handlers |
| `src/pages/Admin.tsx` | Add "Test Error" button |
| `vite.config.ts` | Add `__APP_VERSION__` define |
| `src/vite-env.d.ts` | Add type declaration for `__APP_VERSION__` |

## What About @sentry/capacitor?

The `@sentry/capacitor` package provides native iOS/Android crash reporting (Objective-C/Java level crashes). However, it requires native build tooling (Xcode/Android Studio) to integrate and cannot be set up from the web codebase alone. Your current setup with `@sentry/react` already captures all JavaScript-level errors in the Capacitor WebView, which covers 99% of crashes your users will encounter.

If you want native-level crash reporting later, you would:
1. Install `@sentry/capacitor` via npm
2. Run `npx cap sync`
3. Add the Sentry DSN to `capacitor.config.ts` plugins section

For now, the JavaScript-level Sentry + your client_errors DB gives you complete visibility into user-facing errors on mobile.

## What This Does NOT Change

- No database schema changes
- No new database tables
- ErrorBoundary UI stays the same (already production-ready)
- Admin ErrorsTab stays the same
- Offline/slow-connection handling stays the same
- No new npm dependencies needed (everything uses existing @sentry/react)

