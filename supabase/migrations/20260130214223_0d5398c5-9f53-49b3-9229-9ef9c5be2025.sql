-- Create ladders table (like tournaments, but for ladder competitions)
CREATE TABLE public.ladders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ladder categories table (Category A, B, etc.)
CREATE TABLE public.ladder_categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    ladder_id UUID NOT NULL REFERENCES public.ladders(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    challenge_range INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(ladder_id, name)
);

-- Add ladder_category_id to ladder_rankings to link teams to specific categories
ALTER TABLE public.ladder_rankings 
ADD COLUMN ladder_category_id UUID REFERENCES public.ladder_categories(id) ON DELETE SET NULL;

-- Add ladder_category_id to challenges to track which category the challenge is in
ALTER TABLE public.challenges 
ADD COLUMN ladder_category_id UUID REFERENCES public.ladder_categories(id) ON DELETE SET NULL;

-- Enable RLS on new tables
ALTER TABLE public.ladders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ladder_categories ENABLE ROW LEVEL SECURITY;

-- Ladders policies
CREATE POLICY "Anyone can view ladders" ON public.ladders
FOR SELECT USING (true);

CREATE POLICY "Admins can create ladders" ON public.ladders
FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update ladders" ON public.ladders
FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete ladders" ON public.ladders
FOR DELETE USING (is_admin(auth.uid()));

-- Ladder categories policies
CREATE POLICY "Anyone can view ladder categories" ON public.ladder_categories
FOR SELECT USING (true);

CREATE POLICY "Admins can manage ladder categories" ON public.ladder_categories
FOR ALL USING (is_admin(auth.uid()));

-- Create trigger for updated_at on ladders
CREATE TRIGGER update_ladders_updated_at
BEFORE UPDATE ON public.ladders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_ladder_rankings_category ON public.ladder_rankings(ladder_category_id);
CREATE INDEX idx_ladder_categories_ladder ON public.ladder_categories(ladder_id);
CREATE INDEX idx_challenges_category ON public.challenges(ladder_category_id);