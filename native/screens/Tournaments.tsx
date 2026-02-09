import { useCallback, useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ScreenContainer } from "../components/ScreenContainer";
import { SectionCard } from "../components/SectionCard";
import { InfoRow } from "../components/InfoRow";
import { PrimaryButton } from "../components/PrimaryButton";
import { Paragraph, SectionTitle } from "../components/Typography";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../contexts/AuthContext";

type Tournament = {
  id: string;
  name: string;
  format: "single_elimination" | "double_elimination" | "round_robin";
  status: "draft" | "registration" | "in_progress" | "completed" | "cancelled";
  max_teams: number;
  registration_deadline: string | null;
  entry_fee: number | null;
  created_at: string;
  participant_count?: number;
};

export function TournamentsScreen() {
  const navigation = useNavigation();
  const { role } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formatLabel = useMemo(() => {
    return (format: Tournament["format"]) => {
      const labels: Record<Tournament["format"], string> = {
        single_elimination: "Single Elimination",
        double_elimination: "Double Elimination",
        round_robin: "Round Robin"
      };
      return labels[format] ?? format;
    };
  }, []);

  const statusLabel = useMemo(() => {
    return (status: Tournament["status"]) => {
      const labels: Record<Tournament["status"], string> = {
        draft: "Draft",
        registration: "Registration Open",
        in_progress: "In Progress",
        completed: "Completed",
        cancelled: "Cancelled"
      };
      return labels[status] ?? status;
    };
  }, []);

  const fetchTournaments = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [tournamentsResult, participantsResult] = await Promise.all([
        supabase
          .from("tournaments")
          .select(
            "id, name, format, status, max_teams, registration_deadline, entry_fee, created_at"
          )
          .order("created_at", { ascending: false }),
        supabase.from("tournament_participants").select("tournament_id")
      ]);

      if (tournamentsResult.error) throw tournamentsResult.error;

      const countMap = new Map<string, number>();
      (participantsResult.data ?? []).forEach((participant) => {
        countMap.set(
          participant.tournament_id,
          (countMap.get(participant.tournament_id) ?? 0) + 1
        );
      });

      const tournamentsWithCounts = (tournamentsResult.data ?? []).map((tournament) => ({
        ...tournament,
        participant_count: countMap.get(tournament.id) ?? 0
      }));

      setTournaments(tournamentsWithCounts);
    } catch (error) {
      setErrorMessage("Failed to load tournaments. Pull to refresh or try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTournaments();
  }, [fetchTournaments]);

  return (
    <ScreenContainer
      title="Tournaments"
      subtitle="Register for upcoming competitions."
    >
      <SectionCard title="Tournament formats">
        <Paragraph>
          Single elimination, double elimination, and round robin events are available for
          competitive play.
        </Paragraph>
        <View style={{ gap: 8 }}>
          <Paragraph>• Single Elimination: One loss and you&apos;re out.</Paragraph>
          <Paragraph>• Double Elimination: Two losses to be eliminated.</Paragraph>
          <Paragraph>• Round Robin: Everyone plays everyone.</Paragraph>
        </View>
      </SectionCard>

      <SectionCard title="All tournaments" description="Latest events from the club.">
        {isLoading ? (
          <Text style={{ color: "#64748B" }}>Loading tournaments…</Text>
        ) : tournaments.length === 0 ? (
          <Text style={{ color: "#64748B" }}>No tournaments are available yet.</Text>
        ) : (
          <View style={{ gap: 16 }}>
            {tournaments.map((tournament) => (
              <View key={tournament.id} style={{ gap: 8 }}>
                <SectionTitle>{tournament.name}</SectionTitle>
                <InfoRow label="Status" value={statusLabel(tournament.status)} />
                <InfoRow label="Format" value={formatLabel(tournament.format)} />
                <InfoRow
                  label="Teams"
                  value={`${tournament.participant_count ?? 0} / ${tournament.max_teams}`}
                />
                {tournament.entry_fee ? (
                  <InfoRow label="Entry fee" value={`PKR ${tournament.entry_fee.toLocaleString()}`} />
                ) : null}
                {tournament.registration_deadline ? (
                  <InfoRow
                    label="Registration closes"
                    value={new Date(tournament.registration_deadline).toLocaleDateString()}
                  />
                ) : null}
                <PrimaryButton
                  label="View tournament"
                  variant="outline"
                  onPress={() => navigation.navigate("TournamentDetail" as never)}
                />
              </View>
            ))}
          </View>
        )}
        {errorMessage ? <Text style={{ color: "#DC2626" }}>{errorMessage}</Text> : null}
        <View style={{ gap: 12 }}>
          <PrimaryButton label="Refresh list" variant="outline" onPress={fetchTournaments} />
          {role === "admin" ? (
            <PrimaryButton
              label="Create tournament"
              onPress={() => navigation.navigate("TournamentCreate" as never)}
            />
          ) : null}
        </View>
      </SectionCard>
    </ScreenContainer>
  );
}
