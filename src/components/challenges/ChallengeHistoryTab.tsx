import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, Trophy, Clock, X, Check, AlertCircle, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format, subDays, isAfter } from "date-fns";

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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

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

  // Apply filters
  const filteredChallenges = historyChallenges.filter(challenge => {
    // Status filter
    if (statusFilter !== "all" && challenge.status !== statusFilter) {
      return false;
    }

    // Date filter
    if (dateFilter !== "all") {
      const challengeDate = new Date(challenge.created_at);
      const now = new Date();
      
      switch (dateFilter) {
        case "7days":
          if (!isAfter(challengeDate, subDays(now, 7))) return false;
          break;
        case "30days":
          if (!isAfter(challengeDate, subDays(now, 30))) return false;
          break;
        case "90days":
          if (!isAfter(challengeDate, subDays(now, 90))) return false;
          break;
      }
    }

    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter:</span>
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
            <SelectItem value="90days">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>

        {(statusFilter !== "all" || dateFilter !== "all") && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              setStatusFilter("all");
              setDateFilter("all");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      <AnimatePresence mode="popLayout">
        {filteredChallenges.length === 0 ? (
          <Card className="text-center py-8">
            <CardContent>
              <History className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {historyChallenges.length === 0 
                  ? "No challenge history yet" 
                  : "No challenges match your filters"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredChallenges.map((challenge) => (
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
                          <span>•</span>
                          <span className="text-muted-foreground">
                            {format(new Date(challenge.created_at), "MMM d, yyyy")}
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
    </div>
  );
}
