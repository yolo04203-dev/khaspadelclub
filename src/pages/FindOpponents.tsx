import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Loader2, 
  Trophy, 
  Swords, 
  Send,
  Users,
  Snowflake,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { isFuture } from "date-fns";

interface LadderMembership {
  id: string;
  rank: number;
  ladder_category_id: string;
  category_name: string;
  ladder_id: string;
  ladder_name: string;
  challenge_range: number;
  wins: number;
  losses: number;
  streak: number;
  points: number;
}

interface ChallengeableTeam {
  team_id: string;
  team_name: string;
  rank: number;
  ladder_category_id: string;
  is_frozen?: boolean;
  frozen_until?: string | null;
}

interface UserTeam {
  id: string;
  name: string;
  is_captain: boolean;
  is_frozen?: boolean;
  frozen_until?: string | null;
}

export default function FindOpponents() {
  const { user } = useAuth();
  const [userTeam, setUserTeam] = useState<UserTeam | null>(null);
  const [ladderMemberships, setLadderMemberships] = useState<LadderMembership[]>([]);
  const [challengeableTeams, setChallengeableTeams] = useState<Record<string, ChallengeableTeam[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [challengingTeam, setChallengingTeam] = useState<ChallengeableTeam | null>(null);
  const [challengingCategoryId, setChallengingCategoryId] = useState<string | null>(null);
  const [challengeMessage, setChallengeMessage] = useState("");
  const [isSendingChallenge, setIsSendingChallenge] = useState(false);
  const [pendingChallenges, setPendingChallenges] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    if (!user) {
      setIsLoading(false);
      return null;
    }

    try {
      // Get user's team
      const { data: memberData } = await supabase
        .from("team_members")
        .select("team_id, is_captain")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!memberData) {
        setIsLoading(false);
        return null;
      }

      const { data: teamData } = await supabase
        .from("teams")
        .select("id, name, is_frozen, frozen_until")
        .eq("id", memberData.team_id)
        .single();

      if (!teamData) {
        setIsLoading(false);
        return null;
      }

      setUserTeam({
        id: teamData.id,
        name: teamData.name,
        is_captain: memberData.is_captain ?? false,
        is_frozen: teamData.is_frozen ?? false,
        frozen_until: teamData.frozen_until,
      });

      // Get user's ladder memberships
      const { data: rankings } = await supabase
        .from("ladder_rankings")
        .select(`
          id,
          rank,
          wins,
          losses,
          streak,
          points,
          ladder_category_id,
          ladder_categories!inner (
            id,
            name,
            challenge_range,
            ladder_id,
            ladders!inner (
              id,
              name
            )
          )
        `)
        .eq("team_id", memberData.team_id);

      if (!rankings || rankings.length === 0) {
        setIsLoading(false);
        return memberData.team_id;
      }

      const memberships: LadderMembership[] = rankings.map((r: any) => ({
        id: r.id,
        rank: r.rank,
        ladder_category_id: r.ladder_category_id,
        category_name: r.ladder_categories.name,
        ladder_id: r.ladder_categories.ladder_id,
        ladder_name: r.ladder_categories.ladders.name,
        challenge_range: r.ladder_categories.challenge_range,
        wins: r.wins ?? 0,
        losses: r.losses ?? 0,
        streak: r.streak ?? 0,
        points: r.points ?? 1000,
      }));

      setLadderMemberships(memberships);

      // Get pending challenges to prevent duplicate challenges
      const { data: pendingChallengesData } = await supabase
        .from("challenges")
        .select("challenged_team_id")
        .eq("challenger_team_id", memberData.team_id)
        .eq("status", "pending");

      const pendingSet = new Set(
        (pendingChallengesData || []).map(c => c.challenged_team_id)
      );
      setPendingChallenges(pendingSet);

      // For each membership, get challengeable teams
      const teamsData: Record<string, ChallengeableTeam[]> = {};

      for (const membership of memberships) {
        // Get teams ranked higher (lower rank number) within challenge range
        const minRank = Math.max(1, membership.rank - membership.challenge_range);
        
        const { data: opponents } = await supabase
          .from("ladder_rankings")
          .select(`
            team_id,
            rank,
            ladder_category_id,
            teams!inner (
              id,
              name,
              is_frozen,
              frozen_until
            )
          `)
          .eq("ladder_category_id", membership.ladder_category_id)
          .neq("team_id", memberData.team_id)
          .lt("rank", membership.rank)
          .gte("rank", minRank)
          .order("rank", { ascending: true });

        teamsData[membership.ladder_category_id] = (opponents || []).map((o: any) => ({
          team_id: o.team_id,
          team_name: o.teams.name,
          rank: o.rank,
          ladder_category_id: o.ladder_category_id,
          is_frozen: o.teams.is_frozen,
          frozen_until: o.teams.frozen_until,
        }));
      }

      setChallengeableTeams(teamsData);
      return memberData.team_id;
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load ladder data",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to realtime changes on challenges and ladder_rankings
    const challengesChannel = supabase
      .channel('find-opponents-challenges')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'challenges',
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    const rankingsChannel = supabase
      .channel('find-opponents-rankings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ladder_rankings',
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(challengesChannel);
      supabase.removeChannel(rankingsChannel);
    };
  }, [user]);

  const isTeamFrozen = (team: ChallengeableTeam) => {
    return team.is_frozen && team.frozen_until && isFuture(new Date(team.frozen_until));
  };

  const handleSendChallenge = async () => {
    if (!challengingTeam || !userTeam || !challengingCategoryId) return;

    setIsSendingChallenge(true);

    try {
      const { error } = await supabase.from("challenges").insert({
        challenger_team_id: userTeam.id,
        challenged_team_id: challengingTeam.team_id,
        ladder_category_id: challengingCategoryId,
        message: challengeMessage.trim() || null,
      });

      if (error) throw error;

      toast({
        title: "Challenge sent!",
        description: `Challenge sent to ${challengingTeam.team_name}`,
      });

      // Add to pending challenges
      setPendingChallenges(prev => new Set([...prev, challengingTeam.team_id]));

      setChallengingTeam(null);
      setChallengingCategoryId(null);
      setChallengeMessage("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSendingChallenge(false);
    }
  };

  const openChallengeDialog = (team: ChallengeableTeam, categoryId: string) => {
    setChallengingTeam(team);
    setChallengingCategoryId(categoryId);
    setChallengeMessage("");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
              <Link to="/challenges">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <Logo size="sm" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">Find Opponents</h1>
            <p className="text-muted-foreground">
              Challenge teams ranked above you in your ladders
            </p>
          </div>

          {!user ? (
            <Card className="text-center py-12">
              <CardContent>
                <Swords className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Sign in required
                </h3>
                <p className="text-muted-foreground mb-4">
                  Please sign in to find opponents.
                </p>
                <Button asChild>
                  <Link to="/auth">Sign In</Link>
                </Button>
              </CardContent>
            </Card>
          ) : !userTeam ? (
            <Card className="text-center py-12">
              <CardContent>
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Join a team first
                </h3>
                <p className="text-muted-foreground mb-4">
                  You need to be on a team to challenge opponents.
                </p>
                <Button asChild>
                  <Link to="/teams/create">Create Team</Link>
                </Button>
              </CardContent>
            </Card>
          ) : ladderMemberships.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Join a ladder
                </h3>
                <p className="text-muted-foreground mb-4">
                  Your team isn't in any ladder yet. Join a ladder to start challenging opponents.
                </p>
                <Button asChild>
                  <Link to="/ladders">Browse Ladders</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue={ladderMemberships[0].ladder_category_id} className="w-full">
              <TabsList className={`grid w-full mb-6 ${ladderMemberships.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {ladderMemberships.map((membership) => (
                  <TabsTrigger key={membership.ladder_category_id} value={membership.ladder_category_id}>
                    <Trophy className="w-4 h-4 mr-2" />
                    <span className="truncate">{membership.ladder_name}</span>
                    <Badge variant="secondary" className="ml-2">
                      #{membership.rank}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>

              {ladderMemberships.map((membership) => {
                const totalMatches = membership.wins + membership.losses;
                const winRate = totalMatches > 0 ? Math.round((membership.wins / totalMatches) * 100) : 0;
                
                return (
                <TabsContent key={membership.ladder_category_id} value={membership.ladder_category_id}>
                  {/* Stats Card */}
                  <Card className="mb-4">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {membership.category_name}
                        <Badge variant="outline">
                          Rank #{membership.rank}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-3 rounded-lg bg-accent/10">
                          <div className="text-2xl font-bold text-accent">{membership.wins}</div>
                          <div className="text-xs text-muted-foreground">Wins</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-destructive/10">
                          <div className="text-2xl font-bold text-destructive">{membership.losses}</div>
                          <div className="text-xs text-muted-foreground">Losses</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-muted">
                          <div className="text-2xl font-bold text-foreground flex items-center justify-center gap-1">
                            {membership.streak > 0 ? (
                              <>
                                <TrendingUp className="w-4 h-4 text-accent" />
                                {membership.streak}
                              </>
                            ) : membership.streak < 0 ? (
                              <>
                                <TrendingDown className="w-4 h-4 text-destructive" />
                                {Math.abs(membership.streak)}
                              </>
                            ) : (
                              <>
                                <Minus className="w-4 h-4" />
                                0
                              </>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">Streak</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-primary/10">
                          <div className="text-2xl font-bold text-primary">{membership.points}</div>
                          <div className="text-xs text-muted-foreground">Points</div>
                        </div>
                      </div>
                      
                      {totalMatches > 0 && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Win Rate</span>
                            <span className="font-medium">{winRate}%</span>
                          </div>
                          <Progress value={winRate} className="h-2" />
                        </div>
                      )}
                      
                      <p className="text-sm text-muted-foreground mt-4">
                        You can challenge teams ranked #{Math.max(1, membership.rank - membership.challenge_range)} - #{membership.rank - 1}
                      </p>
                    </CardContent>
                  </Card>

                  {challengeableTeams[membership.ladder_category_id]?.length === 0 ? (
                    <Card className="text-center py-8">
                      <CardContent>
                        <Trophy className="w-10 h-10 mx-auto text-warning mb-3" />
                        <p className="text-foreground font-medium">You're at the top!</p>
                        <p className="text-muted-foreground text-sm mt-1">
                          {membership.rank === 1 
                            ? "You're ranked #1 - no one to challenge above you!" 
                            : "No teams available to challenge within your range."}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {challengeableTeams[membership.ladder_category_id]?.map((team) => {
                        const isFrozen = isTeamFrozen(team);
                        const hasPendingChallenge = pendingChallenges.has(team.team_id);
                        
                        return (
                          <Card key={team.team_id} className={isFrozen ? "opacity-60" : ""}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent/20 text-accent font-bold">
                                    #{team.rank}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-foreground">
                                        {team.team_name}
                                      </span>
                                      {isFrozen && (
                                        <Badge variant="secondary" className="text-xs">
                                          <Snowflake className="w-3 h-3 mr-1" />
                                          Frozen
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {team.rank - membership.rank === -1 
                                        ? "1 rank above you" 
                                        : `${Math.abs(team.rank - membership.rank)} ranks above you`}
                                    </p>
                                  </div>
                                </div>

                                <Button
                                  size="sm"
                                  onClick={() => openChallengeDialog(team, membership.ladder_category_id)}
                                  disabled={isFrozen || hasPendingChallenge}
                                >
                                  {hasPendingChallenge ? (
                                    <>
                                      <Send className="w-4 h-4 mr-2" />
                                      Pending
                                    </>
                                  ) : (
                                    <>
                                      <Swords className="w-4 h-4 mr-2" />
                                      Challenge
                                    </>
                                  )}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              );
              })}
            </Tabs>
          )}
        </motion.div>
      </main>

      {/* Challenge Dialog */}
      <Dialog open={!!challengingTeam} onOpenChange={(open) => !open && setChallengingTeam(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Challenge {challengingTeam?.team_name}</DialogTitle>
            <DialogDescription>
              Send a challenge to this team. They have 7 days to respond.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">
                Message (optional)
              </label>
              <Textarea
                placeholder="Add a message to your challenge..."
                value={challengeMessage}
                onChange={(e) => setChallengeMessage(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setChallengingTeam(null)}
              disabled={isSendingChallenge}
            >
              Cancel
            </Button>
            <Button onClick={handleSendChallenge} disabled={isSendingChallenge}>
              {isSendingChallenge ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Swords className="w-4 h-4 mr-2" />
              )}
              Send Challenge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
