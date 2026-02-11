

# True Individual Stats Across All Game Modes

## The Problem You Identified

Currently the stats system finds your ONE team and counts that team's wins/losses. But:
- If you play Americano individually, that has nothing to do with your team
- If you change teams or play on multiple teams in tournaments, those stats get lost
- Your personal record should follow YOU, not your current team

## The Fix: Player-Centric Stats

Instead of "find team, then find team's matches," we flip it to "find all matches this player participated in, across all modes."

### How Each Mode Links to YOU (the player)

| Mode | How we find YOUR matches |
|------|--------------------------|
| Ladder | `matches` -> your team_id via `team_members` (all teams you've been on) |
| Tournament | `tournament_matches` -> teams you were on via `team_members` (all teams) |
| Americano | `americano_rounds` -> directly via `americano_players.user_id` |

The key change: instead of `LIMIT 1` on team lookup, we get ALL teams the player has ever been a member of, and count matches across all of them.

## Changes

### 1. Update the Database RPC Function

Modify `get_player_unified_stats` to:
- Collect ALL team_ids the player belongs to (not just one)
- Count ladder/tournament matches across ALL those teams
- Keep Americano as-is (already user_id based)
- Add a `teams` array in the response showing each team's name and individual record
- The "overall" section becomes a true personal aggregate

### 2. Update Stats Page

- Title becomes "My Stats" with the player's own name
- Show a "Teams" section listing each team the player is on, with per-team records
- Americano stats shown separately as "Individual" since they're not tied to any team
- Overall summary adds up everything across all teams + individual play
- Mode filter still works (All / Ladder / Tournament / Americano)

### 3. Update Player Profile Page

- Add a unified stats summary when viewing any player's profile
- Uses the same RPC, showing their cross-mode performance

## Technical Details

### Updated RPC Logic

```text
get_player_unified_stats(p_user_id, p_days)
  |
  |-- Find ALL team_ids from team_members (not LIMIT 1)
  |-- For EACH team_id:
  |     |-- Count ladder match wins/losses
  |     |-- Count tournament match wins/losses
  |-- Americano: query by user_id directly (unchanged)
  |-- Aggregate everything into personal totals
  |-- Return per-team breakdown + personal americano + overall
```

### Updated Response Shape

```text
{
  "player_name": "Ali",
  "teams": [
    { "team_id": "...", "team_name": "Team Alpha", "ladder_wins": 5, "ladder_losses": 2, "tournament_wins": 3, "tournament_losses": 1 },
    { "team_id": "...", "team_name": "Team Beta", "ladder_wins": 1, "ladder_losses": 0, "tournament_wins": 0, "tournament_losses": 0 }
  ],
  "overall": { "wins": 12, "losses": 4 },
  "by_mode": {
    "ladder": { "wins": 6, "losses": 2 },
    "tournament": { "wins": 3, "losses": 1 },
    "americano": { "wins": 3, "losses": 1 }
  },
  "rank": 5,              // from primary/first team's ladder ranking
  "points": 1200,
  "streak": 3,
  "recent_matches": [...], // unified across all teams + americano
  "win_rate_by_day": [...],
  "head_to_head": [...]
}
```

### Files Changed

| File | Change |
|------|--------|
| New migration SQL | Replace RPC to use ALL team_ids, add per-team breakdown, fetch player name from profiles |
| `src/pages/Stats.tsx` | Show player name as title, add per-team breakdown cards, label Americano as "Individual" |
| `src/pages/PlayerProfile.tsx` | Add unified stats section using the same RPC for any viewed player |
| `src/components/stats/MatchTimeline.tsx` | No change needed (already shows source badges) |
| `src/components/stats/WinRateChart.tsx` | No change needed (already accepts data prop) |
| `src/components/stats/HeadToHead.tsx` | No change needed (already includes tournament) |

### Stats Page Layout Updates

- Header: "My Stats" with player display name from profiles
- Per-team cards: each team the player is on, showing that team's ladder + tournament record
- Americano card: labeled "Individual" showing personal americano record
- Overall summary cards: aggregate of everything (unchanged layout, just correct numbers now)
- All existing charts and filters remain the same

