-- Drop the existing unique constraint on team_id that limits teams to 1 ladder
ALTER TABLE public.ladder_rankings DROP CONSTRAINT ladder_rankings_team_id_key;

-- Add a composite unique constraint to prevent the same team from joining the same category twice
CREATE UNIQUE INDEX ladder_rankings_team_category_key ON public.ladder_rankings (team_id, ladder_category_id);

-- Add a check constraint to limit teams to maximum 2 ladder memberships
-- We'll use a trigger function for this since Postgres check constraints can't query other rows

CREATE OR REPLACE FUNCTION public.check_max_ladder_memberships()
RETURNS TRIGGER AS $$
DECLARE
  membership_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO membership_count
  FROM public.ladder_rankings
  WHERE team_id = NEW.team_id;
  
  IF membership_count >= 2 THEN
    RAISE EXCEPTION 'Teams can participate in a maximum of 2 ladders simultaneously';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER check_max_ladder_memberships_trigger
BEFORE INSERT ON public.ladder_rankings
FOR EACH ROW
EXECUTE FUNCTION public.check_max_ladder_memberships();