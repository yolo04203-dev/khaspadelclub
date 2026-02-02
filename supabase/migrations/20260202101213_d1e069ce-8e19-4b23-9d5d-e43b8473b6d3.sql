-- Create tournament_groups table for group stage
CREATE TABLE public.tournament_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add group_id and group stage tracking to tournament_participants
ALTER TABLE public.tournament_participants 
ADD COLUMN group_id UUID REFERENCES public.tournament_groups(id) ON DELETE SET NULL,
ADD COLUMN group_wins INTEGER NOT NULL DEFAULT 0,
ADD COLUMN group_losses INTEGER NOT NULL DEFAULT 0,
ADD COLUMN group_points_for INTEGER NOT NULL DEFAULT 0,
ADD COLUMN group_points_against INTEGER NOT NULL DEFAULT 0;

-- Add group match tracking to tournament_matches
ALTER TABLE public.tournament_matches
ADD COLUMN group_id UUID REFERENCES public.tournament_groups(id) ON DELETE SET NULL,
ADD COLUMN stage TEXT NOT NULL DEFAULT 'knockout' CHECK (stage IN ('group', 'knockout'));

-- Add number_of_groups to tournaments for tracking group count
ALTER TABLE public.tournaments
ADD COLUMN number_of_groups INTEGER DEFAULT NULL;

-- Enable RLS on tournament_groups
ALTER TABLE public.tournament_groups ENABLE ROW LEVEL SECURITY;

-- Anyone can view tournament groups
CREATE POLICY "Anyone can view tournament groups" 
ON public.tournament_groups 
FOR SELECT 
USING (true);

-- Tournament creator and admins can manage groups
CREATE POLICY "Tournament creator can manage groups" 
ON public.tournament_groups 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM tournaments 
        WHERE tournaments.id = tournament_groups.tournament_id 
        AND (tournaments.created_by = auth.uid() OR is_admin(auth.uid()))
    )
);

-- Create index for faster group lookups
CREATE INDEX idx_tournament_groups_tournament_id ON public.tournament_groups(tournament_id);
CREATE INDEX idx_tournament_participants_group_id ON public.tournament_participants(group_id);
CREATE INDEX idx_tournament_matches_group_id ON public.tournament_matches(group_id);