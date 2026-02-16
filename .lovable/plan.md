

# Fix: Rankings Showing "Unranked" for Teams in Multiple Categories

## Problem
Since teams can now join multiple ladder categories, the `ladder_rankings` table can have multiple rows per team. All pages that fetch ranking data use `.maybeSingle()` which fails silently when multiple rows exist, returning `null` -- causing "Unranked" to display even though the team IS ranked.

Affected pages:
- **Dashboard** (line 77) -- shows "Unranked" in team card and "#--" in stats
- **Profile** (line 142) -- shows "Unranked" in team section
- **PlayerProfile** (line 86) -- shows "Unranked" for viewed player
- **Challenges** (line 127) -- rank not resolved for challenge logic

## Solution
Change all four pages to fetch multiple ranking rows (remove `.maybeSingle()`) and pick the **best rank** (lowest number = highest position) to display. This ensures the user always sees their top ranking across all categories.

### Technical Changes

#### 1. `src/pages/Dashboard.tsx` (~line 77)
Replace:
```tsx
supabase.from("ladder_rankings").select("rank, wins, losses").eq("team_id", teamId).maybeSingle()
```
With a query that fetches all rankings for the team, then pick the one with the best (lowest) rank:
```tsx
supabase.from("ladder_rankings").select("rank, wins, losses").eq("team_id", teamId).order("rank", { ascending: true }).limit(1).maybeSingle()
```

#### 2. `src/pages/Profile.tsx` (~line 138-142)
Same pattern -- add `.order("rank").limit(1)` before `.maybeSingle()`.

#### 3. `src/pages/PlayerProfile.tsx` (~line 82-86)
Same pattern -- add `.order("rank").limit(1)` before `.maybeSingle()`.

#### 4. `src/pages/Challenges.tsx` (~line 123-127)
Same pattern -- add `.order("rank").limit(1)` before `.maybeSingle()`.

## Why `.order("rank").limit(1).maybeSingle()` Works
- Fetches only the highest-ranked (lowest number) entry across all categories
- `.limit(1)` ensures only one row is returned, so `.maybeSingle()` works correctly
- If the team has no rankings at all, it still returns `null` gracefully
- No UI changes needed -- the existing "Rank #X" / "Unranked" display logic remains correct

## Files Modified

| File | Change |
|---|---|
| `src/pages/Dashboard.tsx` | Add `.order("rank").limit(1)` to ladder_rankings query |
| `src/pages/Profile.tsx` | Add `.order("rank").limit(1)` to ladder_rankings query |
| `src/pages/PlayerProfile.tsx` | Add `.order("rank").limit(1)` to ladder_rankings query |
| `src/pages/Challenges.tsx` | Add `.order("rank").limit(1)` to ladder_rankings query |

