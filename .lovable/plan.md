

# Admin Override Powers Across All Game Modes

## Current State

The admin panel currently has limited capabilities:
- Ladder Matches: can only cancel (no score editing, no scheduling override)
- Tournaments: can delete tournaments and view them, but score management only works for tournament creators on the detail page
- Americano: managed exclusively by session creators, admin has no UI access
- No ability to resolve score disputes

The database security policies already grant admin users full access to all tables. The gap is entirely in the admin interface -- the buttons and dialogs to exercise these powers are missing.

## Plan

### 1. Enhanced Matches Tab (Ladder Matches)

Add these admin actions to each match row in the admin panel:

- **Edit Score**: Opens a dialog with the existing set-based score entry (reusing the SetScoreDialog pattern) allowing admin to set or override the score for any match, including completed ones
- **Edit Schedule/Venue**: Opens a dialog to change the scheduled date/time and venue
- **Change Status**: Dropdown to set match status (pending, scheduled, in_progress, completed, cancelled)
- **Resolve Dispute**: For matches flagged as disputed, a button to accept one side's score or enter a corrected score

The match list will also show more detail: venue, scheduled time, and a "disputed" indicator.

### 2. Enhanced Tournaments Tab

Add an **"Edit Scores"** action that links to the tournament detail page (which already has score editing for the creator). Since the RLS policies grant admin the same permissions as the tournament creator, this already works -- we just need to ensure the tournament detail page shows admin controls even when the admin is not the creator.

Changes:
- On `TournamentDetail` page: show admin score controls (group match score inputs, knockout score inputs) when the user is an admin, not just when they are the creator
- On admin Tournaments tab: add a quick "Manage" link alongside "View"

### 3. Americano Admin Access

Add an **Americano Sessions** tab to the admin panel showing all sessions with:
- Session name, status, mode (Individual/Team), player count
- **Manage** link to the session page
- **Delete** option for any session

On the Americano session page itself:
- Show score editing controls when the user is an admin (currently only shown to the session creator)

### 4. Score Dispute Resolution

On the Matches tab, add a filter/indicator for disputed matches. For disputed matches, show:
- Both teams' submitted scores
- The dispute reason
- Buttons to accept either score or enter a custom override

## Technical Details

### Files to Change

| File | Change |
|------|--------|
| `src/components/admin/MatchesTab.tsx` | Add Edit Score dialog, Edit Schedule dialog, status change, dispute resolution. Expand match data fetched (venue, scheduled_at, dispute info) |
| `src/pages/Admin.tsx` | Add Americano Sessions tab, expand match data to include venue/schedule/dispute fields |
| `src/components/admin/AmericanoTab.tsx` | New file -- lists all americano sessions with manage/delete actions |
| `src/components/admin/TournamentsTab.tsx` | Change "View" to "Manage" link text |
| `src/pages/TournamentDetail.tsx` | Check for admin role in addition to creator when showing score controls |
| `src/pages/AmericanoSession.tsx` | Check for admin role in addition to creator when showing score controls |

### Admin Match Edit Score Dialog

A new dialog component that:
- Shows the two team names
- Allows entering set scores (reusing the same validation as SetScoreDialog)
- On submit, updates the match record with the new scores, sets won, and winner
- Works for both new scores and overriding existing completed match scores
- Includes a "notes" field so admin can document why the score was changed

### Admin Match Schedule Dialog

Reuses the pattern from the existing ScheduleMatchDialog:
- Date picker, time picker, venue input
- Updates the match's `scheduled_at` and `venue` fields

### Americano Admin Controls

The Americano session page already has score inputs for the session creator. The only change needed is to also show these controls when the logged-in user has the admin role. This applies to:
- `AmericanoSession.tsx` -- the `isCreator` check becomes `isCreator || isAdmin`
- Score inputs for individual rounds and team matches become visible to admins

### No Database Changes Required

All RLS policies already include `is_admin(auth.uid())` checks:
- `matches`: admin can update via "Involved teams can update match" + "Admins can delete matches"
- `tournament_matches`: "Tournament creator can manage matches" uses `is_admin(auth.uid())`
- `americano_rounds`: "Session creator can manage rounds" uses `is_admin(auth.uid())`
- `americano_team_matches`: same pattern

The admin override is purely a frontend feature unlock.

### Implementation Order

1. Enhance MatchesTab with edit score + edit schedule + dispute resolution
2. Create AmericanoTab for admin panel
3. Update TournamentDetail and AmericanoSession pages to recognize admin role
4. Update Admin.tsx to include the new Americano tab

