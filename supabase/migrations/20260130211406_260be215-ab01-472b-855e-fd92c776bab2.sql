-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Team members can create matches" ON public.matches;

-- Create a new policy that allows both challenger and challenged team members to create matches
CREATE POLICY "Team members can create matches" 
ON public.matches 
FOR INSERT 
WITH CHECK (
  is_team_member(auth.uid(), challenger_team_id) 
  OR is_team_member(auth.uid(), challenged_team_id)
  OR is_admin(auth.uid())
);