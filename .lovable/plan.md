

# Performance Audit and Cold-Start Optimization

## Findings

After thorough audit of the codebase, the app already has good foundations (lazy routes, deferred analytics/Sentry, code splitting). However, several regressions have been introduced in recent changes:

### Issue 1: NotFound page is eagerly imported in AuthenticatedRoutes

`AuthenticatedRoutes.tsx` line 8 imports `NotFound` eagerly (`import NotFound from "@/pages/NotFound"`). Since `AuthenticatedRoutes` is the shell for all authenticated pages, this import gets bundled with it and loads for every authenticated user even though 404s are rare.

**Fix**: Change to `lazyWithRetry` like all other routes in the file.

### Issue 2: TournamentDetail.tsx imports `motion` from framer-motion at top level

The 1,408-line `TournamentDetail.tsx` statically imports `motion` from `framer-motion` (line 3). Since this page is lazy-loaded, the framer-motion chunk must be fetched before TournamentDetail can render. While framer-motion is in its own chunk, this creates an unnecessary chain. The same pattern exists in 14 other page files.

**Fix**: Not critical since framer-motion is already chunked and pages are lazy. No change needed here -- the chunk splitting in vite.config.ts already handles this correctly.

### Issue 3: NotificationContext fetches data on mount with only a 1.5s delay

In `NotificationContext.tsx` (line 110), notification counts are fetched 1.5 seconds after mount. This runs 3-4 sequential Supabase queries on every authenticated page load. While deferred slightly, it still competes with page-specific data.

**Fix**: Increase the initial delay to 3 seconds and reduce polling frequency from 60s to 120s to reduce background load.

### Issue 4: TournamentDetail eagerly imports 6 heavy sub-components

`TournamentDetail.tsx` statically imports `GroupStandings`, `GroupMatchList`, `AdminGroupManagement`, `KnockoutBracket`, `RegistrationDialog`, `PaymentManagement`, and `CategoryManagement`. These are all bundled together in one chunk, making the TournamentDetail chunk very large even though only a subset is needed at any time (based on active tab).

**Fix**: Lazy-load admin-only components (`AdminGroupManagement`, `PaymentManagement`, `CategoryManagement`) since they are only shown to admins.

### Issue 5: `useLocation` import in AuthenticatedRoutes

`AuthenticatedRoutes.tsx` imports `useLocation` from react-router-dom (line 2) but never uses it. This is harmless dead code but should be cleaned up.

**Fix**: Remove unused import.

## Implementation Plan

### Step 1: Lazy-load NotFound in AuthenticatedRoutes
- Change `import NotFound from "@/pages/NotFound"` to use `lazyWithRetry`
- Remove unused `useLocation` import

### Step 2: Lazy-load admin tournament components
In `TournamentDetail.tsx`:
- Lazy-load `AdminGroupManagement`, `PaymentManagement`, and `CategoryManagement` since they are admin-only
- Wrap their usage in `<Suspense>` with a small loader fallback

### Step 3: Increase NotificationContext defer time
- Change initial delay from 1500ms to 3000ms
- Change polling interval from 60s to 120s
- This ensures page-specific data loads first

### Step 4: Remove unused import
- Clean up `useLocation` from `AuthenticatedRoutes.tsx`

## Expected Impact
- Smaller initial chunk for authenticated routes (NotFound removed from bundle)
- Faster TournamentDetail page rendering for non-admin users (admin components not loaded)
- Less network contention during first 3 seconds (notification queries deferred further)
- No functionality changes -- all features remain intact

