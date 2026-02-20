

# Fix: Show All Ladder Rankings on Dashboard

## Problem
The dashboard currently fetches only one ladder ranking per team (using `.limit(1).maybeSingle()`), so if a team is enrolled in multiple ladder categories (e.g., Category A rank #2 and Category B rank #1), only one rank is displayed. The "Current Rank" stat card and the team card both show a single rank, which is misleading.

## Solution
Fetch all ladder rankings for the user's team and display them in the dashboard. The "Current Rank" stat card will show the best rank with a label indicating the category, and additional rankings will be visible.

## Changes

### 1. Update the `UserTeam` interface
Replace the single `rank: number | null` with an array of rankings:
```typescript
interface LadderRank {
  rank: number;
  categoryName: string;
  ladderName: string;
  points: number;
}

interface UserTeam {
  id: string;
  name: string;
  rankings: LadderRank[];  // replaces rank
  memberNames: string[];
}
```

### 2. Update the rank query (line 88)
Replace the current `.limit(1).maybeSingle()` query with a query that fetches all rankings and joins category/ladder names:

```typescript
supabase
  .from("ladder_rankings")
  .select("rank, points, ladder_category_id")
  .eq("team_id", teamId)
  .order("rank", { ascending: true })
```

Then fetch category names for the returned `ladder_category_id` values from `ladder_categories` joined with `ladders`.

### 3. Update the "Current Rank" stat card (lines 356-367)
- Show the best rank prominently (lowest number)
- Add the category name as subtitle (e.g., "Cat A -- Chiniot Ladder")
- If multiple rankings exist, show a small indicator like "+1 more"

### 4. Update the team status card rank display (line 297-298)
Replace `Rank #X` with a list of all rankings:
- "Cat A: #2 -- Cat B: #1" or show them as small badges

### 5. Update `PlayerStatsSection` (optional, same issue)
The `get_player_unified_stats` RPC also returns a single rank/points. This is a known limitation but out of scope for this change -- the dashboard fix is the priority.

## Technical Details

- The rank query changes from a single `.maybeSingle()` call to fetching multiple rows
- Category names require an additional lookup since `ladder_rankings` only stores `ladder_category_id`
- The `UserTeam.rank` field throughout the component needs updating to `UserTeam.rankings`
- No database migration needed -- this is purely a frontend display fix using existing data

