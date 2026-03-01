import { supabase } from "@/integrations/supabase/client";
import { fetchTeamNamesByIds } from "@/services/teams";
import { fetchMatchesByIds } from "@/services/matches";
import { logger } from "@/lib/logger";

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

export function mapChallenge(c: any, teamsMap: Map<string, { id: string; name: string }>, ranksMap: Map<string, number>, matchMap: Map<string, Record<string, unknown>>): Challenge {
  const matchInfo = c.match_id ? matchMap.get(c.match_id) as any : null;
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
    challenger_team: teamsMap.get(c.challenger_team_id) || null,
    challenged_team: teamsMap.get(c.challenged_team_id) || null,
    challenger_rank: ranksMap.get(c.challenger_team_id) || null,
    challenged_rank: ranksMap.get(c.challenged_team_id) || null,
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

export async function enrichChallenges(rawChallenges: any[], includeMatches = false): Promise<{ teamsMap: Map<string, { id: string; name: string }>; ranksMap: Map<string, number>; matchMap: Map<string, Record<string, unknown>> }> {
  const allTeamIds = rawChallenges.flatMap(c => [c.challenger_team_id, c.challenged_team_id]).filter(Boolean);
  const uniqueTeamIds = [...new Set(allTeamIds)];
  const matchIds = includeMatches ? rawChallenges.map(c => c.match_id).filter(Boolean) : [];

  const [teamNameMap, { data: ranks }, matchMap] = await Promise.all([
    fetchTeamNamesByIds(uniqueTeamIds),
    supabase.from("ladder_rankings").select("team_id, rank").in("team_id", uniqueTeamIds.length > 0 ? uniqueTeamIds : ["__none__"]),
    fetchMatchesByIds(matchIds),
  ]);

  const teamsMap = new Map(uniqueTeamIds.map(id => [id, { id, name: teamNameMap.get(id) || "Unknown" }]));
  const ranksMap = new Map(ranks?.map(r => [r.team_id, r.rank]) || []);

  return { teamsMap, ranksMap, matchMap };
}
