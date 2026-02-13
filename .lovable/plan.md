

# Seed 500 Dummy Users Across All Game Modes

## Overview
Rewrite the `seed-test-data` edge function to create 500 fake users (profiles + teams) and distribute them across ladders, tournaments, and americano sessions with realistic data -- giving you a production-like dataset to stress-test on mobile.

## Current State
- 9 real profiles, 29 teams
- 2 ladders with 4 categories
- 5 tournaments with 9 categories
- 5 americano sessions (4 individual, 1 team)

## Data Distribution Plan

| Entity | Count | Details |
|--------|-------|---------|
| Profiles | 500 | Fake `user_id`, display name, skill level, bio |
| Teams | 250 | 2 players per team, linked via `team_members` |
| Ladder rankings | 250 | All 250 teams distributed across 4 existing ladder categories |
| Challenges | 500 | Mix of pending/accepted/declined/expired between ladder teams |
| Matches | 400 | ~60% completed with scores, rest pending/scheduled |
| Tournament participants | 120 | ~30 teams per tournament category (using existing tournaments) |
| Tournament matches | 80 | Group stage + knockout matches for registered teams |
| Americano sessions | 5 new | 3 individual (8 players each) + 2 team (6 teams each) with completed rounds |

## Technical Approach

### Rewrite `supabase/functions/seed-test-data/index.ts`

The function will execute in phases using the service role key (bypasses RLS):

**Phase 1 -- Profiles (500)**
- Generate 500 UUIDs as fake `user_id` values
- Insert into `profiles` with randomized display names, skill levels (Beginner/Intermediate/Advanced/Pro), bios
- These are NOT real auth users -- just profile rows for data volume

**Phase 2 -- Teams (250) + Team Members (500)**
- Pair up profiles into 250 teams
- Insert into `teams` with generated names (marked with "SEED" suffix)
- Insert 2 `team_members` rows per team (one captain, one regular)

**Phase 3 -- Ladder Rankings (250)**
- Distribute all 250 teams across the 4 existing ladder categories
- Assign sequential ranks starting from 100 (avoids conflicting with real data)
- Randomize wins/losses/points/streak

**Phase 4 -- Challenges (500)**
- Create challenges between random teams within the same ladder category
- Mix of statuses: 40% pending, 20% accepted, 15% declined, 15% expired, 10% cancelled

**Phase 5 -- Matches (400)**
- Create matches between random teams
- ~60% completed with random scores and winner
- ~25% scheduled with future dates
- ~15% pending

**Phase 6 -- Tournament Participants (120)**
- Register ~30 seed teams into existing tournament categories
- Set payment status, seed numbers, group assignments

**Phase 7 -- Americano Sessions (5 new)**
- Create 3 individual sessions with 8 random players each, completed rounds with scores
- Create 2 team sessions with 6 teams each, completed round-robin matches

**Phase 8 -- Cleanup marker**
- All seed data uses "SEED" or "SEED_DATA" markers so `clearExisting` can remove it cleanly

### Request Parameters
```json
{
  "userCount": 500,        // default 500
  "clearExisting": false   // set true to wipe previous seed data
}
```

### Cleanup Logic (when `clearExisting: true`)
Delete in reverse dependency order:
1. `americano_team_matches` / `americano_rounds` (where session name contains SEED)
2. `americano_teams` / `americano_players` (where session name contains SEED)
3. `americano_sessions` (where name contains SEED)
4. `tournament_matches` (where linked participants are SEED)
5. `tournament_participants` (where team name contains SEED)
6. `challenges` (where message contains SEED_DATA)
7. `matches` (where notes contains SEED_DATA)
8. `ladder_rankings` (where rank >= 100)
9. `team_members` (where team name contains SEED)
10. `teams` (where name contains SEED)
11. `profiles` (where bio contains SEED_DATA)

### Files Changed
| File | Change |
|------|--------|
| `supabase/functions/seed-test-data/index.ts` | Full rewrite to cover all game modes |

### How to Run
After deployment, call the function from the Admin panel or via the existing trigger. The function requires admin authentication and uses the service role key for inserts.

