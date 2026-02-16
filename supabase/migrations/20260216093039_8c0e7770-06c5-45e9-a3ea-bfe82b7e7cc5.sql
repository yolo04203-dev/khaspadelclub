
-- Drop the 2-ladder limit trigger and function
DROP TRIGGER IF EXISTS check_max_ladder_memberships_trigger ON public.ladder_rankings;
DROP FUNCTION IF EXISTS check_max_ladder_memberships;

-- Add player name columns to ladder_join_requests
ALTER TABLE public.ladder_join_requests 
  ADD COLUMN IF NOT EXISTS player1_name text,
  ADD COLUMN IF NOT EXISTS player2_name text;
