import { useEffect, useState, useCallback } from "react";
import { Navigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Trophy, Swords, Settings, Users, Plus, Shuffle, Layers } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatsCardSkeleton, DashboardCardSkeleton, TeamCardSkeleton } from "@/components/ui/skeleton-card";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { FAB, FABContainer } from "@/components/ui/fab";
import { logger } from "@/lib/logger";
import { safeCount, safeString } from "@/lib/safeData";
interface UserTeam {
  id: string;
  name: string;
  rank: number | null;
}

interface DashboardStats {
  matchesPlayed: number;
  wins: number;
  losses: number;
  pendingChallenges: number;
}

interface ModeBreakdown {
  ladder: { wins: number; losses: number };
  tournament: { wins: number; losses: number };
  americano: { wins: number; losses: number };
}

export default function Dashboard() {
  const { user, role, isLoading, signOut } = useAuth();
  const [userTeam, setUserTeam] = useState<UserTeam | null>(null);
  const [teamLoading, setTeamLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    pendingChallenges: 0,
  });
  const [incomingChallenges, setIncomingChallenges] = useState(0);
  const [modeBreakdown, setModeBreakdown] = useState<ModeBreakdown | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserTeamAndStats = async () => {
      if (!user) {
        setTeamLoading(false);
        return;
      }

      try {
        setFetchError(null);
        
        // Get team membership with timeout
        const memberPromise = supabase
          .from("team_members")
          .select("team_id")
          .eq("user_id", user.id)
          .maybeSingle();

        const { data: memberData, error: memberError } = await memberPromise;

        if (memberError) {
          logger.apiError("fetchTeamMember", memberError, { userId: user.id });
          throw memberError;
        }

        if (memberData?.team_id) {
          // Parallel fetch for performance
          const [teamResult, rankResult] = await Promise.all([
            supabase
              .from("teams")
              .select("id, name")
              .eq("id", memberData.team_id)
              .maybeSingle(),
            supabase
              .from("ladder_rankings")
              .select("rank, wins, losses")
              .eq("team_id", memberData.team_id)
              .maybeSingle(),
          ]);

          if (teamResult.error) {
            logger.apiError("fetchTeam", teamResult.error);
            throw teamResult.error;
          }

          if (teamResult.data) {
            setUserTeam({
              id: teamResult.data.id,
              name: safeString(teamResult.data.name, "Unknown Team"),
              rank: rankResult.data?.rank ?? null,
            });
          }

          // Fetch stats in parallel
          const teamId = memberData.team_id;
          
          const [matchesResult, pendingResult, incomingResult, unifiedResult] = await Promise.all([
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
              .eq("status", "pending"),
            supabase.rpc("get_player_unified_stats", {
              p_user_id: user.id,
              p_days: 0,
            }),
          ]);

          setIncomingChallenges(safeCount(incomingResult.count));

          const unified = unifiedResult.data as any;
          if (unified?.by_mode) {
            setModeBreakdown(unified.by_mode);
          }

          const totalWins = unified?.overall?.wins ?? rankResult.data?.wins ?? 0;
          const totalLosses = unified?.overall?.losses ?? rankResult.data?.losses ?? 0;

          setStats({
            matchesPlayed: totalWins + totalLosses,
            wins: totalWins,
            losses: totalLosses,
            pendingChallenges: safeCount(pendingResult.count),
          });
        }
      } catch (error) {
        logger.error("Error fetching dashboard data", error);
        setFetchError("Failed to load dashboard data. Pull down to retry.");
      } finally {
        setTeamLoading(false);
      }
    };

    fetchUserTeamAndStats();
  }, [user]);

  const winRate = stats.matchesPlayed > 0 
    ? Math.round((stats.wins / stats.matchesPlayed) * 100) 
    : 0;

  const handleRefresh = useCallback(async () => {
    if (!user) return;
    
    try {
      setFetchError(null);
      
      const { data: memberData } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberData?.team_id) {
        const [teamResult, rankResult] = await Promise.all([
          supabase
            .from("teams")
            .select("id, name")
            .eq("id", memberData.team_id)
            .maybeSingle(),
          supabase
            .from("ladder_rankings")
            .select("rank, wins, losses")
            .eq("team_id", memberData.team_id)
            .maybeSingle(),
        ]);

        if (teamResult.data) {
          setUserTeam({
            id: teamResult.data.id,
            name: safeString(teamResult.data.name, "Unknown Team"),
            rank: rankResult.data?.rank ?? null,
          });
        }

        const teamId = memberData.team_id;
        
        const [matchesResult, pendingResult, incomingResult, unifiedResult] = await Promise.all([
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
            .eq("status", "pending"),
          supabase.rpc("get_player_unified_stats", {
            p_user_id: user!.id,
            p_days: 0,
          }),
        ]);

        setIncomingChallenges(safeCount(incomingResult.count));

        const unified = unifiedResult.data as any;
        if (unified?.by_mode) {
          setModeBreakdown(unified.by_mode);
        }

        const totalWins = unified?.overall?.wins ?? rankResult.data?.wins ?? 0;
        const totalLosses = unified?.overall?.losses ?? rankResult.data?.losses ?? 0;

        setStats({
          matchesPlayed: totalWins + totalLosses,
          wins: totalWins,
          losses: totalLosses,
          pendingChallenges: safeCount(pendingResult.count),
        });
      }
      
      logger.debug("Dashboard data refreshed");
    } catch (error) {
      logger.error("Error refreshing dashboard data", error);
      setFetchError("Failed to refresh. Try again.");
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container py-6 sm:py-8">
          <div className="mb-6 sm:mb-8">
            <div className="h-8 w-64 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-48 bg-muted rounded animate-pulse" />
          </div>
          <div className="mb-8">
            <TeamCardSkeleton />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <DashboardCardSkeleton />
            <DashboardCardSkeleton />
            <DashboardCardSkeleton />
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* Mobile FAB for quick challenge */}
      <FABContainer show={!!userTeam}>
        <FAB
          icon={<Swords />}
          label="Challenge"
          showLabel
          position="bottom-right"
          asChild
        >
          <Link to="/challenges" />
        </FAB>
      </FABContainer>

      {/* Main Content */}
      <PullToRefresh onRefresh={handleRefresh} className="min-h-[calc(100vh-4rem)]">
        <main className="container py-6 sm:py-8 pb-safe-nav sm:pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Welcome, {user.user_metadata?.display_name || user.email?.split("@")[0]}!
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-2">
                {role === "admin"
                  ? "Manage your academy from the admin dashboard"
                  : "View your rankings and challenge other players"}
              </p>
            </div>

          {/* Team Status Card */}
          {!teamLoading && (
            <div className="mb-8">
              {userTeam ? (
                <Card className="bg-gradient-to-r from-accent/10 to-primary/10 border-accent/30">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                          <Users className="w-6 h-6 text-accent" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{userTeam.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {userTeam.rank ? `Rank #${userTeam.rank}` : "Unranked"}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" asChild>
                        <Link to="/ladders">View Ladders</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed border-2 border-accent/50 bg-accent/5">
                  <CardContent className="py-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                          <Plus className="w-6 h-6 text-accent" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">No team yet</p>
                          <p className="text-sm text-muted-foreground">
                            Create a team to join the ladder rankings
                          </p>
                        </div>
                      </div>
                      <Button asChild>
                        <Link to="/teams/create">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Team
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Rank</CardTitle>
                <Trophy className="h-4 w-4 text-rank-gold" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {userTeam?.rank ? `#${userTeam.rank}` : "#--"}
                </div>
                <p className="text-xs text-muted-foreground">Ladder position</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Matches Played</CardTitle>
                <Swords className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.matchesPlayed}</div>
                <p className="text-xs text-muted-foreground">Total matches</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.matchesPlayed > 0 ? `${winRate}%` : "--%"}</div>
                <p className="text-xs text-muted-foreground">{stats.wins}W / {stats.losses}L</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Challenges</CardTitle>
                <Swords className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingChallenges}</div>
                <p className="text-xs text-muted-foreground">Awaiting response</p>
              </CardContent>
            </Card>
          </div>

          {/* Mode Breakdown */}
          {modeBreakdown && (
            <div className="flex flex-wrap gap-3 mb-8">
              {(["ladder", "tournament", "americano"] as const).map((m) => {
                const ms = modeBreakdown[m];
                const total = ms.wins + ms.losses;
                if (total === 0) return null;
                const wr = Math.round((ms.wins / total) * 100);
                const icons = { ladder: "🪜", tournament: "🏆", americano: "🔀" };
                return (
                  <Link to="/stats" key={m}>
                    <Badge variant="secondary" className="px-3 py-1.5 text-sm gap-1.5 cursor-pointer hover:bg-muted transition-colors">
                      <span>{icons[m]}</span>
                      <span className="capitalize font-medium">{m}</span>
                      <span className="text-muted-foreground">{total} matches</span>
                      <span className="text-foreground font-semibold">{wr}%</span>
                    </Badge>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link to="/ladders">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-accent" />
                    Ladders
                  </CardTitle>
                  <CardDescription>View and compete in ladder rankings</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/challenges">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full relative">
                {incomingChallenges > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-warning text-warning-foreground">
                    {incomingChallenges}
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Swords className="w-5 h-5 text-accent" />
                    Challenges
                  </CardTitle>
                  <CardDescription>View and manage your ladder challenges</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/players">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-accent" />
                    Find Players
                  </CardTitle>
                  <CardDescription>Discover players and build your team</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/americano">
              <Card className="hover:border-success/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shuffle className="w-5 h-5 text-success" />
                    Americano
                  </CardTitle>
                  <CardDescription>Rotating partners, point accumulation</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/tournaments">
              <Card className="hover:border-warning/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-warning" />
                    Tournaments
                  </CardTitle>
                  <CardDescription>Bracket-based competitions</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/stats">
              <Card className="hover:border-accent/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-accent" />
                    My Stats
                  </CardTitle>
                  <CardDescription>View your performance analytics</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/profile">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-accent" />
                    Profile
                  </CardTitle>
                  <CardDescription>Update your profile and settings</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            {role === "admin" && (
              <Link to="/admin">
                <Card className="hover:border-primary/50 transition-colors cursor-pointer border-accent/30 h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5 text-accent" />
                      Admin Panel
                    </CardTitle>
                    <CardDescription>Manage players, matches, and academy settings</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            )}
          </div>
        </motion.div>
      </main>
    </PullToRefresh>
    </div>
  );
}
