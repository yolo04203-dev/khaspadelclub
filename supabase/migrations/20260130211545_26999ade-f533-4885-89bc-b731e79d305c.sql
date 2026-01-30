-- Allow team members to update their own team's ladder ranking (for match results)
CREATE POLICY "Team members can update own ranking" 
ON public.ladder_rankings 
FOR UPDATE 
USING (is_team_member(auth.uid(), team_id))
WITH CHECK (is_team_member(auth.uid(), team_id));

-- Allow match participants to update opponent's ranking (for match results)
-- This is needed because when recording a match, both teams' rankings are updated
CREATE POLICY "Match participants can update rankings" 
ON public.ladder_rankings 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.status = 'completed'
    AND (m.challenger_team_id = ladder_rankings.team_id OR m.challenged_team_id = ladder_rankings.team_id)
    AND (is_team_member(auth.uid(), m.challenger_team_id) OR is_team_member(auth.uid(), m.challenged_team_id))
  )
);