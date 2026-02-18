

# Block Partner Removal When Team Has Active Competitions

## What Changes

Currently, the "Remove Partner" dialog shows a **warning** about active ladder rankings, pending challenges, and accepted challenges -- but still allows removal. This needs to change:

- If the team is **enrolled in any ladder** (has entries in `ladder_rankings`) or has **active tournament registrations** (entries in `tournament_participants` for non-completed tournaments), the "Remove Partner" button should be **disabled** with a clear explanation.
- Pending/accepted challenges should also block removal.
- The message should explain that the partner can only be changed for **future** ladders and tournaments, not ones they're already enrolled in.

## How It Works for the User

1. Captain clicks "Remove Partner"
2. Dialog opens and checks for active competitions
3. **If active competitions exist**: The "Remove Partner" button is disabled. A message explains:
   - Which ladders the team is ranked in
   - Which tournaments the team is registered for
   - Any pending/accepted challenges
   - "You must withdraw from all active competitions before changing your partner. Partner changes only apply to future ladders and tournaments."
4. **If no active competitions**: Removal proceeds as before

## Technical Details

### File: `src/components/team/RemovePartnerDialog.tsx`

- Add a query for active tournament registrations:
  ```
  supabase
    .from("tournament_participants")
    .select("tournament_id, tournaments(name, status)")
    .eq("team_id", teamId)
  ```
  Then filter for tournaments where status is not `completed`.
- Update the `ActiveData` interface to include `activeTournaments: { name: string }[]`
- Change `hasWarnings` to a `isBlocked` boolean -- when any active data exists, the action is **blocked**, not just warned
- Disable the "Remove Partner" button when `isBlocked` is true
- Update the warning text to explain that the team must first withdraw from ladders/tournaments before the partner can be removed
- Change the warning box color/style to indicate a hard block (not just a warning)

### File: `src/pages/Dashboard.tsx`

- Also add a "Change Partner" button for 2-member teams (alongside "Remove Partner") that opens `AddPartnerDialog` -- but **only when the team has no active competitions**
- Alternatively, keep it simple: the captain must remove the partner first (which requires withdrawing from competitions), then add a new one

No database changes needed.

