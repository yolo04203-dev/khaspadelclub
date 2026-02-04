-- Drop the existing unique constraint that blocks re-requests
ALTER TABLE public.ladder_join_requests 
DROP CONSTRAINT IF EXISTS ladder_join_requests_team_id_ladder_category_id_key;

-- Create a partial unique index that only prevents duplicate PENDING requests
-- This allows teams to re-request after their previous request was approved/rejected
CREATE UNIQUE INDEX ladder_join_requests_unique_pending 
ON public.ladder_join_requests (team_id, ladder_category_id) 
WHERE status = 'pending';