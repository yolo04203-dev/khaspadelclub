import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Users, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { isFuture, format } from "date-fns";
import { VirtualizedRankingsList } from "@/components/ladder/VirtualizedRankingsList";
import { LadderRowSkeleton } from "@/components/ui/skeleton-card";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { logger } from "@/lib/logger";
import { AdminModeIndicator } from "@/components/ladder/AdminRankingControls";

interface TeamMember {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface TeamRanking {
  id: string;
  rank: number;
  points: number;
  wins: number;
  losses: number;
  streak: number;
  team: {
    id: string;
    name: string;
    avatar_url: string | null;
    is_frozen?: boolean;
    frozen_until?: string | null;
    frozen_reason?: string | null;
  } | null;
  members: TeamMember[];
}

export default function LadderCategoryDetail() {
  const { id, categoryId } = useParams<{ id: string; categoryId: string }>();
  const { user, role } = useAuth();
  const [ladderName, setLadderName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState<string | null>(null);
  const [challengeRange, setChallengeRange] = useState(5);
  const [rankings, setRankings] = useState<TeamRanking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const [userTeamName, setUserTeamName] = useState<string | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userTeamMemberCount, setUserTeamMemberCount] = useState(0);
  const [challengingTeamId, setChallengingTeamId] = useState<string | null>(null);
  const [pendingChallenges, setPendingChallenges] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    if (!id || !categoryId) return;

    try {
      // Fetch everything in a single parallel batch — no waterfall
      const userMembershipPromise = user
        ? supabase.from("team_members").select("team_id, team:teams(id, name)").eq("user_id", user.id).maybeSingle()
        : Promise.resolve({ data: null });

      const [ladderResult, categoryResult, rankingsResult, userMembershipResult] = await Promise.all([
        supabase.from("ladders").select("name").eq("id", id).single(),
        supabase.from("ladder_categories").select("name, description, challenge_range").eq("id", categoryId).single(),
        supabase.from("ladder_rankings").select(`
          id, rank, points, wins, losses, streak,
          team:teams(id, name, avatar_url, is_frozen, frozen_until, frozen_reason)
        `).eq("ladder_category_id", categoryId).order("rank", { ascending: true }),
        userMembershipPromise,
      ]);

      if (ladderResult.error) throw ladderResult.error;
      if (categoryResult.error) throw categoryResult.error;
      if (rankingsResult.error) throw rankingsResult.error;

      setLadderName(ladderResult.data.name);
      setCategoryName(categoryResult.data.name);
      setCategoryDescription(categoryResult.data.description);
      setChallengeRange(categoryResult.data.challenge_range);

      const rankingsData = rankingsResult.data || [];
      const teamIds = rankingsData.map((r: any) => r.team?.id).filter(Boolean);

      // User team info (from parallel query above)
      const teamId = (userMembershipResult.data as any)?.team_id || null;
      setUserTeamId(teamId);
      setUserTeamName(((userMembershipResult.data as any)?.team as any)?.name || null);

      // Fetch members, profiles, and user-specific data ALL in parallel
      const [membersResult, memberCountResult, challengesResult] = await Promise.all([
        teamIds.length > 0
          ? supabase.from("team_members").select("team_id, user_id").in("team_id", teamIds)
          : Promise.resolve({ data: [] as { team_id: string; user_id: string }[] }),
        teamId
          ? supabase.from("team_members").select("*", { count: "exact", head: true }).eq("team_id", teamId)
          : Promise.resolve({ count: 0 }),
        teamId
          ? supabase.from("challenges").select("challenged_team_id").eq("challenger_team_id", teamId).eq("status", "pending")
          : Promise.resolve({ data: [] as { challenged_team_id: string }[] }),
      ]);

      const membersData = (membersResult as any).data || [];
      const userIds = [...new Set(membersData.map((m: any) => m.user_id))] as string[];

      let profilesMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
      if (userIds.length > 0) {
        const { data } = await supabase.from("public_profiles").select("user_id, display_name, avatar_url").in("user_id", userIds);
        (data || []).forEach(p => profilesMap.set(p.user_id!, p));
      }

      const builtRankings: TeamRanking[] = rankingsData.map((ranking: any) => {
        const team = ranking.team as TeamRanking["team"];
        let members = (membersData || [])
          .filter((m: any) => m.team_id === team?.id)
          .map((m: any) => {
            const profile = profilesMap.get(m.user_id);
            return { user_id: m.user_id, display_name: profile?.display_name || null, avatar_url: profile?.avatar_url || null };
          });

        if (team?.name?.includes(" & ") && members.length === 1) {
          const parts = team.name.split(" & ");
          const existingName = members[0]?.display_name?.toLowerCase();
          const partnerName = parts.find((p: string) => p.toLowerCase() !== existingName) || parts[1];
          if (partnerName) {
            members = [...members, { user_id: `manual-${team.id}`, display_name: partnerName.trim(), avatar_url: null }];
          }
        }

        return { id: ranking.id, rank: ranking.rank, points: ranking.points, wins: ranking.wins, losses: ranking.losses, streak: ranking.streak, team, members };
      });

      setRankings(builtRankings);

      if (teamId) {
        setUserTeamMemberCount((memberCountResult as any).count || 0);
        setPendingChallenges(new Set(((challengesResult as any).data || []).map((c: any) => c.challenged_team_id)));
        const userRanking = builtRankings.find(r => r.team?.id === teamId);
        setUserRank(userRanking?.rank ?? null);
      }
    } catch (error) {
      logger.apiError("fetchLadderCategoryDetail", error);
    } finally {
      setIsLoading(false);
    }
  }, [id, categoryId, user]);

  useEffect(() => {
    fetchData();

    if (!categoryId) return;
    const channel = supabase
      .channel(`ladder-cat-${categoryId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ladder_rankings", filter: `ladder_category_id=eq.${categoryId}` }, () => { fetchData(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData, categoryId]);

  const handleRefresh = useCallback(async () => { await fetchData(); }, [fetchData]);

  const isTeamFrozen = (team: TeamRanking["team"]): boolean => {
    if (!team) return false;
    return !!team.is_frozen && !!team.frozen_until && isFuture(new Date(team.frozen_until));
  };

  const getFrozenUntilDate = (team: TeamRanking["team"]): string | null => {
    if (!team || !team.frozen_until) return null;
    return format(new Date(team.frozen_until), "MMM d");
  };

  const canChallenge = (targetRank: number, targetTeamId: string, _categoryId: string, team: TeamRanking["team"]): boolean => {
    if (!userTeamId || userRank == null) return false;
    if (targetTeamId === userTeamId) return false;
    if (pendingChallenges.has(targetTeamId)) return false;
    if (isTeamFrozen(team)) return false;
    const hasManualPartner = userTeamName?.includes(" & ") ?? false;
    if (userTeamMemberCount < 2 && !hasManualPartner) return false;
    return targetRank < userRank && userRank - targetRank <= challengeRange;
  };

  const handleChallenge = async (targetTeamId: string, targetTeamName: string) => {
    if (!userTeamId || !categoryId) return;
    setChallengingTeamId(targetTeamId);
    try {
      const { error } = await supabase.from("challenges").insert({
        challenger_team_id: userTeamId,
        challenged_team_id: targetTeamId,
        ladder_category_id: categoryId,
      });
      if (error) throw error;
      setPendingChallenges(prev => new Set([...prev, targetTeamId]));
      toast({ title: "Challenge sent!", description: `You have challenged ${targetTeamName}. Waiting for their response.` });
    } catch (error: any) {
      toast({ title: "Failed to send challenge", description: error.message, variant: "destructive" });
    } finally {
      setChallengingTeamId(null);
    }
  };

  const isAdmin = role === "admin" || role === "super_admin";

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background">
        <header className="border-b border-border bg-card sticky top-0 z-40 safe-top">
          <div className="container flex items-center h-16">
            <Button variant="ghost" size="icon" asChild>
              <Link to={`/ladders/${id}`}><ArrowLeft className="w-4 h-4" /></Link>
            </Button>
            <Logo size="sm" showImage={false} className="ml-4" />
          </div>
        </header>
        <main className="container py-6 sm:py-8">
          <div className="mb-6 text-center">
            <div className="h-10 w-48 bg-muted rounded mx-auto mb-2 animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded mx-auto animate-pulse" />
          </div>
          <div className="space-y-3">
            <LadderRowSkeleton /><LadderRowSkeleton /><LadderRowSkeleton /><LadderRowSkeleton /><LadderRowSkeleton />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-40 safe-top">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to={`/ladders/${id}`}><ArrowLeft className="w-4 h-4" /></Link>
            </Button>
            <Logo size="sm" showImage={false} />
          </div>
          {isAdmin && (
            <Button variant="outline" size="icon" className="sm:w-auto sm:px-4" asChild>
              <Link to={`/ladders/${id}/manage`}>
                <Settings className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Manage</span>
              </Link>
            </Button>
          )}
        </div>
      </header>

      <PullToRefresh onRefresh={handleRefresh} className="min-h-[calc(100dvh-4rem)]">
        <main className="container py-6 sm:py-8 pb-safe-nav sm:pb-8">
          <div className="animate-fade-in">
            <div className="mb-6 sm:mb-8 text-center">
              <p className="text-sm text-muted-foreground mb-1">{ladderName}</p>
              <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2">{categoryName}</h1>
              {categoryDescription && <p className="text-sm sm:text-base text-muted-foreground">{categoryDescription}</p>}
              <div className="mt-3 flex justify-center">
                <AdminModeIndicator isAdmin={isAdmin} />
              </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8 max-w-md mx-auto">
              <Card className="text-center">
                <CardContent className="pt-3 pb-3 sm:pt-4 sm:pb-4">
                  <div className="text-xl sm:text-2xl font-bold text-foreground">{rankings.length}</div>
                  <div className="text-xs text-muted-foreground">Teams</div>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-3 pb-3 sm:pt-4 sm:pb-4">
                  <div className="text-xl sm:text-2xl font-bold text-foreground">
                    {rankings.reduce((sum, r) => sum + r.wins + r.losses, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Matches</div>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-3 pb-3 sm:pt-4 sm:pb-4">
                  <div className="text-xl sm:text-2xl font-bold text-foreground">{challengeRange}</div>
                  <div className="text-xs text-muted-foreground">Challenge Range</div>
                </CardContent>
              </Card>
            </div>

            {/* Rankings List */}
            {rankings.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No teams yet</h3>
                  <p className="text-muted-foreground">Be the first to join this category!</p>
                </CardContent>
              </Card>
            ) : (
              <VirtualizedRankingsList
                rankings={rankings}
                categoryId={categoryId!}
                userTeamId={userTeamId}
                user={user}
                isTeamFrozen={isTeamFrozen}
                getFrozenUntilDate={getFrozenUntilDate}
                canChallenge={canChallenge}
                handleChallenge={handleChallenge}
                challengingTeamId={challengingTeamId}
                pendingChallenges={pendingChallenges}
                isAdmin={isAdmin}
                onAdminRankChanged={fetchData}
              />
            )}
          </div>
        </main>
      </PullToRefresh>
    </div>
  );
}
