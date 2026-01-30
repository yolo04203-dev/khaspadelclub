-- Create teams table
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    avatar_url TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team_members junction table
CREATE TABLE public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    is_captain BOOLEAN DEFAULT false,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (team_id, user_id)
);

-- Create match status enum
CREATE TYPE public.match_status AS ENUM ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled');

-- Create challenge status enum  
CREATE TYPE public.challenge_status AS ENUM ('pending', 'accepted', 'declined', 'expired', 'cancelled');

-- Create matches table
CREATE TABLE public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenger_team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    challenged_team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    winner_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    challenger_score INTEGER,
    challenged_score INTEGER,
    status match_status NOT NULL DEFAULT 'pending',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT different_teams CHECK (challenger_team_id != challenged_team_id)
);

-- Create challenges table (for ladder challenges)
CREATE TABLE public.challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenger_team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    challenged_team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
    status challenge_status NOT NULL DEFAULT 'pending',
    message TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT different_challenge_teams CHECK (challenger_team_id != challenged_team_id)
);

-- Create ladder_rankings table
CREATE TABLE public.ladder_rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL UNIQUE,
    rank INTEGER NOT NULL,
    points INTEGER NOT NULL DEFAULT 1000,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    streak INTEGER NOT NULL DEFAULT 0, -- positive = win streak, negative = loss streak
    last_match_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster rank queries
CREATE INDEX idx_ladder_rankings_rank ON public.ladder_rankings(rank);
CREATE INDEX idx_ladder_rankings_points ON public.ladder_rankings(points DESC);

-- Enable RLS on all tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ladder_rankings ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user is member of a team
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.team_members
        WHERE user_id = _user_id
          AND team_id = _team_id
    )
$$;

-- Helper function: Check if user is captain of a team
CREATE OR REPLACE FUNCTION public.is_team_captain(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.team_members
        WHERE user_id = _user_id
          AND team_id = _team_id
          AND is_captain = true
    )
$$;

-- Teams policies
CREATE POLICY "Anyone can view teams"
ON public.teams FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create teams"
ON public.teams FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Team captains can update their team"
ON public.teams FOR UPDATE
TO authenticated
USING (public.is_team_captain(auth.uid(), id));

CREATE POLICY "Admins can manage all teams"
ON public.teams FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Team members policies
CREATE POLICY "Anyone can view team members"
ON public.team_members FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Team captains can add members"
ON public.team_members FOR INSERT
TO authenticated
WITH CHECK (public.is_team_captain(auth.uid(), team_id) OR public.is_admin(auth.uid()));

CREATE POLICY "Team captains can remove members"
ON public.team_members FOR DELETE
TO authenticated
USING (public.is_team_captain(auth.uid(), team_id) OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage team members"
ON public.team_members FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Matches policies
CREATE POLICY "Anyone can view matches"
ON public.matches FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Team members can create matches"
ON public.matches FOR INSERT
TO authenticated
WITH CHECK (
    public.is_team_member(auth.uid(), challenger_team_id) OR
    public.is_admin(auth.uid())
);

CREATE POLICY "Involved teams can update match"
ON public.matches FOR UPDATE
TO authenticated
USING (
    public.is_team_member(auth.uid(), challenger_team_id) OR
    public.is_team_member(auth.uid(), challenged_team_id) OR
    public.is_admin(auth.uid())
);

CREATE POLICY "Admins can delete matches"
ON public.matches FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Challenges policies
CREATE POLICY "Anyone can view challenges"
ON public.challenges FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Team members can create challenges"
ON public.challenges FOR INSERT
TO authenticated
WITH CHECK (public.is_team_member(auth.uid(), challenger_team_id));

CREATE POLICY "Challenged team can respond to challenge"
ON public.challenges FOR UPDATE
TO authenticated
USING (
    public.is_team_member(auth.uid(), challenged_team_id) OR
    public.is_team_member(auth.uid(), challenger_team_id) OR
    public.is_admin(auth.uid())
);

CREATE POLICY "Admins can manage challenges"
ON public.challenges FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Ladder rankings policies (public read, admin write)
CREATE POLICY "Anyone can view ladder rankings"
ON public.ladder_rankings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage rankings"
ON public.ladder_rankings FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON public.teams
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_matches_updated_at
    BEFORE UPDATE ON public.matches
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ladder_rankings_updated_at
    BEFORE UPDATE ON public.ladder_rankings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create a team and add creator as captain
CREATE OR REPLACE FUNCTION public.create_team_with_captain(
    _name TEXT,
    _avatar_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _team_id UUID;
    _next_rank INTEGER;
BEGIN
    -- Create the team
    INSERT INTO public.teams (name, avatar_url, created_by)
    VALUES (_name, _avatar_url, auth.uid())
    RETURNING id INTO _team_id;
    
    -- Add creator as captain
    INSERT INTO public.team_members (team_id, user_id, is_captain)
    VALUES (_team_id, auth.uid(), true);
    
    -- Get next rank position
    SELECT COALESCE(MAX(rank), 0) + 1 INTO _next_rank FROM public.ladder_rankings;
    
    -- Add to ladder rankings
    INSERT INTO public.ladder_rankings (team_id, rank)
    VALUES (_team_id, _next_rank);
    
    RETURN _team_id;
END;
$$;