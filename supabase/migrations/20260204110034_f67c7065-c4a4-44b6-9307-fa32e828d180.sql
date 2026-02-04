
-- Update the create_team_with_captain function to NOT add teams to ladder_rankings automatically
-- Teams will need to request to join a ladder category instead

CREATE OR REPLACE FUNCTION public.create_team_with_captain(_name text, _avatar_url text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
    _team_id UUID;
BEGIN
    -- Create the team
    INSERT INTO public.teams (name, avatar_url, created_by)
    VALUES (_name, _avatar_url, auth.uid())
    RETURNING id INTO _team_id;
    
    -- Add creator as captain
    INSERT INTO public.team_members (team_id, user_id, is_captain)
    VALUES (_team_id, auth.uid(), true);
    
    -- NOTE: No longer automatically adding to ladder_rankings
    -- Teams must request to join a specific ladder category
    
    RETURN _team_id;
END;
$$;
