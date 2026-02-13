

# Performance Testing and Optimization for 500 Users

## Current Performance Risks Found

After analyzing the codebase, several bottlenecks will degrade mobile performance with 500 users:

### Critical Issues

1. **Ladder rankings render ALL items without virtualization** -- LadderDetail.tsx renders every team in a category (now 100+) as individual animated cards with staggered delays (`delay: index * 0.05`), meaning the last item waits 5 seconds before appearing.

2. **Per-item Framer Motion animations on long lists** -- Each ranking row gets its own `motion.div` with `layout`, `initial`, `animate`, and staggered `exit` animations. With 100+ items, this overwhelms the main thread on mobile.

3. **No list virtualization implemented** -- Despite project memories referencing react-window, no page actually uses it. All lists render every DOM node.

4. **LadderDetail fetches all members + profiles in separate queries** -- For 100 teams with 2 members each, this means processing 200 member rows and 200 profile lookups client-side.

## Implementation Plan

### 1. Remove per-item animations on long lists

**Files:** `src/pages/LadderDetail.tsx`
- Remove `AnimatePresence` and per-row `motion.div` with staggered delays from the rankings list
- Keep the page-level fade-in animation (already 0.4s, will reduce to 0.15s to match other pages)
- Replace with plain `div` elements -- eliminates layout thrashing on scroll

### 2. Add list virtualization for ladder rankings

**Files:** `src/pages/LadderDetail.tsx`
- Install `react-window` (lightweight virtual list renderer, ~6KB gzipped)
- Wrap the rankings list in a `FixedSizeList` that only renders visible rows
- Each row height: ~88px (card with padding)
- Container height: `calc(100vh - 300px)` to fill available space
- This reduces DOM nodes from 100+ cards to ~10-12 visible at a time

### 3. Add list virtualization for Players page

**Files:** `src/pages/Players.tsx`
- Wrap the player cards list in a `FixedSizeList`
- Row height: ~120px (player card with avatar, badges, bio)
- Keep the existing "Load More" pagination -- virtualization handles what's already loaded

### 4. Enhance the load test suite for 500-user scenario

**Files:** `src/test/performance-benchmarks.test.ts`
- Update the existing 500-user stress test to check:
  - Ladder ranking fetch time under 2s (was 3s threshold)
  - Player list fetch time under 1.5s
  - Tournament participant fetch time under 1s
- Add a new "Mobile Simulation" test that measures with throttled network conditions

### 5. Add a performance test page (admin-only)

**Files:** `src/pages/Admin.tsx` (add a "Perf Test" tab or section)
- Add a button to run the existing `smokeTest()` from `load-test.ts` directly in the browser
- Display results (avg response time, P95, error rate, per-endpoint breakdown) in a results card
- This lets you test from a real mobile device without needing DevTools

### 6. Reduce LadderDetail animation duration

**Files:** `src/pages/LadderDetail.tsx`
- Change page-level `motion.div` transition from `0.4s` to `0.15s` (consistent with Ladders, Tournaments pages)

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Add `react-window` and `@types/react-window` dependencies |
| `src/pages/LadderDetail.tsx` | Remove per-item animations, add react-window virtualization, reduce page transition to 0.15s |
| `src/pages/Players.tsx` | Add react-window virtualization for player cards |
| `src/pages/Admin.tsx` | Add "Run Perf Test" button with results display |
| `src/test/performance-benchmarks.test.ts` | Tighten thresholds for 500-user scenario |

## Expected Outcomes

| Metric | Before | After |
|--------|--------|-------|
| Ladder page DOM nodes (100 teams) | ~800+ | ~80-100 (virtualized) |
| Ladder page initial render | ~2-3s (staggered animations) | < 300ms |
| Scroll FPS on ladder list | ~30-40 FPS | 55-60 FPS |
| Players page DOM nodes (30 loaded) | ~300 | ~80-100 (virtualized) |
| LadderDetail animation duration | 400ms + 5s stagger | 150ms flat |

## What This Does NOT Change
- Backend queries remain the same (already optimized with parallel fetches and column selection)
- Service worker and caching strategy untouched
- Existing load test infrastructure reused, not replaced
- No changes to the seed data function

