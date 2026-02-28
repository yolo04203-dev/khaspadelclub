-- Transactional cascade delete for teams
-- Deletes: ladder_rankings, ladder_join_requests, challenges, matches, tournament_participants,
--          team_invitations, team_members, then the team itself.
-- Requires caller to be admin or team captain.
CREATE OR REPLACE FUNCTION public.delete_team_cascade(_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Auth check: must be admin or captain of this team
  IF NOT (is_admin(auth.uid()) OR is_team_captain(auth.uid(), _team_id)) THEN
    RAISE EXCEPTION 'Permission denied: you must be an admin or team captain';
  END IF;

  -- 1. Ladder rankings
  DELETE FROM ladder_rankings WHERE team_id = _team_id;

  -- 2. Ladder join requests
  DELETE FROM ladder_join_requests WHERE team_id = _team_id;

  -- 3. Ladder audit log references
  UPDATE ladder_audit_log SET team_id = NULL WHERE team_id = _team_id;

  -- 4. Challenges (both sides)
  DELETE FROM challenges WHERE challenger_team_id = _team_id OR challenged_team_id = _team_id;

  -- 5. Matches (both sides)
  DELETE FROM matches WHERE challenger_team_id = _team_id OR challenged_team_id = _team_id;

  -- 6. Tournament participants
  DELETE FROM tournament_participants WHERE team_id = _team_id;

  -- 7. Tournament match references (null out, don't delete the match)
  UPDATE tournament_matches SET team1_id = NULL WHERE team1_id = _team_id;
  UPDATE tournament_matches SET team2_id = NULL WHERE team2_id = _team_id;
  UPDATE tournament_matches SET winner_team_id = NULL WHERE winner_team_id = _team_id;

  -- 8. Tournament winner reference
  UPDATE tournaments SET winner_team_id = NULL WHERE winner_team_id = _team_id;

  -- 9. Team invitations
  DELETE FROM team_invitations WHERE team_id = _team_id;

  -- 10. Team members
  DELETE FROM team_members WHERE team_id = _team_id;

  -- 11. The team itself
  DELETE FROM teams WHERE id = _team_id;
END;
$$;

-- Transactional cascade delete for tournaments
-- Deletes: tournament_matches, tournament_participants, tournament_groups, tournament_categories,
--          then the tournament itself.
-- Requires caller to be admin or tournament creator.
CREATE OR REPLACE FUNCTION public.delete_tournament_cascade(_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _created_by uuid;
BEGIN
  -- Fetch creator for auth check
  SELECT created_by INTO _created_by
  FROM tournaments WHERE id = _tournament_id;

  IF _created_by IS NULL THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  IF NOT (is_admin(auth.uid()) OR auth.uid() = _created_by) THEN
    RAISE EXCEPTION 'Permission denied: you must be an admin or tournament creator';
  END IF;

  -- 1. Tournament matches
  DELETE FROM tournament_matches WHERE tournament_id = _tournament_id;

  -- 2. Tournament participants
  DELETE FROM tournament_participants WHERE tournament_id = _tournament_id;

  -- 3. Tournament groups
  DELETE FROM tournament_groups WHERE tournament_id = _tournament_id;

  -- 4. Tournament categories
  DELETE FROM tournament_categories WHERE tournament_id = _tournament_id;

  -- 5. The tournament itself
  DELETE FROM tournaments WHERE id = _tournament_id;
END;
$$;