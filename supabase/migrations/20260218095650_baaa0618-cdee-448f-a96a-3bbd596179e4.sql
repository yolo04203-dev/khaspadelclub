
CREATE OR REPLACE FUNCTION public.auto_name_team(_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _names TEXT[];
  _new_name TEXT;
BEGIN
  SELECT ARRAY_AGG(COALESCE(p.display_name, 'Player') ORDER BY tm.joined_at)
  INTO _names
  FROM team_members tm
  JOIN profiles p ON p.user_id = tm.user_id
  WHERE tm.team_id = _team_id;

  IF array_length(_names, 1) = 2 THEN
    _new_name := _names[1] || ' & ' || _names[2];
    UPDATE teams SET name = _new_name WHERE id = _team_id;
  END IF;
END;
$$;
