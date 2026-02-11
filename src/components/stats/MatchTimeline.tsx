import { Trophy, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";

interface MatchEntry {
  id: string;
  completed_at: string;
  source: string;
  opponent_name: string;
  result: string;
  score: string;
}

interface MatchTimelineProps {
  matches: MatchEntry[];
}

const sourceColors: Record<string, "default" | "secondary" | "outline"> = {
  ladder: "default",
  tournament: "secondary",
  americano: "outline",
};

export function MatchTimeline({ matches }: MatchTimelineProps) {
  if (!matches || matches.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No matches in this period
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {matches.map((match) => (
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
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-foreground">
                vs {match.opponent_name}
              </span>
              <Badge
                variant={match.result === "win" ? "default" : "destructive"}
                className="text-xs"
              >
                {match.result === "win" ? "W" : "L"}
              </Badge>
              <Badge
                variant={sourceColors[match.source] || "secondary"}
                className="text-xs capitalize"
              >
                {match.source}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {match.completed_at ? format(parseISO(match.completed_at), "MMM d, yyyy") : "N/A"}
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
