import { useEffect, useState, useCallback } from "react";
import { Navigate, Link } from "react-router-dom";

import { User, Trophy, Swords, Settings, Users, Plus, Shuffle, Layers, Pencil, AlertTriangle, UserPlus, UserMinus, RefreshCw } from "lucide-react";
import { RenameTeamDialog } from "@/components/team/RenameTeamDialog";
import { AddPartnerDialog } from "@/components/team/AddPartnerDialog";
import { RemovePartnerDialog } from "@/components/team/RemovePartnerDialog";
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
import { PendingInvitations } from "@/components/team/PendingInvitations";
interface UserTeam {
  id: string;
  name: string;
  rank: number | null;
  memberNames: string[];
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
  const [isCaptain, setIsCaptain] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showPartnerDialog, setShowPartnerDialog] = useState(false);
  const [showRemovePartnerDialog, setShowRemovePartnerDialog] = useState(false);
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

  const fetchDashboardData = useCallback(async () => {
    if (!user) {
      setTeamLoading(false);
      return;
    }

    try {
      setFetchError(null);
      
      // Fetch team membership first — independent sections below degrade gracefully
        const { data: memberData, error: memberError } = await supabase
          .from("team_members")
          .select("team_id, is_captain")
          .eq("user_id", user.id)
          .maybeSingle();

      if (memberError) {
        logger.apiError("fetchTeamMember", memberError, { userId: user.id });
        throw memberError;
      }

        if (memberData?.team_id) {
          const teamId = memberData.team_id;
          setIsCaptain(!!memberData.is_captain);

        // Section 1: Team info (critical — if this fails, show error)
        try {
          const [teamResult, rankResult, membersResult] = await Promise.all([
            supabase.from("teams").select("id, name").eq("id", teamId).maybeSingle(),
            supabase.from("ladder_rankings").select("rank, wins, losses").eq("team_id", teamId).order("rank", { ascending: true }).limit(1).maybeSingle(),
            supabase.from("team_members").select("user_id").eq("team_id", teamId).order("joined_at"),
          ]);

          if (teamResult.error) throw teamResult.error;
          
          // Fetch member display names
          let memberNames: string[] = [];
          if (membersResult.data && membersResult.data.length > 0) {
            const userIds = membersResult.data.map(m => m.user_id);
            const { data: profiles } = await supabase
              .from("public_profiles")
              .select("user_id, display_name")
              .in("user_id", userIds);
            if (profiles) {
              memberNames = userIds.map(uid => {
                const p = profiles.find(pr => pr.user_id === uid);
                return p?.display_name || "Player";
              });
            }
          }

          // Fallback: if partner was added manually (team name contains "&"), parse names from team name
          const teamName = safeString(teamResult.data?.name, "Unknown Team");
          if (memberNames.length < 2 && teamName.includes(" & ")) {
            const parts = teamName.split("&").map(n => n.trim());
            if (parts.length === 2 && parts[0] && parts[1]) {
              memberNames = parts;
            }
          }

          if (teamResult.data) {
            setUserTeam({
              id: teamResult.data.id,
              name: teamName,
              rank: rankResult.data?.rank ?? null,
              memberNames,
            });
          }
        } catch (err) {
          logger.error("Dashboard: team info failed", err);
        }

      // Section 2: Stats + challenges — deferred to avoid blocking first paint
        // Use requestIdleCallback (or setTimeout fallback) so team card renders first
        const loadStats = async () => {
          try {
            const [pendingResult, incomingResult, unifiedResult] = await Promise.all([
              supabase.from("challenges").select("*", { count: "exact", head: true })
                .or(`challenger_team_id.eq.${teamId},challenged_team_id.eq.${teamId}`)
                .eq("status", "pending"),
              supabase.from("challenges").select("*", { count: "exact", head: true })
                .eq("challenged_team_id", teamId)
                .eq("status", "pending"),
              supabase.rpc("get_player_unified_stats", { p_user_id: user.id, p_days: 0 }),
            ]);

            setIncomingChallenges(safeCount(incomingResult.count));

            const unified = unifiedResult.data as any;
            if (unified?.by_mode) setModeBreakdown(unified.by_mode);

            const totalWins = unified?.overall?.wins ?? 0;
            const totalLosses = unified?.overall?.losses ?? 0;

            setStats({
              matchesPlayed: totalWins + totalLosses,
              wins: totalWins,
              losses: totalLosses,
              pendingChallenges: safeCount(pendingResult.count),
            });
          } catch (err) {
            logger.warn("Dashboard: stats section failed, using defaults", err);
          }
        };

        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => { loadStats(); });
        } else {
          setTimeout(loadStats, 100);
        }
      }
      
      logger.debug("Dashboard data loaded");
    } catch (error) {
      logger.error("Error fetching dashboard data", error);
      setFetchError("Failed to load dashboard data. Pull down to retry.");
    } finally {
      setTeamLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const winRate = stats.matchesPlayed > 0 
    ? Math.round((stats.wins / stats.matchesPlayed) * 100) 
    : 0;

  const handleRefresh = useCallback(async () => {
    await fetchDashboardData();
  }, [fetchDashboardData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container py-4 sm:py-8">
          <div className="mb-5 sm:mb-8">
            <div className="h-8 w-64 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-48 bg-muted rounded animate-pulse" />
          </div>
          <div className="mb-5 sm:mb-8">
            <TeamCardSkeleton />
          </div>
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 mb-5 sm:mb-8">
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
          <Link to="/ladders" />
        </FAB>
      </FABContainer>

      {/* Main Content */}
      <PullToRefresh onRefresh={handleRefresh} className="min-h-[calc(100vh-4rem)]">
        <main className="container py-4 sm:py-8 pb-safe-nav sm:pb-8">
          <div>
            <div className="mb-5 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Welcome, {user.user_metadata?.display_name || user.email?.split("@")[0]}!
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-2">
                {(role === "admin" || role === "super_admin")
                  ? "Manage your club from the admin dashboard"
                  : "View your rankings and challenge other players"}
              </p>
            </div>

          {/* Team Status Card */}
          {teamLoading ? (
            <div className="mb-5 sm:mb-8">
              <TeamCardSkeleton />
            </div>
          ) : (
            <div className="mb-5 sm:mb-8">
              {userTeam ? (
                <Card className="bg-gradient-to-r from-accent/10 to-primary/10 border-accent/30">
                  <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                          <Users className="w-6 h-6 text-accent" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground">{userTeam.name}</p>
                            {isCaptain && (
                              <button
                                onClick={() => setShowRenameDialog(true)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                aria-label="Rename team"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          {userTeam.memberNames.length === 2 ? (
                            <p className="text-xs text-muted-foreground">
                              {userTeam.memberNames[0]} & {userTeam.memberNames[1]}
                            </p>
                          ) : (
                            <div className="flex items-center gap-1.5 text-warning">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <p className="text-xs font-medium">Team needs a partner to compete</p>
                            </div>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {userTeam.rank ? `Rank #${userTeam.rank}` : "Unranked"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        {userTeam.memberNames.length < 2 && isCaptain && (
                          <Button variant="default" className="w-full sm:w-auto" onClick={() => setShowPartnerDialog(true)}>
                            <UserPlus className="w-4 h-4 mr-2" />
                            {userTeam.name.includes(" & ") ? "Change Partner" : "Add Partner"}
                          </Button>
                        )}
                        {userTeam.memberNames.length === 2 && isCaptain && (
                          <Button variant="outline" className="w-full sm:w-auto text-destructive hover:text-destructive" onClick={() => setShowRemovePartnerDialog(true)}>
                            <UserMinus className="w-4 h-4 mr-2" />
                            Remove Partner
                          </Button>
                        )}
                        <Button variant="outline" className="w-full sm:w-auto" asChild>
                          <Link to="/ladders">View Ladders</Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed border-2 border-accent/50 bg-accent/5">
                  <CardContent className="py-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
                      <Button className="w-full sm:w-auto" asChild>
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

          {/* Pending Team Invitations */}
          <div className="mb-5 sm:mb-8">
            <PendingInvitations onAccepted={fetchDashboardData} />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 mb-5 sm:mb-8 min-h-[120px]">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Current Rank</CardTitle>
                <Trophy className="h-4 w-4 text-rank-gold" />
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="text-xl sm:text-2xl font-bold">
                  {userTeam?.rank ? `#${userTeam.rank}` : "#--"}
                </div>
                <p className="text-xs text-muted-foreground">Ladder position</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Matches Played</CardTitle>
                <Swords className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="text-xl sm:text-2xl font-bold">{stats.matchesPlayed}</div>
                <p className="text-xs text-muted-foreground">Total matches</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Win Rate</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="text-xl sm:text-2xl font-bold">{stats.matchesPlayed > 0 ? `${winRate}%` : "--%"}</div>
                <p className="text-xs text-muted-foreground">{stats.wins}W / {stats.losses}L</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Pending Challenges</CardTitle>
                <Swords className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="text-xl sm:text-2xl font-bold">{stats.pendingChallenges}</div>
                <p className="text-xs text-muted-foreground">Awaiting response</p>
              </CardContent>
            </Card>
          </div>

          {/* Mode Breakdown */}
          {modeBreakdown && (
            <div className="flex flex-wrap gap-3 mb-5 sm:mb-8">
              {(["ladder", "tournament", "americano"] as const).map((m) => {
                const ms = modeBreakdown[m];
                const total = ms.wins + ms.losses;
                if (total === 0) return null;
                const wr = Math.round((ms.wins / total) * 100);
                const IconMap = { ladder: Layers, tournament: Trophy, americano: Shuffle };
                const Icon = IconMap[m];
                return (
                  <Link to="/stats" key={m}>
                    <Badge variant="secondary" className="px-3 py-1.5 text-sm gap-1.5 cursor-pointer hover:bg-muted transition-colors">
                      <Icon className="w-3.5 h-3.5" />
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link to="/ladders">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full press-scale">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-2xl">
                    <Layers className="w-5 h-5 text-accent" />
                    Ladders
                  </CardTitle>
                  <CardDescription>View and compete in ladder rankings</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/challenges">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full relative press-scale">
                {incomingChallenges > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-warning text-warning-foreground">
                    {incomingChallenges}
                  </Badge>
                )}
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-2xl">
                    <Swords className="w-5 h-5 text-accent" />
                    Challenges
                  </CardTitle>
                  <CardDescription>View and manage your ladder challenges</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/players">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full press-scale">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-2xl">
                    <Users className="w-5 h-5 text-accent" />
                    Find Players
                  </CardTitle>
                  <CardDescription>Discover players and build your team</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/americano">
              <Card className="hover:border-success/50 transition-colors cursor-pointer h-full press-scale">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-2xl">
                    <Shuffle className="w-5 h-5 text-success" />
                    Americano
                  </CardTitle>
                  <CardDescription>Rotating partners, point accumulation</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/tournaments">
              <Card className="hover:border-warning/50 transition-colors cursor-pointer h-full press-scale">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-2xl">
                    <Trophy className="w-5 h-5 text-warning" />
                    Tournaments
                  </CardTitle>
                  <CardDescription>Bracket-based competitions</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/stats">
              <Card className="hover:border-accent/50 transition-colors cursor-pointer h-full press-scale">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-2xl">
                    <Trophy className="w-5 h-5 text-accent" />
                    My Stats
                  </CardTitle>
                  <CardDescription>View your performance analytics</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/profile">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full press-scale">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-2xl">
                    <User className="w-5 h-5 text-accent" />
                    Profile
                  </CardTitle>
                  <CardDescription>Update your profile and settings</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            {(role === "admin" || role === "super_admin") && (
              <Link to="/admin">
                <Card className="hover:border-primary/50 transition-colors cursor-pointer border-accent/30 h-full press-scale">
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-2xl">
                      <Settings className="w-5 h-5 text-accent" />
                      Admin Panel
                    </CardTitle>
                    <CardDescription>Manage players, matches, and club settings</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            )}
          </div>
        </div>
      </main>
     </PullToRefresh>

      {userTeam && isCaptain && (
        <>
          <RenameTeamDialog
            open={showRenameDialog}
            onOpenChange={setShowRenameDialog}
            teamId={userTeam.id}
            currentName={userTeam.name}
            onRenamed={(newName) => setUserTeam({ ...userTeam, name: newName })}
          />
          <AddPartnerDialog
            open={showPartnerDialog}
            onOpenChange={setShowPartnerDialog}
            teamId={userTeam.id}
            teamName={userTeam.name}
            captainName={userTeam.memberNames[0] || "Captain"}
            onComplete={fetchDashboardData}
          />
          <RemovePartnerDialog
            open={showRemovePartnerDialog}
            onOpenChange={setShowRemovePartnerDialog}
            teamId={userTeam.id}
            partnerName={userTeam.memberNames[1] || "Partner"}
            captainName={userTeam.memberNames[0] || "Captain"}
            onRemoved={fetchDashboardData}
          />
        </>
      )}
    </div>
  );
}
