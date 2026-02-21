

# Fix Privilege Escalation in Ladder Rankings RLS

## Problem Found

The `ladder_rankings` table has an overly broad UPDATE policy called **"Team members can update own ranking"** that allows any team member to directly modify their ranking row -- including `rank`, `points`, `wins`, `losses`, and `streak` fields -- without any match context. Since this is a PERMISSIVE policy (OR logic with other policies), it bypasses the more restrictive "Match participants can update rankings" policy that properly scopes updates to completed match scenarios.

**Impact**: A player could use the browser console or any API client to directly set their rank to #1, inflate their win count, or manipulate points -- effectively cheating the ladder system.

## Fix

Drop the overly broad "Team members can update own ranking" policy. The existing "Match participants can update rankings" policy already correctly allows ranking updates only when a completed match exists involving that team, and the "Admins can manage rankings" policy covers admin operations.

## Technical Details

**Migration SQL:**
```sql
DROP POLICY IF EXISTS "Team members can update own ranking" ON public.ladder_rankings;
```

**Policies that remain (sufficient for all operations):**
- "Admins can manage rankings" (ALL) -- admin full access
- "Anyone can view ladder rankings" (SELECT) -- public leaderboard
- "Match participants can update rankings" (UPDATE) -- scoped to completed matches only

## No Code Changes Required

The client code in `ScoreConfirmationCard.tsx` already updates rankings in the context of a completed match, so it will continue to work under the "Match participants can update rankings" policy.

## Other Policies Reviewed (No Issues)

All other tables were reviewed and found to be properly configured:
- **profiles**: Own profile + admin only (no public PII leak)
- **public_profiles view**: SECURITY DEFINER intentionally excludes phone_number
- **user_roles / user_permissions**: Admin/super_admin only for writes, own-record reads
- **team_invitations**: Properly scoped to invited user + captain + admin
- **tournament_participants**: Stakeholder-only SELECT, creator-only writes
- **matches/challenges**: Team-member scoped writes, public reads (competition data)
- **client_errors**: Recently tightened with user_id enforcement

