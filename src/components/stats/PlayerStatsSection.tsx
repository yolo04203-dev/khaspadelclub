import { useEffect, useState } from "react";
import { TrendingUp, Trophy, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { logger } from "@/lib/logger";

interface PlayerStatsSectionProps {
  userId: string;
}

interface StatsData {
  player_name: string;
  overall: { wins: number; losses: number };
  by_mode: {
    ladder: { wins: number; losses: number };
    tournament: { wins: number; losses: number };
    americano: { wins: number; losses: number };
  };
  rank: number | null;
  points: number;
}

interface LadderRank {
  rank: number;
  categoryName: string;
  ladderName: string;
  points: number;
}

export function PlayerStatsSection({ userId }: PlayerStatsSectionProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [rankings, setRankings] = useState<LadderRank[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [unifiedResult, teamMembersResult] = await Promise.all([
          supabase.rpc("get_player_unified_stats", { p_user_id: userId, p_days: 0 }),
          supabase.from("team_members").select("team_id").eq("user_id", userId),
        ]);

        if (unifiedResult.error) throw unifiedResult.error;
        setStats(unifiedResult.data as unknown as StatsData);

        // Fetch all rankings for the user's teams
        const teamIds = (teamMembersResult.data || []).map(m => m.team_id);
        if (teamIds.length > 0) {
          const { data: rankingsData } = await supabase
            .from("ladder_rankings")
            .select("rank, points, ladder_category_id, ladder_categories(name, ladder_id, ladders(name))")
            .in("team_id", teamIds)
            .order("rank", { ascending: true });

          if (rankingsData) {
            setRankings(rankingsData.map((r: any) => ({
              rank: r.rank,
              points: r.points,
              categoryName: r.ladder_categories?.name || "Unknown",
              ladderName: r.ladder_categories?.ladders?.name || "Unknown",
            })));
          }
        }
      } catch (error) {
        logger.apiError("fetchPlayerStats", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [userId]);

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const totalMatches = stats.overall.wins + stats.overall.losses;
  if (totalMatches === 0) return null;

  const winRate = Math.round((stats.overall.wins / totalMatches) * 100);

  const modes = [
    { key: "ladder", label: "Ladder", badge: "Team" },
    { key: "tournament", label: "Tournament", badge: "Team" },
    { key: "americano", label: "Americano", badge: "Individual" },
  ] as const;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6 mb-4 flex-wrap">
          <div>
            <p className="text-2xl font-bold text-foreground">{winRate}%</p>
            <p className="text-xs text-muted-foreground">Win Rate</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{totalMatches}</p>
            <p className="text-xs text-muted-foreground">Matches</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {stats.overall.wins}W / {stats.overall.losses}L
            </p>
            <p className="text-xs text-muted-foreground">Record</p>
          </div>
        </div>

        {rankings.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {rankings.map((r, i) => (
              <Badge key={i} variant="outline" className="text-xs gap-1.5 py-1">
                <Trophy className="w-3 h-3 text-rank-gold" />
                <span className="font-medium">{r.categoryName}</span>
                <span className="text-foreground font-semibold">#{r.rank}</span>
                <span className="text-muted-foreground">{r.points}pts</span>
              </Badge>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {modes.map((m) => {
            const ms = stats.by_mode[m.key];
            const t = ms.wins + ms.losses;
            if (t === 0) return null;
            return (
              <Badge key={m.key} variant="secondary" className="text-xs gap-1">
                <span className="font-medium">{m.label}</span>
                <span className="text-muted-foreground">
                  {ms.wins}W/{ms.losses}L
                </span>
              </Badge>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}