

# Improve Loading Speed Across All Pages

## Problem Analysis

After reviewing every page component, I identified these performance bottlenecks:

1. **Waterfall queries** -- Several pages fetch data sequentially when they could run in parallel
2. **N+1 query pattern** -- Americano.tsx fires a separate query per session to get counts
3. **No skeleton loaders** -- Stats, Tournaments, Americano, and FindOpponents show blank spinners instead of content-shaped skeletons
4. **Heavy animations** -- Every page wraps content in framer-motion fade+slide animations that delay perceived render by 400ms
5. **No code splitting optimization** -- Vite config has no manual chunk splitting, so large libraries bundle together

---

## Changes

### 1. Parallelize waterfall queries

**Profile.tsx** -- Currently fetches profile, then team, then rank, then matches, then team names sequentially. Refactor to run profile + team membership in parallel, then team details + rank + matches in a second parallel batch.

**FindOpponents.tsx** -- Currently loops through memberships sequentially to fetch challengeable teams. Refactor to use `Promise.all` over all memberships.

### 2. Fix N+1 query in Americano.tsx

Currently runs one query per session to count players/teams. Replace with two bulk queries (one for player counts, one for team counts) using `.in("session_id", sessionIds)`, then map counts client-side.

### 3. Add skeleton loaders to pages that show blank spinners

**Stats.tsx** -- Replace the full-screen `Loader2` spinner with a skeleton layout matching the stats cards, chart, and timeline structure.

**Tournaments.tsx** -- Replace the spinning div with card-shaped skeletons (3 cards in a grid).

**Americano.tsx** -- Same pattern: card skeletons instead of spinner.

**FindOpponents.tsx** -- Add skeleton cards for the opponent list.

### 4. Reduce animation delay

Change `transition={{ duration: 0.4 }}` to `transition={{ duration: 0.15 }}` across all page-level `motion.div` wrappers. This cuts 250ms of perceived delay on every navigation. Affected files:
- Dashboard.tsx
- Players.tsx  
- Stats.tsx
- Challenges.tsx
- Ladders.tsx
- Profile.tsx
- Tournaments.tsx
- FindOpponents.tsx
- Americano.tsx

### 5. Vite manual chunks for better caching

Split large vendor libraries into separate chunks so returning users get cache hits:

```text
manualChunks: {
  'react-vendor': ['react', 'react-dom', 'react-router-dom'],
  'ui-vendor': ['framer-motion', 'recharts', '@radix-ui/react-dialog', ...],
  'supabase': ['@supabase/supabase-js'],
}
```

This means after first load, navigating to new pages only downloads the page code, not the shared vendor code again.

### 6. Prefetch lazy routes on nav link hover

Update `AppHeader.tsx` to add `onMouseEnter`/`onTouchStart` handlers on nav links that trigger the lazy import. For example, hovering over "Stats" in the nav will start loading the Stats chunk before the user clicks.

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Profile.tsx` | Parallelize data fetching |
| `src/pages/FindOpponents.tsx` | Parallelize opponent fetching loop |
| `src/pages/Americano.tsx` | Fix N+1 with bulk count queries |
| `src/pages/Stats.tsx` | Skeleton loader + faster animation |
| `src/pages/Tournaments.tsx` | Skeleton loader + faster animation |
| `src/pages/Dashboard.tsx` | Faster animation |
| `src/pages/Players.tsx` | Faster animation |
| `src/pages/Challenges.tsx` | Faster animation |
| `src/pages/Ladders.tsx` | Faster animation |
| `src/components/AppHeader.tsx` | Prefetch on hover/touch |
| `src/App.tsx` | Export lazy imports for prefetch map |
| `vite.config.ts` | Manual chunk splitting |

No new dependencies needed.

