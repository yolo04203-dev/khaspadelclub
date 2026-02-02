

# Team Americano Mode Implementation

This plan adds a new "Team Americano" mode alongside the existing individual Americano mode. In Team Americano, fixed teams compete against each other in a round-robin format where every team plays against every other team.

---

## Overview

**What is Team Americano?**
- Teams are fixed (no rotating partners)
- Every team plays against every other team (round-robin)
- Teams earn points for each match based on the score
- The team with the highest total points at the end wins

**Key Differences from Individual Americano:**

| Aspect | Individual Americano | Team Americano |
|--------|---------------------|----------------|
| Partners | Rotate each round | Fixed teams |
| Scoring | Individual points | Team points |
| Format | Random pairings | Round-robin (all vs all) |
| Minimum | 4 players | 2 teams |

---

## User Experience

### For Session Creation:

1. User navigates to `/americano/create`
2. **New:** User sees a toggle to choose between "Individual" or "Team" mode
3. For Team mode:
   - Enter session name and points per match
   - Add teams (each with a team name and 2 player names)
   - Minimum 2 teams, recommended 4-8 teams
4. System automatically calculates total rounds based on round-robin schedule

### For Session Play:

1. All matches are pre-generated (round-robin schedule)
2. Each round can have multiple matches running in parallel
3. Admin enters scores for completed matches
4. Team standings update in real-time showing:
   - Total points accumulated
   - Matches played
   - Wins/Losses
5. Session completes when all matches are finished

---

## Database Changes

### 1. Update americano_sessions Table

Add a new column to distinguish between individual and team modes:

```sql
ALTER TABLE americano_sessions
ADD COLUMN mode TEXT NOT NULL DEFAULT 'individual' 
  CHECK (mode IN ('individual', 'team'));
```

### 2. Create americano_teams Table

New table to store teams in a Team Americano session:

```sql
CREATE TABLE americano_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES americano_sessions(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  player1_name TEXT NOT NULL,
  player2_name TEXT NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 0,
  matches_played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### 3. Create americano_team_matches Table

New table to store team vs team matches:

```sql
CREATE TABLE americano_team_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES americano_sessions(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  court_number INTEGER NOT NULL DEFAULT 1,
  team1_id UUID NOT NULL REFERENCES americano_teams(id),
  team2_id UUID NOT NULL REFERENCES americano_teams(id),
  team1_score INTEGER,
  team2_score INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### 4. RLS Policies

Apply similar RLS policies as existing Americano tables:
- Anyone can view teams and matches
- Session creator can manage teams and matches

---

## Feature Implementation

### 1. Update AmericanoCreate Page

**File:** `src/pages/AmericanoCreate.tsx`

Add mode selection and team input:
- Toggle between "Individual" and "Team" mode at the top
- For Team mode: show team input cards instead of individual player inputs
- Each team card has: Team Name, Player 1, Player 2
- Add/remove team buttons
- Validation: minimum 2 teams for Team mode
- Calculate total rounds (round-robin: each team plays every other team once)

### 2. Update AmericanoSession Page

**File:** `src/pages/AmericanoSession.tsx`

Add conditional rendering based on session mode:
- For team mode: show team standings instead of individual standings
- Team standings columns: Rank, Team Name, W, L, Points
- Match display shows team names instead of player pairs
- Score submission updates team stats (points, wins, losses)

### 3. Update Americano List Page

**File:** `src/pages/Americano.tsx`

- Show mode badge on session cards ("Individual" or "Team")
- Update player count display to show team count for team sessions

### 4. Round-Robin Match Generation Logic

Generate all matches when session starts:
```typescript
function generateRoundRobinSchedule(teams: Team[]): Match[] {
  const matches = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matches.push({ team1: teams[i], team2: teams[j] });
    }
  }
  // Distribute into rounds for parallel play
  return distributeIntoRounds(matches, courts);
}
```

Total matches = n(n-1)/2 where n = number of teams
- 4 teams = 6 matches
- 6 teams = 15 matches
- 8 teams = 28 matches

---

## Files to Create

1. None (all functionality added to existing files)

## Files to Modify

1. `src/pages/AmericanoCreate.tsx` - Add mode selection and team input UI
2. `src/pages/AmericanoSession.tsx` - Handle team mode display and scoring
3. `src/pages/Americano.tsx` - Show mode badge on session cards

## Database Migrations

1. Add `mode` column to `americano_sessions`
2. Create `americano_teams` table
3. Create `americano_team_matches` table
4. Add RLS policies for new tables

---

## UI Components

The implementation will use existing UI components:
- **RadioGroup** - For mode selection (Individual/Team)
- **Card** - For team input sections
- **Input** - For team name and player names
- **Badge** - For mode indicator on session cards
- **Table** - For team standings
- **Button** - For add/remove team actions

---

## Technical Details

### Team Mode Session Flow:

1. **Creation:**
   - User selects "Team" mode
   - Enters teams with player names
   - Session saved with `mode: 'team'`
   - Teams saved to `americano_teams` table

2. **Start Session:**
   - Generate round-robin schedule
   - All matches created in `americano_team_matches`
   - Distribute matches into rounds for parallel play

3. **Score Entry:**
   - Admin enters match scores
   - Team stats updated (points accumulated, wins/losses)
   - Both teams get their respective scores as points

4. **Completion:**
   - All matches completed
   - Final standings calculated
   - Winner is team with most points

### Standings Calculation:

Teams ranked by:
1. Total points (primary)
2. Number of wins (tiebreaker)
3. Point difference (secondary tiebreaker)

