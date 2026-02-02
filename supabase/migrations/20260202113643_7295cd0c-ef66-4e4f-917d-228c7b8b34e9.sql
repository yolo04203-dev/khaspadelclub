-- Add mode column to americano_sessions
ALTER TABLE americano_sessions
ADD COLUMN mode TEXT NOT NULL DEFAULT 'individual';

-- Create americano_teams table for Team Americano mode
CREATE TABLE americano_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES americano_sessions(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  player1_name TEXT NOT NULL,
  player2_name TEXT NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 0,
  matches_played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create americano_team_matches table for team vs team matches
CREATE TABLE americano_team_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES americano_sessions(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  court_number INTEGER NOT NULL DEFAULT 1,
  team1_id UUID NOT NULL REFERENCES americano_teams(id) ON DELETE CASCADE,
  team2_id UUID NOT NULL REFERENCES americano_teams(id) ON DELETE CASCADE,
  team1_score INTEGER,
  team2_score INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE americano_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE americano_team_matches ENABLE ROW LEVEL SECURITY;

-- RLS policies for americano_teams
CREATE POLICY "Anyone can view americano teams"
ON americano_teams FOR SELECT
USING (true);

CREATE POLICY "Session creator can manage teams"
ON americano_teams FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM americano_sessions
    WHERE americano_sessions.id = americano_teams.session_id
    AND (americano_sessions.created_by = auth.uid() OR is_admin(auth.uid()))
  )
);

-- RLS policies for americano_team_matches
CREATE POLICY "Anyone can view americano team matches"
ON americano_team_matches FOR SELECT
USING (true);

CREATE POLICY "Session creator can manage team matches"
ON americano_team_matches FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM americano_sessions
    WHERE americano_sessions.id = americano_team_matches.session_id
    AND (americano_sessions.created_by = auth.uid() OR is_admin(auth.uid()))
  )
);