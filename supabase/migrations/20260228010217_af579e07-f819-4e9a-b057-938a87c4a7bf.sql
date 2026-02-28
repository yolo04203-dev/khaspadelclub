-- Performance indexes for frequently filtered foreign keys
CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament_id ON public.tournament_matches (tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_category_id ON public.tournament_matches (category_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_category_id ON public.tournament_participants (category_id);
CREATE INDEX IF NOT EXISTS idx_americano_team_matches_session_id ON public.americano_team_matches (session_id);
CREATE INDEX IF NOT EXISTS idx_americano_rounds_session_id ON public.americano_rounds (session_id);
CREATE INDEX IF NOT EXISTS idx_americano_players_session_id ON public.americano_players (session_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_invited_user_status ON public.team_invitations (invited_user_id, status);