

## Analysis: No Deduplication Exists

The CSV export code (`src/lib/exportMatches.ts`) has **zero deduplication logic**. Every row maps directly from its match record:

- `tournament.venue || ""` — venue from the tournament object (same for all rows, by design)
- `m.court_number ? String(m.court_number) : ""` — per-match court
- `formatDate(m.scheduled_at)` — per-match date
- `formatTime(m.scheduled_at)` — per-match time

There are no `previousCourt`, `previousTime`, or "skip if same" comparisons anywhere.

**Root cause of blank values**: The `court_number` and `scheduled_at` columns in the `tournament_matches` table are nullable. When matches haven't been assigned a court or scheduled time, they export as empty strings — not because of deduplication, but because the data is `NULL` in the database.

### Changes needed

#### 1. `src/lib/exportMatches.ts` — Add missing-data warning callback

Add an `onWarning` callback to `exportTournamentMatchesCSV` and both Americano export functions. Before generating CSV, count matches with null `court_number` or `scheduled_at`. If any are missing, call the warning with a descriptive message. Still proceed with export.

#### 2. `src/pages/TournamentDetail.tsx` — Show toast warning on export

Pass `toast.warning(msg)` as the `onWarning` callback so admins see: "X of Y matches are missing court or time assignments."

#### 3. `src/pages/AmericanoSession.tsx` — Same warning pattern

Pass `toast.warning(msg)` for Americano exports, warning about missing `court_number` values.

No deduplication removal needed — none exists. This is purely a data-completeness visibility fix.

