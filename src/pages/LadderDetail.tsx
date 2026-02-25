import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Trophy, ArrowLeft, Users, TrendingDown, Flame, Swords, Loader2, Settings, Snowflake, Clock, ChevronDown, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { isFuture, format } from "date-fns";
import { JoinLadderDialog } from "@/components/ladder/JoinLadderDialog";
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

interface LadderCategory {
  id: string;
  name: string;
  description: string | null;
  challenge_range: number;
  rankings: TeamRanking[];
}

interface Ladder {
  id: string;
  name: string;
  description: string | null;
  status: string;
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Trophy className="w-5 h-5 text-rank-gold" />;
  if (rank === 2) return <Trophy className="w-5 h-5 text-rank-silver" />;
  if (rank === 3) return <Trophy className="w-5 h-5 text-rank-bronze" />;
  return <span className="text-muted-foreground font-mono">#{rank}</span>;
}

function getStreakDisplay(streak: number) {
  if (streak === 0) return null;
  if (streak > 0) {
    return (
      <div className="flex items-center gap-1 text-ladder-up">
        <Flame className="w-4 h-4" />
        <span className="text-sm font-medium">{streak}W</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-ladder-down">
      <TrendingDown className="w-4 h-4" />
      <span className="text-sm font-medium">{Math.abs(streak)}L</span>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const baseClasses = "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-bold text-base sm:text-lg";

  if (rank === 1) {
    return (
      <div className={cn(baseClasses, "bg-rank-gold/20 text-rank-gold border-2 border-rank-gold/30")}>
        {getRankIcon(rank)}
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className={cn(baseClasses, "bg-rank-silver/20 text-rank-silver border-2 border-rank-silver/30")}>
        {getRankIcon(rank)}
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className={cn(baseClasses, "bg-rank-bronze/20 text-rank-bronze border-2 border-rank-bronze/30")}>
        {getRankIcon(rank)}
      </div>
    );
  }
  return (
    <div className={cn(baseClasses, "bg-muted text-muted-foreground")}>
      {rank}
    </div>
  );
}

export default function LadderDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const [ladder, setLadder] = useState<Ladder | null>(null);
  const [categories, setCategories] = useState<LadderCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const [userRanksByCategory, setUserRanksByCategory] = useState<Map<string, number>>(new Map());
  const [challengingTeamId, setChallengingTeamId] = useState<string | null>(null);
  const [pendingChallenges, setPendingChallenges] = useState<Set<string>>(new Set());
  const [userTeamName, setUserTeamName] = useState<string | null>(null);
  const [pendingJoinRequests, setPendingJoinRequests] = useState<Set<string>>(new Set());
  const [isInLadder, setIsInLadder] = useState(false);
  const [userTeamMemberCount, setUserTeamMemberCount] = useState(0);

  const fetchLadderData = async () => {
    if (!id) return;

    try {
      // Fetch ladder with only needed columns
      const { data: ladderData, error: ladderError } = await supabase
        .from("ladders")
        .select("id, name, description, status")
        .eq("id", id)
        .single();

      if (ladderError) throw ladderError;
      setLadder(ladderData);

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("ladder_categories")
        .select("id, name, description, challenge_range, entry_fee, entry_fee_currency")
        .eq("ladder_id", id)
        .order("display_order", { ascending: true });

      if (categoriesError) throw categoriesError;

      if (!categoriesData || categoriesData.length === 0) {
        setCategories([]);
        setIsLoading(false);
        return;
      }

      // Set default active category
      if (!activeCategory && categoriesData.length > 0) {
        setActiveCategory(categoriesData[0].id);
      }

      // Fetch rankings for all categories
      const categoryIds = categoriesData.map((c) => c.id);
      const { data: rankingsData, error: rankingsError } = await supabase
        .from("ladder_rankings")
        .select(`
          id,
          rank,
          points,
          wins,
          losses,
          streak,
          ladder_category_id,
          team:teams (
            id,
            name,
            avatar_url,
            is_frozen,
            frozen_until,
            frozen_reason
          )
        `)
        .in("ladder_category_id", categoryIds)
        .order("rank", { ascending: true });

      if (rankingsError) throw rankingsError;

      // Get all team IDs
      const teamIds = rankingsData?.map((r) => (r.team as any)?.id).filter(Boolean) || [];

      // Fetch team members (only for teams already in this ladder)
      let membersData: { team_id: string; user_id: string }[] = [];
      if (teamIds.length > 0) {
        const { data, error } = await supabase
          .from("team_members")
          .select("team_id, user_id")
          .in("team_id", teamIds);

        if (error) throw error;
        membersData = data || [];
      }

      // Get user IDs and fetch profiles
      const userIds = [...new Set(membersData.map((m) => m.user_id))];
      let profilesData: { user_id: string; display_name: string | null; avatar_url: string | null }[] = [];
      if (userIds.length > 0) {
        const { data, error } = await supabase
          .from("public_profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);

        if (error) throw error;
        profilesData = data || [];
      }

      const profilesMap = new Map(profilesData?.map((p) => [p.user_id, p]) || []);

      // Build categories with rankings
      const categoriesWithRankings: LadderCategory[] = categoriesData.map((cat) => {
        const catRankings = (rankingsData || [])
          .filter((r) => r.ladder_category_id === cat.id)
          .map((ranking) => {
            const team = ranking.team as TeamRanking["team"];
            const teamMembers = (membersData || [])
              .filter((m) => m.team_id === team?.id)
              .map((m) => {
                const profile = profilesMap.get(m.user_id);
                return {
                  user_id: m.user_id,
                  display_name: profile?.display_name || null,
                  avatar_url: profile?.avatar_url || null,
                };
              });

            // If team has a manual partner (name format "Player1 & Player2")
            // and only one real member, add synthetic member for the partner
            let finalMembers = teamMembers;
            if (team?.name?.includes(" & ") && teamMembers.length === 1) {
              const parts = team.name.split(" & ");
              const existingName = teamMembers[0]?.display_name?.toLowerCase();
              const partnerName = parts.find(p => p.toLowerCase() !== existingName) || parts[1];
              if (partnerName) {
                finalMembers = [
                  ...teamMembers,
                  { user_id: `manual-${team.id}`, display_name: partnerName.trim(), avatar_url: null },
                ];
              }
            }

            return {
              id: ranking.id,
              rank: ranking.rank,
              points: ranking.points,
              wins: ranking.wins,
              losses: ranking.losses,
              streak: ranking.streak,
              team,
              members: finalMembers,
            };
          });

        return {
          ...cat,
          rankings: catRankings,
        };
      });

      setCategories(categoriesWithRankings);

      // Check user's team
      if (user) {
        // IMPORTANT: user team membership is independent of ladder rankings.
        // If the user's team is not ranked yet, it won't appear in `membersData`.
        const { data: userMembership, error: userMembershipError } = await supabase
          .from("team_members")
          .select(
            `
              team_id,
              team:teams (
                id,
                name
              )
            `
          )
          .eq("user_id", user.id)
          .maybeSingle();

        if (userMembershipError) throw userMembershipError;

        const teamId = (userMembership as any)?.team_id || null;
        setUserTeamId(teamId);
        setUserTeamName(((userMembership as any)?.team as any)?.name || null);

        if (teamId) {
          // Fetch team member count
          const { count: memberCount } = await supabase
            .from("team_members")
            .select("*", { count: "exact", head: true })
            .eq("team_id", teamId);
          setUserTeamMemberCount(memberCount || 0);

          // Build a map of category_id -> rank for the user's team
          const rankMap = new Map<string, number>();
          (rankingsData || [])
            .filter((r) => (r.team as any)?.id === teamId)
            .forEach((r) => {
              if (r.ladder_category_id) rankMap.set(r.ladder_category_id, r.rank);
            });
          setUserRanksByCategory(rankMap);
          setIsInLadder(rankMap.size > 0);

          // Fetch pending challenges
          const { data: challenges } = await supabase
            .from("challenges")
            .select("challenged_team_id")
            .eq("challenger_team_id", teamId)
            .eq("status", "pending");

          setPendingChallenges(new Set(challenges?.map((c) => c.challenged_team_id) || []));

          // Fetch pending join requests for this team
          const { data: joinRequests } = await supabase
            .from("ladder_join_requests")
            .select("ladder_category_id")
            .eq("team_id", teamId)
            .eq("status", "pending")
            .in("ladder_category_id", categoryIds);

          // Combine pending requests with already-ranked categories
          const rankedCategoryIds = (rankingsData || [])
            .filter((r) => (r.team as any)?.id === teamId)
            .map((r) => r.ladder_category_id);
          const pendingRequestIds = joinRequests?.map((r) => r.ladder_category_id) || [];
          setPendingJoinRequests(new Set([...pendingRequestIds, ...rankedCategoryIds]));
        } else {
          setIsInLadder(false);
          setUserTeamName(null);
          setPendingJoinRequests(new Set());
        }
      }
    } catch (error) {
      logger.apiError("fetchLadder", error);
    } finally {
      setIsLoading(false);
    }
  };

  const activeCategoryData = categories.find((c) => c.id === activeCategory);

  const isTeamFrozen = (team: TeamRanking["team"]): boolean => {
    if (!team) return false;
    return !!team.is_frozen && !!team.frozen_until && isFuture(new Date(team.frozen_until));
  };

  const getFrozenUntilDate = (team: TeamRanking["team"]): string | null => {
    if (!team || !team.frozen_until) return null;
    return format(new Date(team.frozen_until), "MMM d");
  };

  const canChallenge = (targetRank: number, targetTeamId: string, categoryId: string, team: TeamRanking["team"]): boolean => {
    if (!userTeamId) return false;
    const userRankInCategory = userRanksByCategory.get(categoryId);
    if (userRankInCategory == null) return false;
    if (targetTeamId === userTeamId) return false;
    if (pendingChallenges.has(targetTeamId)) return false;
    if (isTeamFrozen(team)) return false;
    // Teams with manually-added partners (name format "Player1 & Player2") count as complete
    const hasManualPartner = userTeamName?.includes(" & ") ?? false;
    if (userTeamMemberCount < 2 && !hasManualPartner) return false;
    const catData = categories.find((c) => c.id === categoryId);
    const challengeRange = catData?.challenge_range || 5;
    return targetRank < userRankInCategory && userRankInCategory - targetRank <= challengeRange;
  };

  const handleChallenge = async (targetTeamId: string, targetTeamName: string) => {
    if (!userTeamId || !activeCategory) return;

    setChallengingTeamId(targetTeamId);

    try {
      const { error } = await supabase.from("challenges").insert({
        challenger_team_id: userTeamId,
        challenged_team_id: targetTeamId,
        ladder_category_id: activeCategory,
      });

      if (error) throw error;

      setPendingChallenges((prev) => new Set([...prev, targetTeamId]));

      toast({
        title: "Challenge sent!",
        description: `You have challenged ${targetTeamName}. Waiting for their response.`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to send challenge",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setChallengingTeamId(null);
    }
  };

  const isAdmin = role === "admin" || role === "super_admin";

  useEffect(() => {
    fetchLadderData();

    // Subscribe to realtime ranking changes for instant admin edit sync
    if (!id) return;
    const channel = supabase
      .channel(`ladder-rankings-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ladder_rankings" },
        () => {
          fetchLadderData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user]);

  const handleRefresh = useCallback(async () => {
    await fetchLadderData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background">
        <header className="border-b border-border bg-card sticky top-0 z-40 safe-top">
          <div className="container flex items-center h-16">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/ladders">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <Logo size="sm" className="ml-4" />
          </div>
        </header>
        <main className="container py-6 sm:py-8">
          <div className="mb-6 sm:mb-8 text-center">
            <div className="h-10 w-48 bg-muted rounded mx-auto mb-2 animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded mx-auto animate-pulse" />
          </div>
          <div className="space-y-3">
            <LadderRowSkeleton />
            <LadderRowSkeleton />
            <LadderRowSkeleton />
            <LadderRowSkeleton />
            <LadderRowSkeleton />
          </div>
        </main>
      </div>
    );
  }

  if (!ladder) {
    return (
      <div className="min-h-dvh bg-background">
        <header className="border-b border-border bg-card safe-top">
          <div className="container flex items-center h-16">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/ladders">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <Logo size="sm" className="ml-4" />
          </div>
        </header>
        <main className="container py-8">
          <Card className="text-center py-12">
            <CardContent>
              <h2 className="text-xl font-semibold">Ladder not found</h2>
              <p className="text-muted-foreground mt-2">The ladder you're looking for doesn't exist.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40 safe-top">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/ladders">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <Logo size="sm" />
          </div>

          <div className="flex items-center gap-2">
            {/* Join Ladder Button - show if user has a team and there are available categories */}
            {user && userTeamId && categories.length > 0 && (
              <JoinLadderDialog
                categories={categories}
                teamId={userTeamId}
                teamName={userTeamName || "Your Team"}
                existingRequests={pendingJoinRequests}
                onRequestSubmitted={fetchLadderData}
                teamMemberCount={userTeamMemberCount}
              />
            )}

            {(role === "admin" || role === "super_admin") && (
              <Button variant="outline" size="icon" className="sm:w-auto sm:px-4" asChild>
                <Link to={`/ladders/${id}/manage`}>
                  <Settings className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Manage</span>
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <PullToRefresh onRefresh={handleRefresh} className="min-h-[calc(100dvh-4rem)]">
        <main className="container py-6 sm:py-8 pb-safe-nav sm:pb-8">
          <div className="animate-fade-in">
            {/* Ladder Header */}
            <div className="mb-6 sm:mb-8 text-center">
              <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2">{ladder.name}</h1>
              <p className="text-sm sm:text-base text-muted-foreground">{ladder.description || "Compete and climb the rankings"}</p>
              <div className="mt-3 flex justify-center">
                <AdminModeIndicator isAdmin={isAdmin} />
              </div>
            </div>

          {/* Categories Tabs */}
          {categories.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No categories yet</h3>
                <p className="text-muted-foreground">
                  {(role === "admin" || role === "super_admin")
                    ? "Add categories to this ladder to get started."
                    : "This ladder has no categories configured yet."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Tabs value={activeCategory || undefined} onValueChange={setActiveCategory}>
              <TabsList className="grid w-full max-w-md mx-auto mb-6 overflow-x-auto" style={{ gridTemplateColumns: `repeat(${categories.length}, 1fr)` }}>
                {categories.map((cat) => (
                  <TabsTrigger key={cat.id} value={cat.id} className="text-xs sm:text-sm">
                    {cat.name}
                    <Badge variant="secondary" className="ml-1 sm:ml-2 text-[10px] sm:text-xs">
                      {cat.rankings.length}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>

              {categories.map((category) => (
                <TabsContent key={category.id} value={category.id}>
                  {category.description && (
                    <p className="text-center text-muted-foreground mb-6">{category.description}</p>
                  )}

                  {/* Stats Bar */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8 max-w-md mx-auto">
                    <Card className="text-center">
                      <CardContent className="pt-3 pb-3 sm:pt-4 sm:pb-4">
                        <div className="text-xl sm:text-2xl font-bold text-foreground">{category.rankings.length}</div>
                        <div className="text-xs text-muted-foreground">Teams</div>
                      </CardContent>
                    </Card>
                    <Card className="text-center">
                      <CardContent className="pt-3 pb-3 sm:pt-4 sm:pb-4">
                        <div className="text-xl sm:text-2xl font-bold text-foreground">
                          {category.rankings.reduce((sum, r) => sum + r.wins + r.losses, 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">Matches</div>
                      </CardContent>
                    </Card>
                    <Card className="text-center">
                      <CardContent className="pt-3 pb-3 sm:pt-4 sm:pb-4">
                        <div className="text-xl sm:text-2xl font-bold text-foreground">{category.challenge_range}</div>
                        <div className="text-xs text-muted-foreground">Challenge Range</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Rankings List */}
                  {category.rankings.length === 0 ? (
                    <Card className="text-center py-12">
                      <CardContent>
                        <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">No teams yet</h3>
                        <p className="text-muted-foreground">Be the first to join this category!</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <VirtualizedRankingsList
                      rankings={category.rankings}
                      categoryId={category.id}
                      userTeamId={userTeamId}
                      user={user}
                      isTeamFrozen={isTeamFrozen}
                      getFrozenUntilDate={getFrozenUntilDate}
                      canChallenge={canChallenge}
                      handleChallenge={handleChallenge}
                      challengingTeamId={challengingTeamId}
                      pendingChallenges={pendingChallenges}
                      isAdmin={isAdmin}
                      onAdminRankChanged={fetchLadderData}
                    />
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </main>
    </PullToRefresh>
    </div>
  );
}
