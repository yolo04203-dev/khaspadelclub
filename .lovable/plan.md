

## Speed Up Web App Loading

### Problem

The app has **FCP/LCP of 6.5 seconds** (rated "poor"). The root cause is that the entire app initialization chain blocks rendering, even for first-time visitors who just need to see the landing page.

### Root Causes Identified

1. **Auth blocks everything**: `AuthProvider` calls `getSession()` + `fetchUserRole()` before any page renders, even the public landing page where no auth is needed.
2. **NotificationProvider fires queries for unauthenticated users**: It runs DB queries on mount even when there is no logged-in user (it does bail out, but still adds to the provider chain).
3. **PostHog loads before first render**: `analytics.init()` in `main.tsx` dynamically imports posthog-js (~40KB) before `createRoot().render()` completes.
4. **AnimatePresence wraps all routes**: `framer-motion`'s AnimatePresence is in the critical path for every page transition, including the initial render.
5. **Auth page is eagerly imported**: `import Auth from "./pages/Auth"` is a synchronous import alongside Index, but Auth is only needed after clicking "Get Started".

### Plan

#### Step 1: Split routes into public and authenticated groups

Restructure `App.tsx` so the landing page (`/`, `/privacy`, `/terms`, `/contact`) renders **outside** the `AuthProvider` and `NotificationProvider`. Only wrap authenticated routes (dashboard, ladders, challenges, etc.) in these providers.

This means first-time visitors see the landing page instantly without waiting for session restoration or notification queries.

```text
Before:
  ErrorBoundary > QueryClient > AuthProvider > NotificationProvider > ALL Routes

After:
  ErrorBoundary > QueryClient > BrowserRouter >
    Route "/" -> Index (no auth needed)
    Route "/auth" -> Auth (no auth needed)
    Route "/privacy" -> Privacy (no auth needed)
    Route "/terms" -> Terms (no auth needed)
    Route "/contact" -> Contact (no auth needed)
    Route "/*" -> AuthProvider > NotificationProvider > Authenticated Routes
```

#### Step 2: Lazy-load Auth page

Change `Auth` from an eager import to a lazy import. It is only needed when the user clicks "Get Started", so it should not be in the initial bundle.

#### Step 3: Defer PostHog initialization

Move `analytics.init()` from before render to after first paint using `requestIdleCallback` (similar to how Sentry is already deferred). This removes the posthog-js dynamic import from the critical path.

#### Step 4: Remove AnimatePresence from initial render

For the landing page route specifically, skip the `PageTransition` wrapper since the Hero section already uses CSS animations (`hero-animate` classes). The framer-motion animation adds no value on initial load but costs time to parse and execute.

Approach: Only wrap lazy-loaded routes in `PageTransition`, not eagerly loaded ones.

#### Step 5: Defer webVitals initialization

Move `initWebVitals()` to after first render using `requestIdleCallback`, similar to the Sentry pattern already in place.

### Technical Details

**Step 1 - Route splitting in App.tsx:**
- Create an `AuthenticatedApp` component that wraps `AuthProvider > NotificationProvider > authenticated routes`
- Lazy-load `AuthenticatedApp` so its providers only initialize when a user navigates to a protected route
- Public routes render immediately with just `QueryClientProvider` and `BrowserRouter`

**Step 2 - Auth lazy loading:**
```typescript
// Before (eager)
import Auth from "./pages/Auth";

// After (lazy)
const Auth = lazyWithRetry(() => import("./pages/Auth"));
```

**Step 3 - Defer PostHog:**
```typescript
// Before
analytics.init();
createRoot(...).render(<App />);

// After
createRoot(...).render(<App />);
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => analytics.init());
} else {
  setTimeout(() => analytics.init(), 2000);
}
```

**Step 5 - Defer webVitals:**
```typescript
// Before
initWebVitals();

// After
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => initWebVitals());
} else {
  setTimeout(() => initWebVitals(), 1000);
}
```

### Files Changed

- `src/main.tsx` -- defer PostHog and webVitals initialization
- `src/App.tsx` -- split routes into public (no auth) and authenticated groups, lazy-load Auth, remove AnimatePresence from landing page

### Expected Impact

- Landing page FCP should drop from ~6.5s to under 2s (in dev mode; production will be even faster with bundled chunks)
- Authenticated pages remain unchanged in behavior
- No visual or functional regressions for logged-in users

