import { supabase } from "@/integrations/supabase/client";
import { fetchMatchesByIds } from "@/services/matches";

export interface Challenge {
  id: string;
  status: string;
  message: string | null;
  decline_reason: string | null;
  expires_at: string;
  created_at: string;
  match_id: string | null;
  match_status: string | null;
  match_scheduled_at: string | null;
  match_venue: string | null;
  challenger_team: { id: string; name: string } | null;
  challenged_team: { id: string; name: string } | null;
  challenger_rank: number | null;
  challenged_rank: number | null;
  winner_team_id?: string | null;
  challenger_score?: number | null;
  challenged_score?: number | null;
  challenger_sets?: number[];
  challenged_sets?: number[];
  score_submitted_by?: string | null;
  score_confirmed_by?: string | null;
  score_disputed?: boolean;
  dispute_reason?: string | null;
  ladder_category?: {
    id: string;
    name: string;
    ladder_name: string;
  } | null;
}

export interface UserTeam {
  id: string;
  name: string;
  rank: number | null;
  is_captain: boolean;
  is_frozen?: boolean;
  frozen_until?: string | null;
  frozen_reason?: string | null;
}

export function formatTimeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  return "Just now";
}

export function formatExpiresIn(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffMs < 0) return "Expired";
  if (diffDays > 0) return `${diffDays}d left`;
  if (diffHours > 0) return `${diffHours}h left`;
  return "< 1h left";
}

export function getOpponentName(challenge: Challenge, userTeamId: string) {
  return challenge.challenger_team?.id === userTeamId
    ? challenge.challenged_team?.name || "Unknown"
    : challenge.challenger_team?.name || "Unknown";
}

/** Base select with FK joins for team names — single query, no waterfall */
const CHALLENGE_SELECT_WITH_TEAMS = `
  id, status, message, decline_reason, expires_at, created_at, match_id,
  challenger_team_id, challenged_team_id,
  challenger_team:teams!challenger_team_id(id, name),
  challenged_team:teams!challenged_team_id(id, name)
`;

const CHALLENGE_SELECT_WITH_TEAMS_AND_CATEGORY = `
  id, status, message, decline_reason, expires_at, created_at, match_id,
  challenger_team_id, challenged_team_id, ladder_category_id,
  challenger_team:teams!challenger_team_id(id, name),
  challenged_team:teams!challenged_team_id(id, name),
  ladder_categories!ladder_category_id(id, name, ladders!ladder_id(id, name))
`;

export { CHALLENGE_SELECT_WITH_TEAMS, CHALLENGE_SELECT_WITH_TEAMS_AND_CATEGORY };

/**
 * Map a raw challenge row (with FK-joined teams) to a Challenge object.
 * Ranks and match data are optional maps applied on top.
 */
export function mapChallengeWithJoins(
  c: any,
  ranksMap?: Map<string, number>,
  matchMap?: Map<string, Record<string, unknown>>
): Challenge {
  const matchInfo = c.match_id && matchMap ? matchMap.get(c.match_id) as any : null;
  const ladderCategory = c.ladder_categories;
  return {
    id: c.id,
    status: c.status,
    message: c.message,
    decline_reason: c.decline_reason ?? null,
    expires_at: c.expires_at,
    created_at: c.created_at,
    match_id: c.match_id,
    match_status: matchInfo?.status ?? null,
    match_scheduled_at: matchInfo?.scheduled_at ?? null,
    match_venue: matchInfo?.venue ?? null,
    challenger_team: c.challenger_team || null,
    challenged_team: c.challenged_team || null,
    challenger_rank: ranksMap?.get(c.challenger_team_id) ?? null,
    challenged_rank: ranksMap?.get(c.challenged_team_id) ?? null,
    winner_team_id: matchInfo?.winner_team_id ?? null,
    challenger_score: matchInfo?.challenger_score ?? null,
    challenged_score: matchInfo?.challenged_score ?? null,
    challenger_sets: matchInfo?.challenger_sets ?? [],
    challenged_sets: matchInfo?.challenged_sets ?? [],
    score_submitted_by: matchInfo?.score_submitted_by ?? null,
    score_confirmed_by: matchInfo?.score_confirmed_by ?? null,
    score_disputed: matchInfo?.score_disputed ?? false,
    dispute_reason: matchInfo?.dispute_reason ?? null,
    ladder_category: ladderCategory ? {
      id: ladderCategory.id,
      name: ladderCategory.name,
      ladder_name: ladderCategory.ladders?.name || "Unknown Ladder",
    } : null,
  };
}

/** Fetch ranks for a set of team IDs. Returns Map<teamId, rank>. */
export async function fetchRanksMap(teamIds: string[]): Promise<Map<string, number>> {
  if (teamIds.length === 0) return new Map();
  const { data } = await supabase
    .from("ladder_rankings")
    .select("team_id, rank")
    .in("team_id", teamIds);
  return new Map((data || []).map(r => [r.team_id, r.rank]));
}

/** Fetch match data and ranks in parallel for a set of challenges. */
export async function enrichWithRanksAndMatches(
  rawChallenges: any[],
  includeMatches: boolean
): Promise<{ ranksMap: Map<string, number>; matchMap: Map<string, Record<string, unknown>> }> {
  if (rawChallenges.length === 0) return { ranksMap: new Map(), matchMap: new Map() };

  const uniqueTeamIds = [...new Set(
    rawChallenges.flatMap(c => [c.challenger_team_id, c.challenged_team_id]).filter(Boolean)
  )];
  const matchIds = includeMatches ? rawChallenges.map(c => c.match_id).filter(Boolean) : [];

  const [ranksMap, matchMap] = await Promise.all([
    fetchRanksMap(uniqueTeamIds),
    fetchMatchesByIds(matchIds),
  ]);

  return { ranksMap, matchMap };
}
