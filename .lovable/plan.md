
# Cleanup Plan: Remove Seeded Test Data

## Problem Summary
The application became slow because load testing seeded ~10,000 records into production tables:
- 1,000 teams with "SEED" suffix in names
- 1,000 ladder rankings linked to seeded teams
- 5,000 challenges with "SEED_DATA" in message field
- 3,000 matches with "SEED_DATA" in notes field

These records are now being loaded in normal application views like the Ladder Detail page.

---

## Cleanup Strategy

Execute database deletions in the correct order to respect foreign key constraints:

```text
Step 1: Delete challenges linked to seeded teams
Step 2: Delete matches linked to seeded teams  
Step 3: Delete ladder rankings linked to seeded teams
Step 4: Delete the seeded teams themselves
```

---

## Technical Implementation

### Phase 1: Database Cleanup Migration

Create a new migration to remove all seeded data using reliable markers:

```sql
-- Step 1: Delete challenges linked to seeded teams
DELETE FROM challenges 
WHERE message LIKE 'SEED_DATA%';

-- Step 2: Delete matches linked to seeded teams
DELETE FROM matches 
WHERE notes LIKE 'SEED_DATA%';

-- Step 3: Delete ladder rankings linked to seeded teams
DELETE FROM ladder_rankings 
WHERE team_id IN (
  SELECT id FROM teams WHERE name LIKE '%SEED%'
);

-- Step 4: Delete seeded teams
DELETE FROM teams 
WHERE name LIKE '%SEED%';
```

### Phase 2: Verify Cleanup

After running the migration, verify counts return to normal:
- teams: ~29 rows
- ladder_rankings: ~25 rows
- challenges: ~12 rows
- matches: ~6 rows

---

## Expected Results

| Table | Before Cleanup | After Cleanup |
|-------|----------------|---------------|
| teams | 1,029 | ~29 |
| ladder_rankings | 1,025 | ~25 |
| challenges | 5,012 | ~12 |
| matches | 3,006 | ~6 |

**Performance Impact:** Ladder Detail page will load 507 → ~5 rankings, dramatically improving response times.

---

## Files to Modify

| File | Action |
|------|--------|
| `supabase/migrations/[new]_cleanup_seed_data.sql` | New migration to delete seeded records |

---

## Alternative: Call Existing Edge Function

The `seed-test-data` edge function already has cleanup logic. You could also call it with:

```json
POST /seed-test-data
{ "teamCount": 0, "clearExisting": true }
```

However, a direct migration is more reliable and leaves a clear audit trail.
