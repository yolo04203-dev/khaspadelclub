

## Add Score Validation for Americano Matches

In Americano, the total points in each match are fixed (e.g., 21). Both teams' scores must add up to exactly the `points_per_round` value. For example, valid scores include 20-1, 16-5, 11-10, etc.

### Changes

**File: `src/pages/AmericanoSession.tsx`**

1. **Individual mode (`submitScore` function)** -- Add a validation check after parsing scores:
   - If `team1Score + team2Score !== session.points_per_round`, show an error toast like "Scores must add up to {points_per_round}" and return early.

2. **Team mode (`submitTeamScore` function)** -- Same validation:
   - If `team1Score + team2Score !== session.points_per_round`, show the same error toast and return early.

3. **Score input hint** -- Add a helper text below each match's score inputs showing the required total, e.g., "Total must equal 21", so users know the constraint before submitting.

### Technical Details

Both `submitScore` (line ~360) and `submitTeamScore` (line ~315) will get a new check right after the `isNaN` validation:

```typescript
if (team1Score + team2Score !== session!.points_per_round) {
  toast({
    title: "Invalid score total",
    description: `Scores must add up to ${session!.points_per_round}`,
    variant: "destructive",
  });
  return;
}
```

A small muted text label will be added near the score inputs in the Rounds tab to display the constraint visually.
