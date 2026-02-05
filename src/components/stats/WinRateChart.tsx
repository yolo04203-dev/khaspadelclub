import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { format, subDays, isAfter, parseISO } from "date-fns";

interface WinRateChartProps {
  teamId: string;
  days: number;
}

interface ChartData {
  date: string;
  winRate: number;
  wins: number;
  total: number;
}

export function WinRateChart({ teamId, days }: WinRateChartProps) {
  const [data, setData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from("matches")
          .select("winner_team_id, completed_at")
          .or(`challenger_team_id.eq.${teamId},challenged_team_id.eq.${teamId}`)
          .eq("status", "completed")
          .order("completed_at", { ascending: true });

        if (days !== 0) {
          const startDate = subDays(new Date(), days);
          query = query.gte("completed_at", startDate.toISOString());
        }

        const { data: matches, error } = await query;

        if (error) throw error;

        if (!matches || matches.length === 0) {
          setData([]);
          return;
        }

        // Group matches by day and calculate cumulative win rate
        const dailyData: Map<string, { wins: number; total: number }> = new Map();
        
        matches.forEach((match) => {
          if (!match.completed_at) return;
          const dateKey = format(parseISO(match.completed_at), "MMM d");
          const existing = dailyData.get(dateKey) || { wins: 0, total: 0 };
          
          existing.total += 1;
          if (match.winner_team_id === teamId) {
            existing.wins += 1;
          }
          
          dailyData.set(dateKey, existing);
        });

        // Calculate cumulative win rate
        let cumulativeWins = 0;
        let cumulativeTotal = 0;
        const chartData: ChartData[] = [];

        dailyData.forEach((value, date) => {
          cumulativeWins += value.wins;
          cumulativeTotal += value.total;
          chartData.push({
            date,
            winRate: Math.round((cumulativeWins / cumulativeTotal) * 100),
            wins: cumulativeWins,
            total: cumulativeTotal,
          });
        });

        setData(chartData);
      } catch (error) {
        console.error("Error fetching chart data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [teamId, days]);

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No match data available for this period
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
          />
          <YAxis 
            domain={[0, 100]}
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `${value}%`}
            className="text-muted-foreground"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "hsl(var(--foreground))" }}
            formatter={(value: number) => [`${value}%`, "Win Rate"]}
          />
          <Line
            type="monotone"
            dataKey="winRate"
            stroke="hsl(var(--accent))"
            strokeWidth={2}
            dot={{ fill: "hsl(var(--accent))", strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
