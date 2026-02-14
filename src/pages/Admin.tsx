import { useEffect, useState, useCallback, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Trophy, Swords, Search, Loader2, Layers, LayoutGrid, Zap, Shuffle, Shield, Database, Activity, Bug } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminStats } from "@/components/admin/AdminStats";
import { PlayersTab } from "@/components/admin/PlayersTab";
import { TeamsTab } from "@/components/admin/TeamsTab";
import { MatchesTab } from "@/components/admin/MatchesTab";
import { LaddersTab } from "@/components/admin/LaddersTab";
import { TournamentsTab } from "@/components/admin/TournamentsTab";
import { ChallengesTab } from "@/components/admin/ChallengesTab";
import { AmericanoTab } from "@/components/admin/AmericanoTab";
import { PermissionsTab } from "@/components/admin/PermissionsTab";
import { ErrorsTab } from "@/components/admin/ErrorsTab";
import { logger } from "@/lib/logger";
import { sendTestError } from "@/lib/errorReporting";
import { AlertTriangle } from "lucide-react";
import * as Sentry from "@sentry/react";

interface Player {
  id: string;
  display_name: string | null;
  email: string;
  team_name: string | null;
  role: string;
}

interface Team {
  id: string;
  name: string;
  rank: number | null;
  members_count: number;
  wins: number;
  losses: number;
  is_frozen?: boolean;
  frozen_until?: string | null;
  frozen_reason?: string | null;
}

interface Match {
  id: string;
  challenger_name: string;
  challenged_name: string;
  challenger_team_id: string;
  challenged_team_id: string;
  status: string;
  challenger_score: number | null;
  challenged_score: number | null;
  created_at: string;
  scheduled_at: string | null;
  venue: string | null;
  score_disputed: boolean;
  dispute_reason: string | null;
}

interface Ladder {
  id: string;
  name: string;
  description: string | null;
  status: string;
  categories_count: number;
  teams_count: number;
  created_at: string;
}

interface Tournament {
  id: string;
  name: string;
  format: string;
  status: string;
  max_teams: number;
  participants_count: number;
  created_at: string;
}

export default function Admin() {
  const { user, role, isLoading: authLoading } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [ladders, setLadders] = useState<Ladder[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isSeeding, setIsSeeding] = useState(false);
  const [perfResult, setPerfResult] = useState<any>(null);
  const [isRunningPerf, setIsRunningPerf] = useState(false);
  const [unresolvedErrorCount, setUnresolvedErrorCount] = useState(0);
  const handleSeedData = async (clearExisting = false) => {
    setIsSeeding(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Not authenticated"); return; }

      const res = await supabase.functions.invoke("seed-test-data", {
        body: { teamCount: 250, teamsPerLadder: 100, clearExisting },
      });

      if (res.error) {
        toast.error(`Seed failed: ${res.error.message}`);
      } else {
        const r = res.data;
        toast.success(`Seeded ${r.totalRecords} records! (${r.results.teams} teams, ${r.results.ladderRankings} rankings, ${r.results.matches} matches)`);
        fetchAdminData();
      }
    } catch (e: any) {
      toast.error(`Seed error: ${e.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const handlePerfTest = async () => {
    setIsRunningPerf(true);
    setPerfResult(null);
    try {
      const { smokeTest } = await import("@/test/load-test");
      const result = await smokeTest();
      setPerfResult(result);
    } catch (e: any) {
      toast.error(`Perf test error: ${e.message}`);
    } finally {
      setIsRunningPerf(false);
    }
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchAdminData = useCallback(async () => {
    if (role !== "admin" && role !== "super_admin") return;

    try {
      // Single parallel fetch for ALL admin data
      const [
        profilesRes, membersRes, teamsRes, rolesRes, rankingsRes,
        matchesRes, laddersRes, categoriesRes, ladderRankingsRes,
        tournamentsRes, participantsRes
      ] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name"),
        supabase.from("team_members").select("user_id, team_id"),
        supabase.from("teams").select("id, name, is_frozen, frozen_until, frozen_reason"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("ladder_rankings").select("team_id, rank, wins, losses").order("rank"),
        supabase.from("matches").select("id, challenger_team_id, challenged_team_id, status, challenger_score, challenged_score, created_at, scheduled_at, venue, score_disputed, dispute_reason").order("created_at", { ascending: false }).limit(50),
        supabase.from("ladders").select("id, name, description, status, created_at").order("created_at", { ascending: false }),
        supabase.from("ladder_categories").select("id, ladder_id"),
        supabase.from("ladder_rankings").select("id, ladder_category_id"),
        supabase.from("tournaments").select("id, name, format, status, max_teams, created_at").order("created_at", { ascending: false }),
        supabase.from("tournament_participants").select("id, tournament_id"),
      ]);

      const profiles = profilesRes.data;
      const members = membersRes.data;
      const teamsData = teamsRes.data;
      const roles = rolesRes.data;
      const rankings = rankingsRes.data;

      const teamsMap = new Map(teamsData?.map(t => [t.id, t.name]) || []);
      const membersMap = new Map(members?.map(m => [m.user_id, m.team_id]) || []);
      const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      const playersData: Player[] = (profiles || []).map(p => ({
        id: p.user_id,
        display_name: p.display_name,
        email: "",
        team_name: membersMap.has(p.user_id) ? teamsMap.get(membersMap.get(p.user_id)!) || null : null,
        role: rolesMap.get(p.user_id) || "player",
      }));
      setPlayers(playersData);

      // Teams with rankings
      const teamMemberCounts = new Map<string, number>();
      members?.forEach(m => {
        teamMemberCounts.set(m.team_id, (teamMemberCounts.get(m.team_id) || 0) + 1);
      });

      const teamsWithRank: Team[] = (teamsData || []).map(t => {
        const ranking = rankings?.find(r => r.team_id === t.id);
        return {
          id: t.id,
          name: t.name,
          rank: ranking?.rank || null,
          members_count: teamMemberCounts.get(t.id) || 0,
          wins: ranking?.wins || 0,
          losses: ranking?.losses || 0,
          is_frozen: t.is_frozen ?? false,
          frozen_until: t.frozen_until,
          frozen_reason: t.frozen_reason,
        };
      }).sort((a, b) => (a.rank || 999) - (b.rank || 999));
      setTeams(teamsWithRank);

      // Matches
      if (matchesRes.data) {
        const matchesMapped: Match[] = matchesRes.data.map(m => ({
          id: m.id,
          challenger_name: teamsMap.get(m.challenger_team_id) || "Unknown",
          challenged_name: teamsMap.get(m.challenged_team_id) || "Unknown",
          challenger_team_id: m.challenger_team_id,
          challenged_team_id: m.challenged_team_id,
          status: m.status,
          challenger_score: m.challenger_score,
          challenged_score: m.challenged_score,
          created_at: new Date(m.created_at).toLocaleDateString(),
          scheduled_at: m.scheduled_at,
          venue: m.venue,
          score_disputed: m.score_disputed ?? false,
          dispute_reason: m.dispute_reason,
        }));
        setMatches(matchesMapped);
      }

      // Ladders
      if (laddersRes.data) {
        const laddersMapped: Ladder[] = laddersRes.data.map(l => {
          const cats = categoriesRes.data?.filter(c => c.ladder_id === l.id) || [];
          const catIds = cats.map(c => c.id);
          const teamsInLadder = ladderRankingsRes.data?.filter(r => catIds.includes(r.ladder_category_id || "")) || [];
          return {
            id: l.id,
            name: l.name,
            description: l.description,
            status: l.status,
            categories_count: cats.length,
            teams_count: teamsInLadder.length,
            created_at: new Date(l.created_at).toLocaleDateString(),
          };
        });
        setLadders(laddersMapped);
      }

      // Tournaments
      if (tournamentsRes.data) {
        const tournamentsMapped: Tournament[] = tournamentsRes.data.map(t => ({
          id: t.id,
          name: t.name,
          format: t.format,
          status: t.status,
          max_teams: t.max_teams,
          participants_count: participantsRes.data?.filter(p => p.tournament_id === t.id).length || 0,
          created_at: new Date(t.created_at).toLocaleDateString(),
        }));
        setTournaments(tournamentsMapped);
      }
    } catch (error) {
      logger.apiError("fetchAdminData", error);
    } finally {
      setIsLoading(false);
    }
  }, [role]);

  useEffect(() => {
    if (role === "admin" || role === "super_admin") fetchAdminData();
    else setIsLoading(false);
  }, [role, fetchAdminData]);

  const filteredPlayers = useMemo(() => players.filter(p => 
    p.display_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    p.team_name?.toLowerCase().includes(debouncedSearch.toLowerCase())
  ), [players, debouncedSearch]);

  const filteredTeams = useMemo(() => teams.filter(t =>
    t.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  ), [teams, debouncedSearch]);

  const filteredLadders = useMemo(() => ladders.filter(l =>
    l.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  ), [ladders, debouncedSearch]);

  const filteredTournaments = useMemo(() => tournaments.filter(t =>
    t.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  ), [tournaments, debouncedSearch]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (role !== "admin" && role !== "super_admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />

      <main className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Admin Portal</h1>
            <p className="text-muted-foreground mb-4">Manage players, teams, ladders, and tournaments</p>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => handleSeedData(false)}
                disabled={isSeeding}
                variant="outline"
                size="sm"
              >
                {isSeeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
                Seed 500 Users
              </Button>
              <Button
                onClick={() => handleSeedData(true)}
                disabled={isSeeding}
                variant="destructive"
                size="sm"
              >
                {isSeeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
                Clear &amp; Re-seed
              </Button>
              <Button
                onClick={handlePerfTest}
                disabled={isRunningPerf}
                variant="outline"
                size="sm"
              >
                {isRunningPerf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
                Run Perf Test
              </Button>
              <Button
                onClick={() => {
                  logger.error("Test error from admin panel", new Error("Admin test error"));
                  sendTestError();
                  toast.success("Test error sent to Sentry + DB");
                }}
                variant="outline"
                size="sm"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Test Error
              </Button>
              <Button
                onClick={() => {
                  Promise.reject(new Error("Test unhandled rejection from admin"));
                  toast.success("Unhandled rejection fired");
                }}
                variant="outline"
                size="sm"
              >
                <Bug className="w-4 h-4 mr-2" />
                Unhandled Rejection
              </Button>
              <Button
                onClick={() => {
                  Sentry.addBreadcrumb({ category: "test", message: "Manual breadcrumb from admin", level: "info" });
                  toast.success("Breadcrumb added to Sentry");
                }}
                variant="outline"
                size="sm"
              >
                <Layers className="w-4 h-4 mr-2" />
                Send Breadcrumb
              </Button>
              <Button
                onClick={() => {
                  Sentry.captureMessage("Test message from admin panel");
                  toast.success("Message captured in Sentry");
                }}
                variant="outline"
                size="sm"
              >
                <Zap className="w-4 h-4 mr-2" />
                Capture Message
              </Button>
            </div>

            {perfResult && (
              <Card className="mt-4">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground mb-2">📊 Performance Results</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div><div className="text-muted-foreground">Total Requests</div><div className="font-semibold">{perfResult.totalRequests}</div></div>
                    <div><div className="text-muted-foreground">Avg Response</div><div className="font-semibold">{perfResult.averageResponseTime?.toFixed(0)}ms</div></div>
                    <div><div className="text-muted-foreground">P95 Response</div><div className="font-semibold">{perfResult.p95ResponseTime?.toFixed(0)}ms</div></div>
                    <div><div className="text-muted-foreground">Error Rate</div><div className="font-semibold">{perfResult.errorRate?.toFixed(2)}%</div></div>
                  </div>
                  {perfResult.endpointStats?.length > 0 && (
                    <div className="mt-3 border-t border-border pt-3">
                      <p className="text-xs text-muted-foreground mb-2">Endpoint Breakdown:</p>
                      {perfResult.endpointStats.map((s: any) => (
                        <div key={s.name} className="flex justify-between text-xs py-1">
                          <span>{s.name}</span>
                          <span className="text-muted-foreground">{s.averageResponseTime?.toFixed(0)}ms avg, p95={s.p95ResponseTime?.toFixed(0)}ms</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <AdminStats 
            playersCount={players.length}
            teamsCount={teams.length}
            matchesCount={matches.length}
            laddersCount={ladders.length}
          />

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search players, teams, ladders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="players" className="w-full">
            <TabsList className="flex w-full mb-6 overflow-x-auto h-auto flex-nowrap justify-start gap-1 p-1">
              <TabsTrigger value="players" className="text-xs sm:text-sm shrink-0">
                <Users className="w-4 h-4 mr-1 sm:mr-2 hidden sm:inline" />
                Players
              </TabsTrigger>
              <TabsTrigger value="teams" className="text-xs sm:text-sm shrink-0">
                <Trophy className="w-4 h-4 mr-1 sm:mr-2 hidden sm:inline" />
                Teams
              </TabsTrigger>
              <TabsTrigger value="challenges" className="text-xs sm:text-sm shrink-0">
                <Zap className="w-4 h-4 mr-1 sm:mr-2 hidden sm:inline" />
                Challenges
              </TabsTrigger>
              <TabsTrigger value="matches" className="text-xs sm:text-sm shrink-0">
                <Swords className="w-4 h-4 mr-1 sm:mr-2 hidden sm:inline" />
                Matches
              </TabsTrigger>
              <TabsTrigger value="ladders" className="text-xs sm:text-sm shrink-0">
                <Layers className="w-4 h-4 mr-1 sm:mr-2 hidden sm:inline" />
                Ladders
              </TabsTrigger>
              <TabsTrigger value="tournaments" className="text-xs sm:text-sm shrink-0">
                <LayoutGrid className="w-4 h-4 mr-1 sm:mr-2 hidden sm:inline" />
                Tournaments
              </TabsTrigger>
              <TabsTrigger value="americano" className="text-xs sm:text-sm shrink-0">
                <Shuffle className="w-4 h-4 mr-1 sm:mr-2 hidden sm:inline" />
                Americano
              </TabsTrigger>
              {role === "super_admin" && (
              <TabsTrigger value="permissions" className="text-xs sm:text-sm shrink-0">
                  <Shield className="w-4 h-4 mr-1 sm:mr-2 hidden sm:inline" />
                  Permissions
                </TabsTrigger>
              )}
              <TabsTrigger value="errors" className="text-xs sm:text-sm shrink-0 relative">
                <Bug className="w-4 h-4 mr-1 sm:mr-2 hidden sm:inline" />
                Errors
                {unresolvedErrorCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {unresolvedErrorCount > 99 ? "99+" : unresolvedErrorCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="players">
              <PlayersTab players={filteredPlayers} onRefresh={fetchAdminData} currentUserRole={role} />
            </TabsContent>

            <TabsContent value="teams">
              <TeamsTab teams={filteredTeams} onRefresh={fetchAdminData} />
            </TabsContent>

            <TabsContent value="challenges">
              <ChallengesTab />
            </TabsContent>

            <TabsContent value="matches">
              <MatchesTab matches={matches} onRefresh={fetchAdminData} />
            </TabsContent>

            <TabsContent value="ladders">
              <LaddersTab ladders={filteredLadders} onRefresh={fetchAdminData} />
            </TabsContent>

            <TabsContent value="tournaments">
              <TournamentsTab tournaments={filteredTournaments} onRefresh={fetchAdminData} />
            </TabsContent>

            <TabsContent value="americano">
              <AmericanoTab />
            </TabsContent>

            {role === "super_admin" && (
              <TabsContent value="permissions">
                <PermissionsTab players={players} />
              </TabsContent>
            )}

            <TabsContent value="errors">
              <ErrorsTab onUnresolvedCountChange={setUnresolvedErrorCount} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
}
