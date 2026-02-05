-- Add entry_fee column to tournament_categories
ALTER TABLE tournament_categories 
ADD COLUMN entry_fee numeric DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN tournament_categories.entry_fee IS 'Category-specific entry fee. 0 means use tournament default.';