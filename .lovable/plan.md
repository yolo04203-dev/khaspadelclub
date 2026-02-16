
# Fix: "Find Opponents" FAB Overlapping Challenge Content

## Problem
The floating "Find Opponents" button sits too low on mobile, covering the Dispute/Confirm buttons on challenge cards.

## Solution
Increase the FAB's bottom offset in `src/components/ui/fab.tsx` so it floats higher above the bottom navigation bar, clearing the card action buttons.

### File: `src/components/ui/fab.tsx`

**Change line 49 from:**
```
"bottom-[calc(4.5rem+env(safe-area-inset-bottom))] sm:bottom-6",
```

**To:**
```
"bottom-[calc(5.5rem+env(safe-area-inset-bottom))] sm:bottom-6",
```

This adds 1rem (~16px) of extra clearance above the mobile nav bar, pushing the FAB up enough to stop overlapping card action buttons while still staying visually anchored to the bottom of the screen.

## Files Modified

| File | Change |
|---|---|
| `src/components/ui/fab.tsx` | Increase mobile bottom offset from `4.5rem` to `5.5rem` |
