

# Add Manual Partner Name Option to Team Creation

## What Changes

After creating a team, instead of only showing the invite partner dialog, the player will see a choice:

1. **Invite a registered player** (existing behavior) -- search and send an invitation
2. **Add partner name manually** -- just type the partner's name to complete the team name immediately

If the player chooses option 2, the team name will be updated to "Player 1 & Player 2" right away, and they can proceed to ladders. The team will still have only 1 registered member, but the team name will reflect both players. This is consistent with how tournament registration and ladder join requests already allow custom player names.

## How It Works for the User

1. Player enters their name and clicks "Create Team"
2. A dialog appears with two tabs/options:
   - **Invite Partner** -- the existing search-and-invite flow
   - **Add Name Manually** -- a simple text input for the partner's name
3. If they choose manual entry, the team is renamed to "Ahmed & Ali" format immediately and they navigate to ladders
4. They can skip and do it later from the dashboard

## Technical Details

### File: `src/pages/CreateTeam.tsx`

- After team creation, instead of directly opening `InvitePartnerDialog`, show a new `AddPartnerDialog` component that presents both options
- When "manual name" is chosen: update the team name via `supabase.from("teams").update({ name: "Player1 & Player2" })` and navigate to ladders

### New Component: `src/components/team/AddPartnerDialog.tsx`

- A dialog with two options presented as radio cards:
  - "Invite a registered player" -- opens the existing `InvitePartnerDialog`
  - "Enter partner name manually" -- shows an input field for the partner's name
- Manual flow: validates name (min 2, max 50 chars), updates team name to "{captain} & {partner}" format, shows success toast, navigates to ladders
- Skip option at the bottom: "I'll do this later" closes dialog and navigates to dashboard

### No Database Changes Required

The team name is simply updated via the existing `teams` table. No new columns or functions needed. The team remains a 1-member team, but with a proper display name showing both players -- exactly how it works when admins or the auto-name function sets names.
