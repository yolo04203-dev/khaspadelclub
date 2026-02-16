

# Fix: Join Ladder Button Hidden on Mobile

## Problem
The "Join Ladder" button with text is too wide for mobile screens, getting clipped/hidden behind the edge. The header has the back arrow, logo, and the button all competing for space.

## Solution
On mobile, show only the icon (UserPlus) without text. On larger screens, keep the full "Join Ladder" label. This follows the existing UX standard of reducing header congestion on mobile.

### File: `src/components/ladder/JoinLadderDialog.tsx`

**Change the trigger button (lines 128-133) from:**
```tsx
<DialogTrigger asChild>
  <Button variant="default">
    <UserPlus className="w-4 h-4 mr-2" />
    Join Ladder
  </Button>
</DialogTrigger>
```

**To:**
```tsx
<DialogTrigger asChild>
  <Button variant="default" size="icon" className="sm:w-auto sm:px-4">
    <UserPlus className="w-4 h-4 sm:mr-2" />
    <span className="hidden sm:inline">Join Ladder</span>
  </Button>
</DialogTrigger>
```

This shows just the plus-style icon on mobile (44px touch target maintained) and the full "Join Ladder" text on desktop/tablet.

## Files Modified

| File | Change |
|---|---|
| `src/components/ladder/JoinLadderDialog.tsx` | Icon-only button on mobile, full text on larger screens |

