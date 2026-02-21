import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Crown, MapPin, Pencil, Check, RotateCcw } from "lucide-react";
import { RescheduleMatchDialog } from "./RescheduleMatchDialog";
import { formatMatchDateTime } from "./matchDateFormat";
import { cn } from "@/lib/utils";

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
  onResetScore?: (matchId: string) => Promise<void>;
  availableTeams?: AvailableTeam[];
  winnerTeamId?: string | null;
  winnerTeamName?: string;
}

interface SetScore {
  team1Games: string;
  team2Games: string;
}

function isValidSetScore(a: number, b: number): boolean {
  const wins = (x: number, y: number) =>
    (x === 6 && y <= 4) || (x === 7 && y === 5) || (x === 7 && y === 6);
  return wins(a, b) || wins(b, a);
}

function getSetWinner(a: number, b: number): "team1" | "team2" | null {
  if (a > b && (a === 6 || a === 7)) return "team1";
  if (b > a && (b === 6 || b === 7)) return "team2";
  return null;
}

export function KnockoutBracket({ matches, isAdmin, onSubmitScore, onReschedule, onAssignTeam, onResetScore, availableTeams, winnerTeamId, winnerTeamName }: KnockoutBracketProps) {
  const [scores, setScores] = useState<Record<string, { team1: string; team2: string }>>({});
  const [setsData, setSetsData] = useState<Record<string, SetScore[]>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [rescheduleMatch, setRescheduleMatch] = useState<KnockoutMatch | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);

  const isBestOf3 = (match: KnockoutMatch) => (match.sets_per_match ?? 1) === 3;

  const getMatchSets = (matchId: string): SetScore[] => {
    return setsData[matchId] || [
      { team1Games: "", team2Games: "" },
      { team1Games: "", team2Games: "" },
      { team1Games: "", team2Games: "" },
    ];
  };

  const updateSetScore = (matchId: string, setIndex: number, field: "team1Games" | "team2Games", value: string) => {
    if (value && !/^[0-7]$/.test(value)) return;
    const current = getMatchSets(matchId);
    const updated = [...current];
    updated[setIndex] = { ...updated[setIndex], [field]: value };
    setSetsData(prev => ({ ...prev, [matchId]: updated }));
  };

  const computeSetsWon = (matchId: string) => {
    const matchSets = getMatchSets(matchId);
    let team1 = 0, team2 = 0;
    for (const s of matchSets) {
      if (s.team1Games === "" || s.team2Games === "") continue;
      const w = getSetWinner(parseInt(s.team1Games), parseInt(s.team2Games));
      if (w === "team1") team1++;
      if (w === "team2") team2++;
    }
    return { team1, team2 };
  };

  const canSubmitBo3 = (matchId: string) => {
    const { team1, team2 } = computeSetsWon(matchId);
    return team1 === 2 || team2 === 2;
  };

  const handleSubmit = async (match: KnockoutMatch) => {
    if (isBestOf3(match)) {
      const { team1, team2 } = computeSetsWon(match.id);
      if (team1 < 2 && team2 < 2) return;
      setSubmitting(match.id);
      try {
        await onSubmitScore(match.id, team1, team2);
        setSetsData(prev => {
          const updated = { ...prev };
          delete updated[match.id];
          return updated;
        });
      } finally {
        setSubmitting(null);
      }
    } else {
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
          {isAdmin && onAssignTeam && !match.winner_team_id && availableTeams && availableTeams.length > 0 ? (
            <Select
              value={teamId || ""}
              onValueChange={(val) => handleAssignTeam(match.id, slot, val)}
              disabled={assigning === `${match.id}-${slot}`}
            >
              <SelectTrigger className="h-8 text-xs w-full max-w-[180px]">
                <SelectValue placeholder="Assign team…">{teamName || "Assign team…"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableTeams.map(t => (
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

  const renderSingleSetEntry = (match: KnockoutMatch) => (
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
        disabled={submitting === match.id || !scores[match.id]?.team1 || !scores[match.id]?.team2}
      >
        {submitting === match.id ? "..." : "Save"}
      </Button>
    </div>
  );

  const renderBestOf3Entry = (match: KnockoutMatch) => {
    const matchSets = getMatchSets(match.id);
    const { team1, team2 } = computeSetsWon(match.id);
    const matchDecided = team1 === 2 || team2 === 2;

    return (
      <div className="pt-2 border-t mt-2 space-y-2">
        {/* Sets won summary */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Sets: {match.team1_name.split(" ")[0]} {team1} - {team2} {match.team2_name.split(" ")[0]}</span>
          <span className="text-[10px]">Valid: 6-0…6-4, 7-5, 7-6</span>
        </div>
        {matchSets.map((set, idx) => {
          const isFilled = set.team1Games !== "" && set.team2Games !== "";
          const setWinner = isFilled ? getSetWinner(parseInt(set.team1Games), parseInt(set.team2Games)) : null;
          const valid = isFilled ? isValidSetScore(parseInt(set.team1Games), parseInt(set.team2Games)) : true;
          const isDisabled = matchDecided && !isFilled;

          return (
            <div key={idx} className="flex items-center gap-2">
              <Label className="w-10 text-xs text-muted-foreground shrink-0">S{idx + 1}</Label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={set.team1Games}
                onChange={(e) => updateSetScore(match.id, idx, "team1Games", e.target.value)}
                disabled={isDisabled}
                placeholder="0"
                className={cn(
                  "w-12 h-9 text-center text-sm font-mono",
                  setWinner === "team1" && "border-accent bg-accent/10",
                  isFilled && !valid && "border-destructive"
                )}
              />
              <span className="text-muted-foreground text-xs">-</span>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={set.team2Games}
                onChange={(e) => updateSetScore(match.id, idx, "team2Games", e.target.value)}
                disabled={isDisabled}
                placeholder="0"
                className={cn(
                  "w-12 h-9 text-center text-sm font-mono",
                  setWinner === "team2" && "border-accent bg-accent/10",
                  isFilled && !valid && "border-destructive"
                )}
              />
              {setWinner && valid && <Check className="w-3 h-3 text-accent shrink-0" />}
            </div>
          );
        })}
        <Button
          size="sm"
          className="w-full"
          onClick={() => handleSubmit(match)}
          disabled={submitting === match.id || !canSubmitBo3(match.id)}
        >
          {submitting === match.id ? "..." : "Save Result"}
        </Button>
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
                              isBestOf3(match) ? renderBestOf3Entry(match) : renderSingleSetEntry(match)
                            )}
                            {isAdmin && match.winner_team_id && onResetScore && (
                              <div className="pt-2 border-t mt-2">
                                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => onResetScore(match.id)}>
                                  <RotateCcw className="w-3 h-3 mr-1" />Reset Score
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