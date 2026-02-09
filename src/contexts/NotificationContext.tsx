import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface NotificationCounts {
  incomingChallenges: number;
  scheduledMatches: number;
  ladderApprovals: number;
  pendingScoreConfirmations: number;
  total: number;
}

interface NotificationContextType {
  counts: NotificationCounts;
  isLoading: boolean;
  refresh: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [counts, setCounts] = useState<NotificationCounts>({
    incomingChallenges: 0,
    scheduledMatches: 0,
    ladderApprovals: 0,
    pendingScoreConfirmations: 0,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);

  const fetchCounts = useCallback(async () => {
    if (!user) {
      setCounts({ incomingChallenges: 0, scheduledMatches: 0, ladderApprovals: 0, pendingScoreConfirmations: 0, total: 0 });
      setIsLoading(false);
      return;
    }

    try {
      // Get user's team first
      const { data: memberData } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id)
        .maybeSingle();

      const teamId = memberData?.team_id;
      setUserTeamId(teamId || null);

      if (!teamId) {
        setCounts({ incomingChallenges: 0, scheduledMatches: 0, ladderApprovals: 0, pendingScoreConfirmations: 0, total: 0 });
        setIsLoading(false);
        return;
      }

      // Fetch incoming challenges (pending challenges where team is challenged)
      const { count: incomingCount } = await supabase
        .from("challenges")
        .select("*", { count: "exact", head: true })
        .eq("challenged_team_id", teamId)
        .eq("status", "pending");

      // Fetch scheduled matches (accepted challenges with scheduled_at set)
      const { data: acceptedChallenges } = await supabase
        .from("challenges")
        .select("match_id")
        .or(`challenger_team_id.eq.${teamId},challenged_team_id.eq.${teamId}`)
        .eq("status", "accepted");

      let scheduledCount = 0;
      let pendingConfirmationsCount = 0;
      
      if (acceptedChallenges && acceptedChallenges.length > 0) {
        const matchIds = acceptedChallenges.map(c => c.match_id).filter(Boolean);
        if (matchIds.length > 0) {
          // Count scheduled matches
          const { count } = await supabase
            .from("matches")
            .select("*", { count: "exact", head: true })
            .in("id", matchIds)
            .not("scheduled_at", "is", null)
            .eq("status", "pending");
          scheduledCount = count || 0;

          // Count pending score confirmations - matches where:
          // - score was submitted (score_submitted_by is set)
          // - not yet confirmed (score_confirmed_by is null)
          // - current user is NOT the one who submitted (they need to confirm)
          const { data: pendingConfirmations } = await supabase
            .from("matches")
            .select("id, score_submitted_by, challenger_team_id, challenged_team_id")
            .in("id", matchIds)
            .not("score_submitted_by", "is", null)
            .is("score_confirmed_by", null)
            .eq("score_disputed", false);
          
          // Filter to only count matches where WE need to confirm (we didn't submit)
          pendingConfirmationsCount = (pendingConfirmations || []).filter(m => 
            m.score_submitted_by !== user.id
          ).length;
        }
      }

      // Fetch ladder approvals (approved join requests for user's team)
      const { count: approvalCount } = await supabase
        .from("ladder_join_requests")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamId)
        .eq("status", "approved");

      const newCounts = {
        incomingChallenges: incomingCount || 0,
        scheduledMatches: scheduledCount,
        ladderApprovals: approvalCount || 0,
        pendingScoreConfirmations: pendingConfirmationsCount,
        total: (incomingCount || 0) + scheduledCount + (approvalCount || 0) + pendingConfirmationsCount,
      };

      setCounts(newCounts);
    } catch (error) {
      console.error("Error fetching notification counts:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCounts();

    // Poll every 60s instead of realtime on 3 tables (which triggered on ANY row change globally)
    const interval = setInterval(fetchCounts, 60000);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  return (
    <NotificationContext.Provider value={{ counts, isLoading, refresh: fetchCounts }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
