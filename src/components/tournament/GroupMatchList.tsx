import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock } from "lucide-react";

interface GroupMatch {
  id: string;
  team1_id: string | null;
  team2_id: string | null;
  team1_name: string;
  team2_name: string;
  team1_score: number | null;
  team2_score: number | null;
  winner_team_id: string | null;
}

interface GroupMatchListProps {
  groupName: string;
  matches: GroupMatch[];
  isAdmin: boolean;
  onSubmitScore: (matchId: string, team1Score: number, team2Score: number) => Promise<void>;
}

export function GroupMatchList({ groupName, matches, isAdmin, onSubmitScore }: GroupMatchListProps) {
  const [scores, setScores] = useState<Record<string, { team1: string; team2: string }>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const handleSubmit = async (match: GroupMatch) => {
    const scoreData = scores[match.id];
    if (!scoreData) return;

    const team1Score = parseInt(scoreData.team1);
    const team2Score = parseInt(scoreData.team2);

    if (isNaN(team1Score) || isNaN(team2Score)) return;

    setSubmitting(match.id);
    try {
      await onSubmitScore(match.id, team1Score, team2Score);
      setScores(prev => {
        const updated = { ...prev };
        delete updated[match.id];
        return updated;
      });
    } finally {
      setSubmitting(null);
    }
  };

  const completedMatches = matches.filter(m => m.winner_team_id !== null);
  const pendingMatches = matches.filter(m => m.winner_team_id === null);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>{groupName} Matches</span>
          <Badge variant="outline">
            {completedMatches.length}/{matches.length} played
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {matches.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No matches scheduled</p>
        ) : (
          <>
            {/* Pending matches first */}
            {pendingMatches.map((match) => (
              <div key={match.id} className="p-3 rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-3 h-3 text-warning" />
                      <span className="text-muted-foreground">Pending</span>
                    </div>
                    <div className="mt-1 font-medium">
                      {match.team1_name} vs {match.team2_name}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        className="w-16 text-center"
                        value={scores[match.id]?.team1 || ""}
                        onChange={(e) =>
                          setScores((prev) => ({
                            ...prev,
                            [match.id]: { ...prev[match.id], team1: e.target.value },
                          }))
                        }
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        className="w-16 text-center"
                        value={scores[match.id]?.team2 || ""}
                        onChange={(e) =>
                          setScores((prev) => ({
                            ...prev,
                            [match.id]: { ...prev[match.id], team2: e.target.value },
                          }))
                        }
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSubmit(match)}
                        disabled={
                          submitting === match.id ||
                          !scores[match.id]?.team1 ||
                          !scores[match.id]?.team2
                        }
                      >
                        {submitting === match.id ? "..." : "Save"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Completed matches */}
            {completedMatches.map((match) => (
              <div key={match.id} className="p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-3 h-3 text-success" />
                      <span className="text-muted-foreground">Completed</span>
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <span className={match.winner_team_id === match.team1_id ? "font-bold text-success" : ""}>
                        {match.team1_name}
                      </span>
                      <span className="font-mono text-lg font-semibold">
                        {match.team1_score} - {match.team2_score}
                      </span>
                      <span className={match.winner_team_id === match.team2_id ? "font-bold text-success" : ""}>
                        {match.team2_name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
