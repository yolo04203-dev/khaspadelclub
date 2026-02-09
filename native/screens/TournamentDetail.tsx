import { useCallback, useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useRoute } from "@react-navigation/native";
import { ScreenContainer } from "../components/ScreenContainer";
import { SectionCard } from "../components/SectionCard";
import { InfoRow } from "../components/InfoRow";
import { Paragraph, SectionTitle } from "../components/Typography";
import { PrimaryButton } from "../components/PrimaryButton";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../contexts/AuthContext";

export function TournamentDetailScreen() {
  const route = useRoute();
  const { user, role } = useAuth();
  const [tournament, setTournament] = useState<any | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [userTeam, setUserTeam] = useState<{ id: string; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const tournamentId = useMemo(() => {
    const params = (route.params ?? {}) as { id?: string };
    return params.id ?? null;
  }, [route.params]);

  const fetchUserTeam = useCallback(async () => {
    if (!user) return;
    const { data: memberData } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", user.id)
      .eq("is_captain", true)
      .maybeSingle();

    if (memberData?.team_id) {
      const { data: teamData } = await supabase
        .from("teams")
        .select("id, name")
        .eq("id", memberData.team_id)
        .maybeSingle();
      if (teamData) setUserTeam({ id: teamData.id, name: teamData.name ?? "Unknown Team" });
    }
  }, [user]);

  const fetchTournament = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setActionMessage(null);

    try {
      const tournamentQuery = tournamentId
        ? supabase.from("tournaments").select("*").eq("id", tournamentId).single()
        : supabase.from("tournaments").select("*").order("created_at", { ascending: false }).limit(1).single();

      const { data: tournamentData, error: tournamentError } = await tournamentQuery;
      if (tournamentError) throw tournamentError;

      const [participantsResult, matchesResult] = await Promise.all([
        supabase
          .from("tournament_participants")
          .select("id, team_id, seed, waitlist_position, registered_at")
          .eq("tournament_id", tournamentData.id),
        supabase
          .from("tournament_matches")
          .select("id, round_number, match_number, team1_id, team2_id, team1_score, team2_score, stage")
          .eq("tournament_id", tournamentData.id)
          .order("round_number")
          .order("match_number")
      ]);

      const teamIds = (participantsResult.data ?? []).map((participant) => participant.team_id);
      const { data: teamsData } = teamIds.length
        ? await supabase.from("teams").select("id, name").in("id", teamIds)
        : { data: [] };

      const teamNameMap = new Map<string, string>(
        (teamsData ?? []).map((team: { id: string; name: string }) => [
          team.id,
          team.name ?? "Unknown Team"
        ])
      );

      const participantsWithNames = (participantsResult.data ?? []).map((participant) => ({
        ...participant,
        team_name: teamNameMap.get(participant.team_id) ?? "Unknown Team"
      }));

      setTournament(tournamentData);
      setParticipants(participantsWithNames);
      setMatches(matchesResult.data ?? []);
    } catch (error) {
      setErrorMessage("Unable to load tournament details. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    void fetchTournament();
    void fetchUserTeam();
  }, [fetchTournament, fetchUserTeam]);

  const isRegistered = useMemo(() => {
    if (!userTeam) return false;
    return participants.some((participant) => participant.team_id === userTeam.id);
  }, [participants, userTeam]);

  const registerTeam = useCallback(async () => {
    if (!tournament || !userTeam) return;
    setActionMessage(null);
    try {
      const registeredCount = participants.filter((participant) => participant.waitlist_position === null).length;
      const isFull = registeredCount >= tournament.max_teams;
      const waitlistPosition = isFull
        ? participants.filter((participant) => participant.waitlist_position !== null).length + 1
        : null;

      const { error } = await supabase.from("tournament_participants").insert({
        tournament_id: tournament.id,
        team_id: userTeam.id,
        seed: isFull ? null : registeredCount + 1,
        waitlist_position: waitlistPosition
      });
      if (error) throw error;

      setActionMessage(
        isFull
          ? `${userTeam.name} joined the waitlist at position #${waitlistPosition}.`
          : `${userTeam.name} is registered for this tournament.`
      );
      await fetchTournament();
    } catch (error) {
      setActionMessage("Registration failed. Please try again.");
    }
  }, [fetchTournament, participants, tournament, userTeam]);

  const withdrawTeam = useCallback(async () => {
    if (!tournament || !userTeam) return;
    setActionMessage(null);
    try {
      const participant = participants.find((entry) => entry.team_id === userTeam.id);
      if (!participant) return;
      const { error } = await supabase
        .from("tournament_participants")
        .delete()
        .eq("id", participant.id);
      if (error) throw error;

      setActionMessage(`${userTeam.name} has been withdrawn.`);
      await fetchTournament();
    } catch (error) {
      setActionMessage("Withdrawal failed. Please try again.");
    }
  }, [fetchTournament, participants, tournament, userTeam]);

  const updateStatus = useCallback(
    async (status: string) => {
      if (!tournament) return;
      setActionMessage(null);
      try {
        const { error } = await supabase.from("tournaments").update({ status }).eq("id", tournament.id);
        if (error) throw error;
        setActionMessage(`Tournament marked as ${status.replace("_", " ")}.`);
        await fetchTournament();
      } catch (error) {
        setActionMessage("Unable to update status.");
      }
    },
    [fetchTournament, tournament]
  );

  const registeredCount = participants.filter((participant) => participant.waitlist_position === null).length;
  const waitlistCount = participants.filter((participant) => participant.waitlist_position !== null).length;

  return (
    <ScreenContainer
      title="Tournament Detail"
      subtitle="Review brackets, schedules, and standings."
    >
      <SectionCard title="Tournament overview">
        {isLoading ? (
          <Text style={{ color: "#64748B" }}>Loading tournament…</Text>
        ) : tournament ? (
          <View style={{ gap: 8 }}>
            <SectionTitle>{tournament.name}</SectionTitle>
            <Paragraph>{tournament.description ?? "No description provided."}</Paragraph>
            <InfoRow label="Status" value={tournament.status ?? "Unknown"} />
            <InfoRow label="Format" value={tournament.format ?? "Unknown"} />
            <InfoRow
              label="Teams"
              value={`${registeredCount} / ${tournament.max_teams}`}
            />
            {tournament.entry_fee ? (
              <InfoRow
                label="Entry fee"
                value={`${tournament.entry_fee_currency ?? "PKR"} ${tournament.entry_fee.toLocaleString()}`}
              />
            ) : null}
            {tournament.registration_deadline ? (
              <InfoRow
                label="Registration closes"
                value={new Date(tournament.registration_deadline).toLocaleDateString()}
              />
            ) : null}
            {tournament.start_date ? (
              <InfoRow
                label="Starts"
                value={new Date(tournament.start_date).toLocaleDateString()}
              />
            ) : null}
            {tournament.end_date ? (
              <InfoRow
                label="Ends"
                value={new Date(tournament.end_date).toLocaleDateString()}
              />
            ) : null}
          </View>
        ) : (
          <Text style={{ color: "#64748B" }}>Tournament not found.</Text>
        )}
        {errorMessage ? <Text style={{ color: "#DC2626" }}>{errorMessage}</Text> : null}
        {actionMessage ? <Text style={{ color: "#1D4ED8" }}>{actionMessage}</Text> : null}
      </SectionCard>

      <SectionCard title="Registration">
        {userTeam ? (
          <Paragraph>
            Your captain team: <Text style={{ fontWeight: "600" }}>{userTeam.name}</Text>
          </Paragraph>
        ) : (
          <Paragraph>Set a captain team to register for this tournament.</Paragraph>
        )}
        <View style={{ gap: 12 }}>
          <PrimaryButton
            label={isRegistered ? "Withdraw team" : "Register team"}
            variant={isRegistered ? "outline" : "primary"}
            onPress={isRegistered ? withdrawTeam : registerTeam}
          />
          <PrimaryButton label="Refresh" variant="outline" onPress={fetchTournament} />
        </View>
        {waitlistCount > 0 ? (
          <Text style={{ color: "#64748B" }}>
            {waitlistCount} team{waitlistCount === 1 ? "" : "s"} on the waitlist.
          </Text>
        ) : null}
      </SectionCard>

      <SectionCard title="Participants">
        {isLoading ? (
          <Text style={{ color: "#64748B" }}>Loading participants…</Text>
        ) : participants.length === 0 ? (
          <Text style={{ color: "#64748B" }}>No teams registered yet.</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {participants.map((participant) => (
              <InfoRow
                key={participant.id}
                label={participant.team_name}
                value={
                  participant.waitlist_position
                    ? `Waitlist #${participant.waitlist_position}`
                    : participant.seed
                    ? `Seed ${participant.seed}`
                    : "Registered"
                }
              />
            ))}
          </View>
        )}
      </SectionCard>

      <SectionCard title="Matches">
        {isLoading ? (
          <Text style={{ color: "#64748B" }}>Loading matches…</Text>
        ) : matches.length === 0 ? (
          <Text style={{ color: "#64748B" }}>Matches will appear once the bracket is published.</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {matches.map((match) => (
              <InfoRow
                key={match.id}
                label={`Round ${match.round_number} · Match ${match.match_number}`}
                value={
                  match.team1_score !== null && match.team2_score !== null
                    ? `${match.team1_score} - ${match.team2_score}`
                    : "Scheduled"
                }
              />
            ))}
          </View>
        )}
      </SectionCard>

      {role === "admin" && tournament ? (
        <SectionCard title="Admin actions">
          <Paragraph>Manage registration and status updates for this tournament.</Paragraph>
          <View style={{ gap: 12 }}>
            <PrimaryButton
              label="Open registration"
              variant="outline"
              onPress={() => updateStatus("registration")}
            />
            <PrimaryButton
              label="Start tournament"
              onPress={() => updateStatus("in_progress")}
            />
            <PrimaryButton
              label="Mark completed"
              variant="outline"
              onPress={() => updateStatus("completed")}
            />
            <PrimaryButton
              label="Cancel tournament"
              variant="outline"
              onPress={() => updateStatus("cancelled")}
            />
          </View>
        </SectionCard>
      ) : null}
    </ScreenContainer>
  );
}
