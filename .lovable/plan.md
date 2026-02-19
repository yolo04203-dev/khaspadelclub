

# Make Group Management Category-Wise

## What Changes

Currently the admin "Manage" tab shows all groups and all teams in a single flat view, ignoring categories. This plan makes group management respect categories so each category has its own independent set of groups, teams, and matches.

## Changes

### File: `src/pages/TournamentDetail.tsx`

1. **Filter participants passed to AdminGroupManagement** -- When categories exist, only pass participants that belong to the currently selected category (using the existing `selectedCategoryId` filter). When "All Categories" is selected and categories exist, show a message prompting the admin to select a specific category first.

2. **Pass `category_id` to `createGroup`** -- When creating a group, store the selected category's ID on the group record (the `category_id` column already exists on `tournament_groups`).

3. **Filter groups by category** -- The `filteredGroups` variable already filters by category, so pass `filteredGroups` instead of `groups` to `AdminGroupManagement`.

4. **Update `randomAssignTeams`** -- Only shuffle and assign participants from the current category into groups belonging to that category.

5. **Update `generateGroupMatches`** -- Set `category_id` on generated group matches so they are properly filtered. Only generate for groups in the current category.

6. **Update `startKnockoutStage`** -- Generate knockout brackets per category, setting `category_id` on knockout matches.

7. **Show the category filter above or inside the Manage tab** -- Move the category selector to be visible within the Manage tab, or show a prompt to select a category when categories exist.

### File: `src/components/tournament/AdminGroupManagement.tsx`

1. **Add optional `categoryName` prop** -- Display which category is being managed in the card header/description.

2. **No other structural changes needed** -- The component already works with whatever groups/teams are passed to it. The filtering happens in the parent.

## How It Works

- Admin selects a category from the existing category filter dropdown
- The Manage tab then shows only groups and teams for that category
- Creating a group assigns it to the selected category
- Random draw only affects teams in the selected category
- Generate Group Matches only creates matches for the selected category
- If no categories exist, everything works as before (no filtering)

## No Database Changes Needed

The `tournament_groups.category_id` and `tournament_matches.category_id` columns already exist and just need to be populated.

