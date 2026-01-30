-- Create enums for game modes
CREATE TYPE public.game_mode AS ENUM ('ladder', 'americano', 'tournament');
CREATE TYPE public.tournament_format AS ENUM ('single_elimination', 'double_elimination', 'round_robin');
CREATE TYPE public.tournament_status AS ENUM ('draft', 'registration', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.americano_status AS ENUM ('draft', 'in_progress', 'completed', 'cancelled');

-- Americano Sessions table
CREATE TABLE public.americano_sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id),
    status americano_status NOT NULL DEFAULT 'draft',
    points_per_round INTEGER NOT NULL DEFAULT 21,
    total_rounds INTEGER NOT NULL DEFAULT 4,
    current_round INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Americano Players (individual players in a session)
CREATE TABLE public.americano_players (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.americano_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    player_name TEXT NOT NULL,
    total_points INTEGER NOT NULL DEFAULT 0,
    matches_played INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Americano Rounds (stores partner assignments and match results)
CREATE TABLE public.americano_rounds (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.americano_sessions(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    court_number INTEGER NOT NULL DEFAULT 1,
    team1_player1_id UUID NOT NULL REFERENCES public.americano_players(id),
    team1_player2_id UUID NOT NULL REFERENCES public.americano_players(id),
    team2_player1_id UUID NOT NULL REFERENCES public.americano_players(id),
    team2_player2_id UUID NOT NULL REFERENCES public.americano_players(id),
    team1_score INTEGER,
    team2_score INTEGER,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tournaments table
CREATE TABLE public.tournaments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    format tournament_format NOT NULL DEFAULT 'single_elimination',
    status tournament_status NOT NULL DEFAULT 'draft',
    max_teams INTEGER NOT NULL DEFAULT 8,
    created_by UUID REFERENCES auth.users(id),
    registration_deadline TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    winner_team_id UUID REFERENCES public.teams(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tournament Participants (teams registered)
CREATE TABLE public.tournament_participants (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    seed INTEGER,
    is_eliminated BOOLEAN NOT NULL DEFAULT false,
    eliminated_at TIMESTAMP WITH TIME ZONE,
    final_placement INTEGER,
    registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(tournament_id, team_id)
);

-- Tournament Matches (bracket matches)
CREATE TABLE public.tournament_matches (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    match_number INTEGER NOT NULL,
    team1_id UUID REFERENCES public.teams(id),
    team2_id UUID REFERENCES public.teams(id),
    team1_score INTEGER,
    team2_score INTEGER,
    winner_team_id UUID REFERENCES public.teams(id),
    next_match_id UUID REFERENCES public.tournament_matches(id),
    is_losers_bracket BOOLEAN NOT NULL DEFAULT false,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.americano_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.americano_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.americano_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;

-- Americano Sessions policies
CREATE POLICY "Anyone can view americano sessions"
ON public.americano_sessions FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create americano sessions"
ON public.americano_sessions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can update their sessions"
ON public.americano_sessions FOR UPDATE
USING (auth.uid() = created_by OR is_admin(auth.uid()));

CREATE POLICY "Creator can delete their sessions"
ON public.americano_sessions FOR DELETE
USING (auth.uid() = created_by OR is_admin(auth.uid()));

-- Americano Players policies
CREATE POLICY "Anyone can view americano players"
ON public.americano_players FOR SELECT
USING (true);

CREATE POLICY "Session creator can manage players"
ON public.americano_players FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.americano_sessions
        WHERE id = session_id AND (created_by = auth.uid() OR is_admin(auth.uid()))
    )
);

-- Americano Rounds policies
CREATE POLICY "Anyone can view americano rounds"
ON public.americano_rounds FOR SELECT
USING (true);

CREATE POLICY "Session creator can manage rounds"
ON public.americano_rounds FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.americano_sessions
        WHERE id = session_id AND (created_by = auth.uid() OR is_admin(auth.uid()))
    )
);

-- Tournament policies
CREATE POLICY "Anyone can view tournaments"
ON public.tournaments FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create tournaments"
ON public.tournaments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can update their tournaments"
ON public.tournaments FOR UPDATE
USING (auth.uid() = created_by OR is_admin(auth.uid()));

CREATE POLICY "Creator can delete their tournaments"
ON public.tournaments FOR DELETE
USING (auth.uid() = created_by OR is_admin(auth.uid()));

-- Tournament Participants policies
CREATE POLICY "Anyone can view tournament participants"
ON public.tournament_participants FOR SELECT
USING (true);

CREATE POLICY "Team captains can register for tournaments"
ON public.tournament_participants FOR INSERT
TO authenticated
WITH CHECK (
    is_team_captain(auth.uid(), team_id) OR is_admin(auth.uid())
);

CREATE POLICY "Tournament creator can manage participants"
ON public.tournament_participants FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.tournaments
        WHERE id = tournament_id AND (created_by = auth.uid() OR is_admin(auth.uid()))
    )
);

CREATE POLICY "Team captains can withdraw from tournaments"
ON public.tournament_participants FOR DELETE
USING (
    is_team_captain(auth.uid(), team_id) OR 
    EXISTS (
        SELECT 1 FROM public.tournaments
        WHERE id = tournament_id AND created_by = auth.uid()
    ) OR
    is_admin(auth.uid())
);

-- Tournament Matches policies
CREATE POLICY "Anyone can view tournament matches"
ON public.tournament_matches FOR SELECT
USING (true);

CREATE POLICY "Tournament creator can manage matches"
ON public.tournament_matches FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.tournaments
        WHERE id = tournament_id AND (created_by = auth.uid() OR is_admin(auth.uid()))
    )
);

-- Create triggers for updated_at
CREATE TRIGGER update_americano_sessions_updated_at
BEFORE UPDATE ON public.americano_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at
BEFORE UPDATE ON public.tournaments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();