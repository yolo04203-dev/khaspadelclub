import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, TrendingUp, Calendar, Users, Loader2, Target, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WinRateChart } from "@/components/stats/WinRateChart";
import { HeadToHead } from "@/components/stats/HeadToHead";
import { MatchTimeline } from "@/components/stats/MatchTimeline";
import { logger } from "@/lib/logger";

interface TeamBreakdown {
  team_id: string;
  team_name: string;
  ladder_wins: number;
  ladder_losses: number;
  tournament_wins: number;
  tournament_losses: number;
}

interface UnifiedStats {
  player_name: string;
  teams: TeamBreakdown[];
  rank: number | null;
  points: number;
  streak: number;
  overall: { wins: number; losses: number };
  by_mode: {
    ladder: { wins: number; losses: number };
    tournament: { wins: number; losses: number };
    americano: { wins: number; losses: number };
  };
  recent_matches: Array<{
    id: string;
    completed_at: string;
    source: string;
    opponent_name: string;
    result: string;
    score: string;
  }>;
  win_rate_by_day: Array<{ date: string; wins: number; total: number }>;
  head_to_head: Array<{
    opponent_id: string;
    opponent_name: string;
    wins: number;
    losses: number;
    win_rate: number;
  }>;
}

export default function Stats() {
  const { user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<UnifiedStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState("30");
  const [mode, setMode] = useState("all");

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      setIsLoading(true);

      try {
        const days = period === "all" ? 0 : parseInt(period);
        const { data, error } = await supabase.rpc("get_player_unified_stats", {
          p_user_id: user.id,
          p_days: days,
        });

        if (error) throw error;
        setStats(data as unknown as UnifiedStats);
      } catch (error) {
        logger.apiError("fetchStats", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) fetchStats();
  }, [user, period]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader showBack />
        <main className="container py-8 max-w-4xl pb-safe-nav sm:pb-8">
          <div className="h-8 bg-muted rounded w-48 mb-2 animate-pulse" />
          <div className="h-4 bg-muted rounded w-64 mb-8 animate-pulse" />
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2"><div className="h-4 bg-muted rounded w-1/2" /></CardHeader>
                <CardContent><div className="h-8 bg-muted rounded w-16" /></CardContent>
              </Card>
            ))}
          </div>
          <Card className="animate-pulse mb-6">
            <CardHeader><div className="h-5 bg-muted rounded w-40" /></CardHeader>
            <CardContent><div className="h-48 bg-muted rounded" /></CardContent>
          </Card>
          <Card className="animate-pulse">
            <CardHeader><div className="h-5 bg-muted rounded w-32" /></CardHeader>
            <CardContent><div className="h-32 bg-muted rounded" /></CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader showBack />
        <main className="container py-8 max-w-4xl">
          <h1 className="text-3xl font-bold text-foreground mb-8">My Stats</h1>
          <Card className="text-center py-12">
            <CardContent>
              <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No stats available</h3>
              <p className="text-muted-foreground">Play some matches to see your performance stats</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const modeStats = mode === "all" ? stats.overall : stats.by_mode[mode as keyof typeof stats.by_mode];
  const totalMatches = modeStats.wins + modeStats.losses;
  const winRate = totalMatches > 0 ? Math.round((modeStats.wins / totalMatches) * 100) : 0;

  const streakLabel = stats.streak
    ? stats.streak > 0
      ? `${stats.streak} Win Streak`
      : `${Math.abs(stats.streak)} Loss Streak`
    : "No streak";

  // Filter recent matches by mode
  const filteredMatches = mode === "all"
    ? stats.recent_matches
    : stats.recent_matches.filter((m) => m.source === mode);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader showBack />

      <main className="container py-8 max-w-4xl pb-safe-nav sm:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {stats.player_name}'s Stats
              </h1>
              <p className="text-muted-foreground mt-1">
                Your personal performance across all game modes
              </p>
            </div>

            <div className="flex gap-2">
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="ladder">Ladder</SelectItem>
                  <SelectItem value="tournament">Tournament</SelectItem>
                  <SelectItem value="americano">Americano</SelectItem>
                </SelectContent>
              </Select>

              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Time Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rank</CardTitle>
                  <Trophy className="h-4 w-4 text-rank-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.rank ? `#${stats.rank}` : "Unranked"}
                  </div>
                  <p className="text-xs text-muted-foreground">Ladder position</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {totalMatches > 0 ? `${winRate}%` : "--%"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {modeStats.wins}W / {modeStats.losses}L
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Points</CardTitle>
                  <Target className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.points}</div>
                  <p className="text-xs text-muted-foreground">Ladder points</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Streak</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.abs(stats.streak)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <Badge
                      variant={stats.streak > 0 ? "default" : stats.streak < 0 ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {streakLabel}
                    </Badge>
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Per-Team Breakdown */}
            {mode === "all" && stats.teams.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Team Records
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {stats.teams.map((team) => {
                    const teamTotal = team.ladder_wins + team.ladder_losses + team.tournament_wins + team.tournament_losses;
                    const teamWins = team.ladder_wins + team.tournament_wins;
                    return (
                      <Card key={team.team_id}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-foreground">{team.team_name}</span>
                            <Badge variant="outline" className="text-xs">Team</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Ladder: </span>
                              <span className="font-medium">{team.ladder_wins}W / {team.ladder_losses}L</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Tournament: </span>
                              <span className="font-medium">{team.tournament_wins}W / {team.tournament_losses}L</span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {teamTotal} matches · {teamWins}W total
                            {teamTotal > 0 && ` · ${Math.round((teamWins / teamTotal) * 100)}%`}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Americano Individual Card */}
                  {(stats.by_mode.americano.wins > 0 || stats.by_mode.americano.losses > 0) && (
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-foreground">Americano</span>
                          <Badge variant="secondary" className="text-xs">Individual</Badge>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">
                            {stats.by_mode.americano.wins}W / {stats.by_mode.americano.losses}L
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {stats.by_mode.americano.wins + stats.by_mode.americano.losses} matches
                          {(stats.by_mode.americano.wins + stats.by_mode.americano.losses) > 0 &&
                            ` · ${Math.round((stats.by_mode.americano.wins / (stats.by_mode.americano.wins + stats.by_mode.americano.losses)) * 100)}%`
                          }
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* Mode breakdown (only when "All" is selected and no teams) */}
            {mode === "all" && stats.teams.length === 0 && (
              <div className="grid gap-4 md:grid-cols-3">
                {(["ladder", "tournament", "americano"] as const).map((m) => {
                  const ms = stats.by_mode[m];
                  const t = ms.wins + ms.losses;
                  return (
                    <Card key={m} className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => setMode(m)}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium capitalize text-foreground">{m}</span>
                          <Badge variant={m === "americano" ? "secondary" : "outline"} className="text-xs">
                            {m === "americano" ? "Individual" : "Team"} · {t} matches
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {ms.wins}W / {ms.losses}L
                          {t > 0 && ` · ${Math.round((ms.wins / t) * 100)}%`}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Win Rate Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Win Rate Over Time</CardTitle>
                <CardDescription>Your performance trend over the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <WinRateChart data={stats.win_rate_by_day} />
              </CardContent>
            </Card>

            {/* Match Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Match History</CardTitle>
                <CardDescription>Your recent matches and results</CardDescription>
              </CardHeader>
              <CardContent>
                <MatchTimeline matches={filteredMatches} />
              </CardContent>
            </Card>

            {/* Head to Head */}
            <Card>
              <CardHeader>
                <CardTitle>Head-to-Head Records</CardTitle>
                <CardDescription>Your record against frequent opponents</CardDescription>
              </CardHeader>
              <CardContent>
                <HeadToHead records={stats.head_to_head} />
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
