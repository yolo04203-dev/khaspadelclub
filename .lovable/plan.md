

## Plan: Admin Match Export + Auth Persistence Verification

### Auth Persistence — Already Fully Implemented ✓

Your `AuthContext.tsx` already has all the requested features:
- `persistSession: true` and `autoRefreshToken: true` on the Supabase client
- Silent session refresh every 55 minutes via `refreshSession()`
- Session restored on app launch via `getSession()` before showing UI
- Splash screen shown during auth initialization, dismissed after
- Users stay logged in until manual `signOut()`
- Retry logic for transient session restore failures

**No changes needed for authentication.**

---

### Match Export — New Feature

#### 1. Create `src/lib/exportMatches.ts` — CSV generation utility

A single utility file with two export functions:

- **`exportTournamentMatchesCSV(matches, participants, groups, tournament, categoryName)`**
  - Columns: Stage, Round, Team 1, Team 1 Players, Team 2, Team 2 Players, Score, Winner, Category, Venue, Court, Date, Time
  - Maps `team1_id`/`team2_id` to team names using participants data
  - Maps `group_id` to group name, derives stage from `match.stage` field
  - Filename: `khas-padel-{tournamentName}-matches.csv`

- **`exportAmericanoMatchesCSV(matches, teams/players, session)`**
  - For team mode: Round, Court, Team 1, Team 2, Team 1 Score, Team 2 Score, Status
  - For individual mode: Round, Court, Team 1 (Player1 & Player2), Team 2 (Player1 & Player2), Scores, Status
  - Filename: `khas-padel-{sessionName}-matches.csv`

- Both use `Blob` + `URL.createObjectURL` + anchor click for download (works on web, Android WebView, iOS Safari)

#### 2. Update `src/pages/TournamentDetail.tsx` — Add Export button

- Import `exportTournamentMatchesCSV`
- Add "Export Matches" button in the category detail header area, visible only when `isAdmin` is true and matches exist for the selected category
- Button triggers CSV generation using already-loaded `matches`, `participants`, `groups`, and `tournament` state
- Filter matches to the selected category before export

#### 3. Update `src/pages/AmericanoSession.tsx` — Add Export button

- Import `exportAmericanoMatchesCSV`
- Add "Export Matches" button near the top of the session page, visible only when `isOwner` (session creator) or admin, and session is in progress or completed
- Uses already-loaded `teamMatches`/`rounds`, `teams`/`players`, and `session` state

#### No image export

Image export via `html-to-image` adds a heavy dependency and is unreliable across mobile WebViews. CSV covers the primary use case. Can be added later if needed.

