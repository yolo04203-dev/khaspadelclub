import { supabase } from "@/integrations/supabase/client";

const TOURNAMENT_COLUMNS =
  "id, name, description, format, status, max_teams, created_by, winner_team_id, number_of_groups, sets_per_match, entry_fee, entry_fee_currency, payment_instructions, venue, registration_deadline, start_date, end_date, created_at";

const PARTICIPANT_PUBLIC_COLUMNS =
  "id, tournament_id, team_id, seed, is_eliminated, eliminated_at, final_placement, registered_at, group_id, category_id, group_wins, group_losses, group_points_for, group_points_against, waitlist_position, payment_status, custom_team_name, player1_name, player2_name";

const MATCH_COLUMNS =
  "id, round_number, match_number, team1_id, team2_id, team1_score, team2_score, winner_team_id, is_losers_bracket, group_id, category_id, stage, scheduled_at, court_number, duration_minutes, sets_per_match";

const CATEGORY_COLUMNS =
  "id, tournament_id, name, description, max_teams, display_order, entry_fee";

const GROUP_COLUMNS = "id, name, display_order, category_id";

const PAYMENT_COLUMNS =
  "id, team_id, registered_at, payment_status, payment_notes, custom_team_name, waitlist_position";

/** Fetch all tournament detail data in a single parallel batch. */
export async function fetchTournamentDetail(tournamentId: string) {
  const [
    tournamentRes,
    groupsRes,
    participantsRes,
    matchesRes,
    categoriesRes,
    paymentRes,
  ] = await Promise.all([
    supabase
      .from("tournaments")
      .select(TOURNAMENT_COLUMNS)
      .eq("id", tournamentId)
      .single(),
    supabase
      .from("tournament_groups")
      .select(GROUP_COLUMNS)
      .eq("tournament_id", tournamentId)
      .order("display_order"),
    supabase
      .from("tournament_participants_public")
      .select(PARTICIPANT_PUBLIC_COLUMNS)
      .eq("tournament_id", tournamentId),
    supabase
      .from("tournament_matches")
      .select(MATCH_COLUMNS)
      .eq("tournament_id", tournamentId)
      .order("round_number")
      .order("match_number"),
    supabase
      .from("tournament_categories")
      .select(CATEGORY_COLUMNS)
      .eq("tournament_id", tournamentId)
      .order("display_order"),
    supabase
      .from("tournament_participants")
      .select(PAYMENT_COLUMNS)
      .eq("tournament_id", tournamentId),
  ]);

  if (tournamentRes.error) throw tournamentRes.error;

  return {
    tournament: tournamentRes.data,
    groups: groupsRes.data || [],
    participants: participantsRes.data || [],
    matches: matchesRes.data || [],
    categories: categoriesRes.data || [],
    paymentParticipants: paymentRes.data || [],
  };
}

/** Cascade-delete a tournament via server-side function. */
export async function deleteTournamentCascade(tournamentId: string) {
  const { error } = await supabase.rpc("delete_tournament_cascade", {
    _tournament_id: tournamentId,
  });
  if (error) throw error;
}
