

## Auto-Name Teams from Player Names

### Overview

After a user signs up and logs in, they land on the dashboard where a prominent card invites them to create or join a team (current behavior stays). The key change is that **team names are now automatically generated** from the two players' display names once both players are on the team.

### How it works

1. **Sign up / Login** -- stays the same. Users register with email + password + display name.

2. **Create Team page** -- simplified. The captain no longer picks a team name. They only enter their own name (pre-filled from profile) and optionally search for a partner to invite.
   - A temporary team name is set (e.g., the captain's display name + "'s Team").
   - After creation, the invite dialog still opens.

3. **When 2nd player joins** -- the team name is automatically updated to combine both players' names (e.g., "Ahmed & Ali"). This happens in two places:
   - When accepting an invitation via `PendingInvitations`
   - When an admin adds a member

4. **Dashboard** -- remains the same. Users without a team see the "Create Team" prompt card.

### Technical Details

**File: `src/pages/CreateTeam.tsx`**
- Remove the "Team Name" form field
- Remove the "Player 2 Name" field (partner is handled via invite dialog)
- Set a temporary team name automatically: `${player1Name}'s Team`
- Pre-fill Player 1 name from user profile if available

**File: `src/components/team/PendingInvitations.tsx`**
- After successfully adding the user to the team (accept flow), fetch both members' display names
- Update the team name to `"Player1 & Player2"` format using a Supabase update
- The team name update query:
  ```sql
  UPDATE teams SET name = 'Ahmed & Ali' WHERE id = team_id
  ```

**File: `src/components/team/InvitePartnerDialog.tsx`**
- After invitation is accepted (not at send time -- no change needed here since naming happens on accept)

**New database function (migration):**
Create a helper function `auto_name_team` that:
- Takes a `team_id`
- Looks up all team_members for that team, joins with profiles to get display_names
- If exactly 2 members, updates the team name to `"Name1 & Name2"` (ordered by `joined_at`)
- This function is called from the frontend after a member joins

```sql
CREATE OR REPLACE FUNCTION public.auto_name_team(_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _names TEXT[];
  _new_name TEXT;
BEGIN
  SELECT ARRAY_AGG(COALESCE(p.display_name, 'Player') ORDER BY tm.joined_at)
  INTO _names
  FROM team_members tm
  JOIN profiles p ON p.user_id = tm.user_id
  WHERE tm.team_id = _team_id;

  IF array_length(_names, 1) = 2 THEN
    _new_name := _names[1] || ' & ' || _names[2];
    UPDATE teams SET name = _new_name WHERE id = _team_id;
  END IF;
END;
$$;
```

### Summary of changes

| File | Change |
|------|--------|
| Migration | Add `auto_name_team` database function |
| `src/pages/CreateTeam.tsx` | Remove team name + player 2 fields; auto-set temp name |
| `src/components/team/PendingInvitations.tsx` | Call `auto_name_team` after accepting invitation |
| `src/components/team/InvitePartnerDialog.tsx` | Minor: remove `initialSearchQuery` for player2 name (no longer collected) |

