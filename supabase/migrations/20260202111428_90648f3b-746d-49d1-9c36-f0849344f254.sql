-- Add waitlist_position column to tournament_participants
-- NULL means the team is registered, a number means they're on the waitlist
ALTER TABLE public.tournament_participants 
ADD COLUMN waitlist_position integer DEFAULT NULL;

-- Add index for efficient waitlist queries
CREATE INDEX idx_tournament_participants_waitlist ON public.tournament_participants(tournament_id, waitlist_position) 
WHERE waitlist_position IS NOT NULL;