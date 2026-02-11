import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";

interface DayData {
  date: string;
  wins: number;
  total: number;
}

interface ChartPoint {
  date: string;
  winRate: number;
}

interface WinRateChartProps {
  data: DayData[];
}

export function WinRateChart({ data }: WinRateChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    let cumulativeWins = 0;
    let cumulativeTotal = 0;

    return data.map((d): ChartPoint => {
      cumulativeWins += d.wins;
      cumulativeTotal += d.total;
      return {
        date: format(parseISO(d.date), "MMM d"),
        winRate: Math.round((cumulativeWins / cumulativeTotal) * 100),
      };
    });
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No match data available for this period
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
