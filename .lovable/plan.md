

# Add "Change Partner" Option to Dashboard

## What Changes

When a captain views their team on the dashboard, they will see a "Change Partner" button that opens the same `AddPartnerDialog` used during team creation. This allows them to update the partner name (manual entry) or invite a different registered player at any time -- not just during initial team creation.

## Where It Appears

The "Change Partner" button will appear on the dashboard team card for captains whose team has only 1 registered member (i.e., the partner was added manually via name only). For teams with 2 registered members, the button will not appear since changing a partner would require removing an actual user from the team, which is a different flow.

Additionally, for solo captains (no partner at all), the existing "Invite Partner" button will be replaced with the same `AddPartnerDialog` so they also get the manual name option from the dashboard.

## Technical Details

### File: `src/pages/Dashboard.tsx`

- Import `AddPartnerDialog` and the `UserRoundCog` (or `RefreshCw`) icon
- Add state for `showChangePartnerDialog`
- In the team card actions area (lines 281-293):
  - For solo teams (memberNames.length < 2): change the "Invite Partner" button to open `AddPartnerDialog` instead of navigating to `/players`
  - For teams where memberNames.length is 1 but team name contains " & " (manual partner was set): show a "Change Partner" button that opens `AddPartnerDialog`
- Render `AddPartnerDialog` at the bottom of the component, passing the current captain name from `userTeam.memberNames[0]`
- On dialog close, call `fetchDashboardData()` to refresh the team card

### File: `src/components/team/AddPartnerDialog.tsx`

- Make the navigation optional: add an `onComplete` callback prop as an alternative to the hardcoded `navigate("/ladders")` and `navigate("/dashboard")`
- When `onComplete` is provided, call it instead of navigating -- this lets the dashboard refresh in place without navigating away
- The skip button should just close the dialog when used from the dashboard (no navigation needed)

### No Database Changes Required

Same `teams.update({ name })` call already works via existing RLS policies (captains can update their team).
