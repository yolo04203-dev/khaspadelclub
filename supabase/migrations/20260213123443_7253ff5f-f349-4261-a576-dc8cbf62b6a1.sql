
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view tournament participants" ON public.tournament_participants;

-- Authenticated users can view tournament participants (removes anonymous/public access)
CREATE POLICY "Authenticated users can view tournament participants"
ON public.tournament_participants FOR SELECT TO authenticated
USING (true);

-- Create a public view excluding payment-sensitive columns
CREATE VIEW public.tournament_participants_public
WITH (security_invoker = on) AS
SELECT
  id, tournament_id, team_id, seed, is_eliminated, eliminated_at,
  final_placement, registered_at, group_id, group_wins, group_losses,
  group_points_for, group_points_against, waitlist_position,
  custom_team_name, player1_name, player2_name, category_id, payment_status
FROM public.tournament_participants;
