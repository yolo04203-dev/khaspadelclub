

# Ladder Detail: Category Display Refactor

## Current State

The Ladder Detail page (`src/pages/LadderDetail.tsx`, lines 561-630) displays categories as **horizontal tabs** inside a `TabsList`:

```
[Category A] [Category B] [Category C]  ← compressed horizontal grid
```

When there are 3+ categories, each tab trigger is squeezed into a `grid` with `repeat(N, 1fr)` columns inside a `max-w-md` container. On a 360px screen, this means each tab gets ~100px or less — text truncates, badges overlap, and only the first tab looks readable. The user must tap a tiny tab to switch — the other categories' content is completely hidden behind inactive tabs.

## Problem

- Tab triggers compress to unreadable widths with 3+ categories
- Only one category's rankings are visible at a time (tab behavior)
- The UI feels "height-restricted" because inactive category content is hidden, not scrollable
- No way to visually scan across categories without tapping each tab

## Proposed Fix: Vertical Category Sections (Mobile) + Tabs (Desktop)

Replace the tab-based layout with **vertically stacked category sections on mobile** so all categories and their rankings are visible in a single scrollable page. On desktop (md+), keep the tab layout for efficiency.

### Changes to `src/pages/LadderDetail.tsx`

**Mobile (< md):** Render all categories as stacked sections:
```
── Category A ──────────────
   [Stats bar: Teams / Matches / Range]
   [Ranking 1]
   [Ranking 2]
   [Ranking 3]

── Category B ──────────────
   [Stats bar: Teams / Matches / Range]
   [Ranking 1]
   [Ranking 2]

── Category C ──────────────
   ...
```

Each category section includes:
- A full-width header with the category name and team count badge
- The stats bar (Teams / Matches / Challenge Range)
- The full rankings list via `VirtualizedRankingsList`
- Natural document flow — no fixed heights, no overflow hidden, no nested scroll containers

**Desktop (md+):** Keep the existing `Tabs` UI unchanged — it works well at wider viewports.

### Implementation Detail

Lines 561-630 currently wrap everything in a single `<Tabs>` component. The refactor:

1. Extract the per-category content (stats bar + rankings list, lines 579-628) into a shared `CategorySection` component
2. On mobile (`md:hidden`), render a `div` with `flex flex-col gap-8` containing all `CategorySection` components
3. On desktop (`hidden md:block`), render the existing `Tabs` with `TabsList` and `TabsContent`
4. Use the `useIsMobile` hook (already exists at `src/hooks/use-mobile.tsx`) to conditionally render, or use Tailwind `hidden/block` classes

### What This Does NOT Change
- Rankings list component (`VirtualizedRankingsList`) — unchanged
- Challenge flow — unchanged
- Desktop tab behavior — unchanged
- Safe-area handling — already implemented
- No new dependencies needed

### Files Modified

| File | Change |
|------|--------|
| `src/pages/LadderDetail.tsx` | Replace single Tabs layout with mobile-stacked + desktop-tabbed dual layout |

### Expected Result
- All categories fully visible on mobile via natural vertical scroll
- Each category has its own stats bar and rankings section
- No compressed tab triggers on narrow screens
- Page scrolls naturally — no nested scroll traps
- Desktop retains efficient tab-switching UI
- Works from 320px through desktop

