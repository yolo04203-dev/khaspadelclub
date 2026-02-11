import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface OpponentRecord {
  opponent_id: string;
  opponent_name: string;
  wins: number;
  losses: number;
  win_rate: number;
}

interface HeadToHeadProps {
  records: OpponentRecord[];
}

export function HeadToHead({ records }: HeadToHeadProps) {
  if (!records || records.length === 0) {
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
          key={record.opponent_id}
          className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-foreground truncate">
                {record.opponent_name}
              </span>
              <span className="text-sm text-muted-foreground">
                {record.wins}W - {record.losses}L
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={record.win_rate} className="flex-1 h-2" />
              <span className="text-sm font-medium w-12 text-right">
                {record.win_rate}%
              </span>
            </div>
          </div>

          <div className="w-8 flex justify-center">
            {record.win_rate > 50 ? (
              <TrendingUp className="w-5 h-5 text-success" />
            ) : record.win_rate < 50 ? (
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
