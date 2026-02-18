

## Show 2 Player Names on Every Team

Currently, player names are only partially visible: the ladder rankings show member names, but the dashboard and tournament views often only show the team name. This plan ensures every team consistently displays its 2 participant names.

### Changes

#### 1. Dashboard Team Card -- Show Member Names
Fetch team member profiles alongside the team info and display both names under the team name.

**File:** `src/pages/Dashboard.tsx`
- Expand the team info fetch to also query `team_members` + `public_profiles` for the user's team
- Store member names in state (e.g. `memberNames: string[]`)
- Display "Player 1 & Player 2" below the team name in the team status card

#### 2. Tournament Participants -- Always Show Player Names
Currently player names only appear for custom teams. For registered teams (non-custom), fetch member profiles and display them.

**File:** `src/pages/TournamentDetail.tsx`
- When fetching participants, also fetch `team_members` + `public_profiles` for each team
- For participants without `player1_name`/`player2_name`, populate them from member profiles
- Update `getTeamName()` to optionally include player names
- Show "(Player 1 & Player 2)" next to team names in the participant list, group standings, match lists, and knockout bracket

#### 3. Tournament Group Standings -- Show Player Names
The `GroupStandings` component shows team names but no player names.

**File:** `src/components/tournament/GroupStandings.tsx`
- Add an optional `player1_name` and `player2_name` to the `TeamStanding` interface
- Display them below the team name in the standings table

#### 4. Tournament Match Components -- Show Player Names
`GroupMatchList` and `KnockoutBracket` show team names but no player names.

**Files:** `src/components/tournament/GroupMatchList.tsx`, `src/components/tournament/KnockoutBracket.tsx`
- Add optional `team1_players` and `team2_players` (string) to match interfaces
- Display player names in smaller text under each team name

### Technical Details

**Data flow for tournaments:**
- Build a `teamMembersMap: Map<teamId, { player1: string, player2: string }>` once during `fetchData()`
- Reuse it in `getTeamName()`, participant rendering, and match component props
- For custom teams, use `player1_name` / `player2_name` from `tournament_participants`
- For registered teams, use `public_profiles.display_name` via `team_members`

**Data flow for dashboard:**
- Single additional query: `team_members` joined with `public_profiles` for the user's team
- Runs in the existing `Promise.all` alongside team + rank fetch

### Summary

| Area | Current | After |
|------|---------|-------|
| Dashboard team card | "Team Name" | "Team Name" + "Player 1 & Player 2" below |
| Ladder rankings | Already shows member names | No change needed |
| Tournament participant list | Player names only for custom teams | Player names for all teams |
| Tournament group standings | Team name only | Team name + player names |
| Tournament matches/brackets | Team name only | Team name + player names |

No database changes required -- all data is already available via existing `team_members` and `public_profiles` tables.
