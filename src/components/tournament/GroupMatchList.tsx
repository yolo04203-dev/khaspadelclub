import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, MapPin, Pencil } from "lucide-react";
import { RescheduleMatchDialog } from "./RescheduleMatchDialog";
import { formatMatchDateTime } from "./matchDateFormat";

interface GroupMatch {
  id: string;
  team1_id: string | null;
  team2_id: string | null;
  team1_name: string;
  team2_name: string;
  team1_players?: string;
  team2_players?: string;
  team1_score: number | null;
  team2_score: number | null;
  winner_team_id: string | null;
  scheduled_at?: string | null;
  court_number?: number | null;
}

interface GroupMatchListProps {
  groupName: string;
  matches: GroupMatch[];
  isAdmin: boolean;
  onSubmitScore: (matchId: string, team1Score: number, team2Score: number) => Promise<void>;
  onReschedule?: (matchId: string, scheduledAt: string | null, courtNumber: number | null) => Promise<void>;
  setsPerMatch?: number;
}

export function GroupMatchList({ groupName, matches, isAdmin, onSubmitScore, onReschedule, setsPerMatch = 3 }: GroupMatchListProps) {
  const [scores, setScores] = useState<Record<string, { sets: { team1: string; team2: string }[] }>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [rescheduleMatch, setRescheduleMatch] = useState<GroupMatch | null>(null);

  const initializeScores = (matchId: string) => {
    if (!scores[matchId]) {
      const numSets = setsPerMatch;
      setScores(prev => ({
        ...prev,
        [matchId]: {
          sets: Array(numSets).fill(null).map(() => ({ team1: "", team2: "" }))
        }
      }));
    }
  };

  const handleSubmit = async (match: GroupMatch) => {
    const scoreData = scores[match.id];
    if (!scoreData) return;

    let team1Total = 0;
    let team2Total = 0;

    if (setsPerMatch === 1) {
      team1Total = parseInt(scoreData.sets[0]?.team1 || "0");
      team2Total = parseInt(scoreData.sets[0]?.team2 || "0");
    } else {
      scoreData.sets.forEach(set => {
        const s1 = parseInt(set.team1 || "0");
        const s2 = parseInt(set.team2 || "0");
        if (s1 > s2) team1Total++;
        else if (s2 > s1) team2Total++;
      });
    }

    if (team1Total === team2Total) return;

    setSubmitting(match.id);
    try {
      await onSubmitScore(match.id, team1Total, team2Total);
      setScores(prev => {
        const updated = { ...prev };
        delete updated[match.id];
        return updated;
      });
    } finally {
      setSubmitting(null);
    }
  };

  const isValidScore = (matchId: string) => {
    const scoreData = scores[matchId];
    if (!scoreData) return false;

    if (setsPerMatch === 1) {
      const s1 = parseInt(scoreData.sets[0]?.team1 || "");
      const s2 = parseInt(scoreData.sets[0]?.team2 || "");
      return !isNaN(s1) && !isNaN(s2) && s1 !== s2;
    } else {
      let team1Wins = 0;
      let team2Wins = 0;
      let validSets = 0;

      scoreData.sets.forEach(set => {
        const s1 = parseInt(set.team1 || "");
        const s2 = parseInt(set.team2 || "");
        if (!isNaN(s1) && !isNaN(s2) && s1 !== s2) {
          validSets++;
          if (s1 > s2) team1Wins++;
          else team2Wins++;
        }
      });

      return validSets >= 2 && (team1Wins === 2 || team2Wins === 2);
    }
  };

  const completedMatches = matches.filter(m => m.winner_team_id !== null);
  const pendingMatches = matches.filter(m => m.winner_team_id === null);

  const renderScheduleInfo = (match: GroupMatch) => {
    if (!match.court_number && !match.scheduled_at) return null;
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        {match.court_number && <><MapPin className="w-3 h-3" />Court {match.court_number}</>}
        {match.court_number && match.scheduled_at && <span>—</span>}
        {match.scheduled_at && formatMatchDateTime(match.scheduled_at)}
        {isAdmin && onReschedule && (
          <Button variant="ghost" size="icon" className="h-5 w-5 ml-1" onClick={(e) => { e.stopPropagation(); setRescheduleMatch(match); }}>
            <Pencil className="w-3 h-3" />
          </Button>
        )}
      </span>
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>{groupName} Matches</span>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {setsPerMatch === 1 ? "Single Set" : "Best of 3"}
              </Badge>
              <Badge variant="outline">
                {completedMatches.length}/{matches.length} played
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {matches.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No matches scheduled</p>
          ) : (
            <>
              {pendingMatches.map((match) => {
                initializeScores(match.id);
                const matchScores = scores[match.id];

                return (
                  <div key={match.id} className="p-3 rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-2 text-sm mb-2">
                      <Clock className="w-3 h-3 text-warning" />
                      <span className="text-muted-foreground">Pending</span>
                      {renderScheduleInfo(match)}
                    </div>
                    <div className="mb-3">
                      <div className="font-medium">
                        {match.team1_name} vs {match.team2_name}
                      </div>
                      {(match.team1_players || match.team2_players) && (
                        <p className="text-xs text-muted-foreground">
                          {match.team1_players || "—"} vs {match.team2_players || "—"}
                        </p>
                      )}
                    </div>
                    {isAdmin && matchScores && (
                      <div className="space-y-2">
                        {matchScores.sets.map((set, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-12">
                              {setsPerMatch === 1 ? "Score" : `Set ${idx + 1}`}
                            </span>
                            <Input
                              type="number"
                              min={0}
                              placeholder="0"
                              className="w-14 text-center h-8"
                              value={set.team1}
                              onChange={(e) =>
                                setScores((prev) => ({
                                  ...prev,
                                  [match.id]: {
                                    sets: prev[match.id].sets.map((s, i) =>
                                      i === idx ? { ...s, team1: e.target.value } : s
                                    ),
                                  },
                                }))
                              }
                            />
                            <span className="text-muted-foreground">-</span>
                            <Input
                              type="number"
                              min={0}
                              placeholder="0"
                              className="w-14 text-center h-8"
                              value={set.team2}
                              onChange={(e) =>
                                setScores((prev) => ({
                                  ...prev,
                                  [match.id]: {
                                    sets: prev[match.id].sets.map((s, i) =>
                                      i === idx ? { ...s, team2: e.target.value } : s
                                    ),
                                  },
                                }))
                              }
                            />
                          </div>
                        ))}
                        <Button
                          size="sm"
                          onClick={() => handleSubmit(match)}
                          disabled={submitting === match.id || !isValidScore(match.id)}
                          className="mt-2"
                        >
                          {submitting === match.id ? "Saving..." : "Save Result"}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}

              {completedMatches.map((match) => (
                <div key={match.id} className="p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-3 h-3 text-success" />
                        <span className="text-muted-foreground">Completed</span>
                        {renderScheduleInfo(match)}
                      </div>
                      <div className="mt-1 flex items-center gap-3">
                        <div className={match.winner_team_id === match.team1_id ? "font-bold text-success" : ""}>
                          {match.team1_name}
                          {match.team1_players && <p className="text-[11px] text-muted-foreground font-normal">{match.team1_players}</p>}
                        </div>
                        <span className="font-mono text-lg font-semibold">
                          {match.team1_score} - {match.team2_score}
                        </span>
                        <div className={match.winner_team_id === match.team2_id ? "font-bold text-success" : ""}>
                          {match.team2_name}
                          {match.team2_players && <p className="text-[11px] text-muted-foreground font-normal">{match.team2_players}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      {rescheduleMatch && onReschedule && (
        <RescheduleMatchDialog
          open={!!rescheduleMatch}
          onOpenChange={(open) => { if (!open) setRescheduleMatch(null); }}
          onConfirm={async (scheduledAt, courtNumber) => {
            await onReschedule(rescheduleMatch.id, scheduledAt, courtNumber);
            setRescheduleMatch(null);
          }}
          currentScheduledAt={rescheduleMatch.scheduled_at}
          currentCourtNumber={rescheduleMatch.court_number}
          team1Name={rescheduleMatch.team1_name}
          team2Name={rescheduleMatch.team2_name}
        />
      )}
    </>
  );
}
