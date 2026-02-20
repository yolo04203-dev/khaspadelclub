

# Fix Inverted Opponent Names in Match History

## Problem

In the `get_player_unified_stats` database function, the **ladder matches** section of the `recent_matches` CTE has the opponent name aliases swapped:

```sql
-- Current (WRONG):
CASE 
  WHEN m.challenger_team_id = ANY(v_team_ids) THEN ct.name   -- ct = challenger (self!)
  ELSE cht.name                                               -- cht = challenged (self!)
END AS opponent_name
```

- `ct` is joined on `m.challenger_team_id` (the user's own team when they are the challenger)
- `cht` is joined on `m.challenged_team_id` (the user's own team when they are the challenged)

So when the user's team is the challenger, it displays the **user's own team name** as the opponent instead of the actual opponent. This is why "Ahmed & Ali" shows "Javed & Hello" -- the names are swapped.

The PlayerProfile page (lines 114-127) has its own separate client-side logic that does this correctly, so this bug only affects the Stats page and the PlayerStatsSection component.

## Fix

### 1. Database Migration -- Fix `get_player_unified_stats` function

Swap the two team name references in the ladder matches section of the `recent_matches` CTE:

```sql
-- Fixed:
CASE 
  WHEN m.challenger_team_id = ANY(v_team_ids) THEN cht.name   -- opponent is challenged team
  ELSE ct.name                                                  -- opponent is challenger team
END AS opponent_name
```

This is a single-line swap in the existing function. The rest of the function (tournament matches, americano, head-to-head, scores, win/loss logic) is already correct.

### Scope

- **1 database migration** to update the `get_player_unified_stats` function
- **0 frontend file changes** -- the UI components (`MatchTimeline`, `HeadToHead`, `Stats`, `PlayerStatsSection`) are all correct; the bug is purely in the SQL function

