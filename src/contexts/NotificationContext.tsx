import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface NotificationCounts {
  incomingChallenges: number;
  scheduledMatches: number;
  ladderApprovals: number;
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
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);

  const fetchCounts = useCallback(async () => {
    if (!user) {
      setCounts({ incomingChallenges: 0, scheduledMatches: 0, ladderApprovals: 0, total: 0 });
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
        setCounts({ incomingChallenges: 0, scheduledMatches: 0, ladderApprovals: 0, total: 0 });
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
      if (acceptedChallenges && acceptedChallenges.length > 0) {
        const matchIds = acceptedChallenges.map(c => c.match_id).filter(Boolean);
        if (matchIds.length > 0) {
          const { count } = await supabase
            .from("matches")
            .select("*", { count: "exact", head: true })
            .in("id", matchIds)
            .not("scheduled_at", "is", null)
            .eq("status", "pending");
          scheduledCount = count || 0;
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
        total: (incomingCount || 0) + scheduledCount + (approvalCount || 0),
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
  }, [fetchCounts]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user || !userTeamId) return;

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "challenges",
        },
        () => {
          fetchCounts();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
        },
        () => {
          fetchCounts();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ladder_join_requests",
        },
        () => {
          fetchCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userTeamId, fetchCounts]);

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
