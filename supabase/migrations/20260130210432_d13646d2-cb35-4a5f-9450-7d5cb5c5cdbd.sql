-- Add columns to store set scores as JSONB arrays
-- Example: [6, 4, 6] means team won 6, 4, 6 games in sets 1, 2, 3
ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS challenger_sets jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS challenged_sets jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS sets_won_challenger integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS sets_won_challenged integer DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.matches.challenger_sets IS 'Array of games won per set by challenger, e.g. [6, 4, 6]';
COMMENT ON COLUMN public.matches.challenged_sets IS 'Array of games won per set by challenged, e.g. [4, 6, 3]';