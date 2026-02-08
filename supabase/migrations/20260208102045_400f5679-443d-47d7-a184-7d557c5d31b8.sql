-- Optimize team lookups
CREATE INDEX IF NOT EXISTS idx_team_members_user_id 
ON team_members(user_id);

-- Optimize ranking queries
CREATE INDEX IF NOT EXISTS idx_ladder_rankings_category_rank 
ON ladder_rankings(ladder_category_id, rank);

-- Optimize challenge queries
CREATE INDEX IF NOT EXISTS idx_challenges_status_teams 
ON challenges(status, challenger_team_id, challenged_team_id);

-- Optimize match history
CREATE INDEX IF NOT EXISTS idx_matches_teams_status 
ON matches(status, challenger_team_id, challenged_team_id);