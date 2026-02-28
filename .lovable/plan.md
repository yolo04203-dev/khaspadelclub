

## Analysis: Everything Requested Is Already Implemented

All five optimization categories in this request are already in place:

### 1. Route-level code splitting — DONE
Every major route (Tournaments, Americano, Challenges, Stats, Admin, Dashboard, Players, Profile, Ladders) uses `lazyWithRetry` in `AuthenticatedRoutes.tsx`. Public pages (Auth, Privacy, Terms, Contact, DeleteAccount) are lazy in `App.tsx`. The `AuthenticatedRoutes` shell itself is lazy-loaded, so none of those pages exist in the initial bundle.

### 2. Dialog components lazy-loaded — DONE
Dashboard lazy-loads `PendingInvitations`, `RenameTeamDialog`, `AddPartnerDialog`, `RemovePartnerDialog` via `lazyWithRetry` (implemented in the previous message).

### 3. Charts isolated to Stats page — DONE
`recharts` is imported only in `src/components/stats/WinRateChart.tsx`, which is statically imported by `Stats.tsx` — but Stats itself is lazy-loaded. The dead `chart.tsx` barrel was already deleted. Charts never enter the initial or Dashboard bundle.

### 4. Vite manualChunks — DONE
`vite.config.ts` already splits: `react-core`, `router`, `ui-vendor` (12 Radix packages), `animation` (framer-motion), `charts` (recharts), `supabase`, `sentry`, `analytics` (posthog), `query` (tanstack).

### 5. Dashboard minimal dependencies — DONE
Dashboard imports no page-level modules. Its dialogs and PendingInvitations are lazy. The landing page (`Index.tsx`) is eagerly loaded but minimal (Header + Hero above fold; Features, SportsModes, Footer are lazy).

### One Remaining Opportunity: framer-motion leaks into Dashboard chunk

`PullToRefresh` and `FAB` both `import { motion } from "framer-motion"` at top level. Dashboard imports both, so framer-motion loads with the Dashboard chunk despite being in a separate manualChunk. This doesn't affect initial page load (Dashboard is lazy), but it does inflate the Dashboard chunk.

**Proposed fix**: Convert `PullToRefresh` and `FAB` to use dynamic `import("framer-motion")` internally, so the animation chunk only loads when those components actually render — not when Dashboard's JS is parsed.

### Implementation steps

1. **Refactor `src/components/ui/pull-to-refresh.tsx`** — Replace static `import { motion, ... } from "framer-motion"` with a lazy-loaded motion component pattern using `React.lazy` or a local `useMotion` hook that dynamically imports framer-motion.

2. **Refactor `src/components/ui/fab.tsx`** — Same treatment: remove static framer-motion import, use dynamic import so the animation chunk is deferred until FAB actually animates.

3. **No changes to `ChallengeHistoryTab.tsx`** — It's inside the lazy-loaded Challenges page, so framer-motion there is already isolated.

These are the only changes needed. Everything else requested is already implemented.

