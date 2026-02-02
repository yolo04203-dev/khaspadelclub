-- Create tournament_categories table
CREATE TABLE public.tournament_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  max_teams INTEGER NOT NULL DEFAULT 8,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tournament_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view tournament categories"
  ON public.tournament_categories FOR SELECT
  USING (true);

CREATE POLICY "Tournament creator can manage categories"
  ON public.tournament_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE tournaments.id = tournament_categories.tournament_id
      AND (tournaments.created_by = auth.uid() OR is_admin(auth.uid()))
    )
  );

-- Add category_id to tournament_participants
ALTER TABLE public.tournament_participants
ADD COLUMN category_id UUID REFERENCES public.tournament_categories(id) ON DELETE SET NULL;

-- Add category_id to tournament_groups
ALTER TABLE public.tournament_groups
ADD COLUMN category_id UUID REFERENCES public.tournament_categories(id) ON DELETE SET NULL;

-- Add category_id to tournament_matches
ALTER TABLE public.tournament_matches
ADD COLUMN category_id UUID REFERENCES public.tournament_categories(id) ON DELETE SET NULL;