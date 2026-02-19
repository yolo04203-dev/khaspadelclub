

# Show Entry Fee in Ladder Join Request Dialog

## What Changes

When a user opens the "Join Ladder" dialog and selects a category, they will see the entry fee for that category displayed clearly. This ensures players know the cost before submitting a join request.

## Database Change

The `ladder_categories` table currently has no `entry_fee` column. A new column will be added:

- **Column**: `entry_fee` (numeric, nullable, default 0)
- **Column**: `entry_fee_currency` (text, nullable, default 'PKR')

This mirrors the same pattern used in `tournament_categories`.

## UI Changes

### File: `src/components/ladder/JoinLadderDialog.tsx`

- Update the `Category` interface to include `entry_fee` and `entry_fee_currency`
- After the user selects a category, display an info box showing the entry fee (or "Free" if 0)
- The fee will appear between the category selector and the "Join as" radio group

### File: `src/pages/LadderDetail.tsx`

- Update the `ladder_categories` query (line 152) to also select `entry_fee, entry_fee_currency` so the data is passed to the dialog

### Admin Side (optional, for completeness)

- If there's a ladder category management UI, add entry fee input fields there too (similar to tournament category management)

## Technical Details

### Migration SQL

```sql
ALTER TABLE public.ladder_categories
  ADD COLUMN entry_fee numeric DEFAULT 0,
  ADD COLUMN entry_fee_currency text DEFAULT 'PKR';
```

### JoinLadderDialog Changes

- Extend Category interface:
  ```
  interface Category {
    id: string;
    name: string;
    description: string | null;
    entry_fee?: number;
    entry_fee_currency?: string;
  }
  ```
- When `selectedCategory` changes, look up the fee from the categories array
- Show a styled info block below the category select:
  - If fee > 0: "Entry Fee: PKR 2,000" with a money icon
  - If fee is 0 or null: "Free to join"

### LadderDetail.tsx Changes

- Line 152: change select from `"id, name, description, challenge_range"` to `"id, name, description, challenge_range, entry_fee, entry_fee_currency"`

