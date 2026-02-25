

# Mobile Layout Refactor for Safe Areas, Responsive Scaling, and Ladder UI

## Problem Summary (from screenshots)

The Samsung S21 screenshot shows:
1. "Khas Padel Club" text in the header consuming critical space, pushing the Join button against the edge
2. Ladder ranking cards show team name AND member names, creating visual duplication and cramped rows ("Ahmed..." then "Ahmed & ali" below)
3. The "Manage" button is hidden due to space constraints
4. Content renders under the Android status bar area

---

## Technical Changes

### 1. Global Safe-Area and Viewport Fixes

**File: `src/index.css`**

The `viewport-fit=cover` meta tag already exists in `index.html` (line 9). The safe-area CSS classes (`safe-top`, `safe-bottom`) exist but need a fallback minimum. Update the safe-area utilities:

- Change `.safe-top` to use `padding-top: max(12px, env(safe-area-inset-top))` to ensure a minimum offset on Android devices where env() returns 0.
- Replace all `min-h-screen` usage with `min-h-[100dvh]` via a new utility class `.min-h-screen-safe` that uses `min-height: 100dvh` with `100vh` fallback.
- Replace `min-h-[calc(100vh-4rem)]` in LadderDetail and Challenges PullToRefresh with `min-h-[calc(100dvh-4rem)]`.

**File: `src/index.css`** — add:
```css
/* Dynamic viewport height — replaces 100vh for iOS/Android compat */
.min-h-dvh {
  min-height: 100vh; /* fallback */
  min-height: 100dvh;
}
```

### 2. Hide Logo Text on Mobile (Remove "Khas Padel Club" on small screens)

**File: `src/components/Logo.tsx`**

Currently the Logo always shows text unless `showText={false}`. The AppHeader already hides it via a Tailwind class hack on the span. But pages like LadderDetail use `<Logo size="sm" />` directly (showText defaults to true).

Changes:
- Add a `hideTextOnMobile` prop (default: true) that applies `hidden sm:inline` to the text span.
- This means on screens < 640px, the "Khas Padel Club" text is hidden, freeing horizontal space.
- Only the logo image shows on mobile.

### 3. LadderDetail Header — Make Actions Always Visible

**File: `src/pages/LadderDetail.tsx`** (lines 495-532)

Current header has: `[Back] [Logo "Khas Padel Club"]` on left, `[Join] [Manage]` on right. On narrow screens, the text pushes buttons off-screen.

Changes:
- Use `<Logo size="sm" />` which will now auto-hide text on mobile (from change #2).
- Make "Manage" button icon-only on mobile: `<Settings className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Manage</span>`.
- Both Join and Manage buttons become icon-only (44px touch targets) on mobile, side by side.
- Add `safe-top` class to the sticky header.
- Apply `pb-safe-nav` to the main content area.

### 4. Ladder Ranking Card Refactor — Remove Duplicate Names on Mobile

**File: `src/components/ladder/VirtualizedRankingsList.tsx`**

Per user preference: show **team name only** on mobile, hide member names line from the collapsed row.

Changes to the mobile (collapsed) row layout:
- Remove the member avatars + names line from the collapsed card view on mobile. That section (lines 109-121, the `flex -space-x-2` avatars and `span` with member names) gets `hidden sm:flex` — only visible on desktop.
- The team name (line 106) becomes the sole identifier. It already has `truncate`.
- Make RankBadge smaller on mobile: `w-10 h-10 sm:w-12 sm:h-12` with `text-base sm:text-lg`.
- Reduce card padding on mobile: `p-3 sm:p-4`.

Mobile row structure becomes:
```
[Rank 10x10] [Team Name (truncate, flex-1)] [pts + W-L (shrink-0)] [Challenge?] [Expand]
```

The expanded CollapsibleContent already shows full member details — no change needed there.

### 5. Typography Scaling for Dense Data

**File: `src/components/ladder/VirtualizedRankingsList.tsx`**

- Team name: `text-xs sm:text-sm` (was `text-sm sm:text-base`)
- Points display: `text-xs sm:text-sm` (was `text-sm`)
- W-L display: `text-[10px] sm:text-xs` (was `text-xs`)

### 6. Action Buttons Never Shrink

Already using `shrink-0` on the mobile action container (line 174). Verify challenge button uses `shrink-0` as well. Add explicit `shrink-0` to each action button wrapper in the mobile row.

### 7. Ladder Page Stats Bar Fix

**File: `src/pages/LadderDetail.tsx`** (lines 580-601)

The stats bar cards (Teams / Matches / Challenge Range) use `text-2xl` which is large on 320px screens.

Changes:
- Font size: `text-xl sm:text-2xl` for the stat number.
- Reduce vertical padding: `pt-3 pb-3 sm:pt-4 sm:pb-4`.
- Use `gap-2 sm:gap-4` between grid items.

### 8. Tab Triggers — Prevent Overflow

**File: `src/pages/LadderDetail.tsx`** (lines 562-571)

Category tabs with badges can overflow on narrow screens. Changes:
- Add `overflow-x-auto` to the TabsList wrapper.
- Make tab text smaller: add `text-xs sm:text-sm` to TabsTrigger.
- Hide badge count on very narrow screens or make it smaller.

### 9. Replace 100vh Usages (Key Files Only)

Replace `min-h-[calc(100vh-4rem)]` with `min-h-[calc(100dvh-4rem)]` in:
- `src/pages/LadderDetail.tsx` (line 535)
- `src/pages/Challenges.tsx` (line 628)

Replace `min-h-screen` with the dvh-safe utility where it's the page root on these critical paths (LadderDetail loading/error/main states). Other pages use `min-h-screen` from Tailwind which is `100vh` — these can be updated incrementally but the ladder page is the priority.

### 10. StatusBar Overlay Fix for Android

**File: `src/hooks/useStatusBar.ts`**

Add `StatusBar.setOverlaysWebView({ overlay: true })` on Android to ensure content draws behind the status bar, which allows the `safe-top` CSS to handle the spacing correctly. Without this, some Android devices don't report safe-area-inset-top.

### 11. LadderDetail Header — Add safe-top to All Header States

The loading/error/main headers in LadderDetail (lines 443, 473, 498) need `safe-top` class added to be consistent with AppHeader.

---

## Files Modified

| File | Change |
|------|--------|
| `src/index.css` | Add `.min-h-dvh` utility, update `.safe-top` with fallback minimum |
| `src/components/Logo.tsx` | Add `hideTextOnMobile` prop, apply `hidden sm:inline` to text |
| `src/pages/LadderDetail.tsx` | Icon-only Manage button on mobile, `safe-top` on headers, `pb-safe-nav`, dvh usage, smaller stats bar |
| `src/components/ladder/VirtualizedRankingsList.tsx` | Hide member names on mobile collapsed row, smaller RankBadge, tighter padding, scaled typography |
| `src/hooks/useStatusBar.ts` | Add `setOverlaysWebView` for Android |

## What Does NOT Change
- Challenge flow
- Match result automation
- Tournament module
- Desktop layout
- Existing safe-area handling in AppHeader and bottom nav

