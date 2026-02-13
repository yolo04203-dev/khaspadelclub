

# Production-Grade Mobile Optimization -- Implementation Plan

## Current State Assessment

The codebase already has strong foundations from earlier work:
- Safe area CSS utilities and viewport-fit=cover configured
- Bottom navigation with safe-area padding
- useKeyboardHeight, useNetworkStatus hooks
- ErrorBoundary with copy-to-clipboard diagnostics
- Skeleton loaders for Dashboard, Players, Challenges, Ladders
- EmptyState and ErrorState reusable components
- 44px touch targets on buttons, active:scale feedback
- Capacitor config with StatusBar/SplashScreen plugins
- Logger utility for structured client-side logging

**The previous implementation was interrupted mid-way.** The following files were attempted but NOT saved: `errorReporting.ts`, `image-with-fallback.tsx`, `useHaptics.ts`. None of the Sentry integrations landed.

---

## What This Plan Implements

### 1. Sentry Crash Reporting (Phase 1.1)

**Install:** `@sentry/react`

**Create `src/lib/errorReporting.ts`** -- Sentry initialization module:
- Init with browser tracing + replay integrations
- Filter browser extension errors
- Helpers: `reportError()`, `setErrorReportingUser()`, `clearErrorReportingUser()`, `reportApiError()`
- Reads DSN from `VITE_SENTRY_DSN` env var (Sentry DSN is a publishable value, safe for client bundles)
- Graceful no-op if DSN not set (dev/preview environments)

**Update `src/main.tsx`** -- Call `initErrorReporting()` before render

**Update `src/components/ErrorBoundary.tsx`** -- Add `reportError()` call in `componentDidCatch`

**Update `src/App.tsx`** -- Add `reportError()` to global `unhandledrejection` and `error` handlers

**Update `src/contexts/AuthContext.tsx`** -- Call `setErrorReportingUser()` on login, `clearErrorReportingUser()` on sign-out

**Note for user:** To enable Sentry in the Capacitor build, add `VITE_SENTRY_DSN=your-dsn-here` to your local `.env` file before running `npm run build`. In the Lovable preview, Sentry will be inactive (no DSN configured as a VITE_ variable).

### 2. ImageWithFallback Component (Phase 1.4)

**Create `src/components/ui/image-with-fallback.tsx`**:
- Lazy loading (`loading="lazy"`, `decoding="async"`)
- Error state with placeholder icon
- Retry button to reload failed images
- Cache-busting on retry via query param
- Fallback source support

### 3. Haptics Hook (Phase 3)

**Install:** `@capacitor/haptics`

**Create `src/hooks/useHaptics.ts`**:
- Dynamic import of `@capacitor/haptics` (tree-shaken on web)
- Methods: `impact(style)`, `notification(type)`, `selectionStart/Changed/End`
- Silent fallback when running in browser (no Capacitor)

### 4. Accessibility Hardening (Phase 4)

**Update `src/index.css`** -- Add global a11y styles:
- Visible focus outlines using `:focus-visible` ring
- Enforce 44px minimum touch targets on all interactive elements
- Proper contrast for focus states
- `forced-colors` media query support for high-contrast mode

### 5. Centralized API Client (Phase 1.2)

**Create `src/lib/apiClient.ts`**:
- Wraps `supabase.functions.invoke()` and raw fetch with:
  - 15-second default timeout via AbortController
  - Single retry for GET/HEAD on failure
  - Typed `AppError` normalization (offline, 401 auth expired, 403 forbidden, 404, 422 validation, 500+ server error)
  - Auto-cancellation on component unmount
- Methods: `apiClient.get()`, `apiClient.post()`, `apiClient.put()`, `apiClient.delete()`
- Integrates with `reportApiError()` from errorReporting

### 6. Performance Utilities (Phase 2)

**Update `src/index.css`** -- Add GPU compositing hints:
- `.gpu-accelerated` utility already exists, verify it has `contain: content`
- Add `.scroll-optimized` class with `will-change: scroll-position`

**Create `src/lib/perfBudget.ts`** -- Constants documenting performance targets:
- Scroll: 50-60fps
- TTI: under 2.5s on 4G
- Tap latency: under 100ms
- Long task threshold: 50ms

### 7. Bottom Nav Spacing on All Pages

Currently only the AppHeader renders the fixed bottom nav, but page content does not account for the 64px + safe-area-inset-bottom height. This means content at the bottom of pages is hidden behind the nav bar.

**Update all authenticated pages** -- Add `pb-safe-nav` class to the main content wrapper on:
- Dashboard, Players, Challenges, Ladders, Stats, Profile, Tournaments, FindOpponents, Americano

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/errorReporting.ts` | Create | Sentry init + helpers |
| `src/lib/apiClient.ts` | Create | Centralized API client with timeout/retry/abort |
| `src/lib/perfBudget.ts` | Create | Performance budget constants |
| `src/components/ui/image-with-fallback.tsx` | Create | Image component with fallback + retry |
| `src/hooks/useHaptics.ts` | Create | Native haptic feedback hook |
| `src/main.tsx` | Edit | Init Sentry before render |
| `src/App.tsx` | Edit | Report errors to Sentry |
| `src/components/ErrorBoundary.tsx` | Edit | Report caught errors to Sentry |
| `src/contexts/AuthContext.tsx` | Edit | Set/clear Sentry user context |
| `src/index.css` | Edit | Add a11y focus styles, touch target enforcement |
| `src/pages/Dashboard.tsx` | Edit | Add pb-safe-nav |
| `src/pages/Players.tsx` | Edit | Add pb-safe-nav |
| `src/pages/Challenges.tsx` | Edit | Add pb-safe-nav |
| `src/pages/Ladders.tsx` | Edit | Add pb-safe-nav |
| `src/pages/Stats.tsx` | Edit | Add pb-safe-nav |
| `src/pages/Profile.tsx` | Edit | Add pb-safe-nav |
| `src/pages/Tournaments.tsx` | Edit | Add pb-safe-nav |

**New dependencies:** `@sentry/react`, `@capacitor/haptics`

---

## Post-Implementation

After pulling these changes, run:
1. `npm install`
2. `npx cap sync`
3. Add `VITE_SENTRY_DSN=<your-dsn>` to local `.env`
4. Test on device with `npx cap run ios` / `npx cap run android`

For full details on building and testing with Capacitor, see the [Lovable Capacitor blog post](https://lovable.dev/blog/building-mobile-apps-with-lovable-and-capacitor).

