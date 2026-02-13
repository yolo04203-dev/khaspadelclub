

# Cross-Platform iOS/Android Audit Report and Optimization Plan

## Current State: What's Already Done (Well)

The codebase is already hardened for cross-platform mobile use. Here is a summary of what's in place:

| Area | Status | Implementation |
|------|--------|----------------|
| Safe area insets | Done | CSS classes (safe-top, safe-bottom, pb-safe-nav), FAB positioning with env() |
| Input font size >= 16px | Done | Global CSS rule prevents iOS auto-zoom |
| Touch targets >= 44px | Done | CSS rule on pointer:coarse media query |
| No tap delay | Done | touch-manipulation on all interactive elements |
| No rubber-band bounce | Done | overscroll-behavior: none globally |
| Tap highlight removed | Done | -webkit-tap-highlight-color: transparent |
| Button press feedback | Done | active:scale-[0.97] + haptic-tap utility |
| Haptic feedback | Done | useHaptics hook with Capacitor Haptics |
| Error boundaries | Done | Global ErrorBoundary + RouteErrorBoundary |
| Crash reporting | Done | Sentry with tracing, replay, user identity |
| Unhandled rejection handling | Done | Global event listeners in App.tsx |
| Dark mode | Done | next-themes with CSS variables |
| Keyboard handling | Done | useKeyboardHeight hook (visualViewport API) |
| Pull-to-refresh | Done | Custom PullToRefresh component with WebKit guards |
| Skeleton loaders | Done | Dashboard, Players, Stats pages |
| Code splitting | Done | 21 lazy-loaded routes |
| Chunk splitting | Done | 3 manual vendor chunks |
| PWA manifest | Done | Standalone, portrait, PNG icons with purpose:any |
| Service worker | Done | Network-first, skips /~oauth and API routes |
| Capacitor config | Done | iOS contentInset, Android mixedContent, StatusBar, SplashScreen |
| Web Vitals tracking | Done | FCP, LCP, CLS, INP via PerformanceObserver |
| Performance budgets | Done | TTI < 2.5s, tap < 100ms, 60fps scroll |
| Safe navigation | Done | useSafeNavigation with WebKit fallback |
| Network monitoring | Done | useNetworkStatus with offline/slow banners |
| Query caching | Done | 2-min staleTime, 10-min gcTime, retry with backoff |
| Font loading | Done | Preloaded in index.html, non-blocking |
| Preconnect hints | Done | Supabase + Google Fonts domains |
| FAB component | Done | Safe-area-aware positioning |
| Image resilience | Done | ImageWithFallback with lazy loading + retry |

## Gaps Found and Fixes

### 1. Profile Page: Missing Skeleton Loader
The Profile page shows a plain centered spinner during loading, unlike Dashboard and Players which use proper skeleton loaders. This creates an inconsistent perceived-performance experience.

**Fix:** Replace the Loader2 spinner with a skeleton layout matching the profile card structure.

**File:** `src/pages/Profile.tsx`

---

### 2. Dashboard: Duplicated Fetch Logic
The Dashboard has identical data-fetching logic in both the initial `useEffect` and the `handleRefresh` callback (~80 lines duplicated). This is a maintainability risk -- bugs fixed in one path may not be fixed in the other.

**Fix:** Extract the shared fetch logic into a single `fetchDashboardData` function and call it from both the initial effect and the pull-to-refresh handler.

**File:** `src/pages/Dashboard.tsx`

---

### 3. Deep Linking for Capacitor (iOS/Android)
No deep linking configuration exists. Users cannot open specific app content (e.g., a tournament or player profile) from external links or notifications.

**Fix:** Add a Capacitor App Listener in `App.tsx` that intercepts deep link URLs and routes them through React Router. Add associated link domain entries to the Capacitor config.

**Files:** `src/App.tsx`, `capacitor.config.ts`

---

### 4. Status Bar and Navigation Bar Styling
The Capacitor config sets a static dark status bar, but doesn't adapt to the current theme (light/dark mode). On iOS, this can cause white text on a white background in light mode.

**Fix:** Add a `useStatusBar` hook that listens to theme changes and dynamically updates the Capacitor StatusBar style to match.

**File:** New `src/hooks/useStatusBar.ts`, integrate in `App.tsx`

---

### 5. App State Lifecycle Handling (Background/Foreground)
When the app returns from background on mobile, stale data may be shown. There is no foreground-resume handler to refresh critical data.

**Fix:** Add a Capacitor App state change listener that triggers a React Query refetch of active queries when the app returns to the foreground.

**File:** `src/App.tsx`

---

### 6. Splash Screen Dismissal
The Capacitor config has `launchAutoHide: true` for the splash screen, but for a smoother experience, the splash should be dismissed only after the auth state is resolved (preventing a flash of the login screen for authenticated users).

**Fix:** Set `launchAutoHide: false` in `capacitor.config.ts` and programmatically hide the splash screen in `AuthContext.tsx` after `isLoading` becomes `false`.

**Files:** `capacitor.config.ts`, `src/contexts/AuthContext.tsx`

---

## Technical Details

### File Changes Summary

| File | Action |
|------|--------|
| `src/pages/Profile.tsx` | Replace spinner with skeleton loader |
| `src/pages/Dashboard.tsx` | Extract shared fetch logic to eliminate duplication |
| `src/App.tsx` | Add deep link listener + foreground resume handler |
| `capacitor.config.ts` | Disable splash auto-hide, add deep link config |
| `src/contexts/AuthContext.tsx` | Dismiss splash screen after auth resolves |
| `src/hooks/useStatusBar.ts` | New -- dynamic status bar style based on theme |

### Items Outside Lovable Scope (Require Local Setup)

These items cannot be implemented within Lovable but are documented for completeness:

- **Push Notifications (FCM):** Requires Firebase project setup, native permission handling, and server-side token management. Must be configured locally with `@capacitor/push-notifications`.
- **E2E Testing (Detox/Appium):** Requires native build toolchain and physical/emulator device access.
- **CI/CD Pipeline:** Requires GitHub Actions or similar configuration in the repository.
- **Feature Flags:** Requires an external service (LaunchDarkly, Unleash) or a custom database-backed implementation.
- **Staged Rollouts:** Handled at the App Store / Play Store level during submission.

