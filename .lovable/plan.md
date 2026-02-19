

# Restructure Tournament Detail into Category-First Navigation

## Overview

Transform the tournament detail page from a flat tab layout with a category dropdown filter into a two-level navigation flow that matches the reference app design:

1. **Level 1 - Tournament Page**: Shows category cards (like the reference "JUNIOR NATIONAL PADEL CHAMPIONSHIP" screen)
2. **Level 2 - Category View**: Shows tabs for Standings, Matches, and Info within that category

## Current vs New Flow

```text
CURRENT:
Tournament -> [Info | Manage | Categories | Registrations | Groups | Matches | Knockout | Participants]
              + Category dropdown filter

NEW:
Tournament -> Category Cards (entry fee, teams joined, winner if completed)
           -> Click category -> [Standings | Matches | Info]
                                  |            |         |
                                  |            |         +-- Tournament info + category details
                                  |            +-- Merged: knockout rounds (Final, Semi, QF) as accordions
                                  |                        + group matches as accordions (Group A, B, ...)
                                  +-- Group standings as accordions (Group A, B, C, D)

Admin still has access to: Manage, Categories, Registrations tabs
```

## Detailed Changes

### 1. Tournament Detail Page - Category Cards View (Level 1)

When the page loads and categories exist, show:
- Tournament header (name, status badge, back button)
- Admin action buttons (if admin): Manage, Categories, Registrations as tabs or buttons
- Category cards in a vertical list, each card showing:
  - Category name (e.g., "Mens A")
  - Venue (from tournament)
  - Teams joined count (e.g., "10/16 Joined")
  - Entry fee (category-specific or tournament default, e.g., "PKR 5,000 Per team")
  - Winner team name (if tournament completed and category has a winner)
  - Clickable -> sets `selectedCategoryId` to enter Level 2

### 2. Category Detail View (Level 2)

When a category is selected, show:
- Back arrow to return to category list (resets `selectedCategoryId` to `"all"`)
- Category name as title
- Three tabs: **Standings**, **Matches**, **Info**

#### Standings Tab
- Accordion sections for each group (Group A, Group B, etc.)
- Each accordion expands to show the group standings table (reuse existing `GroupStandings` component)

#### Matches Tab (merged Groups + Knockout)
- Knockout rounds shown first as accordion sections in reverse order:
  - Final, Third Position, Semi Final, Quarter Final (based on round numbers)
  - Each expands to show match cards
- Then group matches as accordion sections:
  - Group A, Group B, etc.
  - Each expands to show group match list (reuse `GroupMatchList`)

#### Info Tab
- Tournament description, venue, dates, entry fee, payment instructions
- Category-specific details (max teams, category entry fee override)

### 3. Admin Tabs

Admin-only tabs (Manage, Categories, Registrations) remain accessible:
- When at Level 1 (category cards view): show as tabs above the cards
- The Manage tab still requires selecting a specific category to work with groups
- Categories and Registrations tabs work as they do now

### 4. Fallback for No Categories

If a tournament has zero categories, keep the current flat tab layout so existing tournaments without categories still work.

## Technical Details

### Files to Modify

**`src/pages/TournamentDetail.tsx`** - Major restructure:
- Add state: `selectedCategoryId` changes from filter to navigation (`null` = Level 1, a UUID = Level 2)
- Level 1 rendering: category cards with onClick to set selectedCategoryId
- Level 2 rendering: back button + Standings/Matches/Info tabs
- Admin tabs shown at both levels
- Merge knockout + group matches into single "Matches" tab using Accordion component
- Map knockout round numbers to labels: highest round = "Final", second highest = "Semi Final", etc.

**New component: `src/components/tournament/TournamentCategoryCard.tsx`**
- Card component for each category in Level 1
- Props: category name, venue, teams joined/max, entry fee, currency, winner name
- Styled similar to reference image (clean card with info layout)

### Accordion Usage for Matches Tab
- Use existing `@radix-ui/react-accordion` (already installed)
- Knockout sections: "Final", "Third Position", "Semi Final", "Quarter Final"
- Group sections: "Group A", "Group B", etc.
- Each section expandable/collapsible

### Round Number to Label Mapping
```text
If max round = 3: Round 3 = "Final", Round 2 = "Semi Final", Round 1 = "Quarter Final"
If max round = 2: Round 2 = "Final", Round 1 = "Semi Final"
If max round = 1: Round 1 = "Final"
```

### No Database Changes Required
All data already exists - this is purely a UI restructure.

