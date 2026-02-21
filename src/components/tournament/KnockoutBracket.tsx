import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Crown, MapPin, Pencil } from "lucide-react";
import { RescheduleMatchDialog } from "./RescheduleMatchDialog";
import { formatMatchDateTime } from "./matchDateFormat";

interface KnockoutMatch {
  id: string;
  round_number: number;
  match_number: number;
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
  sets_per_match?: number | null;
}

interface AvailableTeam {
  team_id: string;
  team_name: string;
}

interface KnockoutBracketProps {
  matches: KnockoutMatch[];
  isAdmin: boolean;
  onSubmitScore: (matchId: string, team1Score: number, team2Score: number) => Promise<void>;
  onReschedule?: (matchId: string, scheduledAt: string | null, courtNumber: number | null) => Promise<void>;
  onAssignTeam?: (matchId: string, slot: "team1" | "team2", teamId: string) => Promise<void>;
  availableTeams?: AvailableTeam[];
  winnerTeamId?: string | null;
  winnerTeamName?: string;
}

export function KnockoutBracket({ matches, isAdmin, onSubmitScore, onReschedule, onAssignTeam, availableTeams, winnerTeamId, winnerTeamName }: KnockoutBracketProps) {
  const [scores, setScores] = useState<Record<string, { team1: string; team2: string }>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [rescheduleMatch, setRescheduleMatch] = useState<KnockoutMatch | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);

  const handleSubmit = async (match: KnockoutMatch) => {
    const scoreData = scores[match.id];
    if (!scoreData) return;

    const team1Score = parseInt(scoreData.team1);
    const team2Score = parseInt(scoreData.team2);

    if (isNaN(team1Score) || isNaN(team2Score) || team1Score === team2Score) return;

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

  const handleAssignTeam = async (matchId: string, slot: "team1" | "team2", teamId: string) => {
    if (!onAssignTeam) return;
    setAssigning(`${matchId}-${slot}`);
    try {
      await onAssignTeam(matchId, slot, teamId);
    } finally {
      setAssigning(null);
    }
  };

  // Collect team IDs already assigned in knockout matches
  const assignedTeamIds = new Set(
    matches.flatMap(m => [m.team1_id, m.team2_id]).filter(Boolean) as string[]
  );

  const getUnassignedTeams = () => {
    if (!availableTeams) return [];
    return availableTeams.filter(t => !assignedTeamIds.has(t.team_id));
  };

  const roundsGrouped = matches.reduce((acc, match) => {
    if (!acc[match.round_number]) acc[match.round_number] = [];
    acc[match.round_number].push(match);
    return acc;
  }, {} as Record<number, KnockoutMatch[]>);

  const getRoundName = (round: number, totalRounds: number) => {
    const roundsFromEnd = totalRounds - round + 1;
    if (roundsFromEnd === 1) return "Finals";
    if (roundsFromEnd === 2) return "Semi-Finals";
    if (roundsFromEnd === 3) return "Quarter-Finals";
    return `Round ${round}`;
  };

  const totalRounds = Object.keys(roundsGrouped).length;

  const renderTeamSlot = (match: KnockoutMatch, slot: "team1" | "team2") => {
    const teamId = slot === "team1" ? match.team1_id : match.team2_id;
    const teamName = slot === "team1" ? match.team1_name : match.team2_name;
    const teamPlayers = slot === "team1" ? match.team1_players : match.team2_players;
    const teamScore = slot === "team1" ? match.team1_score : match.team2_score;
    const isWinner = match.winner_team_id === teamId;
    const isTBD = !teamId;
    const unassignedTeams = getUnassignedTeams();

    return (
      <div className="flex items-center justify-between">
        <div className={`flex-1 ${isWinner ? "font-bold text-success" : ""}`}>
          {isTBD && isAdmin && onAssignTeam && unassignedTeams.length > 0 && !match.winner_team_id ? (
            <Select
              onValueChange={(val) => handleAssignTeam(match.id, slot, val)}
              disabled={assigning === `${match.id}-${slot}`}
            >
              <SelectTrigger className="h-8 text-xs w-full max-w-[180px]">
                <SelectValue placeholder="Assign team…" />
              </SelectTrigger>
              <SelectContent>
                {unassignedTeams.map(t => (
                  <SelectItem key={t.team_id} value={t.team_id}>
                    {t.team_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <>
              {teamName || "TBD"}
              {teamPlayers && <p className="text-[11px] text-muted-foreground font-normal">{teamPlayers}</p>}
            </>
          )}
        </div>
        {teamScore !== null && (
          <span className="font-mono font-semibold">{teamScore}</span>
        )}
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-warning" />
            Knockout Stage
          </CardTitle>
        </CardHeader>
        <CardContent>
          {winnerTeamId && winnerTeamName && (
            <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-rank-gold/10 to-warning/10 border border-rank-gold/30 flex items-center justify-center gap-3">
              <Crown className="w-8 h-8 text-rank-gold" />
              <span className="text-xl font-bold">{winnerTeamName} wins!</span>
            </div>
          )}

          {matches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Knockout bracket will appear after group stage completes</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(roundsGrouped).map(([roundNum, roundMatches]) => (
                <div key={roundNum}>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    {getRoundName(parseInt(roundNum), totalRounds)}
                    <Badge variant="outline" className="text-xs">
                      {roundMatches.filter(m => m.winner_team_id).length}/{roundMatches.length}
                    </Badge>
                    {roundMatches[0]?.sets_per_match && (
                      <Badge variant="secondary" className="text-xs">
                        {roundMatches[0].sets_per_match === 1 ? "Single Set" : `Best of ${roundMatches[0].sets_per_match}`}
                      </Badge>
                    )}
                  </h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    {roundMatches.map((match) => (
                      <Card key={match.id} className={match.winner_team_id ? "bg-muted/50" : ""}>
                        <CardContent className="py-3">
                          <div className="space-y-2">
                            {(match.court_number || match.scheduled_at) && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                {match.court_number && <><MapPin className="w-3 h-3" />Court {match.court_number}</>}
                                {match.court_number && match.scheduled_at && <span>—</span>}
                                {match.scheduled_at && formatMatchDateTime(match.scheduled_at)}
                                {isAdmin && onReschedule && (
                                  <Button variant="ghost" size="icon" className="h-5 w-5 ml-1" onClick={() => setRescheduleMatch(match)}>
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            )}
                            {!match.court_number && !match.scheduled_at && isAdmin && onReschedule && (
                              <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={() => setRescheduleMatch(match)}>
                                <Pencil className="w-3 h-3 mr-1" />Set schedule
                              </Button>
                            )}
                            {renderTeamSlot(match, "team1")}
                            {renderTeamSlot(match, "team2")}

                            {isAdmin && !match.winner_team_id && match.team1_id && match.team2_id && (
                              <div className="flex items-center gap-2 pt-2 border-t mt-2">
                                <Input
                                  type="number"
                                  min={0}
                                  placeholder="0"
                                  className="w-16 text-center"
                                  value={scores[match.id]?.team1 || ""}
                                  onChange={(e) =>
                                    setScores(prev => ({
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
                                    setScores(prev => ({
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
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
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
