

# Fix Team Invitation Flow

## Problem
Two issues prevent testing the invitation acceptance and auto-rename flow:

1. **Invitations are invisible (403 error)**: The RLS policy "Anyone can view their invitations" on `team_invitations` contains a subquery against `auth.users` to match by email. The `authenticated` role does not have SELECT access to `auth.users`, causing a "permission denied for table users" error.

2. **Acceptance is blocked**: Ahmed already has his own team ("Ahmed's Team"), so the `PendingInvitations` component rejects acceptance with "Already on a team." To accept an invitation, the user would need to leave their current team first -- or the app should handle this automatically.

## Plan

### Step 1: Fix the RLS policy on `team_invitations`
Create a migration that replaces the broken SELECT policies. Instead of querying `auth.users.email`, use `invited_user_id = auth.uid()` for the user-id based check, and remove or replace the email-based check (since invitations are already resolved to `invited_user_id` at creation time).

Updated policies:
- **"Anyone can view their invitations"**: `invited_user_id = auth.uid()`
- **"Invited users can update invitation status"**: `invited_user_id = auth.uid()`

The email-based fallback (`invited_email`) is no longer needed since the `InvitePartnerDialog` already resolves the user by display name and stores `invited_user_id`.

### Step 2: Handle "already on a team" scenario
Update `PendingInvitations` component so that when a user who is already a captain of a solo team (no partner) accepts an invitation:
- Automatically remove them from their old solo team (and optionally delete the empty team)
- Then proceed with joining the new team

This makes the flow seamless: a solo captain can accept an invitation without manually leaving their team first.

### Step 3: Verify auto-rename
After acceptance, the existing `auto_name_team` database function is already called in the `handleRespond` function. This will rename the team to "Player1 & Player2" format once the second member joins.

## Technical Details

### Migration SQL (Step 1)
```sql
-- Drop and recreate the broken SELECT/UPDATE policies
DROP POLICY IF EXISTS "Anyone can view their invitations" ON team_invitations;
DROP POLICY IF EXISTS "Invited users can update invitation status" ON team_invitations;

CREATE POLICY "Anyone can view their invitations"
  ON team_invitations FOR SELECT
  USING (invited_user_id = auth.uid());

CREATE POLICY "Invited users can update invitation status"
  ON team_invitations FOR UPDATE
  USING (invited_user_id = auth.uid());
```

### Component Changes (Step 2)
In `src/components/team/PendingInvitations.tsx`, update the `handleRespond` function:
- When accepting, check if the user is on a solo team (team with only 1 member)
- If so, remove them from that team and delete the empty team before joining the new one
- If the user is on a team with 2 members, keep the existing "Already on a team" error

