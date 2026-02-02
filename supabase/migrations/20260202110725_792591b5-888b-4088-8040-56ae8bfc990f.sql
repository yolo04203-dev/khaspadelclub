-- Add sets_per_match column to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN sets_per_match integer NOT NULL DEFAULT 3 
CHECK (sets_per_match IN (1, 3));