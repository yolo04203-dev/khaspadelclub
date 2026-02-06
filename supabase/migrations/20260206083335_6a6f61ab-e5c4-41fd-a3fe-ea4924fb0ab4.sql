
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view ladder join requests" ON public.ladder_join_requests;

-- Create a proper SELECT policy that only allows:
-- 1. Admins can see all requests
-- 2. Team members can see their own team's requests
CREATE POLICY "Users can view relevant join requests"
ON public.ladder_join_requests
FOR SELECT
USING (
  public.is_admin(auth.uid()) OR
  public.is_team_member(auth.uid(), team_id)
);
