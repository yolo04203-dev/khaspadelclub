

# Allow Joining All Ladders with Team or Custom Player Names

## Problem
1. A database trigger limits teams to a maximum of 2 ladder memberships -- this needs to be removed so teams can join any number of ladders and categories.
2. Users currently can only join with their existing team. They should also have the option to provide custom player names (Player 1 and Player 2) when joining a different ladder.
3. The "Join Ladder" button is hidden once the team is already in any category of that ladder -- it should remain visible so teams can join additional categories.

## Solution

### 1. Database Changes

**Drop the 2-ladder limit trigger:**
```sql
DROP TRIGGER IF EXISTS check_max_ladder_memberships_trigger ON public.ladder_rankings;
DROP FUNCTION IF EXISTS check_max_ladder_memberships;
```

**Add player name columns to `ladder_join_requests`:**
```sql
ALTER TABLE public.ladder_join_requests 
  ADD COLUMN player1_name text,
  ADD COLUMN player2_name text;
```

These columns will be nullable -- when null, it means the user is joining with their existing team. When filled, the admin knows these are custom player names for this ladder entry.

### 2. Update JoinLadderDialog (`src/components/ladder/JoinLadderDialog.tsx`)

- Add a toggle/radio group: "Join with existing team" vs "Join with different players"
- When "different players" is selected, show two text inputs for Player 1 name and Player 2 name
- Pass the player names along in the `ladder_join_requests` insert
- Also filter out categories the team is already ranked in (not just pending requests)

### 3. Update LadderDetail (`src/pages/LadderDetail.tsx`)

- Remove the `!isInLadder` condition so the "Join Ladder" button shows even if the team is already in one category
- Pass the set of category IDs where the team is already ranked, so those are excluded from the dialog's available categories
- Combine "already ranked" category IDs with "pending request" category IDs to determine which categories are still available

### 4. Update JoinRequestsManagement (`src/components/ladder/JoinRequestsManagement.tsx`)

- Display player names in the admin review UI when custom names are provided, so admins know whether the request uses the existing team or custom players

## Files Modified

| File | Change |
|---|---|
| Database migration | Drop 2-ladder limit trigger; add `player1_name`, `player2_name` columns to `ladder_join_requests` |
| `src/components/ladder/JoinLadderDialog.tsx` | Add radio toggle for join type, player name inputs, pass names on insert |
| `src/pages/LadderDetail.tsx` | Remove `!isInLadder` gate on Join button; pass ranked category IDs as existing requests |
| `src/components/ladder/JoinRequestsManagement.tsx` | Show custom player names in admin review when present |

