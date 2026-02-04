-- Add start and end date fields for tournament event dates
ALTER TABLE public.tournaments
ADD COLUMN start_date DATE,
ADD COLUMN end_date DATE;