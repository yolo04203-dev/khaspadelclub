

## Diagnosis: App Not Opening on Google Play Store (Android)

### Root Cause Analysis

After thorough codebase review, there are **three critical issues** that can cause the app to crash or show a white screen on Android devices from the Play Store:

---

### Issue 1: Content Security Policy Blocks Script Execution (CRITICAL)

**File:** `index.html` (line 21)

The CSP meta tag has `script-src 'self'` which is **too restrictive** for Capacitor on Android. When the app runs inside a Capacitor WebView:
- The `androidScheme: 'https'` means scripts load from a synthetic `https://localhost` origin
- Vite's production build may generate inline scripts (e.g. module preload polyfills) that are blocked by `script-src 'self'` (no `'unsafe-inline'`)
- The Sentry Replay integration injects inline scripts that get blocked
- This causes a **white screen / app not opening** on Android

**Fix:** Relax the CSP for Capacitor compatibility — add `'unsafe-inline'` to `script-src`, or better, remove the CSP meta tag entirely for native builds since the WebView is already sandboxed and CSP provides no security benefit inside a native app shell.

Since this is a shared `index.html` for both web and native, the safest approach is to add `'unsafe-inline'` to `script-src` and add `https://localhost` and `capacitor://localhost` to `connect-src` (iOS uses the capacitor scheme).

### Issue 2: Logger Constructor Runs Before DOM is Ready

**File:** `src/lib/logger.ts` (line 76-82)

The `Logger` class constructor calls `this.startFlushTimer()` which sets up a `setInterval` that calls `supabase.auth.getSession()` every 3 seconds. On Android cold start:
- The Supabase client may not have localStorage ready yet
- The flush timer fires before the app has even rendered
- If `supabase.auth.getSession()` throws during early initialization, the error propagates and can crash the app since the logger's own error handling in `flush()` only catches the insert call, not the getSession call

**Fix:** Defer the flush timer start until after the first render using a lazy initialization pattern, and add a try-catch guard around the entire flush method.

### Issue 3: Service Worker Registration on Native Platform

**File:** `src/main.tsx` (lines 46-62)

The service worker registration runs on all platforms including Capacitor Android. Service workers inside a Capacitor WebView can cause:
- Cache conflicts with Capacitor's own asset serving
- Navigation interception issues (the SW intercepts fetches that Capacitor's asset handler should serve)
- Stale content after app updates from the Play Store

**Fix:** Skip service worker registration when running on a native Capacitor platform.

---

### Changes Summary

| File | Change |
|---|---|
| `index.html` | Add `'unsafe-inline'` to `script-src`, add Capacitor origins to `connect-src` and `default-src` |
| `src/main.tsx` | Guard SW registration with `!Capacitor.isNativePlatform()` check |
| `src/lib/logger.ts` | Defer flush timer, add full try-catch in flush, guard against early init |
| `capacitor.config.ts` | Add `loggingBehavior: 'none'` for production, add `backgroundColor` for Android splash |

### What Will NOT Change
- No UI changes
- No database changes  
- No new dependencies
- All existing functionality preserved

