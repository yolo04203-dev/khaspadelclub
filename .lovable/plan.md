

## Current State

1. **Routes are already lazy-loaded** via `lazyWithRetry` in `AuthenticatedRoutes.tsx` and `App.tsx` — Stats, Tournaments, Americano, Challenges, Admin are all code-split. ✓
2. **Vite `manualChunks` already splits** react-core, router, ui-vendor, animation, charts, supabase, sentry, analytics, query. ✓
3. **Supabase client is already a singleton** in `src/integrations/supabase/client.ts`. No page creates its own instance. ✓
4. **NotificationContext already defers** its initial fetch by 3 seconds. ✓
5. **Dashboard already defers stats** via `requestIdleCallback`. ✓

### Actual problems found

- **Charts leak into main bundle**: `src/components/ui/chart.tsx` imports `recharts` at top level. Even though it's unused by any component, Vite may still include it if tree-shaking fails (barrel re-exports). The *real* chart usage is `WinRateChart.tsx` which is imported statically by `Stats.tsx` — but Stats is already lazy-loaded, so recharts only loads with the Stats route. The `chart.tsx` file is dead code and should be removed.
- **`PendingInvitations` fires its own DB queries on Dashboard mount** (team_invitations + teams + profiles = 3 queries). This runs in parallel with Dashboard's own team_members query, causing a duplicate `team_members` fetch from NotificationContext (deferred 3s) + PendingInvitations (immediate). 
- **Dashboard `select("*")` in NotificationContext**: Lines 66 and 76 use `select("*", { count: "exact", head: true })` — the `head: true` means no rows are returned so `*` is harmless, but it's inconsistent with the explicit-columns pattern established elsewhere.
- **`framer-motion` is in manualChunks** but imported by `PageTransition.tsx` — need to verify it's not eagerly loaded.

### Changes (backend/loading only, no UI changes)

#### 1. Delete dead `chart.tsx`
Remove `src/components/ui/chart.tsx` — it's unused and pulls recharts into the dependency graph unnecessarily.

#### 2. Lazy-load `PendingInvitations` in Dashboard
Convert the `PendingInvitations` import in `Dashboard.tsx` to a dynamic import using `lazyWithRetry`. This defers 3 DB queries until the component mounts asynchronously, letting the team card render first.

#### 3. Lazy-load dialog components in Dashboard
`RenameTeamDialog`, `AddPartnerDialog`, `RemovePartnerDialog` are imported statically but only rendered conditionally. Convert to `lazyWithRetry` so their code (and sub-dependencies) loads only when the dialog opens.

#### 4. Clean up NotificationContext selects
Replace `select("*", { count: "exact", head: true })` with `select("id", { count: "exact", head: true })` on lines 66 and 76 for consistency and to ensure no unnecessary column parsing.

#### 5. Verify framer-motion isolation
Check if `PageTransition.tsx` or any eagerly-loaded component imports framer-motion. If so, make it lazy or conditional.

