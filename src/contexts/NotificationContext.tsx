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

      // Fetch all notification data in parallel
      const [
        { count: incomingCount },
        { data: acceptedChallenges },
        { count: approvalCount },
      ] = await Promise.all([
        supabase
          .from("challenges")
          .select("*", { count: "exact", head: true })
          .eq("challenged_team_id", teamId)
          .eq("status", "pending"),
        supabase
          .from("challenges")
          .select("match_id")
          .or(`challenger_team_id.eq.${teamId},challenged_team_id.eq.${teamId}`)
          .eq("status", "accepted"),
        supabase
          .from("ladder_join_requests")
          .select("*", { count: "exact", head: true })
          .eq("team_id", teamId)
          .eq("status", "approved"),
      ]);

      let scheduledCount = 0;
      let pendingConfirmationsCount = 0;
      
      if (acceptedChallenges && acceptedChallenges.length > 0) {
        const matchIds = acceptedChallenges.map(c => c.match_id).filter(Boolean);
        if (matchIds.length > 0) {
          // Fetch scheduled + pending confirmations in parallel
          const [{ count }, { data: pendingConfirmations }] = await Promise.all([
            supabase
              .from("matches")
              .select("*", { count: "exact", head: true })
              .in("id", matchIds)
              .not("scheduled_at", "is", null)
              .eq("status", "pending"),
            supabase
              .from("matches")
              .select("id, score_submitted_by")
              .in("id", matchIds)
              .not("score_submitted_by", "is", null)
              .is("score_confirmed_by", null)
              .eq("score_disputed", false),
          ]);
          scheduledCount = count || 0;
          pendingConfirmationsCount = (pendingConfirmations || []).filter(m => 
            m.score_submitted_by !== user.id
          ).length;
        }
      }

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
