import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Send, Trophy, Clock, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { ChallengeCardSkeleton } from "@/components/ui/skeleton-card";
import { Challenge, formatTimeAgo, enrichChallenges, mapChallenge } from "./challengeUtils";

interface OutgoingTabProps {
  userTeamId: string;
  refreshKey: number;
  onAction: () => void;
}

export function OutgoingTab({ userTeamId, refreshKey, onAction }: OutgoingTabProps) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const { data, error } = await supabase
      .from("challenges")
      .select("id, status, message, decline_reason, expires_at, created_at, match_id, challenger_team_id, challenged_team_id")
      .eq("challenger_team_id", userTeamId)
      .in("status", ["pending", "declined"])
      .order("created_at", { ascending: false });

    if (error) { logger.apiError("fetchOutgoingChallenges", error); return; }

    const { teamsMap, ranksMap, matchMap } = await enrichChallenges(data || []);
    setChallenges((data || []).map(c => mapChallenge(c, teamsMap, ranksMap, matchMap)));
    setIsLoading(false);
  }, [userTeamId]);

  useEffect(() => { fetchData(); }, [fetchData, refreshKey]);

  const handleCancel = async (challengeId: string) => {
    setRespondingTo(challengeId);
    try {
      const { error } = await supabase.from("challenges").update({ status: "cancelled" }).eq("id", challengeId);
      if (error) throw error;
      toast({ title: "Challenge cancelled", description: "Your challenge has been withdrawn." });
      onAction();
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setRespondingTo(null);
    }
  };

  if (isLoading) return <div className="space-y-3"><ChallengeCardSkeleton /><ChallengeCardSkeleton /></div>;

  if (challenges.length === 0) {
    return (
      <Card className="text-center py-8">
        <CardContent>
          <Send className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">No challenges sent</p>
          <Button asChild><Link to="/find-opponents">Find Opponents</Link></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {challenges.map((challenge) => (
        <div key={challenge.id} className="hero-animate">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">#{challenge.challenged_rank || "?"}</span>
                    <span className="font-semibold text-foreground truncate">{challenge.challenged_team?.name || "Unknown"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTimeAgo(challenge.created_at)}</span>
                    <Badge variant={challenge.status === "declined" ? "destructive" : "secondary"} className="text-xs">{challenge.status}</Badge>
                  </div>
                  {challenge.status === "declined" && challenge.decline_reason && (
                    <div className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-destructive flex-shrink-0" />
                      <span className="italic">"{challenge.decline_reason}"</span>
                    </div>
                  )}
                </div>
                {challenge.status === "pending" && (
                  <Button size="sm" variant="ghost" onClick={() => handleCancel(challenge.id)} disabled={respondingTo === challenge.id}>
                    {respondingTo === challenge.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancel"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
