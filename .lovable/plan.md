
# Fix: Tournament Registration "Team Incomplete" Warning for Manually-Added Partners

## The Problem

The tournament registration dialog checks `userTeamMemberCount` (from `team_members` DB rows) to determine if a team is complete. When a partner is added manually (which only renames the team, e.g., "Ahmed & Ali"), no new DB row is created, so the count stays at 1. This triggers the "Your team needs 2 players before registering" warning, blocking registration.

## The Fix

### File: `src/pages/TournamentDetail.tsx`

In the `fetchUserTeam` function (around line 230-247), after getting the team member count, apply the same fallback logic used on the Dashboard: if the count is less than 2 but the team name contains " & ", treat the team as complete (set count to 2).

**Change in `fetchUserTeam`:**

After setting `userTeamMemberCount`, add:

```typescript
const memberCount = countResult.count || 0;
if (memberCount < 2 && teamResult.data?.name?.includes(" & ")) {
  setUserTeamMemberCount(2);
} else {
  setUserTeamMemberCount(memberCount);
}
```

This ensures:
- Manually-named teams (e.g., "Ahmed & Ali") pass the 2-player check
- The "Team incomplete" warning disappears
- The "Register" button becomes enabled
- Teams with 2 actual DB members continue working as before
- No other files need changes
