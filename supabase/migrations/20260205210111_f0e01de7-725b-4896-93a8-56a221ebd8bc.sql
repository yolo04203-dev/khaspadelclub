-- Add score confirmation fields to matches table
ALTER TABLE public.matches 
  ADD COLUMN score_submitted_by uuid,
  ADD COLUMN score_confirmed_by uuid,
  ADD COLUMN score_disputed boolean DEFAULT false,
  ADD COLUMN dispute_reason text;

-- Add RLS policy comment about the new columns
COMMENT ON COLUMN public.matches.score_submitted_by IS 'User who initially submitted the score';
COMMENT ON COLUMN public.matches.score_confirmed_by IS 'User from opposing team who confirmed the score';
COMMENT ON COLUMN public.matches.score_disputed IS 'Whether the score has been disputed by opponent';
COMMENT ON COLUMN public.matches.dispute_reason IS 'Reason for disputing the score';