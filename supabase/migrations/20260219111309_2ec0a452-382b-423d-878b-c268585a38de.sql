ALTER TABLE public.ladder_categories
  ADD COLUMN entry_fee numeric DEFAULT 0,
  ADD COLUMN entry_fee_currency text DEFAULT 'PKR';