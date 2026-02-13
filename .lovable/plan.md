

# Performance Audit and Optimization Plan

## Current State Assessment

The codebase already has a strong performance foundation:
- Route-level code splitting with lazy loading
- Manual chunk splitting (react-vendor, ui-vendor, supabase)
- Load testing infrastructure for 500+ concurrent users
- Performance budget constants (TTI < 2.5s, tap < 100ms, 60fps scroll)
- Query parallelization with Promise.all
- Skeleton loaders on data pages
- 44px touch targets with active:scale-[0.97] press feedback
- touch-manipulation on all interactive elements (eliminates 300ms tap delay)
- Image lazy loading via ImageWithFallback component
- Debounced search (300ms) and server-side pagination (30-50 items)
- QueryClient with 2-min staleTime and 10-min gcTime

## Issues Found

### 1. Render-Blocking Font Loading (Impacts FCP)
Google Fonts are loaded via a blocking `@import url(...)` in `index.css`. This delays First Contentful Paint by several hundred milliseconds as the browser must download and parse the CSS before rendering any text.

**Fix:** Move font loading to `index.html` using `<link rel="preconnect">` and `<link rel="preload">` with `font-display: swap` to allow text to render immediately with a fallback font.

**File:** `index.html`, `src/index.css`

---

### 2. No Web Vitals Measurement (No FCP/TTI Tracking)
There is no runtime measurement of Core Web Vitals (FCP, LCP, CLS, INP). Without this, performance regressions cannot be detected in production.

**Fix:** Add a lightweight Web Vitals reporter that logs FCP, LCP, CLS, and INP metrics using the `web-vitals` library (or the native PerformanceObserver API to avoid adding a dependency).

**File:** New file `src/lib/webVitals.ts`, update `src/main.tsx`

---

### 3. No List Virtualization for Long Lists
The Players page renders all loaded items (30+ cards with avatars, badges, metadata) in the DOM simultaneously. Each card includes framer-motion animation wrappers. As users click "Load More," the DOM grows unbounded.

**Fix:** Add `react-window` for the Players list to virtualize rendering. Only visible items (plus a small overscan buffer) will be in the DOM.

**File:** `src/pages/Players.tsx`

---

### 4. Missing Resource Hints (Preconnect)
No `<link rel="preconnect">` for the Supabase API domain. Every first request to the backend incurs DNS + TCP + TLS handshake latency (~200-400ms on mobile).

**Fix:** Add preconnect hints for the Supabase domain and Google Fonts in `index.html`.

**File:** `index.html`

---

### 5. Framer Motion on List Items (Unnecessary Re-renders)
Every player card in Players.tsx is wrapped in `<motion.div>` with `initial/animate` props. For a list of 30+ items, this creates 30+ animation instances on mount, adding main-thread work that can push TTI above budget.

**Fix:** Remove per-item motion wrappers from list items. Keep only the parent container animation. This eliminates dozens of unnecessary animation calculations on page load.

**File:** `src/pages/Players.tsx`

---

### 6. Expand Load Test Coverage for 500+ Users
The existing load test infrastructure is solid but only tests read queries. It does not simulate mutations (challenge creation, score submission, profile updates) which are the most likely bottlenecks under load.

**Fix:** Add mutation endpoints to the load test suite and add a dedicated 500-user benchmark that reports per-endpoint P95 latency.

**File:** `src/test/load-test.ts`, `src/test/performance-benchmarks.test.ts`

---

### 7. Real-Time Subscription Scalability Check
Supabase real-time channels are used for rankings and tournament updates. Under 500+ concurrent users, each user holds an open WebSocket connection. No connection management or reconnection strategy is documented.

**Fix:** Add a real-time connection health monitor that tracks subscription count and reconnection events. Ensure channels are properly cleaned up on unmount.

**File:** New file `src/hooks/useRealtimeHealth.ts`

---

## Technical Summary

| Area | Current | Target | Change |
|------|---------|--------|--------|
| FCP | ~2.5-3.5s (blocked by fonts) | < 2.0s | Preload fonts, preconnect |
| TTI | ~2.5-3.0s | < 2.5s | Remove per-item animations, virtualize lists |
| Tap Latency | < 100ms (touch-manipulation) | < 100ms | Already met -- no change needed |
| Button Feedback | active:scale[0.97] on all buttons | Immediate | Already met -- no change needed |
| Long Lists | Full DOM rendering | Virtualized | Add react-window to Players |
| Web Vitals | No measurement | Tracked | Add PerformanceObserver reporter |
| Load Test | 500 users, reads only | 500 users, reads + writes | Add mutation endpoints |
| Caching | 2-min stale, 10-min gc | No change needed | Already well configured |
| Images | Lazy loaded, retry logic | No change needed | Already well implemented |

### Files to Create/Modify

| File | Action |
|------|--------|
| `index.html` | Add preconnect hints, preload fonts |
| `src/index.css` | Remove blocking @import, use CSS @font-face with swap |
| `src/lib/webVitals.ts` | New -- lightweight Web Vitals reporter |
| `src/main.tsx` | Import and initialize Web Vitals |
| `src/pages/Players.tsx` | Remove per-item motion wrappers, add react-window virtualization |
| `src/test/load-test.ts` | Add mutation test endpoints |
| `src/hooks/useRealtimeHealth.ts` | New -- real-time connection health monitor |

### No Changes Needed (Already Optimized)

- Button interaction speed (touch-manipulation + active states = sub-100ms)
- Route code splitting (21 lazy-loaded routes)
- Chunk splitting (3 manual vendor chunks)
- Query caching strategy (staleTime/gcTime well tuned)
- Search debouncing (300ms)
- Pagination (30-50 items per page)
- Skeleton loading screens
- Network status monitoring
- Image lazy loading with retry

