import { motion, AnimatePresence } from "framer-motion";
import { History, Trophy, Clock, X, Check, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Challenge {
  id: string;
  status: string;
  message: string | null;
  decline_reason: string | null;
  expires_at: string;
  created_at: string;
  match_id: string | null;
  match_status: string | null;
  match_scheduled_at: string | null;
  match_venue: string | null;
  challenger_team: {
    id: string;
    name: string;
  } | null;
  challenged_team: {
    id: string;
    name: string;
  } | null;
  challenger_rank: number | null;
  challenged_rank: number | null;
  winner_team_id?: string | null;
  challenger_score?: number | null;
  challenged_score?: number | null;
}

interface ChallengeHistoryTabProps {
  historyChallenges: Challenge[];
  userTeamId: string;
}

export function ChallengeHistoryTab({ historyChallenges, userTeamId }: ChallengeHistoryTabProps) {
  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return "Just now";
  };

  const getOpponentName = (challenge: Challenge) => {
    return challenge.challenger_team?.id === userTeamId 
      ? challenge.challenged_team?.name 
      : challenge.challenger_team?.name;
  };

  const isChallenger = (challenge: Challenge) => {
    return challenge.challenger_team?.id === userTeamId;
  };

  const getResultBadge = (challenge: Challenge) => {
    if (challenge.status === "declined") {
      return (
        <Badge variant="destructive" className="text-xs">
          <X className="w-3 h-3 mr-1" />
          Declined
        </Badge>
      );
    }
    if (challenge.status === "cancelled") {
      return (
        <Badge variant="secondary" className="text-xs">
          Cancelled
        </Badge>
      );
    }
    if (challenge.status === "expired") {
      return (
        <Badge variant="secondary" className="text-xs">
          <Clock className="w-3 h-3 mr-1" />
          Expired
        </Badge>
      );
    }
    if (challenge.match_status === "completed") {
      const didWin = challenge.winner_team_id === userTeamId;
      const myScore = isChallenger(challenge) ? challenge.challenger_score : challenge.challenged_score;
      const theirScore = isChallenger(challenge) ? challenge.challenged_score : challenge.challenger_score;
      return (
        <Badge 
          variant={didWin ? "default" : "destructive"} 
          className={cn(
            "text-xs",
            didWin && "bg-accent text-accent-foreground"
          )}
        >
          {didWin ? (
            <Check className="w-3 h-3 mr-1" />
          ) : (
            <X className="w-3 h-3 mr-1" />
          )}
          {didWin ? "Won" : "Lost"} {myScore}-{theirScore}
        </Badge>
      );
    }
    return null;
  };

  return (
    <AnimatePresence mode="popLayout">
      {historyChallenges.length === 0 ? (
        <Card className="text-center py-8">
          <CardContent>
            <History className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No challenge history yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {historyChallenges.map((challenge) => (
            <motion.div
              key={challenge.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="opacity-90">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Trophy className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold text-foreground truncate">
                          vs {getOpponentName(challenge)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(challenge.created_at)}
                        </span>
                        <span className="text-muted-foreground">
                          {isChallenger(challenge) ? "You challenged" : "They challenged"}
                        </span>
                      </div>
                      {/* Show decline reason if available */}
                      {challenge.status === "declined" && challenge.decline_reason && (
                        <div className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                          <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-destructive" />
                          <span className="italic">"{challenge.decline_reason}"</span>
                        </div>
                      )}
                    </div>
                    {getResultBadge(challenge)}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
