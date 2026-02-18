

## Enforce 2-Member Teams for Tournaments and Ladders

Currently, a team can be created with just 1 person (the captain) and immediately join ladders or tournaments. This plan adds validation so teams must have 2 participants before they can compete.

### Changes

#### 1. Dashboard -- Show team completeness status
When a team only has 1 member, show a warning/prompt to invite a partner before competing.

**File:** `src/pages/Dashboard.tsx`
- Check `memberNames.length` on the team card
- If only 1 member, show an "Invite Partner" prompt with a link/button
- Disable/hide the "View Ladders" action until team is complete

#### 2. Ladder Join Dialog -- Block incomplete teams
Prevent teams with only 1 member from submitting a join request.

**File:** `src/components/ladder/JoinLadderDialog.tsx`
- Accept a new prop `teamMemberCount: number`
- If `teamMemberCount < 2`, show a message like "Your team needs 2 players before joining. Invite a partner from your dashboard." and disable the submit button

**File:** `src/pages/LadderDetail.tsx`
- Fetch the team member count for the user's team
- Pass `teamMemberCount` to `JoinLadderDialog`

#### 3. Tournament Registration Dialog -- Block incomplete teams for "existing team" option
When registering with an existing team (not custom), validate that the team has 2 members.

**File:** `src/components/tournament/RegistrationDialog.tsx`
- Accept a new optional prop `teamMemberCount?: number`
- When `registrationType === "existing"` and `teamMemberCount < 2`, show a warning and disable the Register button
- Custom teams already require both player names, so they're fine

**File:** `src/pages/TournamentDetail.tsx`
- Fetch member count for the user's team
- Pass it to `RegistrationDialog`

#### 4. Challenge creation -- Block incomplete teams
Prevent 1-member teams from issuing challenges on the ladder.

**File:** `src/pages/LadderDetail.tsx`
- If team has fewer than 2 members, disable the "Challenge" button and show a tooltip explaining why

### Technical Details

- Member count is fetched via a simple query: `SELECT count(*) FROM team_members WHERE team_id = ?`
- This data is already partially available in the dashboard (we fetch `team_members` for the team); just need to reuse the count
- No database changes needed -- this is purely frontend validation
- The "custom team" flow in tournaments is unaffected since it already requires 2 player names

### Summary

| Area | Current | After |
|------|---------|-------|
| Dashboard team card | Shows team regardless | Shows "Invite Partner" warning if only 1 member |
| Ladder join request | Allows 1-member teams | Blocks with message, requires 2 members |
| Tournament registration (existing team) | Allows 1-member teams | Blocks with message, requires 2 members |
| Tournament registration (custom team) | Already requires 2 names | No change |
| Ladder challenges | Allows 1-member teams | Blocks with tooltip, requires 2 members |
