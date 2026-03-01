import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Swords, Inbox, Send, Target, History, Snowflake } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { ChallengeCardSkeleton } from "@/components/ui/skeleton-card";
import { isFuture, format } from "date-fns";
import { IncomingTab } from "@/components/challenges/IncomingTab";
import { OutgoingTab } from "@/components/challenges/OutgoingTab";
import { ActiveTab } from "@/components/challenges/ActiveTab";
import { ChallengeHistoryTab } from "@/components/challenges/ChallengeHistoryTab";
import type { UserTeam } from "@/components/challenges/challengeUtils";

export default function Challenges() {
  const { user } = useAuth();
  const [userTeam, setUserTeam] = useState<UserTeam | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchUserTeam = useCallback(async () => {
    if (!user) return null;

    const { data: memberData } = await supabase
      .from("team_members")
      .select("team_id, is_captain")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!memberData) return null;

    const [{ data: teamData }, { data: rankData }] = await Promise.all([
      supabase.from("teams").select("id, name, is_frozen, frozen_until, frozen_reason").eq("id", memberData.team_id).single(),
      supabase.from("ladder_rankings").select("rank").eq("team_id", memberData.team_id).order("rank", { ascending: true }).limit(1).maybeSingle(),
    ]);

    if (!teamData) return null;

    return {
      id: teamData.id,
      name: teamData.name,
      rank: rankData?.rank || null,
      is_captain: memberData.is_captain ?? false,
      is_frozen: teamData.is_frozen ?? false,
      frozen_until: teamData.frozen_until,
      frozen_reason: teamData.frozen_reason,
    };
  }, [user]);

  useEffect(() => {
    fetchUserTeam().then(team => {
      setUserTeam(team);
      setIsLoading(false);
    });
  }, [fetchUserTeam]);

  const isTeamFrozen = userTeam?.is_frozen && userTeam?.frozen_until && isFuture(new Date(userTeam.frozen_until));

  const bumpRefresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const handleRefresh = useCallback(async () => {
    const team = await fetchUserTeam();
    setUserTeam(team);
    bumpRefresh();
  }, [fetchUserTeam, bumpRefresh]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader showBack />
        <main className="container py-4 sm:py-8 max-w-2xl">
          <div className="mb-5 sm:mb-8 text-center">
            <div className="h-8 w-40 bg-muted rounded mx-auto mb-2 animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded mx-auto animate-pulse" />
          </div>
          <div className="space-y-3">
            <ChallengeCardSkeleton />
            <ChallengeCardSkeleton />
            <ChallengeCardSkeleton />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        showBack
        actions={
          userTeam && (
            <Button asChild className="hidden sm:inline-flex">
              <Link to="/find-opponents">
                <Swords className="w-4 h-4 mr-2" />
                Find Opponents
              </Link>
            </Button>
          )
        }
      />

      <PullToRefresh onRefresh={handleRefresh} className="min-h-[calc(100dvh-4rem)]">
        <main className="container py-4 sm:py-8 max-w-2xl pb-safe-nav sm:pb-8">
          <div className="hero-animate">
            <div className="mb-6 sm:mb-8 text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Challenges</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Manage your incoming and outgoing ladder challenges
              </p>
            </div>

            {isTeamFrozen && userTeam && (
              <Alert className="mb-6">
                <Snowflake className="h-4 w-4" />
                <AlertDescription className="flex items-center gap-2">
                  <span>
                    Your team is frozen until{" "}
                    <strong>{format(new Date(userTeam.frozen_until!), "MMMM d, yyyy")}</strong>.
                    {userTeam.frozen_reason && ` Reason: ${userTeam.frozen_reason}.`}
                    {" "}You cannot be challenged during this time.
                  </span>
                </AlertDescription>
              </Alert>
            )}

            {!userTeam ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Swords className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Join a team first</h3>
                  <p className="text-muted-foreground mb-4">You need to be on a team to send or receive challenges.</p>
                  <Button asChild><Link to="/teams/create">Create Team</Link></Button>
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="incoming" className="w-full">
                <TabsList className="flex w-full overflow-x-auto mb-5 sm:mb-6">
                  <TabsTrigger value="incoming" className="relative min-h-[44px]">
                    <Inbox className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="sm:hidden">In</span>
                    <span className="hidden sm:inline">Incoming</span>
                  </TabsTrigger>
                  <TabsTrigger value="outgoing" className="min-h-[44px]">
                    <Send className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="sm:hidden">Out</span>
                    <span className="hidden sm:inline">Outgoing</span>
                  </TabsTrigger>
                  <TabsTrigger value="accepted" className="relative min-h-[44px]">
                    <Target className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="sm:hidden">Active</span>
                    <span className="hidden sm:inline">Active</span>
                  </TabsTrigger>
                  <TabsTrigger value="history" className="min-h-[44px]">
                    <History className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="sm:hidden">Hist</span>
                    <span className="hidden sm:inline">History</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="incoming">
                  <IncomingTab userTeamId={userTeam.id} userTeam={userTeam} refreshKey={refreshKey} onAction={bumpRefresh} />
                </TabsContent>
                <TabsContent value="outgoing">
                  <OutgoingTab userTeamId={userTeam.id} refreshKey={refreshKey} onAction={bumpRefresh} />
                </TabsContent>
                <TabsContent value="accepted">
                  <ActiveTab userTeamId={userTeam.id} userTeam={userTeam} refreshKey={refreshKey} onAction={bumpRefresh} />
                </TabsContent>
                <TabsContent value="history">
                  <ChallengeHistoryTab userTeamId={userTeam.id} refreshKey={refreshKey} />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </main>
      </PullToRefresh>
    </div>
  );
}
