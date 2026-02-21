
-- Recreate the tournament_participants_public view WITHOUT security_invoker
-- so that all users can see tournament participant data (excluding sensitive fields)
DROP VIEW IF EXISTS public.tournament_participants_public;

CREATE VIEW public.tournament_participants_public AS
SELECT 
  id,
  tournament_id,
  team_id,
  seed,
  is_eliminated,
  eliminated_at,
  final_placement,
  registered_at,
  group_id,
  group_wins,
  group_losses,
  group_points_for,
  group_points_against,
  waitlist_position,
  custom_team_name,
  player1_name,
  player2_name,
  category_id,
  payment_status
FROM tournament_participants;

-- Grant access to the view
GRANT SELECT ON public.tournament_participants_public TO anon, authenticated;
