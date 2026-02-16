

# Fix: Show Full Team Names on Mobile in Ladder Rankings

## Problem
Team names are truncated to "K..." on mobile in the ladder detail page because of the CSS `truncate` class combined with limited horizontal space (the "Your Team" badge, avatar stack, and points column all compete for width).

## Solution
Remove the `truncate` class from the team name and allow it to wrap to two lines naturally. Also reduce the font size slightly on mobile to give more room.

### File: `src/components/ladder/VirtualizedRankingsList.tsx`

**Line 89 -- Change the team name heading from:**
```tsx
<h3 className="font-semibold text-foreground truncate">{ranking.team?.name || "Unknown Team"}</h3>
```

**To:**
```tsx
<h3 className="font-semibold text-foreground text-sm sm:text-base break-words">{ranking.team?.name || "Unknown Team"}</h3>
```

This removes `truncate`, uses `break-words` to allow wrapping onto a second line, and reduces font size to `text-sm` on mobile (normal `text-base` on desktop).

## Files Modified

| File | Change |
|---|---|
| `src/components/ladder/VirtualizedRankingsList.tsx` | Remove `truncate`, add `text-sm sm:text-base break-words` on team name |

