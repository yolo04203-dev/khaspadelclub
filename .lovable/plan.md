

# Implementation Plan: Per-Category Registration Fees

## Overview
Currently, tournaments have a single entry fee that applies to all categories. This plan implements the ability to set different registration fees for each category (e.g., Men's A could be PKR 2,000 while Women's B could be PKR 1,500).

## Current State
- Tournament has a single `entry_fee` and `entry_fee_currency` stored in the `tournaments` table
- Categories (`tournament_categories` table) only have: `name`, `description`, `max_teams`, `display_order`
- The `RegistrationDialog` shows the tournament-level entry fee regardless of which category is selected

## Implementation Steps

### 1. Database Schema Update
Add `entry_fee` column to the `tournament_categories` table:

```sql
ALTER TABLE tournament_categories 
ADD COLUMN entry_fee numeric DEFAULT 0;
```

This allows each category to optionally override the tournament-level fee. A value of `0` or `NULL` will indicate "use tournament default fee."

### 2. Update Tournament Creation Page
**File: `src/pages/TournamentCreate.tsx`**

- Add an `entryFee` field to the `CategoryInput` interface
- Update the category input form to include a fee input for each category
- When creating categories, save the per-category entry fee to the database

### 3. Update Category Management Component
**File: `src/components/tournament/CategoryManagement.tsx`**

- Add entry fee field to the create/edit category dialog
- Display the entry fee alongside max teams in the category list
- Allow admins to update category fees during registration phase

### 4. Update Registration Dialog
**File: `src/components/tournament/RegistrationDialog.tsx`**

- Extend the `TournamentCategory` interface to include `entry_fee`
- When a category is selected, display that category's entry fee instead of the tournament default
- If category has no specific fee (0 or null), fall back to tournament-level fee

### 5. Update Tournament Detail Page
**File: `src/pages/TournamentDetail.tsx`**

- Fetch and pass `entry_fee` from categories to the `RegistrationDialog`
- Update the Info tab to show category-specific fees if they differ from tournament default
- Update the category filter section to optionally show fees

### 6. Update Type Definitions
The database types will auto-update after migration, but we need to update local interfaces:

- `TournamentCategory` interface in `CategoryManagement.tsx`
- `TournamentCategory` interface in `RegistrationDialog.tsx`

## User Experience Flow

1. **Creating Tournament**: Admin adds categories with optional individual fees
2. **Viewing Tournament**: Info tab shows if categories have different fees
3. **Registering**: When user selects a category, the fee displayed updates to reflect that category's specific fee
4. **Managing Categories**: Admin can edit category fees during registration phase

## Technical Details

### Database Migration
```sql
-- Add entry_fee column to tournament_categories
ALTER TABLE tournament_categories 
ADD COLUMN entry_fee numeric DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN tournament_categories.entry_fee IS 'Category-specific entry fee. 0 means use tournament default.';
```

### Fee Display Logic
```text
displayedFee = selectedCategory?.entry_fee > 0 
  ? selectedCategory.entry_fee 
  : tournament.entry_fee
```

### Files to Modify
1. `src/pages/TournamentCreate.tsx` - Add fee input to category creation
2. `src/components/tournament/CategoryManagement.tsx` - Add fee to category CRUD
3. `src/components/tournament/RegistrationDialog.tsx` - Dynamic fee based on category
4. `src/pages/TournamentDetail.tsx` - Pass category fees to dialog

