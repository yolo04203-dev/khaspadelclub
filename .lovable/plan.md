

# Make Current Rank Card Clickable with Expandable Rankings

## What changes

The "Current Rank" stat card on the dashboard will become clickable/tappable when the user has rankings. Clicking it will expand to show all ladder rankings in a popover or collapsible detail view.

## UI Behavior

- **Single ranking**: Card shows the rank as-is; clicking navigates to the ladder detail page for that category.
- **Multiple rankings**: Clicking the card opens a Popover (desktop) / bottom sheet showing all rankings with category name, ladder name, rank, and points. Each entry links to its respective ladder.
- **No rankings**: Card remains non-interactive (no cursor change, no click behavior).

## Implementation

### 1. Wrap the Current Rank Card with a Popover (`src/pages/Dashboard.tsx`)

- Import `Popover`, `PopoverTrigger`, `PopoverContent` from the existing UI components.
- Wrap the Current Rank `Card` in a `PopoverTrigger` when multiple rankings exist.
- The popover content lists all rankings with:
  - Category name and ladder name
  - Rank number and points
  - A link/button to navigate to the ladder detail page
- Add `cursor-pointer` and hover styling to indicate interactivity.
- If only one ranking exists, make the card a direct `Link` to the ladder detail page instead of using a popover.

### 2. Required data

The `rankings` array already contains `categoryName`, `ladderName`, `rank`, and `points`. We also need the `ladder_id` to build navigation links. This requires a small update to the rankings query to also store the `ladder_id` in the `LadderRank` interface.

### Technical details

- Add `ladderId: string` to the `LadderRank` interface
- Update the rankings mapping to extract `ladder_id` from the joined `ladder_categories` data
- For single ranking: wrap card in `<Link to={/ladders/${ladderId}}>` 
- For multiple rankings: use `Popover` with a list of ranked entries, each linking to `/ladders/${ladderId}`
- Add visual cue: `cursor-pointer hover:shadow-md transition-shadow` on the card when rankings exist

