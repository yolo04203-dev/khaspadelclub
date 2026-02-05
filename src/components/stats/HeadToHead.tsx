import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface HeadToHeadProps {
  teamId: string;
}

interface OpponentRecord {
  opponentId: string;
  opponentName: string;
  wins: number;
  losses: number;
  winRate: number;
}

export function HeadToHead({ teamId }: HeadToHeadProps) {
  const [records, setRecords] = useState<OpponentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: matches, error } = await supabase
          .from("matches")
          .select("challenger_team_id, challenged_team_id, winner_team_id")
          .or(`challenger_team_id.eq.${teamId},challenged_team_id.eq.${teamId}`)
          .eq("status", "completed");

        if (error) throw error;

        if (!matches || matches.length === 0) {
          setRecords([]);
          return;
        }

        // Group by opponent
        const opponentMap: Map<string, { wins: number; losses: number }> = new Map();

        matches.forEach((match) => {
          const opponentId = match.challenger_team_id === teamId 
            ? match.challenged_team_id 
            : match.challenger_team_id;
          
          const existing = opponentMap.get(opponentId) || { wins: 0, losses: 0 };
          
          if (match.winner_team_id === teamId) {
            existing.wins += 1;
          } else {
            existing.losses += 1;
          }
          
          opponentMap.set(opponentId, existing);
        });

        // Get opponent names
        const opponentIds = Array.from(opponentMap.keys());
        const { data: teams } = await supabase
          .from("teams")
          .select("id, name")
          .in("id", opponentIds);

        const teamsMap = new Map(teams?.map(t => [t.id, t.name]) || []);

        // Create records and sort by total matches
        const recordsList: OpponentRecord[] = Array.from(opponentMap.entries())
          .map(([opponentId, stats]) => ({
            opponentId,
            opponentName: teamsMap.get(opponentId) || "Unknown",
            wins: stats.wins,
            losses: stats.losses,
            winRate: Math.round((stats.wins / (stats.wins + stats.losses)) * 100),
          }))
          .sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses))
          .slice(0, 5);

        setRecords(recordsList);
      } catch (error) {
        console.error("Error fetching head-to-head data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [teamId]);

  if (isLoading) {
    return (
      <div className="h-32 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No opponent data available yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {records.map((record) => (
        <div
          key={record.opponentId}
          className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-foreground truncate">
                {record.opponentName}
              </span>
              <span className="text-sm text-muted-foreground">
                {record.wins}W - {record.losses}L
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={record.winRate} className="flex-1 h-2" />
              <span className="text-sm font-medium w-12 text-right">
                {record.winRate}%
              </span>
            </div>
          </div>
          
          <div className="w-8 flex justify-center">
            {record.winRate > 50 ? (
              <TrendingUp className="w-5 h-5 text-success" />
            ) : record.winRate < 50 ? (
              <TrendingDown className="w-5 h-5 text-destructive" />
            ) : (
              <Minus className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
