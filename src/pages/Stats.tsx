import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, TrendingUp, Calendar, Users, Loader2, Target } from "lucide-react";
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
import { format, subDays } from "date-fns";

interface TeamStats {
  teamId: string;
  teamName: string;
  rank: number | null;
  wins: number;
  losses: number;
  points: number;
  streak: number;
}

export default function Stats() {
  const { user, isLoading: authLoading } = useAuth();
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState("30");

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        // Get user's team
        const { data: memberData } = await supabase
          .from("team_members")
          .select("team_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!memberData) {
          setTeamStats(null);
          return;
        }

        const { data: teamData } = await supabase
          .from("teams")
          .select("id, name")
          .eq("id", memberData.team_id)
          .single();

        if (!teamData) return;

        const { data: rankData } = await supabase
          .from("ladder_rankings")
          .select("rank, wins, losses, points, streak")
          .eq("team_id", memberData.team_id)
          .maybeSingle();

        setTeamStats({
          teamId: teamData.id,
          teamName: teamData.name,
          rank: rankData?.rank || null,
          wins: rankData?.wins || 0,
          losses: rankData?.losses || 0,
          points: rankData?.points || 0,
          streak: rankData?.streak || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) fetchStats();
  }, [user]);

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

  const totalMatches = teamStats ? teamStats.wins + teamStats.losses : 0;
  const winRate = totalMatches > 0 
    ? Math.round((teamStats!.wins / totalMatches) * 100) 
    : 0;

  const streakLabel = teamStats?.streak 
    ? teamStats.streak > 0 
      ? `${teamStats.streak} Win Streak` 
      : `${Math.abs(teamStats.streak)} Loss Streak`
    : "No streak";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader showBack />

      <main className="container py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Performance Stats</h1>
              <p className="text-muted-foreground mt-1">
                {teamStats ? `Team: ${teamStats.teamName}` : "Join a team to see stats"}
              </p>
            </div>

            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[160px]">
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

          {!teamStats ? (
            <Card className="text-center py-12">
              <CardContent>
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No team yet
                </h3>
                <p className="text-muted-foreground">
                  Join or create a team to see your performance stats
                </p>
              </CardContent>
            </Card>
          ) : (
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
                      {teamStats.rank ? `#${teamStats.rank}` : "Unranked"}
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
                      {teamStats.wins}W / {teamStats.losses}L
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Points</CardTitle>
                    <Target className="h-4 w-4 text-accent" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{teamStats.points}</div>
                    <p className="text-xs text-muted-foreground">Total points</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Streak</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Math.abs(teamStats.streak)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <Badge 
                        variant={teamStats.streak > 0 ? "default" : teamStats.streak < 0 ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {streakLabel}
                      </Badge>
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Win Rate Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Win Rate Over Time</CardTitle>
                  <CardDescription>
                    Your performance trend over the selected period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WinRateChart teamId={teamStats.teamId} days={parseInt(period)} />
                </CardContent>
              </Card>

              {/* Match Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Match History</CardTitle>
                  <CardDescription>
                    Your recent matches and results
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MatchTimeline teamId={teamStats.teamId} days={parseInt(period)} />
                </CardContent>
              </Card>

              {/* Head to Head */}
              <Card>
                <CardHeader>
                  <CardTitle>Head-to-Head Records</CardTitle>
                  <CardDescription>
                    Your record against frequent opponents
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <HeadToHead teamId={teamStats.teamId} />
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
