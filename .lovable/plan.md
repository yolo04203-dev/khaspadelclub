

# 1000 Concurrent User Testing and Optimization Plan

## Audit Summary

The codebase is already well-hardened across most areas. Here is the current status and the remaining gaps to address.

### Already in Place (No Changes Needed)

| Area | Implementation |
|------|---------------|
| FCP optimization | Fonts preloaded via `<link>` in index.html, preconnect to backend and Google Fonts |
| TTI budget | Performance budget set at 2.5s, code splitting across 21 routes, 3 manual vendor chunks |
| Tap responsiveness | `touch-manipulation` globally removes 300ms delay; `active:scale-[0.97]` gives press feedback |
| Safe areas (iOS) | CSS env() insets for notch, home indicator; `pb-safe-nav` utility class |
| Input zoom prevention | Global CSS enforces 16px minimum on inputs |
| Touch targets | 44px minimum on `pointer:coarse` devices |
| Keyboard handling | `useKeyboardHeight` hook auto-scrolls focused inputs into view |
| Error boundaries | Global `ErrorBoundary` + per-route `RouteErrorBoundary` with copy-to-clipboard diagnostics |
| Crash reporting | Sentry with browser tracing, session replay, user identity |
| Unhandled rejections | Global listeners in App.tsx, forwarded to Sentry |
| API resilience | `apiClient.ts` with 15s timeouts, retry for idempotent methods, AbortController |
| Query caching | 2-min staleTime, 10-min gcTime, exponential backoff retries |
| Dark mode | next-themes with full CSS variable coverage |
| Haptic feedback | `useHaptics` hook with Capacitor Haptics |
| Web Vitals tracking | FCP, LCP, CLS, INP via PerformanceObserver |
| Real-time health | `useRealtimeHealth` hook with connection status tracking and cleanup |
| Deep linking | Capacitor `appUrlOpen` listener routing through React Router |
| Foreground refresh | `appStateChange` listener triggers React Query refetch |
| Splash screen | Manual dismissal after auth resolves |
| Status bar theming | Dynamic StatusBar style synced with light/dark theme |
| Pagination | 30-50 items per page with Load More pattern |
| Search debouncing | 300ms debounce on all search inputs |
| Skeleton loaders | Dashboard, Challenges, Ladder Detail pages |
| Credential security | Only anon key exposed (public by design); service role key is server-side only |
| Load testing infra | Supports up to 2000 concurrent users with ramp-up, per-endpoint stats, percentile tracking |

---

## Gaps Found and Fixes

### 1. Players Page: Missing Skeleton Loader

The Players page uses a basic `Loader2` spinner during initial load (line 199-201). A `PlayerCardSkeleton` component already exists in `skeleton-card.tsx` but is not being used.

**Fix:** Replace the spinner with 6 `PlayerCardSkeleton` instances to match the pattern used by Dashboard and Challenges.

**File:** `src/pages/Players.tsx`

---

### 2. Load Test: Missing 1000-User Tier

The current benchmark tests cover 100 and 500 concurrent users, but the requirement specifies 1000. No 1000-user test scenario exists.

**Fix:** Add a "1000 Concurrent Users" test suite to `performance-benchmarks.test.ts` with:
- Error rate under 5%
- P95 response time under 3x the acceptable threshold (9 seconds)
- Minimum 50 requests/second throughput
- Full endpoint breakdown logging

**File:** `src/test/performance-benchmarks.test.ts`

---

### 3. Load Test: Missing RPC Endpoint Coverage

The load test only covers simple table queries and mutations. The app's heaviest query -- `get_player_unified_stats` RPC -- is not tested. Under 1000 concurrent users, this function (which runs multiple JOINs and subqueries) is the most likely bottleneck.

**Fix:** Add the `get_player_unified_stats` RPC call as a new test endpoint in `load-test.ts` with a realistic weight.

**File:** `src/test/load-test.ts`

---

### 4. Performance Budget: Missing 1000-User Constant

The `perfBudget.ts` file defines budgets for TTI, tap latency, and scroll FPS, but has no constant for concurrent user capacity or API response time targets. This makes it harder to enforce the 1000-user requirement in automated tests.

**Fix:** Add `CONCURRENT_USERS_TARGET`, `API_RESPONSE_MAX_MS`, and `LOAD_ERROR_RATE_MAX_PCT` constants.

**File:** `src/lib/perfBudget.ts`

---

### 5. Dashboard: framer-motion Wrapper on Full Page Content

The Dashboard wraps its entire main content in a `<motion.div>` with an opacity+translate animation (line 211-215). For a page with 4 stat cards, mode breakdown badges, and 7 action cards, this creates a single large animation that blocks TTI until the animation completes.

**Fix:** Remove the `<motion.div>` wrapper. The skeleton-to-content transition already provides a smooth perceived loading experience.

**File:** `src/pages/Dashboard.tsx`

---

## Technical Details

### File Changes

| File | Change |
|------|--------|
| `src/pages/Players.tsx` | Replace Loader2 spinner with PlayerCardSkeleton grid |
| `src/pages/Dashboard.tsx` | Remove motion.div wrapper around main content |
| `src/test/performance-benchmarks.test.ts` | Add 1000-user test suite |
| `src/test/load-test.ts` | Add `get_player_unified_stats` RPC endpoint |
| `src/lib/perfBudget.ts` | Add concurrent user and API response constants |

### What Cannot Be Tested in Lovable (Requires Local Setup)

- Real-device iOS/Android battery and memory profiling
- Lighthouse audits on physical devices
- Network throttling tests (3G/4G simulation)
- Native permission dialogs (camera, location)
- App Store / Play Store submission

