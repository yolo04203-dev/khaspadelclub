-- Add venue field to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN venue text DEFAULT NULL;