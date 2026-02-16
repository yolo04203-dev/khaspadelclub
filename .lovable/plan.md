

# Change: Dashboard FAB Links to Ladders

## Problem
The floating "Challenge" button on the Dashboard currently navigates to `/challenges`. The user wants it to go to `/ladders` instead so users can find opponents through the ladder system.

## Solution
Update the FAB's `Link` destination in `src/pages/Dashboard.tsx` from `/challenges` to `/ladders`.

### File: `src/pages/Dashboard.tsx`

**Change line 193 from:**
```tsx
<Link to="/challenges" />
```

**To:**
```tsx
<Link to="/ladders" />
```

## Files Modified

| File | Change |
|---|---|
| `src/pages/Dashboard.tsx` | Change FAB link from `/challenges` to `/ladders` |

