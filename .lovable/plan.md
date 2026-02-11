

# Unified Player Stats Across All Game Modes

## Problem
The Stats page currently only counts ladder matches. Tournament results, Americano Individual rounds, and Americano Team matches are completely ignored, giving players an incomplete picture of their performance.

## Data Sources to Aggregate

| Game Mode | Table | How player is identified |
|-----------|-------|------------------------|
| Ladder | `matches` | Via team_id (team_members lookup) |
| Tournament | `tournament_matches` | Via team_id (team_members or tournament_participants lookup) |
| Americano Individual | `americano_rounds` | Via americano_players.user_id |
| Americano Team | `americano_team_matches` | Via americano_teams (no direct user_id link -- name-based only) |

Note: Americano Team mode lacks a `user_id` link, so those matches cannot be reliably attributed to a logged-in player. The plan will cover the three modes that have reliable user linkage (Ladder, Tournament, Americano Individual).

## Approach: Database RPC Function

Rather than making 5+ separate queries from the client, we will create a single database RPC function `get_player_unified_stats` that returns aggregated stats in one call. This is more efficient and keeps complex logic server-side.

## Changes

### 1. New Database RPC: `get_player_unified_stats(p_user_id, p_days)`

Returns a JSON object with:
- **overall**: total wins, losses, points, matches played
- **by_mode**: breakdown for ladder, tournament, americano
- **recent_matches**: unified list of recent matches (last 15) across all modes, each tagged with a `source` field ("ladder", "tournament", "americano")
- **win_rate_by_day**: daily win/loss counts for charting

The function will:
- Look up the user's team_id from `team_members`
- Query `matches` (ladder) for completed matches involving that team
- Query `tournament_matches` for completed matches involving that team (via `tournament_participants`)
- Query `americano_rounds` for completed rounds where the user was a player (via `americano_players.user_id`)
- Combine and return aggregated results

### 2. Update `src/pages/Stats.tsx`

- Replace the current ladder-only fetch with a single RPC call to `get_player_unified_stats`
- Add a mode filter (All / Ladder / Tournament / Americano) alongside the existing time period filter
- Update the summary cards to show combined totals
- Keep the existing card layout (Rank stays ladder-only since only ladders have ranks)
- Add a "Matches by Mode" breakdown showing pie/bar distribution

### 3. Update `src/components/stats/WinRateChart.tsx`

- Accept unified match data (with source tags) instead of querying `matches` directly
- Filter by selected mode if applicable
- Chart remains the same visually (cumulative win rate over time)

### 4. Update `src/components/stats/MatchTimeline.tsx`

- Accept unified recent matches list from the RPC
- Add a small badge on each match entry showing the source (Ladder, Tournament, Americano)
- Each entry shows opponent name, result, score, date, and mode

### 5. Update `src/components/stats/HeadToHead.tsx`

- Include tournament matches in opponent records (same team-based lookup)
- Americano individual rounds won't have meaningful "opponents" for head-to-head, so those are excluded from this component

### 6. Database Index

Add an index on `americano_players(user_id)` to speed up the americano stats lookup.

## Technical Details

### RPC Function SQL (simplified)

```sql
CREATE OR REPLACE FUNCTION get_player_unified_stats(
  p_user_id UUID,
  p_days INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  v_team_id UUID;
  v_start_date TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  -- Get user's team
  SELECT team_id INTO v_team_id
  FROM team_members WHERE user_id = p_user_id LIMIT 1;

  -- Calculate date filter
  IF p_days > 0 THEN
    v_start_date := NOW() - (p_days || ' days')::INTERVAL;
  ELSE
    v_start_date := '1970-01-01'::TIMESTAMPTZ;
  END IF;

  -- Build unified result from ladder matches,
  -- tournament matches, and americano rounds
  -- ... (aggregation logic)

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Files Changed

| File | Change |
|------|--------|
| New migration SQL | RPC function + index |
| `src/pages/Stats.tsx` | Replace fetch with RPC call, add mode filter |
| `src/components/stats/WinRateChart.tsx` | Accept pre-fetched data prop instead of self-fetching |
| `src/components/stats/MatchTimeline.tsx` | Accept unified data, show mode badges |
| `src/components/stats/HeadToHead.tsx` | Include tournament matches in records |

### No UI/UX Redesign

The existing card layout, charts, and visual style remain identical. The only visible additions are:
- A mode filter dropdown next to the existing time period dropdown
- Small mode badges on match timeline entries (e.g., "Ladder", "Tournament", "Americano")

