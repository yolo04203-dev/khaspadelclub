import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Trophy, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, subDays, parseISO } from "date-fns";

interface MatchTimelineProps {
  teamId: string;
  days: number;
}

interface MatchEntry {
  id: string;
  opponentName: string;
  result: "win" | "loss";
  score: string;
  date: string;
  dateFormatted: string;
}

export function MatchTimeline({ teamId, days }: MatchTimelineProps) {
  const [matches, setMatches] = useState<MatchEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from("matches")
          .select("id, challenger_team_id, challenged_team_id, challenger_score, challenged_score, winner_team_id, completed_at")
          .or(`challenger_team_id.eq.${teamId},challenged_team_id.eq.${teamId}`)
          .eq("status", "completed")
          .order("completed_at", { ascending: false })
          .limit(10);

        if (days !== 0) {
          const startDate = subDays(new Date(), days);
          query = query.gte("completed_at", startDate.toISOString());
        }

        const { data: matchesData, error } = await query;

        if (error) throw error;

        if (!matchesData || matchesData.length === 0) {
          setMatches([]);
          return;
        }

        // Get team names
        const teamIds = [...new Set(matchesData.flatMap(m => [m.challenger_team_id, m.challenged_team_id]))];
        const { data: teams } = await supabase
          .from("teams")
          .select("id, name")
          .in("id", teamIds);

        const teamsMap = new Map(teams?.map(t => [t.id, t.name]) || []);

        setMatches(matchesData.map(m => {
          const isChallenger = m.challenger_team_id === teamId;
          const opponentId = isChallenger ? m.challenged_team_id : m.challenger_team_id;
          const myScore = isChallenger ? m.challenger_score : m.challenged_score;
          const theirScore = isChallenger ? m.challenged_score : m.challenger_score;

          return {
            id: m.id,
            opponentName: teamsMap.get(opponentId) || "Unknown",
            result: m.winner_team_id === teamId ? "win" : "loss",
            score: `${myScore || 0} - ${theirScore || 0}`,
            date: m.completed_at || "",
            dateFormatted: m.completed_at ? format(parseISO(m.completed_at), "MMM d, yyyy") : "N/A",
          };
        }));
      } catch (error) {
        console.error("Error fetching match timeline:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [teamId, days]);

  if (isLoading) {
    return (
      <div className="h-32 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No matches in this period
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {matches.map((match, index) => (
        <div
          key={match.id}
          className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background border">
            {match.result === "win" ? (
              <Trophy className="w-5 h-5 text-success" />
            ) : (
              <Target className="w-5 h-5 text-destructive" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">
                vs {match.opponentName}
              </span>
              <Badge 
                variant={match.result === "win" ? "default" : "destructive"}
                className="text-xs"
              >
                {match.result === "win" ? "W" : "L"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {match.dateFormatted}
            </p>
          </div>

          <div className="text-right">
            <span className="font-semibold text-foreground">{match.score}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
