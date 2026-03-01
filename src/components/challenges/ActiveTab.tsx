import { useState, useEffect, useCallback } from "react";
import { Swords, Clock, Check, Trophy, Target, Calendar, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { format } from "date-fns";
import { ChallengeCardSkeleton } from "@/components/ui/skeleton-card";
import { SetScoreDialog } from "./SetScoreDialog";
import { ScheduleMatchDialog } from "./ScheduleMatchDialog";
import { ScoreConfirmationCard } from "./ScoreConfirmationCard";
import { Challenge, UserTeam, formatTimeAgo, getOpponentName, enrichChallenges, mapChallenge } from "./challengeUtils";

interface ActiveTabProps {
  userTeamId: string;
  userTeam: UserTeam;
  refreshKey: number;
  onAction: () => void;
}

export function ActiveTab({ userTeamId, userTeam, refreshKey, onAction }: ActiveTabProps) {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scoreDialogOpen, setScoreDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);

  const fetchData = useCallback(async () => {
    const { data, error } = await supabase
      .from("challenges")
      .select(`id, status, message, decline_reason, expires_at, created_at, match_id, challenger_team_id, challenged_team_id, ladder_category_id,
        ladder_categories!ladder_category_id ( id, name, ladders!ladder_id ( id, name ) )`)
      .or(`challenger_team_id.eq.${userTeamId},challenged_team_id.eq.${userTeamId}`)
      .eq("status", "accepted")
      .order("created_at", { ascending: false });

    if (error) { logger.apiError("fetchAcceptedChallenges", error); return; }

    const { teamsMap, ranksMap, matchMap } = await enrichChallenges(data || [], true);
    setChallenges((data || []).map(c => mapChallenge(c, teamsMap, ranksMap, matchMap)));
    setIsLoading(false);
  }, [userTeamId]);

  useEffect(() => { fetchData(); }, [fetchData, refreshKey]);

  const handleSubmitScore = async (mySets: number[], opponentSets: number[], setsWonByMe: number, setsWonByOpponent: number) => {
    if (!selectedChallenge) return;
    setIsSubmittingScore(true);
    try {
      const isChallenger = selectedChallenge.challenger_team?.id === userTeamId;
      const challengerSets = isChallenger ? mySets : opponentSets;
      const challengedSets = isChallenger ? opponentSets : mySets;
      const setsWonChallenger = isChallenger ? setsWonByMe : setsWonByOpponent;
      const setsWonChallenged = isChallenger ? setsWonByOpponent : setsWonByMe;
      const winnerId = setsWonChallenger > setsWonChallenged ? selectedChallenge.challenger_team?.id : selectedChallenge.challenged_team?.id;

      const { data: { user: currentUser } } = await supabase.auth.getUser();

      const { error: matchError } = await supabase
        .from("matches")
        .update({
          challenger_score: setsWonChallenger, challenged_score: setsWonChallenged,
          challenger_sets: challengerSets, challenged_sets: challengedSets,
          sets_won_challenger: setsWonChallenger, sets_won_challenged: setsWonChallenged,
          winner_team_id: winnerId, status: "pending",
          score_submitted_by: currentUser?.id, score_disputed: false, dispute_reason: null,
        })
        .eq("id", selectedChallenge.match_id);
      if (matchError) throw matchError;

      try {
        const opponentTeamId = isChallenger ? selectedChallenge.challenged_team?.id : selectedChallenge.challenger_team?.id;
        const opponentTeamName = isChallenger ? selectedChallenge.challenged_team?.name : selectedChallenge.challenger_team?.name;
        await supabase.functions.invoke("send-challenge-notification", {
          body: { type: "score_submitted", challengerTeamId: userTeam.id, challengerTeamName: userTeam.name, challengedTeamId: opponentTeamId, challengedTeamName: opponentTeamName },
        });
      } catch (e) { logger.apiError("sendScoreSubmittedNotification", e); }

      const setScoreDisplay = mySets.map((s, i) => `${s}-${opponentSets[i]}`).join(", ");
      toast({ title: "Score submitted", description: `Sets: ${setScoreDisplay}. Waiting for opponent to confirm.` });
      setScoreDialogOpen(false);
      setSelectedChallenge(null);
      onAction();
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmittingScore(false);
    }
  };

  if (isLoading) return <div className="space-y-3"><ChallengeCardSkeleton /><ChallengeCardSkeleton /></div>;

  return (
    <>
      {challenges.length === 0 ? (
        <Card className="text-center py-8">
          <CardContent>
            <Target className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No active matches to record</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {challenges.map((challenge) => (
            <div key={challenge.id} className="hero-animate">
              <Card className="border-accent/30 bg-accent/5">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Swords className="w-4 h-4 text-accent" />
                          <span className="font-semibold text-foreground truncate">vs {getOpponentName(challenge, userTeamId)}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Accepted {formatTimeAgo(challenge.created_at)}</span>
                          {challenge.ladder_category && (
                            <Badge variant="outline" className="text-xs">{challenge.ladder_category.ladder_name} • {challenge.ladder_category.name}</Badge>
                          )}
                          <Badge
                            variant={challenge.match_status === "completed" ? "secondary" : challenge.score_submitted_by ? "outline" : "default"}
                            className={cn("text-xs",
                              challenge.match_status === "completed" ? "bg-muted" :
                              challenge.score_submitted_by ? "border-warning text-warning-foreground" : "bg-accent"
                            )}
                          >
                            {challenge.match_status === "completed" ? "Completed" : challenge.score_submitted_by ? "Awaiting Confirmation" : "Ready to play"}
                          </Badge>
                        </div>
                        {challenge.match_scheduled_at && (
                          <div className="mt-2 flex items-center gap-2 text-sm text-foreground">
                            <Calendar className="w-3.5 h-3.5 text-accent" />
                            <span>{format(new Date(challenge.match_scheduled_at), "MMM d 'at' h:mm a")}</span>
                            {challenge.match_venue && (
                              <>
                                <MapPin className="w-3.5 h-3.5 text-muted-foreground ml-1" />
                                <span className="text-muted-foreground">{challenge.match_venue}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      {challenge.match_status === "completed" && challenge.score_confirmed_by ? (
                        <Badge variant="outline" className="text-muted-foreground flex-shrink-0">
                          <Check className="w-4 h-4 mr-1" />Score Confirmed
                        </Badge>
                      ) : !challenge.score_submitted_by && (
                        <div className="flex gap-2 flex-shrink-0">
                          <Button size="sm" variant="outline" onClick={() => { setSelectedChallenge(challenge); setScheduleDialogOpen(true); }}>
                            <Calendar className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Schedule</span>
                          </Button>
                          <Button size="sm" onClick={() => { setSelectedChallenge(challenge); setScoreDialogOpen(true); }}>
                            <Trophy className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Record Score</span>
                          </Button>
                        </div>
                      )}
                    </div>
                    {challenge.score_submitted_by && !challenge.score_confirmed_by && (
                      <ScoreConfirmationCard
                        matchId={challenge.match_id!}
                        challengerTeamName={challenge.challenger_team?.name || "Team A"}
                        challengedTeamName={challenge.challenged_team?.name || "Team B"}
                        challengerScore={challenge.challenger_score || 0}
                        challengedScore={challenge.challenged_score || 0}
                        challengerSets={challenge.challenger_sets || []}
                        challengedSets={challenge.challenged_sets || []}
                        isSubmitter={challenge.score_submitted_by === user?.id}
                        isDisputed={challenge.score_disputed || false}
                        disputeReason={challenge.dispute_reason || null}
                        userTeamId={userTeamId}
                        ladderCategoryId={challenge.ladder_category?.id}
                        onConfirmed={() => { onAction(); fetchData(); }}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      <SetScoreDialog
        open={scoreDialogOpen}
        onOpenChange={setScoreDialogOpen}
        myTeamName={userTeam.name}
        opponentTeamName={selectedChallenge ? getOpponentName(selectedChallenge, userTeamId) : "Opponent"}
        onSubmit={handleSubmitScore}
        isSubmitting={isSubmittingScore}
      />
      {selectedChallenge?.match_id && (
        <ScheduleMatchDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          matchId={selectedChallenge.match_id}
          opponentName={getOpponentName(selectedChallenge, userTeamId)}
          currentScheduledAt={selectedChallenge.match_scheduled_at}
          currentVenue={selectedChallenge.match_venue}
          onScheduled={() => { onAction(); fetchData(); }}
        />
      )}
    </>
  );
}
