import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ScreenContainer } from "../components/ScreenContainer";
import { SectionCard } from "../components/SectionCard";
import { InfoRow } from "../components/InfoRow";
import { PrimaryButton } from "../components/PrimaryButton";
import { Paragraph, SectionTitle } from "../components/Typography";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";

type UserTeam = {
  id: string;
  name: string;
  rank: number | null;
};

type DashboardStats = {
  matchesPlayed: number;
  wins: number;
  losses: number;
  pendingChallenges: number;
};

export function DashboardScreen() {
  const navigation = useNavigation();
  const { user, role, signOut } = useAuth();
  const [userTeam, setUserTeam] = useState<UserTeam | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    pendingChallenges: 0
  });
  const [incomingChallenges, setIncomingChallenges] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { data: memberData, error: memberError } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberError) throw memberError;

      if (!memberData?.team_id) {
        setUserTeam(null);
        setStats({
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          pendingChallenges: 0
        });
        setIncomingChallenges(0);
        return;
      }

      const teamId = memberData.team_id;
      const [teamResult, rankResult] = await Promise.all([
        supabase.from("teams").select("id, name").eq("id", teamId).maybeSingle(),
        supabase
          .from("ladder_rankings")
          .select("rank, wins, losses")
          .eq("team_id", teamId)
          .maybeSingle()
      ]);

      if (teamResult.error) throw teamResult.error;

      if (teamResult.data) {
        setUserTeam({
          id: teamResult.data.id,
          name: teamResult.data.name ?? "Unknown Team",
          rank: rankResult.data?.rank ?? null
        });
      }

      const [matchesResult, pendingResult, incomingResult] = await Promise.all([
        supabase
          .from("matches")
          .select("*", { count: "exact", head: true })
          .or(`challenger_team_id.eq.${teamId},challenged_team_id.eq.${teamId}`)
          .eq("status", "completed"),
        supabase
          .from("challenges")
          .select("*", { count: "exact", head: true })
          .or(`challenger_team_id.eq.${teamId},challenged_team_id.eq.${teamId}`)
          .eq("status", "pending"),
        supabase
          .from("challenges")
          .select("*", { count: "exact", head: true })
          .eq("challenged_team_id", teamId)
          .eq("status", "pending")
      ]);

      setIncomingChallenges(incomingResult.count ?? 0);
      setStats({
        matchesPlayed: matchesResult.count ?? 0,
        wins: rankResult.data?.wins ?? 0,
        losses: rankResult.data?.losses ?? 0,
        pendingChallenges: pendingResult.count ?? 0
      });
    } catch (error) {
      setErrorMessage("Failed to load dashboard data. Tap refresh to retry.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  const winRate =
    stats.matchesPlayed > 0 ? Math.round((stats.wins / stats.matchesPlayed) * 100) : 0;

  return (
    <ScreenContainer
      title="Dashboard"
      subtitle="Overview of club activity and your upcoming sessions."
    >
      <SectionCard title="Account">
        <Paragraph>
          {user ? `Signed in as ${user.email ?? "member"}.` : "Sign in to view your stats."}
        </Paragraph>
        <View style={{ gap: 12 }}>
          <PrimaryButton label="Refresh data" variant="outline" onPress={fetchDashboardData} />
          <PrimaryButton label="Sign out" variant="outline" onPress={signOut} />
        </View>
      </SectionCard>

      <SectionCard title="Team overview">
        {isLoading ? (
          <Text style={{ color: "#64748B" }}>Loading team data…</Text>
        ) : userTeam ? (
          <View style={{ gap: 8 }}>
            <InfoRow label="Team name" value={userTeam.name} />
            <InfoRow label="Ladder rank" value={userTeam.rank ? `#${userTeam.rank}` : "Unranked"} />
          </View>
        ) : (
          <Text style={{ color: "#64748B" }}>No team linked to this account yet.</Text>
        )}
        {errorMessage ? <Text style={{ color: "#DC2626" }}>{errorMessage}</Text> : null}
      </SectionCard>

      <SectionCard title="Performance snapshot">
        {isLoading ? (
          <Text style={{ color: "#64748B" }}>Loading performance stats…</Text>
        ) : (
          <View style={{ gap: 8 }}>
            <InfoRow label="Matches played" value={`${stats.matchesPlayed}`} />
            <InfoRow label="Wins" value={`${stats.wins}`} />
            <InfoRow label="Losses" value={`${stats.losses}`} />
            <InfoRow label="Win rate" value={`${winRate}%`} />
          </View>
        )}
      </SectionCard>

      <SectionCard title="Challenges">
        {isLoading ? (
          <Text style={{ color: "#64748B" }}>Loading challenges…</Text>
        ) : (
          <View style={{ gap: 8 }}>
            <InfoRow label="Pending challenges" value={`${stats.pendingChallenges}`} />
            <InfoRow label="Incoming challenges" value={`${incomingChallenges}`} />
          </View>
        )}
        <View style={{ gap: 12 }}>
          <PrimaryButton
            label="View challenges"
            onPress={() => navigation.navigate("Challenges" as never)}
          />
          <PrimaryButton
            label="Create challenge"
            variant="outline"
            onPress={() => navigation.navigate("Challenges" as never)}
          />
        </View>
      </SectionCard>

      <SectionCard title="Next steps">
        <SectionTitle>Keep playing</SectionTitle>
        <Paragraph>
          Explore ladders, tournaments, and americano sessions to stay competitive.
        </Paragraph>
        <View style={{ gap: 12 }}>
          <PrimaryButton label="View ladders" onPress={() => navigation.navigate("Ladders" as never)} />
          <PrimaryButton
            label="View tournaments"
            variant="outline"
            onPress={() => navigation.navigate("Tournaments" as never)}
          />
        </View>
        {role === "admin" ? (
          <PrimaryButton
            label="Go to admin tools"
            variant="outline"
            onPress={() => navigation.navigate("Admin" as never)}
          />
        ) : null}
      </SectionCard>
    </ScreenContainer>
  );
}
