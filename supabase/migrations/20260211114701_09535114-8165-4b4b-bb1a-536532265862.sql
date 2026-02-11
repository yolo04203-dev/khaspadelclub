
CREATE OR REPLACE FUNCTION public.get_player_unified_stats(p_user_id uuid, p_days integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_team_ids UUID[];
  v_start_date TIMESTAMPTZ;
  v_ladder_wins INT := 0;
  v_ladder_losses INT := 0;
  v_tournament_wins INT := 0;
  v_tournament_losses INT := 0;
  v_americano_wins INT := 0;
  v_americano_losses INT := 0;
  v_recent_matches JSONB := '[]'::JSONB;
  v_win_rate_by_day JSONB := '[]'::JSONB;
  v_head_to_head JSONB := '[]'::JSONB;
  v_teams JSONB := '[]'::JSONB;
  v_rank INT;
  v_points INT;
  v_streak INT;
  v_player_name TEXT;
  v_primary_team_id UUID;
BEGIN
  -- Get player name from profiles
  SELECT p.display_name INTO v_player_name
  FROM profiles p WHERE p.user_id = p_user_id;

  -- Get ALL team_ids the player belongs to (not just one)
  SELECT ARRAY_AGG(tm.team_id) INTO v_team_ids
  FROM team_members tm WHERE tm.user_id = p_user_id;

  -- Use first team as primary for rank/points
  IF v_team_ids IS NOT NULL AND array_length(v_team_ids, 1) > 0 THEN
    v_primary_team_id := v_team_ids[1];
  END IF;

  -- Calculate date filter
  IF p_days > 0 THEN
    v_start_date := NOW() - (p_days || ' days')::INTERVAL;
  ELSE
    v_start_date := '1970-01-01'::TIMESTAMPTZ;
  END IF;

  -- Get ladder rank info from primary team
  IF v_primary_team_id IS NOT NULL THEN
    SELECT lr.rank, lr.points, lr.streak 
    INTO v_rank, v_points, v_streak
    FROM ladder_rankings lr WHERE lr.team_id = v_primary_team_id LIMIT 1;
  END IF;

  -- Build per-team breakdown
  IF v_team_ids IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(team_row ORDER BY team_row->>'team_name'), '[]'::JSONB)
    INTO v_teams
    FROM (
      SELECT jsonb_build_object(
        'team_id', t.id,
        'team_name', t.name,
        'ladder_wins', COALESCE((
          SELECT SUM(CASE WHEN m.winner_team_id = t.id THEN 1 ELSE 0 END)
          FROM matches m
          WHERE m.status = 'completed'
            AND (m.challenger_team_id = t.id OR m.challenged_team_id = t.id)
            AND m.completed_at >= v_start_date
        ), 0),
        'ladder_losses', COALESCE((
          SELECT SUM(CASE WHEN m.winner_team_id IS NOT NULL AND m.winner_team_id != t.id THEN 1 ELSE 0 END)
          FROM matches m
          WHERE m.status = 'completed'
            AND (m.challenger_team_id = t.id OR m.challenged_team_id = t.id)
            AND m.completed_at >= v_start_date
        ), 0),
        'tournament_wins', COALESCE((
          SELECT SUM(CASE WHEN tm2.winner_team_id = t.id THEN 1 ELSE 0 END)
          FROM tournament_matches tm2
          WHERE tm2.completed_at IS NOT NULL
            AND (tm2.team1_id = t.id OR tm2.team2_id = t.id)
            AND tm2.completed_at >= v_start_date
        ), 0),
        'tournament_losses', COALESCE((
          SELECT SUM(CASE WHEN tm2.winner_team_id IS NOT NULL AND tm2.winner_team_id != t.id THEN 1 ELSE 0 END)
          FROM tournament_matches tm2
          WHERE tm2.completed_at IS NOT NULL
            AND (tm2.team1_id = t.id OR tm2.team2_id = t.id)
            AND tm2.completed_at >= v_start_date
        ), 0)
      ) AS team_row
      FROM teams t
      WHERE t.id = ANY(v_team_ids)
    ) sub;
  END IF;

  -- LADDER STATS (across all teams)
  IF v_team_ids IS NOT NULL THEN
    SELECT 
      COALESCE(SUM(CASE WHEN m.winner_team_id = ANY(v_team_ids) THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN m.winner_team_id IS NOT NULL AND NOT (m.winner_team_id = ANY(v_team_ids)) THEN 1 ELSE 0 END), 0)
    INTO v_ladder_wins, v_ladder_losses
    FROM matches m
    WHERE m.status = 'completed'
      AND (m.challenger_team_id = ANY(v_team_ids) OR m.challenged_team_id = ANY(v_team_ids))
      AND m.completed_at >= v_start_date;
  END IF;

  -- TOURNAMENT STATS (across all teams)
  IF v_team_ids IS NOT NULL THEN
    SELECT
      COALESCE(SUM(CASE WHEN tm2.winner_team_id = ANY(v_team_ids) THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN tm2.winner_team_id IS NOT NULL AND NOT (tm2.winner_team_id = ANY(v_team_ids)) THEN 1 ELSE 0 END), 0)
    INTO v_tournament_wins, v_tournament_losses
    FROM tournament_matches tm2
    WHERE tm2.completed_at IS NOT NULL
      AND (tm2.team1_id = ANY(v_team_ids) OR tm2.team2_id = ANY(v_team_ids))
      AND tm2.completed_at >= v_start_date;
  END IF;

  -- AMERICANO INDIVIDUAL STATS (unchanged - already user_id based)
  SELECT
    COALESCE(SUM(
      CASE 
        WHEN (ap.id IN (ar.team1_player1_id, ar.team1_player2_id) AND ar.team1_score > ar.team2_score) THEN 1
        WHEN (ap.id IN (ar.team2_player1_id, ar.team2_player2_id) AND ar.team2_score > ar.team1_score) THEN 1
        ELSE 0
      END
    ), 0),
    COALESCE(SUM(
      CASE
        WHEN (ap.id IN (ar.team1_player1_id, ar.team1_player2_id) AND ar.team1_score < ar.team2_score) THEN 1
        WHEN (ap.id IN (ar.team2_player1_id, ar.team2_player2_id) AND ar.team2_score < ar.team1_score) THEN 1
        ELSE 0
      END
    ), 0)
  INTO v_americano_wins, v_americano_losses
  FROM americano_rounds ar
  JOIN americano_players ap ON ap.user_id = p_user_id 
    AND ap.session_id = ar.session_id
    AND ap.id IN (ar.team1_player1_id, ar.team1_player2_id, ar.team2_player1_id, ar.team2_player2_id)
  WHERE ar.completed_at IS NOT NULL
    AND ar.completed_at >= v_start_date;

  -- RECENT MATCHES (unified across ALL teams + americano, last 15)
  WITH all_matches AS (
    -- Ladder matches (across all teams)
    SELECT 
      m.id,
      m.completed_at,
      'ladder'::TEXT AS source,
      CASE 
        WHEN m.challenger_team_id = ANY(v_team_ids) THEN ct.name 
        ELSE cht.name 
      END AS opponent_name,
      CASE WHEN m.winner_team_id = ANY(v_team_ids) THEN 'win' ELSE 'loss' END AS result,
      CASE WHEN m.challenger_team_id = ANY(v_team_ids)
        THEN COALESCE(m.challenger_score, 0)::TEXT || ' - ' || COALESCE(m.challenged_score, 0)::TEXT
        ELSE COALESCE(m.challenged_score, 0)::TEXT || ' - ' || COALESCE(m.challenger_score, 0)::TEXT
      END AS score
    FROM matches m
    LEFT JOIN teams cht ON cht.id = m.challenged_team_id
    LEFT JOIN teams ct ON ct.id = m.challenger_team_id
    WHERE v_team_ids IS NOT NULL
      AND m.status = 'completed'
      AND (m.challenger_team_id = ANY(v_team_ids) OR m.challenged_team_id = ANY(v_team_ids))
      AND m.completed_at >= v_start_date

    UNION ALL

    -- Tournament matches (across all teams)
    SELECT
      tm2.id,
      tm2.completed_at,
      'tournament'::TEXT AS source,
      CASE WHEN tm2.team1_id = ANY(v_team_ids) THEN t2.name ELSE t1.name END AS opponent_name,
      CASE WHEN tm2.winner_team_id = ANY(v_team_ids) THEN 'win' ELSE 'loss' END AS result,
      CASE WHEN tm2.team1_id = ANY(v_team_ids)
        THEN COALESCE(tm2.team1_score, 0)::TEXT || ' - ' || COALESCE(tm2.team2_score, 0)::TEXT
        ELSE COALESCE(tm2.team2_score, 0)::TEXT || ' - ' || COALESCE(tm2.team1_score, 0)::TEXT
      END AS score
    FROM tournament_matches tm2
    LEFT JOIN teams t1 ON t1.id = tm2.team1_id
    LEFT JOIN teams t2 ON t2.id = tm2.team2_id
    WHERE v_team_ids IS NOT NULL
      AND tm2.completed_at IS NOT NULL
      AND (tm2.team1_id = ANY(v_team_ids) OR tm2.team2_id = ANY(v_team_ids))
      AND tm2.completed_at >= v_start_date

    UNION ALL

    -- Americano individual rounds
    SELECT
      ar.id,
      ar.completed_at,
      'americano'::TEXT AS source,
      ass.name AS opponent_name,
      CASE
        WHEN ap.id IN (ar.team1_player1_id, ar.team1_player2_id) AND ar.team1_score > ar.team2_score THEN 'win'
        WHEN ap.id IN (ar.team2_player1_id, ar.team2_player2_id) AND ar.team2_score > ar.team1_score THEN 'win'
        ELSE 'loss'
      END AS result,
      CASE
        WHEN ap.id IN (ar.team1_player1_id, ar.team1_player2_id)
          THEN COALESCE(ar.team1_score, 0)::TEXT || ' - ' || COALESCE(ar.team2_score, 0)::TEXT
        ELSE COALESCE(ar.team2_score, 0)::TEXT || ' - ' || COALESCE(ar.team1_score, 0)::TEXT
      END AS score
    FROM americano_rounds ar
    JOIN americano_players ap ON ap.user_id = p_user_id AND ap.session_id = ar.session_id
      AND ap.id IN (ar.team1_player1_id, ar.team1_player2_id, ar.team2_player1_id, ar.team2_player2_id)
    JOIN americano_sessions ass ON ass.id = ar.session_id
    WHERE ar.completed_at IS NOT NULL
      AND ar.completed_at >= v_start_date
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', am.id,
      'completed_at', am.completed_at,
      'source', am.source,
      'opponent_name', am.opponent_name,
      'result', am.result,
      'score', am.score
    ) ORDER BY am.completed_at DESC
  ), '[]'::JSONB)
  INTO v_recent_matches
  FROM (SELECT * FROM all_matches ORDER BY completed_at DESC LIMIT 15) am;

  -- WIN RATE BY DAY
  WITH daily AS (
    -- Ladder (all teams)
    SELECT m.completed_at::DATE AS match_date,
      CASE WHEN m.winner_team_id = ANY(v_team_ids) THEN 1 ELSE 0 END AS is_win
    FROM matches m
    WHERE v_team_ids IS NOT NULL AND m.status = 'completed'
      AND (m.challenger_team_id = ANY(v_team_ids) OR m.challenged_team_id = ANY(v_team_ids))
      AND m.completed_at >= v_start_date

    UNION ALL

    -- Tournament (all teams)
    SELECT tm2.completed_at::DATE,
      CASE WHEN tm2.winner_team_id = ANY(v_team_ids) THEN 1 ELSE 0 END
    FROM tournament_matches tm2
    WHERE v_team_ids IS NOT NULL AND tm2.completed_at IS NOT NULL
      AND (tm2.team1_id = ANY(v_team_ids) OR tm2.team2_id = ANY(v_team_ids))
      AND tm2.completed_at >= v_start_date

    UNION ALL

    -- Americano
    SELECT ar.completed_at::DATE,
      CASE
        WHEN ap.id IN (ar.team1_player1_id, ar.team1_player2_id) AND ar.team1_score > ar.team2_score THEN 1
        WHEN ap.id IN (ar.team2_player1_id, ar.team2_player2_id) AND ar.team2_score > ar.team1_score THEN 1
        ELSE 0
      END
    FROM americano_rounds ar
    JOIN americano_players ap ON ap.user_id = p_user_id AND ap.session_id = ar.session_id
      AND ap.id IN (ar.team1_player1_id, ar.team1_player2_id, ar.team2_player1_id, ar.team2_player2_id)
    WHERE ar.completed_at IS NOT NULL AND ar.completed_at >= v_start_date
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('date', d.match_date, 'wins', d.wins, 'total', d.total)
    ORDER BY d.match_date
  ), '[]'::JSONB)
  INTO v_win_rate_by_day
  FROM (
    SELECT match_date, SUM(is_win)::INT AS wins, COUNT(*)::INT AS total
    FROM daily GROUP BY match_date
  ) d;

  -- HEAD TO HEAD (ladder + tournament, across all teams)
  IF v_team_ids IS NOT NULL THEN
    WITH h2h AS (
      SELECT
        CASE WHEN m.challenger_team_id = ANY(v_team_ids) THEN m.challenged_team_id ELSE m.challenger_team_id END AS opp_id,
        CASE WHEN m.winner_team_id = ANY(v_team_ids) THEN 1 ELSE 0 END AS is_win
      FROM matches m
      WHERE m.status = 'completed'
        AND (m.challenger_team_id = ANY(v_team_ids) OR m.challenged_team_id = ANY(v_team_ids))
        AND m.completed_at >= v_start_date

      UNION ALL

      SELECT
        CASE WHEN tm2.team1_id = ANY(v_team_ids) THEN tm2.team2_id ELSE tm2.team1_id END,
        CASE WHEN tm2.winner_team_id = ANY(v_team_ids) THEN 1 ELSE 0 END
      FROM tournament_matches tm2
      WHERE tm2.completed_at IS NOT NULL
        AND (tm2.team1_id = ANY(v_team_ids) OR tm2.team2_id = ANY(v_team_ids))
        AND tm2.completed_at >= v_start_date
    )
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'opponent_id', r.opp_id,
        'opponent_name', t.name,
        'wins', r.wins,
        'losses', r.losses,
        'win_rate', CASE WHEN r.wins + r.losses > 0 THEN ROUND((r.wins::NUMERIC / (r.wins + r.losses)) * 100) ELSE 0 END
      ) ORDER BY (r.wins + r.losses) DESC
    ), '[]'::JSONB)
    INTO v_head_to_head
    FROM (
      SELECT opp_id, SUM(is_win)::INT AS wins, (COUNT(*) - SUM(is_win))::INT AS losses
      FROM h2h WHERE opp_id IS NOT NULL GROUP BY opp_id
    ) r
    LEFT JOIN teams t ON t.id = r.opp_id
    LIMIT 5;
  END IF;

  -- Build final result
  RETURN jsonb_build_object(
    'player_name', COALESCE(v_player_name, 'Unknown'),
    'teams', v_teams,
    'rank', v_rank,
    'points', COALESCE(v_points, 0),
    'streak', COALESCE(v_streak, 0),
    'overall', jsonb_build_object(
      'wins', v_ladder_wins + v_tournament_wins + v_americano_wins,
      'losses', v_ladder_losses + v_tournament_losses + v_americano_losses
    ),
    'by_mode', jsonb_build_object(
      'ladder', jsonb_build_object('wins', v_ladder_wins, 'losses', v_ladder_losses),
      'tournament', jsonb_build_object('wins', v_tournament_wins, 'losses', v_tournament_losses),
      'americano', jsonb_build_object('wins', v_americano_wins, 'losses', v_americano_losses)
    ),
    'recent_matches', v_recent_matches,
    'win_rate_by_day', v_win_rate_by_day,
    'head_to_head', v_head_to_head
  );
END;
$function$;
