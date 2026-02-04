

# Add 10 Random Teams to Each Category in Chiniot Ladder

## Overview

This plan adds 10 random teams to each category (Category A and Category B) in the Chiniot Ladder. The ladder already has the same ranking and challenge functionality as the old Leaderboard - we just need to populate it with teams.

---

## Current State

| Item | Status |
|------|--------|
| Chiniot Ladder | Exists and active |
| Category A | Top tier players - 0 teams |
| Category B | Intermediate players - 0 teams |
| Available Teams | 25 teams in the database |

---

## What Will Be Added

| Category | Teams | Starting Ranks |
|----------|-------|----------------|
| Category A | 10 random teams | Ranked 1-10 |
| Category B | 10 different teams | Ranked 1-10 |

Each team will get:
- A rank (1-10) within their category
- Starting points: 1000
- Wins/Losses: 0
- Streak: 0

---

## Functionality (Already Built)

Once teams are added, users will see the full ladder functionality:

- Team rankings with gold/silver/bronze badges for top 3
- Team member avatars
- Win/loss statistics and streaks
- Challenge button (within the configured challenge range)
- Real-time updates when matches complete
- Frozen team indicators (snowflake icons)

---

## Implementation

This is a **data-only change** - no code modifications needed. I will use a database query to insert 20 ladder_rankings records:

### Teams to Add

**Category A (10 teams):**
1. Ace Attackers
2. Court Commanders
3. Drop Shot Dynasty
4. Net Ninjas
5. Paddle Pros
6. Rally Kings
7. Serve Savages
8. Smash Brothers
9. Thunder Smashers
10. Volley Vikings

**Category B (10 different teams):**
1. Baseline Bandits
2. Court Crushers
3. KHAS
4. Lob Legends
5. Net Guardians
6. Paddle Pirates
7. Paddle Warriors
8. Point Predators
9. Rally Renegades
10. Spin Masters

---

## Database Changes

Insert records into `ladder_rankings` table with:
- `team_id`: The team's UUID
- `ladder_category_id`: Category A or B UUID
- `rank`: 1-10
- `points`: 1000 (default)
- `wins`: 0 (default)
- `losses`: 0 (default)
- `streak`: 0 (default)

---

## Result

After this change, visiting the Chiniot Ladder will show:
- Category A tab with 10 ranked teams
- Category B tab with 10 different ranked teams
- Full challenge functionality active
- Stats bar showing team counts and matches

