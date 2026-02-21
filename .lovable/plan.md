

# Add Match Scheduling (Time, Duration, Court) for All Tournament Matches

## What Changes

When an admin clicks **"Generate Group Matches"** or **"Start Knockout Stage"**, a dialog will appear asking for:

- **Start date and time** of the first match
- **Duration per match** in minutes (e.g., 30, 45, 60)
- **Number of courts** available

The system auto-assigns each match a scheduled time and court number, staggering them across courts. This applies to **all stages**: group, knockout (quarters, semis, finals).

**Example** with 2 courts and 30-minute matches starting at 10:00 AM:

| Match | Court | Time |
|-------|-------|------|
| Match 1 | Court 1 | 10:00 AM |
| Match 2 | Court 2 | 10:00 AM |
| Match 3 | Court 1 | 10:30 AM |
| Match 4 | Court 2 | 10:30 AM |

Match cards will display the assigned court and scheduled time for both group and knockout stages.

---

## Technical Details

### 1. Database Migration

Add `court_number` and `duration_minutes` columns to `tournament_matches`:

```sql
ALTER TABLE tournament_matches ADD COLUMN court_number INTEGER;
ALTER TABLE tournament_matches ADD COLUMN duration_minutes INTEGER DEFAULT 30;
```

### 2. New Component: `GenerateMatchesDialog.tsx`

A reusable dialog with three inputs:
- Date + time picker (using native `datetime-local` input for simplicity)
- Duration in minutes (number input, default 30)
- Number of courts (number input, default 1)

Used by both "Generate Group Matches" and "Start Knockout Stage" buttons.

### 3. Modified Files

- **`src/components/tournament/GenerateMatchesDialog.tsx`** (new) -- scheduling dialog
- **`src/components/tournament/AdminGroupManagement.tsx`** -- wrap both "Generate Group Matches" and "Start Knockout Stage" buttons with the dialog; update callback signatures to accept scheduling config
- **`src/pages/TournamentDetail.tsx`**:
  - Update `TournamentMatch` interface to include `court_number`, `duration_minutes`, `scheduled_at`
  - Update `generateGroupMatches()` to accept and apply scheduling config
  - Update `startKnockoutStage()` to accept and apply scheduling config
  - Update match card rendering in the Matches tab to show court number and time
- **`src/components/tournament/GroupMatchList.tsx`** -- display court and scheduled time on match cards
- **`src/components/tournament/KnockoutBracket.tsx`** -- display court and scheduled time on match cards

### 4. Scheduling Logic

```
for each match (index i):
  court_number = (i % numberOfCourts) + 1
  timeSlot = floor(i / numberOfCourts)
  scheduled_at = startTime + (timeSlot * durationMinutes * 60000ms)
```

### 5. Display Format

Each match card will show a small line like:
- "Court 1 -- 10:30 AM" for pending matches
- Same info retained for completed matches

