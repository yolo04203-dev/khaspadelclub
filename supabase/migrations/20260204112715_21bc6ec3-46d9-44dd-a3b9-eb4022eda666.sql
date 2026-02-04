-- Add max_teams column to ladders table
ALTER TABLE public.ladders 
ADD COLUMN max_teams integer NOT NULL DEFAULT 16;

-- Add a comment to explain the field
COMMENT ON COLUMN public.ladders.max_teams IS 'Maximum number of teams allowed in this ladder';