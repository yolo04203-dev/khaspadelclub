

## Performance Optimization Plan

### Current State Analysis

The app already has strong foundations: route-level code splitting, deferred analytics/Sentry init, skeleton-first rendering, self-hosted fonts with `font-display: swap`, and production console stripping. However, there is one critical bottleneck undermining all of this.

### The Core Problem

**`@sentry/react` is statically imported in the critical path.** Despite Sentry *initialization* being deferred in `main.tsx`, the module itself (~30KB gzip) is pulled into the main bundle because `logger.ts`, `apiClient.ts`, and `safePlugin.ts` all use `import * as Sentry from "@sentry/react"` — and `logger.ts` is imported everywhere, including `App.tsx`, `Hero.tsx`, and `Header.tsx`.

This single issue likely accounts for the gap between the current 4s load and the target 2s load.

### Implementation Steps

**1. Remove static Sentry import from `logger.ts`**
- Replace `import * as Sentry from "@sentry/react"` with a lazy accessor pattern
- Create a shared `src/lib/sentryLazy.ts` module that caches a dynamic `import("@sentry/react")` and exposes `getSentry()` returning `Promise<typeof Sentry | null>`
- Update `logger.ts` to call `getSentry()` only inside `warn()` and `error()` methods (fire-and-forget, no await blocking the log call)

**2. Remove static Sentry import from `apiClient.ts`**
- Replace `import * as Sentry from "@sentry/react"` with the same lazy accessor
- Update Sentry breadcrumb/capture calls to use the lazy pattern

**3. Remove static Sentry import from `safePlugin.ts`**
- Same lazy accessor pattern for `Sentry.addBreadcrumb` and `Sentry.captureException`

**4. Create `src/lib/sentryLazy.ts`**
```text
let cached: Promise<typeof import("@sentry/react") | null> | null = null;

export function getSentry() {
  if (!cached) {
    cached = import("@sentry/react").catch(() => null);
  }
  return cached;
}
```
This ensures Sentry is loaded only once, only when first needed (on first error/warning), and the 30KB chunk is excluded from the initial bundle entirely.

**5. Remove static Sentry import from `webVitals.ts`** (already deferred via dynamic import in `main.tsx`, but verify it's not pulled in elsewhere)

### What This Achieves

- Removes ~30KB gzip from the critical JS payload
- Sentry still loads on first error/warning — no loss of error tracking
- Combined with existing optimizations (deferred PostHog, route splitting, font preloading), the initial bundle should drop well under the 150KB critical path target
- No changes to routing, permissions, UI, or behavior

### Files Changed
- `src/lib/sentryLazy.ts` — new file (5 lines)
- `src/lib/logger.ts` — replace static import with lazy accessor
- `src/lib/apiClient.ts` — replace static import with lazy accessor
- `src/lib/safePlugin.ts` — replace static import with lazy accessor

### What's Already Optimized (No Changes Needed)
- Route-level code splitting with `lazyWithRetry` — already done
- `font-display: swap` — already configured
- Deferred PostHog and WebVitals — already deferred via `requestIdleCallback`
- Production console stripping — already configured in Vite
- Manual chunks for heavy libraries — already configured
- Skeleton-first rendering — already implemented
- Self-hosted fonts with preload — already done
- Service worker caching — already implemented

