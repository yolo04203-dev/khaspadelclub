
-- Fix tournament_participants: restrict SELECT to tournament creators, team members, admins
DROP POLICY IF EXISTS "Authenticated users can view tournament participants" ON public.tournament_participants;

CREATE POLICY "Tournament stakeholders can view participants"
ON public.tournament_participants FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_participants.tournament_id
      AND t.created_by = auth.uid()
  )
  OR is_team_member(auth.uid(), team_id)
  OR is_admin(auth.uid())
);
