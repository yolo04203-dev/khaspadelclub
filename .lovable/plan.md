
# Fix: Allow Manually-Named Teams to Join Ladders

## The Problem

When a captain uses "Enter partner name manually," the system only renames the team (e.g., "Ahmed & Ali") but does NOT add a second row to `team_members`. This means:

- `team_members` count stays at 1
- The Join Ladder dialog checks `teamMemberCount < 2` and shows "Team incomplete," blocking the join request entirely

## The Fix

The `teamMemberCount < 2` check in `JoinLadderDialog` is too strict. A team with a manually-entered partner has only 1 database member but is conceptually a 2-player team. The solution:

**Remove the hard block from `JoinLadderDialog`** and instead:
1. If the team has 2 actual members -- allow joining with existing team normally
2. If the team has only 1 member -- still allow opening the form, but **force the "Join with different players" option** (pre-select "custom" join type) so the user must provide both player names. The "Join with existing team" radio option will be hidden/disabled since the team isn't complete in the database.

This way:
- Solo captains who haven't added anyone yet still need to provide player names
- Captains who added a partner manually can join by entering both names (or the team name already reflects the pairing)
- Teams with 2 real members can join with their existing team as before

## Technical Changes

### File: `src/components/ladder/JoinLadderDialog.tsx`

- Remove the `teamMemberCount < 2` block that shows "Team incomplete" and hides the form
- Instead, when `teamMemberCount < 2`:
  - Auto-set `joinType` to `"custom"`
  - Hide the "Join with existing team" radio option (or disable it with a note)
  - Show the custom player name fields by default
  - Pre-fill player names from the team name if it contains "&" (e.g., "Ahmed & Ali" becomes player1="Ahmed", player2="Ali")
- When `teamMemberCount >= 2`: keep existing behavior unchanged

### File: `src/pages/LadderDetail.tsx`

- No changes needed (it already passes `teamMemberCount` correctly)

No database changes required.
