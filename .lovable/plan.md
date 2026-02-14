
# Implementation Plan: 4 Remaining Production Mobile Items

## 1. Android Hardware Back Button Handling

**File: `src/App.tsx`** -- Modify `NativeLifecycleManager`

Add a `backButton` listener inside the existing `setup()` function (after the `appStateChange` listener, around line 126). Logic:
- Capacitor provides a `canGoBack` flag indicating if the WebView has history
- If `canGoBack` is true, call `navigate(-1)`
- If false (user is on root), call `CapApp.exitApp()`
- Add cleanup in the return function

## 2. Chunk-Load Error Recovery

**File: `src/App.tsx`** -- Add `lazyWithRetry` utility and `ChunkErrorFallback` component

- Create a `lazyWithRetry(importFn)` wrapper that catches failed dynamic imports, waits 1.5s, retries once, and on second failure returns a fallback component
- The `ChunkErrorFallback` component shows "Failed to load page" with a "Reload" button that calls `window.location.reload()`
- Replace all 21 `lazy()` calls with `lazyWithRetry()` using the existing `lazyImports` map

## 3. "Report a Problem" Dialog

**New file: `src/components/ReportProblemDialog.tsx`**

A dialog component that:
- Has a textarea for a short description (required, max 500 chars)
- On submit, sends a Sentry user feedback event via `Sentry.captureFeedback()` with context: current URL, app version, platform, network type
- Shows a success toast on completion
- Uses existing `Dialog` UI components

**File: `src/pages/Profile.tsx`** -- line 627-632

Replace the existing "Report Issue / Send Feedback" link (which currently navigates to `/contact`) with a button that opens the new `ReportProblemDialog`. This gives users an in-app reporting flow instead of navigating away. The `/contact` page remains available for other purposes.

## 4. Expanded Observability Test Suite

**File: `src/pages/Admin.tsx`** -- lines 343-354

Replace the single "Test Error" button with a group of four buttons:
- **Throw test error** (existing behavior -- `sendTestError()` + logger)
- **Unhandled rejection** (`Promise.reject(new Error("Test unhandled rejection"))`)
- **Send breadcrumb** (`Sentry.addBreadcrumb(...)` + toast confirmation)
- **Capture message** (`Sentry.captureMessage("Test message from admin")` + toast)

## Technical Notes

- No new dependencies required -- `@sentry/react` and `@capacitor/app` are already installed
- No database changes needed
- The `ChunkErrorFallback` component will be defined inline in `App.tsx` to keep it simple
- The `lazyWithRetry` export of `lazyImports` remains intact for prefetching in `AppHeader`
