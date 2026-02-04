import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ArrowLeft, Users, TrendingDown, Flame, Swords, Loader2, Settings, Snowflake, Clock } from "lucide-react";
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
import { isFuture, format } from "date-fns";
import { JoinLadderDialog } from "@/components/ladder/JoinLadderDialog";

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
  const baseClasses = "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg";

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
  const [userCategoryId, setUserCategoryId] = useState<string | null>(null);
  const [userTeamRank, setUserTeamRank] = useState<number | null>(null);
  const [challengingTeamId, setChallengingTeamId] = useState<string | null>(null);
  const [pendingChallenges, setPendingChallenges] = useState<Set<string>>(new Set());
  const [userTeamName, setUserTeamName] = useState<string | null>(null);
  const [pendingJoinRequests, setPendingJoinRequests] = useState<Set<string>>(new Set());
  const [isInLadder, setIsInLadder] = useState(false);

  const fetchLadderData = async () => {
    if (!id) return;

    try {
      // Fetch ladder
      const { data: ladderData, error: ladderError } = await supabase
        .from("ladders")
        .select("*")
        .eq("id", id)
        .single();

      if (ladderError) throw ladderError;
      setLadder(ladderData);

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("ladder_categories")
        .select("*")
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
          .from("profiles")
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

            return {
              id: ranking.id,
              rank: ranking.rank,
              points: ranking.points,
              wins: ranking.wins,
              losses: ranking.losses,
              streak: ranking.streak,
              team,
              members: teamMembers,
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
          const userRanking = rankingsData?.find((r) => (r.team as any)?.id === teamId);
          setUserTeamRank(userRanking?.rank || null);
          setUserCategoryId(userRanking?.ladder_category_id || null);
          setIsInLadder(!!userRanking);

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

          setPendingJoinRequests(new Set(joinRequests?.map((r) => r.ladder_category_id) || []));
        } else {
          setIsInLadder(false);
          setUserTeamName(null);
          setPendingJoinRequests(new Set());
        }
      }
    } catch (error) {
      console.error("Error fetching ladder:", error);
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
    if (!userTeamId || !userTeamRank || !userCategoryId) return false;
    if (userCategoryId !== categoryId) return false;
    if (targetTeamId === userTeamId) return false;
    if (pendingChallenges.has(targetTeamId)) return false;
    if (isTeamFrozen(team)) return false;
    const challengeRange = activeCategoryData?.challenge_range || 5;
    return targetRank < userTeamRank && userTeamRank - targetRank <= challengeRange;
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

  useEffect(() => {
    fetchLadderData();
  }, [id, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ladder) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
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
            {/* Join Ladder Button - show if user has a team but is not in any category of this ladder */}
            {user && userTeamId && !isInLadder && categories.length > 0 && (
              <>
                {pendingJoinRequests.size > 0 ? (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Request Pending
                  </Badge>
                ) : (
                  <JoinLadderDialog
                    categories={categories}
                    teamId={userTeamId}
                    teamName={userTeamName || "Your Team"}
                    existingRequests={pendingJoinRequests}
                    onRequestSubmitted={fetchLadderData}
                  />
                )}
              </>
            )}

            {role === "admin" && (
              <Button variant="outline" asChild>
                <Link to={`/ladders/${id}/manage`}>
                  <Settings className="w-4 h-4 mr-2" />
                  Manage
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Ladder Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-foreground mb-2">{ladder.name}</h1>
            <p className="text-muted-foreground">{ladder.description || "Compete and climb the rankings"}</p>
          </div>

          {/* Categories Tabs */}
          {categories.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No categories yet</h3>
                <p className="text-muted-foreground">
                  {role === "admin"
                    ? "Add categories to this ladder to get started."
                    : "This ladder has no categories configured yet."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Tabs value={activeCategory || undefined} onValueChange={setActiveCategory}>
              <TabsList className="grid w-full max-w-md mx-auto mb-6" style={{ gridTemplateColumns: `repeat(${categories.length}, 1fr)` }}>
                {categories.map((cat) => (
                  <TabsTrigger key={cat.id} value={cat.id}>
                    {cat.name}
                    <Badge variant="secondary" className="ml-2">
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
                  <div className="grid grid-cols-3 gap-4 mb-8 max-w-md mx-auto">
                    <Card className="text-center">
                      <CardContent className="pt-4 pb-4">
                        <div className="text-2xl font-bold text-foreground">{category.rankings.length}</div>
                        <div className="text-xs text-muted-foreground">Teams</div>
                      </CardContent>
                    </Card>
                    <Card className="text-center">
                      <CardContent className="pt-4 pb-4">
                        <div className="text-2xl font-bold text-foreground">
                          {category.rankings.reduce((sum, r) => sum + r.wins + r.losses, 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">Matches</div>
                      </CardContent>
                    </Card>
                    <Card className="text-center">
                      <CardContent className="pt-4 pb-4">
                        <div className="text-2xl font-bold text-foreground">{category.challenge_range}</div>
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
                    <div className="space-y-3">
                      <AnimatePresence mode="popLayout">
                        {category.rankings.map((ranking, index) => {
                          const isUserTeam = ranking.team?.id === userTeamId;
                          const winRate =
                            ranking.wins + ranking.losses > 0
                              ? Math.round((ranking.wins / (ranking.wins + ranking.losses)) * 100)
                              : 0;

                          return (
                            <motion.div
                              key={ranking.id}
                              layout
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.3, delay: index * 0.05 }}
                            >
                              <Card
                                className={cn(
                                  "transition-all hover:shadow-md",
                                  isUserTeam && "ring-2 ring-accent border-accent",
                                  ranking.rank <= 3 && "border-transparent"
                                )}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-4">
                                    {/* Rank Badge */}
                                    <RankBadge rank={ranking.rank} />

                                    {/* Team Info */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-foreground truncate">
                                          {ranking.team?.name || "Unknown Team"}
                                        </h3>
                                        {isUserTeam && (
                                          <Badge variant="secondary" className="text-xs">
                                            Your Team
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-3 mt-1">
                                        <div className="flex -space-x-2">
                                          {ranking.members.slice(0, 3).map((member) => (
                                            <Avatar key={member.user_id} className="w-6 h-6 border-2 border-background">
                                              <AvatarImage src={member.avatar_url || undefined} />
                                              <AvatarFallback className="text-xs">
                                                {member.display_name?.charAt(0) || "?"}
                                              </AvatarFallback>
                                            </Avatar>
                                          ))}
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                          {ranking.members.length} member{ranking.members.length !== 1 ? "s" : ""}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="hidden sm:flex items-center gap-6 text-sm">
                                      <div className="text-center">
                                        <div className="font-semibold text-foreground">{ranking.points}</div>
                                        <div className="text-xs text-muted-foreground">Points</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="font-semibold text-foreground">
                                          {ranking.wins}-{ranking.losses}
                                        </div>
                                        <div className="text-xs text-muted-foreground">W-L</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="font-semibold text-foreground">{winRate}%</div>
                                        <div className="text-xs text-muted-foreground">Win Rate</div>
                                      </div>
                                      {getStreakDisplay(ranking.streak)}
                                    </div>

                                    {/* Challenge Button or Frozen Badge */}
                                    {user && ranking.team && isTeamFrozen(ranking.team) && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Badge variant="secondary" className="hidden sm:flex gap-1">
                                              <Snowflake className="w-3 h-3" />
                                              Frozen
                                            </Badge>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            Team frozen until {getFrozenUntilDate(ranking.team)}
                                            {ranking.team.frozen_reason && ` • ${ranking.team.frozen_reason}`}
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}

                                    {user && ranking.team && canChallenge(ranking.rank, ranking.team.id, category.id, ranking.team) && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="hidden sm:flex"
                                        onClick={() => handleChallenge(ranking.team!.id, ranking.team!.name)}
                                        disabled={challengingTeamId === ranking.team.id}
                                      >
                                        {challengingTeamId === ranking.team.id ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <>
                                            <Swords className="w-4 h-4 mr-1" />
                                            Challenge
                                          </>
                                        )}
                                      </Button>
                                    )}

                                    {ranking.team && pendingChallenges.has(ranking.team.id) && (
                                      <Badge variant="secondary" className="hidden sm:flex">
                                        Pending
                                      </Badge>
                                    )}

                                    {/* Mobile Stats */}
                                    <div className="sm:hidden text-right space-y-1">
                                      <div className="font-semibold text-foreground">{ranking.points} pts</div>
                                      <div className="text-xs text-muted-foreground">
                                        {ranking.wins}W - {ranking.losses}L
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </motion.div>
      </main>
    </div>
  );
}
