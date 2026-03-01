import { useState, useEffect, useCallback, useRef } from "react";
import { Inbox, Trophy, Clock, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { ChallengeCardSkeleton } from "@/components/ui/skeleton-card";
import { DeclineReasonDialog } from "./DeclineReasonDialog";
import {
  Challenge, UserTeam, formatTimeAgo, formatExpiresIn,
  CHALLENGE_SELECT_WITH_TEAMS, mapChallengeWithJoins, enrichWithRanksAndMatches,
} from "./challengeUtils";

interface IncomingTabProps {
  userTeamId: string;
  userTeam: UserTeam;
  refreshKey: number;
  onAction: () => void;
}

export function IncomingTab({ userTeamId, userTeam, refreshKey, onAction }: IncomingTabProps) {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[] | null>(null);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [isDeclining, setIsDeclining] = useState(false);
  const lastKeyRef = useRef(-1);

  const fetchData = useCallback(async () => {
    // Single query with FK joins — no waterfall
    const [challengeResult, ranksResult] = await Promise.all([
      supabase.from("challenges")
        .select(CHALLENGE_SELECT_WITH_TEAMS)
        .eq("challenged_team_id", userTeamId)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      // Ranks fetched in parallel with challenges
      supabase.from("ladder_rankings")
        .select("team_id, rank")
        .or(`team_id.eq.${userTeamId}`)
    ]);

    if (challengeResult.error) { logger.apiError("fetchIncomingChallenges", challengeResult.error); return; }

    const data = challengeResult.data || [];
    // Build ranks map from parallel query + any additional team IDs
    const allTeamIds = [...new Set(data.flatMap(c => [c.challenger_team_id, c.challenged_team_id]).filter(Boolean))];
    let ranksMap = new Map((ranksResult.data || []).map((r: any) => [r.team_id, r.rank]));

    // If we have team IDs not in the initial rank query, fetch them
    const missingIds = allTeamIds.filter(id => !ranksMap.has(id));
    if (missingIds.length > 0) {
      const { data: extraRanks } = await supabase.from("ladder_rankings").select("team_id, rank").in("team_id", missingIds);
      (extraRanks || []).forEach((r: any) => ranksMap.set(r.team_id, r.rank));
    }

    setChallenges(data.map(c => mapChallengeWithJoins(c, ranksMap)));
  }, [userTeamId]);

  useEffect(() => {
    if (lastKeyRef.current !== refreshKey) {
      lastKeyRef.current = refreshKey;
      fetchData();
    }
  }, [fetchData, refreshKey]);

  const handleAccept = async (challengeId: string) => {
    setRespondingTo(challengeId);
    try {
      const { data: challenge } = await supabase
        .from("challenges").select("challenger_team_id, challenged_team_id").eq("id", challengeId).single();
      if (!challenge) throw new Error("Challenge not found");

      const { data: match, error: matchError } = await supabase
        .from("matches").insert({ challenger_team_id: challenge.challenger_team_id, challenged_team_id: challenge.challenged_team_id, status: "pending" }).select().single();
      if (matchError) throw matchError;

      const { error: updateError } = await supabase
        .from("challenges").update({ status: "accepted", responded_at: new Date().toISOString(), match_id: match.id }).eq("id", challengeId);
      if (updateError) throw updateError;

      try {
        const ch = challenges?.find(c => c.id === challengeId);
        if (ch) {
          await supabase.functions.invoke("send-challenge-notification", {
            body: { type: "challenge_accepted", challengerTeamId: ch.challenger_team?.id, challengerTeamName: ch.challenger_team?.name, challengedTeamId: userTeam.id, challengedTeamName: userTeam.name },
          });
        }
      } catch (e) { logger.apiError("sendChallengeAcceptedNotification", e); }

      toast({ title: "Challenge accepted!", description: "Record the match result when you've played." });
      onAction();
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setRespondingTo(null);
    }
  };

  const handleDeclineWithReason = async (reason: string) => {
    if (!selectedChallenge) return;
    setIsDeclining(true);
    try {
      const { error } = await supabase
        .from("challenges").update({ status: "declined", responded_at: new Date().toISOString(), decline_reason: reason }).eq("id", selectedChallenge.id);
      if (error) throw error;

      try {
        await supabase.functions.invoke("send-challenge-notification", {
          body: { type: "challenge_declined", challengerTeamId: selectedChallenge.challenger_team?.id, challengerTeamName: selectedChallenge.challenger_team?.name, challengedTeamId: userTeam.id, challengedTeamName: userTeam.name, declineReason: reason },
        });
      } catch (e) { logger.apiError("sendChallengeDeclinedNotification", e); }

      toast({ title: "Challenge declined", description: "The challenge has been declined." });
      setDeclineDialogOpen(false);
      setSelectedChallenge(null);
      onAction();
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsDeclining(false);
    }
  };

  if (challenges === null) return <div className="space-y-3"><ChallengeCardSkeleton /><ChallengeCardSkeleton /></div>;

  return (
    <>
      {challenges.length === 0 ? (
        <Card className="text-center py-8">
          <CardContent>
            <Inbox className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No pending challenges</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {challenges.map((challenge) => (
            <div key={challenge.id} className="hero-animate">
              <Card className="border-accent/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Trophy className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">#{challenge.challenger_rank || "?"}</span>
                        <span className="font-semibold text-foreground truncate">{challenge.challenger_team?.name || "Unknown"}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTimeAgo(challenge.created_at)}</span>
                        <span className={cn(formatExpiresIn(challenge.expires_at) === "Expired" && "text-destructive")}>{formatExpiresIn(challenge.expires_at)}</span>
                      </div>
                      {challenge.message && <p className="text-sm text-muted-foreground mt-2 italic">"{challenge.message}"</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedChallenge(challenge); setDeclineDialogOpen(true); }} disabled={respondingTo === challenge.id}><X className="w-4 h-4" /></Button>
                      <Button size="sm" onClick={() => handleAccept(challenge.id)} disabled={respondingTo === challenge.id}>
                        {respondingTo === challenge.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      <DeclineReasonDialog
        open={declineDialogOpen}
        onOpenChange={setDeclineDialogOpen}
        challengerName={selectedChallenge?.challenger_team?.name || "Opponent"}
        onConfirm={handleDeclineWithReason}
        isLoading={isDeclining}
      />
    </>
  );
}
