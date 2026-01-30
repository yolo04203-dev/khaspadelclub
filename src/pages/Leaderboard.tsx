import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, TrendingDown, Flame, Users, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  } | null;
  members: TeamMember[];
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

export default function Leaderboard() {
  const { user } = useAuth();
  const [rankings, setRankings] = useState<TeamRanking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);

  const fetchRankings = async () => {
    try {
      // Fetch ladder rankings with team info
      const { data: rankingsData, error: rankingsError } = await supabase
        .from("ladder_rankings")
        .select(`
          id,
          rank,
          points,
          wins,
          losses,
          streak,
          team:teams (
            id,
            name,
            avatar_url
          )
        `)
        .order("rank", { ascending: true });

      if (rankingsError) throw rankingsError;

      // Get all team IDs
      const teamIds = rankingsData?.map((r) => (r.team as any)?.id).filter(Boolean) || [];
      
      if (teamIds.length === 0) {
        setRankings([]);
        setIsLoading(false);
        return;
      }

      // Fetch team members
      const { data: membersData, error: membersError } = await supabase
        .from("team_members")
        .select("team_id, user_id")
        .in("team_id", teamIds);

      if (membersError) throw membersError;

      // Get unique user IDs
      const userIds = [...new Set(membersData?.map((m) => m.user_id) || [])];

      // Fetch profiles for those users
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      // Create a map of user_id to profile
      const profilesMap = new Map(
        profilesData?.map((p) => [p.user_id, p]) || []
      );

      // Combine data
      const combinedRankings: TeamRanking[] = (rankingsData || []).map((ranking) => {
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

      setRankings(combinedRankings);

      // Check if user is in any team
      if (user) {
        const userMembership = membersData?.find((m) => m.user_id === user.id);
        setUserTeamId(userMembership?.team_id || null);
      }
    } catch (error) {
      console.error("Error fetching rankings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();

    // Set up real-time subscription
    const channel = supabase
      .channel("ladder-rankings-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ladder_rankings",
        },
        () => {
          fetchRankings();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teams",
        },
        () => {
          fetchRankings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to={user ? "/dashboard" : "/"}>
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <Logo size="sm" />
          </div>
          
          {!user && (
            <Button asChild>
              <Link to="/auth">Join the Ladder</Link>
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Page Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Ladder Rankings
            </h1>
            <p className="text-muted-foreground">
              Real-time standings • Challenge teams ranked up to 5 positions above you
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4 mb-8 max-w-md mx-auto">
            <Card className="text-center">
              <CardContent className="pt-4 pb-4">
                <div className="text-2xl font-bold text-foreground">{rankings.length}</div>
                <div className="text-xs text-muted-foreground">Teams</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-4 pb-4">
                <div className="text-2xl font-bold text-foreground">
                  {rankings.reduce((sum, r) => sum + r.wins + r.losses, 0)}
                </div>
                <div className="text-xs text-muted-foreground">Matches</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-4 pb-4">
                <div className="text-2xl font-bold text-accent">LIVE</div>
                <div className="text-xs text-muted-foreground">Updates</div>
              </CardContent>
            </Card>
          </div>

          {/* Rankings List */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-muted rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-32" />
                        <div className="h-3 bg-muted rounded w-24" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : rankings.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No teams yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  Be the first to create a team and start climbing the ladder!
                </p>
                {user && (
                  <Button asChild>
                    <Link to="/teams/create">Create Team</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {rankings.map((ranking, index) => {
                  const isUserTeam = ranking.team?.id === userTeamId;
                  const winRate = ranking.wins + ranking.losses > 0
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
                                {/* Team Members Avatars */}
                                <div className="flex -space-x-2">
                                  {ranking.members.slice(0, 3).map((member) => (
                                    <Avatar key={member.user_id} className="w-6 h-6 border-2 border-background">
                                      <AvatarImage src={member.avatar_url || undefined} />
                                      <AvatarFallback className="text-xs">
                                        {member.display_name?.charAt(0) || "?"}
                                      </AvatarFallback>
                                    </Avatar>
                                  ))}
                                  {ranking.members.length > 3 && (
                                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                                      +{ranking.members.length - 3}
                                    </div>
                                  )}
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

                            {/* Mobile Stats */}
                            <div className="sm:hidden text-right">
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
        </motion.div>
      </main>
    </div>
  );
}
