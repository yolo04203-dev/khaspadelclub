

## Mobile-First Capacitor Performance Optimization

After thorough analysis, **most of the 10 requested optimizations are already implemented**. Here is what exists and what remains:

### Already Done (no changes needed)
- **1. Route-based code splitting** — All routes use `lazyWithRetry` with `Suspense`
- **3. Vite build config** — Sourcemaps disabled, Terser enabled, `manualChunks` configured for all major vendors
- **4. Non-blocking data fetching** — Dashboard uses skeleton loaders and defers stats via `requestIdleCallback`
- **5. In-memory caching** — React Query configured with `staleTime: 2min`, `gcTime: 10min`, `refetchOnWindowFocus: false`
- **7. Capacitor optimization** — SplashScreen hides only after auth resolves; SPA navigation; production build used
- **8. Tree-shaking** — Terser with `drop_console`, `drop_debugger`, 3 passes; toast/sentry/analytics all lazy-loaded
- **9. Shared layout** — `AppHeader` stays mounted; only route content swaps via `<Routes>`

### Remaining Gaps to Fix

**1. Remove `@capacitor/core` from critical bundle (6 files)**
Six files eagerly import `Capacitor` from `@capacitor/core`, pulling ~15KB into every chunk that uses it. Replace with `window.Capacitor` runtime checks:
- `src/contexts/AuthContext.tsx`
- `src/hooks/useCapacitorAnalytics.ts`
- `src/hooks/useScreenTracking.ts`
- `src/hooks/useStatusBar.ts`
- `src/components/ReportProblemDialog.tsx`
- `src/lib/analytics/posthog.ts`

Pattern: Replace `import { Capacitor } from "@capacitor/core"` with a helper, and use `(window as any).Capacitor?.isNativePlatform?.()` / `(window as any).Capacitor?.getPlatform?.()`.

**2. Create a shared Capacitor utility (`src/lib/capacitor.ts`)**
A tiny helper that wraps `window.Capacitor` access to avoid repeating `(window as any)` casts in every file:
```typescript
export const isNative = () => !!(window as any).Capacitor?.isNativePlatform?.();
export const getPlatform = () => (window as any).Capacitor?.getPlatform?.() ?? "web";
```

**3. Disable Sentry + PostHog inside Capacitor runtime**
- In `src/lib/errorReporting.ts`: Skip `Sentry.init()` when running on native Capacitor (reduces JS execution cost and removes network overhead on mobile)
- In `src/lib/analytics/posthog.ts`: Already has `isEnabled()` check — add native platform skip

**4. Replace `LoadingScreen` Suspense fallback with a lighter component**
The current `LoadingScreen` imports `lucide-react` (Loader2 icon). For route-level Suspense fallbacks, use a pure CSS spinner matching the HTML loading shell — zero JS dependencies, instant render.

**5. Increase React Query `staleTime` for Capacitor**
On native, network round-trips are costlier. Bump `staleTime` to 5 minutes and `gcTime` to 30 minutes when running inside Capacitor to avoid redundant refetches during navigation.

### Files to create
- `src/lib/capacitor.ts` — shared utility (3 lines)

### Files to modify
- `src/contexts/AuthContext.tsx` — replace Capacitor import
- `src/hooks/useCapacitorAnalytics.ts` — replace Capacitor import
- `src/hooks/useScreenTracking.ts` — replace Capacitor import
- `src/hooks/useStatusBar.ts` — replace Capacitor import
- `src/components/ReportProblemDialog.tsx` — replace Capacitor import
- `src/lib/analytics/posthog.ts` — replace Capacitor import + skip on native
- `src/lib/errorReporting.ts` — skip Sentry init on native
- `src/App.tsx` — use native-aware QueryClient settings + lighter Suspense fallback
- `src/components/ui/loading-screen.tsx` — add CSS-only variant for route transitions

