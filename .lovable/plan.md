

## Analysis: Would a two-level ladder flow improve loading speed?

**Yes, significantly.** The current `LadderDetail.tsx` fetches rankings, team members, and profiles for **every category at once** (lines 170-222). If a ladder has 3 categories with 50 teams each, that's 150 rankings + 300 member lookups + 300 profile lookups on initial load — all blocking the first paint.

A tournament-style two-level flow would mean:
- **Level 1** (Ladder page): Load only category metadata (name, description, team count) — a single lightweight query
- **Level 2** (Category page): Load rankings + members + profiles for **one category only** — 3x less data

### Estimated impact
- Current: ~4-6 queries fetching all categories' rankings → 1-3s load
- Proposed: 1 query for category list (~50ms), then 3-4 queries for one category (~300ms)

### Changes

**1. Create `src/pages/LadderCategories.tsx`** (new — Level 1)
- Fetch ladder info + category list with team counts (single query with aggregate)
- Display category cards similar to `TournamentCategoryCard`
- Show category name, description, team count, challenge range, entry fee
- Each card links to `/ladders/:id/category/:categoryId`
- Include Join Ladder button and admin manage link

**2. Create `src/pages/LadderCategoryDetail.tsx`** (new — Level 2)
- Move the current rankings list, challenge logic, and frozen team display here
- Fetch rankings only for the selected `categoryId`
- Back button returns to the ladder categories page
- Contains all existing functionality: challenge buttons, admin controls, realtime subscription, pull-to-refresh

**3. Update `src/pages/LadderDetail.tsx`**
- Replace with the Level 1 component (or redirect to `LadderCategories`)
- Remove all-categories ranking fetch logic

**4. Update `src/components/AuthenticatedRoutes.tsx`**
- Add route: `/ladders/:id/category/:categoryId` → `LadderCategoryDetail`
- Keep `/ladders/:id` → `LadderCategories` (the new Level 1)

**5. Update navigation references**
- Dashboard rank badges that link to specific categories should now link to `/ladders/:id/category/:categoryId`
- Search for all `navigate` and `Link` references to `/ladders/:id` that include category context

### What stays the same
- All challenge logic, frozen team handling, admin controls, realtime subscriptions
- Visual design of ranking cards (VirtualizedRankingsList)
- Join ladder dialog and pending request logic

