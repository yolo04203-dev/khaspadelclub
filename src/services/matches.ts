import { supabase } from "@/integrations/supabase/client";

const MATCH_SELECT =
  "id, status, scheduled_at, venue, winner_team_id, challenger_score, challenged_score, challenger_sets, challenged_sets, score_submitted_by, score_confirmed_by, score_disputed, dispute_reason";

/** Fetch matches by IDs. Returns a Map<matchId, match>. */
export async function fetchMatchesByIds(matchIds: string[]) {
  if (matchIds.length === 0)
    return new Map<string, Record<string, unknown>>();

  const { data } = await supabase
    .from("matches")
    .select(MATCH_SELECT)
    .in("id", matchIds);

  return new Map(
    (data || []).map((m) => [m.id, m as Record<string, unknown>])
  );
}

/** Fetch pending challenge counts for a team. Returns { total, incoming }. */
export async function fetchPendingChallengeCounts(teamId: string) {
  const [totalResult, incomingResult] = await Promise.all([
    supabase
      .from("challenges")
      .select("id", { count: "exact", head: true })
      .or(`challenger_team_id.eq.${teamId},challenged_team_id.eq.${teamId}`)
      .eq("status", "pending"),
    supabase
      .from("challenges")
      .select("id", { count: "exact", head: true })
      .eq("challenged_team_id", teamId)
      .eq("status", "pending"),
  ]);

  return {
    total: totalResult.count || 0,
    incoming: incomingResult.count || 0,
  };
}
