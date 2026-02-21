
# Per-Round Match Format for Knockout Stages

## What Changes

When an admin clicks **"Start Knockout Stage"**, the scheduling dialog will now also show a **match format selector for each knockout round** (e.g., Quarter-Finals: Single Set, Semi-Finals: Best of 3, Finals: Best of 3). Each round can independently be configured.

The knockout bracket and match cards will display the correct format per match, and score entry will adapt accordingly (single score input vs set-by-set entry).

---

## Technical Details

### 1. Database Migration

Add a `sets_per_match` column to `tournament_matches` so each match stores its own format:

```sql
ALTER TABLE tournament_matches ADD COLUMN sets_per_match INTEGER DEFAULT 3;
```

### 2. Update `GenerateMatchesDialog.tsx`

- Add an optional `roundLabels` prop (e.g., `["Quarter-Finals", "Semi-Finals", "Finals"]`) that triggers per-round format selectors
- When `roundLabels` is provided, render a format dropdown (Single Set / Best of 3) for each round
- Export the round formats as part of `SchedulingConfig`

### 3. Update `TournamentDetail.tsx`

- In `startKnockoutStage`, compute the round labels and pass them to the dialog
- When inserting knockout matches, set `sets_per_match` on each match based on the admin's per-round selection
- In the inline knockout match cards (category view), pass the match's `sets_per_match` to control score entry behavior

### 4. Update `KnockoutBracket.tsx`

- Accept `setsPerMatch` from each match's data (not a single prop)
- Use per-match `sets_per_match` to determine score input style (single input vs set-by-set)
- Display format badge per round

### 5. Update `GroupMatchList.tsx`

- No changes needed -- group matches continue using the tournament-level `sets_per_match` setting

### Files to Modify

- **Database migration** -- add `sets_per_match` column to `tournament_matches`
- **`src/components/tournament/GenerateMatchesDialog.tsx`** -- add optional per-round format selectors
- **`src/pages/TournamentDetail.tsx`** -- pass round labels to knockout dialog, save per-match format, use it in score entry
- **`src/components/tournament/KnockoutBracket.tsx`** -- read per-match `sets_per_match` for score entry and display
- **`src/components/tournament/AdminGroupManagement.tsx`** -- pass round count info to the knockout dialog
