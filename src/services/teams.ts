import { supabase } from "@/integrations/supabase/client";

/** Fetch team names by IDs. Returns a Map<teamId, name>. */
export async function fetchTeamNamesByIds(teamIds: string[]): Promise<Map<string, string>> {
  if (teamIds.length === 0) return new Map();
  const { data } = await supabase
    .from("teams")
    .select("id, name")
    .in("id", teamIds);
  return new Map((data || []).map((t) => [t.id, t.name]));
}

/** Fetch a single team by ID. */
export async function fetchTeamById(teamId: string) {
  const { data, error } = await supabase
    .from("teams")
    .select("id, name")
    .eq("id", teamId)
    .single();
  if (error) throw error;
  return data;
}

/** Fetch the team where the user is captain. Returns null if none. */
export async function fetchUserCaptainTeam(userId: string) {
  const { data: member } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", userId)
    .eq("is_captain", true)
    .maybeSingle();

  if (!member) return null;

  const [teamResult, countResult] = await Promise.all([
    supabase.from("teams").select("id, name").eq("id", member.team_id).single(),
    supabase
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("team_id", member.team_id),
  ]);

  return {
    team: teamResult.data,
    memberCount: countResult.count || 0,
  };
}

/** Fetch team member profiles for a set of team IDs. Returns Map<teamId, {player1, player2}>. */
export async function fetchTeamMemberProfiles(teamIds: string[]) {
  if (teamIds.length === 0) return new Map<string, { player1: string; player2: string }>();

  const [membersResult, _] = await Promise.all([
    supabase
      .from("team_members")
      .select("team_id, user_id")
      .in("team_id", teamIds)
      .order("joined_at"),
    Promise.resolve(null), // placeholder for parallel expansion
  ]);

  const allUserIds = [
    ...new Set((membersResult.data || []).map((m) => m.user_id)),
  ];

  let profileMap = new Map<string, string>();
  if (allUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("public_profiles")
      .select("user_id, display_name")
      .in("user_id", allUserIds);
    profileMap = new Map(
      (profiles || []).map((p) => [p.user_id!, p.display_name || "Player"])
    );
  }

  const membersMap = new Map<string, { player1: string; player2: string }>();
  for (const teamId of teamIds) {
    const members = (membersResult.data || []).filter(
      (m) => m.team_id === teamId
    );
    if (members.length >= 2) {
      membersMap.set(teamId, {
        player1: profileMap.get(members[0].user_id) || "Player",
        player2: profileMap.get(members[1].user_id) || "Player",
      });
    } else if (members.length === 1) {
      membersMap.set(teamId, {
        player1: profileMap.get(members[0].user_id) || "Player",
        player2: "",
      });
    }
  }
  return membersMap;
}

/** Cascade-delete a team via server-side function. */
export async function deleteTeamCascade(teamId: string) {
  const { error } = await supabase.rpc("delete_team_cascade", {
    _team_id: teamId,
  });
  if (error) throw error;
}
