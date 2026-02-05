import { useState } from "react";
import { Check, X, AlertTriangle, Loader2, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ScoreConfirmationCardProps {
  matchId: string;
  challengerTeamName: string;
  challengedTeamName: string;
  challengerScore: number;
  challengedScore: number;
  challengerSets: number[];
  challengedSets: number[];
  isSubmitter: boolean;
  isDisputed: boolean;
  disputeReason: string | null;
  userTeamId: string;
  onConfirmed: () => void;
}

export function ScoreConfirmationCard({
  matchId,
  challengerTeamName,
  challengedTeamName,
  challengerScore,
  challengedScore,
  challengerSets,
  challengedSets,
  isSubmitter,
  isDisputed,
  disputeReason,
  userTeamId,
  onConfirmed,
}: ScoreConfirmationCardProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [disputeReasonText, setDisputeReasonText] = useState("");
  const [isDisputing, setIsDisputing] = useState(false);

  const formatSetScores = () => {
    return challengerSets.map((s, i) => `${s}-${challengedSets[i]}`).join(", ");
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // First, update the match as confirmed
      const winnerId = challengerScore > challengedScore 
        ? await getTeamIdFromMatch("challenger") 
        : await getTeamIdFromMatch("challenged");
      const loserId = challengerScore > challengedScore 
        ? await getTeamIdFromMatch("challenged") 
        : await getTeamIdFromMatch("challenger");

      const { error } = await supabase
        .from("matches")
        .update({
          score_confirmed_by: user.id,
          score_disputed: false,
          dispute_reason: null,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", matchId);

      if (error) throw error;

      // Update ladder rankings
      await updateLadderRankings(winnerId, loserId);

      toast({
        title: "Score confirmed",
        description: "The match result has been confirmed and rankings updated.",
      });
      onConfirmed();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const getTeamIdFromMatch = async (team: "challenger" | "challenged"): Promise<string | null> => {
    const { data } = await supabase
      .from("matches")
      .select(`${team}_team_id`)
      .eq("id", matchId)
      .single();
    return data?.[`${team}_team_id`] || null;
  };

  const updateLadderRankings = async (winnerId: string | null, loserId: string | null) => {
    if (!winnerId || !loserId) return;

    const { data: rankings } = await supabase
      .from("ladder_rankings")
      .select("*")
      .in("team_id", [winnerId, loserId]);

    if (!rankings) return;

    const winnerRanking = rankings.find(r => r.team_id === winnerId);
    const loserRanking = rankings.find(r => r.team_id === loserId);

    if (winnerRanking && loserRanking) {
      // Update winner's stats
      await supabase
        .from("ladder_rankings")
        .update({
          wins: winnerRanking.wins + 1,
          streak: winnerRanking.streak >= 0 ? winnerRanking.streak + 1 : 1,
          last_match_at: new Date().toISOString(),
          points: winnerRanking.points + 25,
        })
        .eq("id", winnerRanking.id);

      // Update loser's stats
      await supabase
        .from("ladder_rankings")
        .update({
          losses: loserRanking.losses + 1,
          streak: loserRanking.streak <= 0 ? loserRanking.streak - 1 : -1,
          last_match_at: new Date().toISOString(),
          points: Math.max(0, loserRanking.points - 10),
        })
        .eq("id", loserRanking.id);

      // If lower-ranked team won: winner takes loser's rank, everyone between shifts down by 1
      if (winnerRanking.rank > loserRanking.rank) {
        const winnerOldRank = winnerRanking.rank;
        const loserOldRank = loserRanking.rank;
        
        // Get all teams between the two ranks (exclusive of winner, inclusive of loser)
        const { data: teamsBetween } = await supabase
          .from("ladder_rankings")
          .select("id, rank")
          .gte("rank", loserOldRank)
          .lt("rank", winnerOldRank);
        
        // Shift all teams between down by 1 rank
        if (teamsBetween && teamsBetween.length > 0) {
          for (const team of teamsBetween) {
            await supabase
              .from("ladder_rankings")
              .update({ rank: team.rank + 1 })
              .eq("id", team.id);
          }
        }
        
        // Winner takes the loser's old rank
        await supabase
          .from("ladder_rankings")
          .update({ rank: loserOldRank })
          .eq("id", winnerRanking.id);
      }
    }
  };

  const handleDispute = async () => {
    if (!disputeReasonText.trim()) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for disputing the score.",
        variant: "destructive",
      });
      return;
    }

    setIsDisputing(true);
    try {
      const { error } = await supabase
        .from("matches")
        .update({
          score_disputed: true,
          dispute_reason: disputeReasonText,
          status: "in_progress", // Reset status to allow re-submission
          challenger_score: null,
          challenged_score: null,
          challenger_sets: [],
          challenged_sets: [],
          sets_won_challenger: null,
          sets_won_challenged: null,
          winner_team_id: null,
          completed_at: null,
          score_submitted_by: null,
          score_confirmed_by: null,
        })
        .eq("id", matchId);

      if (error) throw error;

      toast({
        title: "Score disputed",
        description: "The score has been disputed. The other team will need to re-submit.",
      });
      setDisputeDialogOpen(false);
      onConfirmed();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDisputing(false);
    }
  };

  if (isSubmitter) {
    return (
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="w-4 h-4" />
            <span>Waiting for opponent to confirm score: {formatSetScores()}</span>
          </div>
          {isDisputed && disputeReason && (
            <div className="mt-2 text-sm text-destructive">
              <strong>Disputed:</strong> {disputeReason}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Confirm Match Result</p>
                <p className="text-xs text-muted-foreground">
                  Your opponent submitted this score
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                <Trophy className="w-3 h-3 mr-1" />
                {challengerScore}-{challengedScore}
              </Badge>
            </div>

            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium">{challengerTeamName}</span>
                <span className="font-bold">{challengerScore}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{challengedTeamName}</span>
                <span className="font-bold">{challengedScore}</span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground text-center">
                Sets: {formatSetScores()}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setDisputeDialogOpen(true)}
              >
                <X className="w-4 h-4 mr-2" />
                Dispute
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={handleConfirm}
                disabled={isConfirming}
              >
                {isConfirming ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Confirm
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispute Score</DialogTitle>
            <DialogDescription>
              If the submitted score is incorrect, please explain what the correct score should be.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="e.g., The correct score was 6-4, 6-3 in my favor..."
            value={disputeReasonText}
            onChange={(e) => setDisputeReasonText(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDispute} disabled={isDisputing} variant="destructive">
              {isDisputing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <AlertTriangle className="w-4 h-4 mr-2" />
              )}
              Submit Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
