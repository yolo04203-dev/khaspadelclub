

# Fix: Team Name and Points Overlapping on Mobile

## Problem
On mobile, the team name text overlaps with the points/challenge button area. This happens because:
1. The team name uses `break-words` which allows it to expand freely
2. The mobile stats/actions container (points, challenge button, pending badge, chevron) lacks `shrink-0`, so the flex layout doesn't properly constrain the name column

## Solution
Two small CSS changes in `src/components/ladder/VirtualizedRankingsList.tsx`:

1. **Line 98** -- Change `break-words` to `truncate` on the team name `h3` so it clips with an ellipsis instead of overflowing
2. **Line 154** -- Add `shrink-0` to the mobile stats/actions container so it never gets compressed by a long team name

### Technical Details

**File: `src/components/ladder/VirtualizedRankingsList.tsx`**

| Line | Current | Updated |
|---|---|---|
| 98 | `className="font-semibold text-foreground text-sm sm:text-base break-words"` | `className="font-semibold text-foreground text-sm sm:text-base truncate"` |
| 154 | `className="sm:hidden flex items-center gap-2"` | `className="sm:hidden flex items-center gap-2 shrink-0"` |

These changes ensure the team name truncates with "..." when space is limited, and the points/buttons area always maintains its full width.
