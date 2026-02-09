
-- Performance indexes for common query patterns

-- team_members: lookups by user_id (every page checks team membership)
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);

-- challenges: filtered by team + status (dashboard, challenges page, notifications)
CREATE INDEX IF NOT EXISTS idx_challenges_challenger_status ON public.challenges(challenger_team_id, status);
CREATE INDEX IF NOT EXISTS idx_challenges_challenged_status ON public.challenges(challenged_team_id, status);

-- matches: filtered by team + status (dashboard, stats, challenges)
CREATE INDEX IF NOT EXISTS idx_matches_challenger_status ON public.matches(challenger_team_id, status);
CREATE INDEX IF NOT EXISTS idx_matches_challenged_status ON public.matches(challenged_team_id, status);
CREATE INDEX IF NOT EXISTS idx_matches_status_completed_at ON public.matches(status, completed_at DESC);

-- ladder_rankings: lookups by team_id and category
CREATE INDEX IF NOT EXISTS idx_ladder_rankings_team_id ON public.ladder_rankings(team_id);
CREATE INDEX IF NOT EXISTS idx_ladder_rankings_category_rank ON public.ladder_rankings(ladder_category_id, rank);

-- ladder_categories: lookups by ladder_id
CREATE INDEX IF NOT EXISTS idx_ladder_categories_ladder_id ON public.ladder_categories(ladder_id);

-- tournament_participants: count by tournament
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament ON public.tournament_participants(tournament_id);

-- profiles: lookup by user_id
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- ladder_join_requests: filtered by team + status
CREATE INDEX IF NOT EXISTS idx_ladder_join_requests_team_status ON public.ladder_join_requests(team_id, status);
