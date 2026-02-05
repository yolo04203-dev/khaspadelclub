import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Swords, 
  Clock, 
  Check, 
  X, 
  Send, 
  Inbox,
  Loader2,
  Trophy,
  Target,
  Snowflake,
  Calendar,
  MapPin
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { SetScoreDialog } from "@/components/challenges/SetScoreDialog";
import { ScheduleMatchDialog } from "@/components/challenges/ScheduleMatchDialog";
import { isFuture, format } from "date-fns";

interface Challenge {
  id: string;
  status: string;
  message: string | null;
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
}

interface UserTeam {
  id: string;
  name: string;
  rank: number | null;
  is_captain: boolean;
  is_frozen?: boolean;
  frozen_until?: string | null;
  frozen_reason?: string | null;
}

export default function Challenges() {
  const { user } = useAuth();
  const [userTeam, setUserTeam] = useState<UserTeam | null>(null);
  const [incomingChallenges, setIncomingChallenges] = useState<Challenge[]>([]);
  const [outgoingChallenges, setOutgoingChallenges] = useState<Challenge[]>([]);
  const [acceptedChallenges, setAcceptedChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [scoreDialogOpen, setScoreDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);

  const fetchUserTeam = async () => {
    if (!user) return null;

    const { data: memberData } = await supabase
      .from("team_members")
      .select("team_id, is_captain")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!memberData) return null;

    const { data: teamData } = await supabase
      .from("teams")
      .select("id, name, is_frozen, frozen_until, frozen_reason")
      .eq("id", memberData.team_id)
      .single();

    if (!teamData) return null;

    const { data: rankData } = await supabase
      .from("ladder_rankings")
      .select("rank")
      .eq("team_id", memberData.team_id)
      .maybeSingle();

    return {
      id: teamData.id,
      name: teamData.name,
      rank: rankData?.rank || null,
      is_captain: memberData.is_captain ?? false,
      is_frozen: teamData.is_frozen ?? false,
      frozen_until: teamData.frozen_until,
      frozen_reason: teamData.frozen_reason,
    };
  };

  const isTeamFrozen = userTeam?.is_frozen && userTeam?.frozen_until && isFuture(new Date(userTeam.frozen_until));

  const fetchChallenges = async (teamId: string) => {
    // Fetch incoming challenges
    const { data: incoming, error: inError } = await supabase
      .from("challenges")
      .select(`
        id,
        status,
        message,
        expires_at,
        created_at,
        match_id,
        challenger_team_id,
        challenged_team_id
      `)
      .eq("challenged_team_id", teamId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (inError) console.error("Error fetching incoming:", inError);

    // Fetch outgoing challenges
    const { data: outgoing, error: outError } = await supabase
      .from("challenges")
      .select(`
        id,
        status,
        message,
        expires_at,
        created_at,
        match_id,
        challenger_team_id,
        challenged_team_id
      `)
      .eq("challenger_team_id", teamId)
      .in("status", ["pending", "declined"])
      .order("created_at", { ascending: false });

    if (outError) console.error("Error fetching outgoing:", outError);

    // Fetch accepted challenges (both incoming and outgoing)
    const { data: accepted, error: accError } = await supabase
      .from("challenges")
      .select(`
        id,
        status,
        message,
        expires_at,
        created_at,
        match_id,
        challenger_team_id,
        challenged_team_id
      `)
      .or(`challenger_team_id.eq.${teamId},challenged_team_id.eq.${teamId}`)
      .eq("status", "accepted")
      .order("created_at", { ascending: false });

    if (accError) console.error("Error fetching accepted:", accError);

    // Get all team IDs
    const allTeamIds = [
      ...(incoming?.map(c => c.challenger_team_id) || []),
      ...(incoming?.map(c => c.challenged_team_id) || []),
      ...(outgoing?.map(c => c.challenger_team_id) || []),
      ...(outgoing?.map(c => c.challenged_team_id) || []),
      ...(accepted?.map(c => c.challenger_team_id) || []),
      ...(accepted?.map(c => c.challenged_team_id) || []),
    ].filter(Boolean);

    // Fetch team names
    const { data: teams } = await supabase
      .from("teams")
      .select("id, name")
      .in("id", allTeamIds);

    // Fetch ranks
    const { data: ranks } = await supabase
      .from("ladder_rankings")
      .select("team_id, rank")
      .in("team_id", allTeamIds);

    const teamsMap = new Map(teams?.map(t => [t.id, t]) || []);
    const ranksMap = new Map(ranks?.map(r => [r.team_id, r.rank]) || []);

    // Fetch match statuses and scheduling info for accepted challenges
    const matchIds = (accepted || []).map(c => c.match_id).filter(Boolean);
    const { data: matches } = matchIds.length > 0 
      ? await supabase
          .from("matches")
          .select("id, status, scheduled_at, venue")
          .in("id", matchIds)
      : { data: [] as { id: string; status: string; scheduled_at: string | null; venue: string | null }[] };
    
    const matchMap = new Map<string, { status: string; scheduled_at: string | null; venue: string | null }>(
      (matches || []).map(m => [m.id, { status: m.status, scheduled_at: m.scheduled_at, venue: m.venue }])
    );

    const mapChallenge = (c: any): Challenge => {
      const matchInfo = c.match_id ? matchMap.get(c.match_id) : null;
      return {
        id: c.id,
        status: c.status,
        message: c.message,
        expires_at: c.expires_at,
        created_at: c.created_at,
        match_id: c.match_id,
        match_status: matchInfo?.status ?? null,
        match_scheduled_at: matchInfo?.scheduled_at ?? null,
        match_venue: matchInfo?.venue ?? null,
        challenger_team: teamsMap.get(c.challenger_team_id) || null,
        challenged_team: teamsMap.get(c.challenged_team_id) || null,
        challenger_rank: ranksMap.get(c.challenger_team_id) || null,
        challenged_rank: ranksMap.get(c.challenged_team_id) || null,
      };
    };

    setIncomingChallenges((incoming || []).map(mapChallenge));
    setOutgoingChallenges((outgoing || []).map(mapChallenge));
    setAcceptedChallenges((accepted || []).map(mapChallenge));
  };

  useEffect(() => {
    let teamId: string | null = null;
    
    const init = async () => {
      const team = await fetchUserTeam();
      setUserTeam(team);
      teamId = team?.id || null;

      if (team) {
        await fetchChallenges(team.id);
      }

      setIsLoading(false);
    };

    init();

    // Subscribe to realtime changes on challenges table
    const channel = supabase
      .channel('challenges-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'challenges',
        },
        async (payload) => {
          // Refresh challenges when any change occurs
          if (teamId) {
            await fetchChallenges(teamId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleRespond = async (challengeId: string, accept: boolean) => {
    setRespondingTo(challengeId);

    try {
      if (accept) {
        // Get challenge details
        const { data: challenge } = await supabase
          .from("challenges")
          .select("challenger_team_id, challenged_team_id")
          .eq("id", challengeId)
          .single();

        if (!challenge) throw new Error("Challenge not found");

        // Create a match record
        const { data: match, error: matchError } = await supabase
          .from("matches")
          .insert({
            challenger_team_id: challenge.challenger_team_id,
            challenged_team_id: challenge.challenged_team_id,
            status: "pending",
          })
          .select()
          .single();

        if (matchError) throw matchError;

        // Update challenge with match_id
        const { error: updateError } = await supabase
          .from("challenges")
          .update({
            status: "accepted",
            responded_at: new Date().toISOString(),
            match_id: match.id,
          })
          .eq("id", challengeId);

        if (updateError) throw updateError;
      } else {
        const { error } = await supabase
          .from("challenges")
          .update({
            status: "declined",
            responded_at: new Date().toISOString(),
          })
          .eq("id", challengeId);

        if (error) throw error;
      }

      toast({
        title: accept ? "Challenge accepted!" : "Challenge declined",
        description: accept
          ? "Record the match result when you've played."
          : "The challenge has been declined.",
      });

      if (userTeam) {
        await fetchChallenges(userTeam.id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRespondingTo(null);
    }
  };

  const handleCancel = async (challengeId: string) => {
    setRespondingTo(challengeId);

    try {
      const { error } = await supabase
        .from("challenges")
        .update({ status: "cancelled" })
        .eq("id", challengeId);

      if (error) throw error;

      toast({
        title: "Challenge cancelled",
        description: "Your challenge has been withdrawn.",
      });

      if (userTeam) {
        await fetchChallenges(userTeam.id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRespondingTo(null);
    }
  };

  const openScoreDialog = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setScoreDialogOpen(true);
  };

  const openScheduleDialog = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setScheduleDialogOpen(true);
  };

  const handleSubmitScore = async (
    mySets: number[], 
    opponentSets: number[], 
    setsWonByMe: number, 
    setsWonByOpponent: number
  ) => {
    if (!selectedChallenge || !userTeam) return;

    setIsSubmittingScore(true);

    try {
      const isChallenger = selectedChallenge.challenger_team?.id === userTeam.id;
      
      // Determine challenger/challenged sets based on perspective
      const challengerSets = isChallenger ? mySets : opponentSets;
      const challengedSets = isChallenger ? opponentSets : mySets;
      const setsWonChallenger = isChallenger ? setsWonByMe : setsWonByOpponent;
      const setsWonChallenged = isChallenger ? setsWonByOpponent : setsWonByMe;
      
      const winnerId = setsWonChallenger > setsWonChallenged 
        ? selectedChallenge.challenger_team?.id 
        : selectedChallenge.challenged_team?.id;
      const loserId = setsWonChallenger > setsWonChallenged 
        ? selectedChallenge.challenged_team?.id 
        : selectedChallenge.challenger_team?.id;

      // Update the match with set scores
      const { error: matchError } = await supabase
        .from("matches")
        .update({
          challenger_score: setsWonChallenger,
          challenged_score: setsWonChallenged,
          challenger_sets: challengerSets,
          challenged_sets: challengedSets,
          sets_won_challenger: setsWonChallenger,
          sets_won_challenged: setsWonChallenged,
          winner_team_id: winnerId,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", selectedChallenge.match_id);

      if (matchError) throw matchError;

      // Update ladder rankings
      const { data: rankings } = await supabase
        .from("ladder_rankings")
        .select("*")
        .in("team_id", [winnerId, loserId].filter(Boolean));

      if (rankings) {
        const winnerRanking = rankings.find(r => r.team_id === winnerId);
        const loserRanking = rankings.find(r => r.team_id === loserId);

        if (winnerRanking && loserRanking) {
          // Update winner's stats
          await supabase
            .from("ladder_rankings")
            .update({
              wins: winnerRanking.wins + 1,
              streak: winnerRanking.streak >= 0 ? winnerRanking.streak + 1 : 1,
              last_match_at: new Date().toISOString(),
              points: winnerRanking.points + 25,
            })
            .eq("id", winnerRanking.id);

          // Update loser's stats
          await supabase
            .from("ladder_rankings")
            .update({
              losses: loserRanking.losses + 1,
              streak: loserRanking.streak <= 0 ? loserRanking.streak - 1 : -1,
              last_match_at: new Date().toISOString(),
              points: Math.max(0, loserRanking.points - 10),
            })
            .eq("id", loserRanking.id);

          // If lower-ranked team won: winner takes loser's rank, everyone between shifts down by 1
          if (winnerRanking.rank > loserRanking.rank) {
            const winnerOldRank = winnerRanking.rank;
            const loserOldRank = loserRanking.rank;
            
            // Get all teams between the two ranks (exclusive of winner, inclusive of loser)
            const { data: teamsBetween } = await supabase
              .from("ladder_rankings")
              .select("id, rank")
              .gte("rank", loserOldRank)
              .lt("rank", winnerOldRank);
            
            // Shift all teams between down by 1 rank
            if (teamsBetween && teamsBetween.length > 0) {
              for (const team of teamsBetween) {
                await supabase
                  .from("ladder_rankings")
                  .update({ rank: team.rank + 1 })
                  .eq("id", team.id);
              }
            }
            
            // Winner takes the loser's old rank
            await supabase
              .from("ladder_rankings")
              .update({ rank: loserOldRank })
              .eq("id", winnerRanking.id);
          }
        }
      }

      // Format set scores for display
      const setScoreDisplay = mySets.map((s, i) => `${s}-${opponentSets[i]}`).join(", ");

      toast({
        title: "Match recorded!",
        description: `Sets: ${setScoreDisplay}. You ${setsWonByMe > setsWonByOpponent ? "won" : "lost"} ${setsWonByMe}-${setsWonByOpponent}. Rankings updated.`,
      });

      setScoreDialogOpen(false);
      setSelectedChallenge(null);

      if (userTeam) {
        await fetchChallenges(userTeam.id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingScore(false);
    }
  };

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

  const formatExpiresIn = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) return "Expired";
    if (diffDays > 0) return `${diffDays}d left`;
    if (diffHours > 0) return `${diffHours}h left`;
    return "< 1h left";
  };

  const getOpponentName = (challenge: Challenge) => {
    if (!userTeam) return "Unknown";
    return challenge.challenger_team?.id === userTeam.id 
      ? challenge.challenged_team?.name 
      : challenge.challenger_team?.name;
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
      <AppHeader 
        showBack 
        actions={
          userTeam && (
            <Button asChild>
              <Link to="/find-opponents">
                <Swords className="w-4 h-4 mr-2" />
                Find Opponents
              </Link>
            </Button>
          )
        }
      />

      {/* Main Content */}
      <main className="container py-8 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">Challenges</h1>
            <p className="text-muted-foreground">
              Manage your incoming and outgoing ladder challenges
            </p>
          </div>

          {/* Frozen Team Banner */}
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
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Join a team first
                </h3>
                <p className="text-muted-foreground mb-4">
                  You need to be on a team to send or receive challenges.
                </p>
                <Button asChild>
                  <Link to="/teams/create">Create Team</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="incoming" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="incoming" className="relative">
                  <Inbox className="w-4 h-4 mr-2" />
                  Incoming
                  {incomingChallenges.length > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {incomingChallenges.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="outgoing">
                  <Send className="w-4 h-4 mr-2" />
                  Outgoing
                </TabsTrigger>
                <TabsTrigger value="accepted" className="relative">
                  <Target className="w-4 h-4 mr-2" />
                  Active
                  {acceptedChallenges.length > 0 && (
                    <Badge variant="default" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-accent">
                      {acceptedChallenges.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="incoming">
                <AnimatePresence mode="popLayout">
                  {incomingChallenges.length === 0 ? (
                    <Card className="text-center py-8">
                      <CardContent>
                        <Inbox className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">No pending challenges</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {incomingChallenges.map((challenge) => (
                        <motion.div
                          key={challenge.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                        >
                          <Card className="border-accent/30">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Trophy className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                      #{challenge.challenger_rank || "?"}
                                    </span>
                                    <span className="font-semibold text-foreground truncate">
                                      {challenge.challenger_team?.name || "Unknown"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {formatTimeAgo(challenge.created_at)}
                                    </span>
                                    <span className={cn(
                                      formatExpiresIn(challenge.expires_at) === "Expired" && "text-destructive"
                                    )}>
                                      {formatExpiresIn(challenge.expires_at)}
                                    </span>
                                  </div>
                                  {challenge.message && (
                                    <p className="text-sm text-muted-foreground mt-2 italic">
                                      "{challenge.message}"
                                    </p>
                                  )}
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRespond(challenge.id, false)}
                                    disabled={respondingTo === challenge.id}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleRespond(challenge.id, true)}
                                    disabled={respondingTo === challenge.id}
                                  >
                                    {respondingTo === challenge.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Check className="w-4 h-4" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </TabsContent>

              <TabsContent value="outgoing">
                <AnimatePresence mode="popLayout">
                  {outgoingChallenges.length === 0 ? (
                    <Card className="text-center py-8">
                      <CardContent>
                        <Send className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground mb-4">No challenges sent</p>
                        <Button asChild>
                          <Link to="/find-opponents">Find Opponents</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {outgoingChallenges.map((challenge) => (
                        <motion.div
                          key={challenge.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                        >
                          <Card>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Trophy className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                      #{challenge.challenged_rank || "?"}
                                    </span>
                                    <span className="font-semibold text-foreground truncate">
                                      {challenge.challenged_team?.name || "Unknown"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {formatTimeAgo(challenge.created_at)}
                                    </span>
                                    <Badge
                                      variant={
                                        challenge.status === "declined"
                                          ? "destructive"
                                          : "secondary"
                                      }
                                      className="text-xs"
                                    >
                                      {challenge.status}
                                    </Badge>
                                  </div>
                                </div>

                                {challenge.status === "pending" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleCancel(challenge.id)}
                                    disabled={respondingTo === challenge.id}
                                  >
                                    {respondingTo === challenge.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      "Cancel"
                                    )}
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </TabsContent>

              <TabsContent value="accepted">
                <AnimatePresence mode="popLayout">
                  {acceptedChallenges.length === 0 ? (
                    <Card className="text-center py-8">
                      <CardContent>
                        <Target className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">No active matches to record</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {acceptedChallenges.map((challenge) => (
                        <motion.div
                          key={challenge.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                        >
                          <Card className="border-accent/30 bg-accent/5">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Swords className="w-4 h-4 text-accent" />
                                    <span className="font-semibold text-foreground truncate">
                                      vs {getOpponentName(challenge)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      Accepted {formatTimeAgo(challenge.created_at)}
                                    </span>
                                    <Badge 
                                      variant={challenge.match_status === "completed" ? "secondary" : "default"} 
                                      className={cn(
                                        "text-xs",
                                        challenge.match_status === "completed" ? "bg-muted" : "bg-accent"
                                      )}
                                    >
                                      {challenge.match_status === "completed" ? "Completed" : "Ready to play"}
                                    </Badge>
                                  </div>
                                  {/* Show scheduled date/time and venue if set */}
                                  {challenge.match_scheduled_at && (
                                    <div className="mt-2 flex items-center gap-2 text-sm text-foreground">
                                      <Calendar className="w-3.5 h-3.5 text-accent" />
                                      <span>{format(new Date(challenge.match_scheduled_at), "MMM d 'at' h:mm a")}</span>
                                      {challenge.match_venue && (
                                        <>
                                          <MapPin className="w-3.5 h-3.5 text-muted-foreground ml-1" />
                                          <span className="text-muted-foreground">{challenge.match_venue}</span>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {challenge.match_status === "completed" ? (
                                  <Badge variant="outline" className="text-muted-foreground">
                                    <Check className="w-4 h-4 mr-1" />
                                    Score Recorded
                                  </Badge>
                                ) : (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openScheduleDialog(challenge)}
                                    >
                                      <Calendar className="w-4 h-4 sm:mr-2" />
                                      <span className="hidden sm:inline">Schedule</span>
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => openScoreDialog(challenge)}
                                    >
                                      <Trophy className="w-4 h-4 sm:mr-2" />
                                      <span className="hidden sm:inline">Record Score</span>
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </TabsContent>
            </Tabs>
          )}
        </motion.div>
      </main>

      {/* Score Dialog */}
      <SetScoreDialog
        open={scoreDialogOpen}
        onOpenChange={setScoreDialogOpen}
        myTeamName={userTeam?.name || "Your Team"}
        opponentTeamName={selectedChallenge ? getOpponentName(selectedChallenge) : "Opponent"}
        onSubmit={handleSubmitScore}
        isSubmitting={isSubmittingScore}
      />

      {/* Schedule Dialog */}
      {selectedChallenge?.match_id && (
        <ScheduleMatchDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          matchId={selectedChallenge.match_id}
          opponentName={getOpponentName(selectedChallenge)}
          currentScheduledAt={selectedChallenge.match_scheduled_at}
          currentVenue={selectedChallenge.match_venue}
          onScheduled={() => {
            if (userTeam) {
              fetchChallenges(userTeam.id);
            }
          }}
        />
      )}
    </div>
  );
}
