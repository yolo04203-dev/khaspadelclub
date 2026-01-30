import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Swords, 
  ArrowLeft, 
  Clock, 
  Check, 
  X, 
  Send, 
  Inbox,
  Loader2,
  Trophy
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Challenge {
  id: string;
  status: string;
  message: string | null;
  expires_at: string;
  created_at: string;
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
}

export default function Challenges() {
  const { user } = useAuth();
  const [userTeam, setUserTeam] = useState<UserTeam | null>(null);
  const [incomingChallenges, setIncomingChallenges] = useState<Challenge[]>([]);
  const [outgoingChallenges, setOutgoingChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

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
      .select("id, name")
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
      is_captain: memberData.is_captain,
    };
  };

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
        challenger_team_id,
        challenged_team_id
      `)
      .eq("challenger_team_id", teamId)
      .in("status", ["pending", "accepted", "declined"])
      .order("created_at", { ascending: false });

    if (outError) console.error("Error fetching outgoing:", outError);

    // Get all team IDs
    const allTeamIds = [
      ...(incoming?.map(c => c.challenger_team_id) || []),
      ...(incoming?.map(c => c.challenged_team_id) || []),
      ...(outgoing?.map(c => c.challenger_team_id) || []),
      ...(outgoing?.map(c => c.challenged_team_id) || []),
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

    const mapChallenge = (c: any): Challenge => ({
      id: c.id,
      status: c.status,
      message: c.message,
      expires_at: c.expires_at,
      created_at: c.created_at,
      challenger_team: teamsMap.get(c.challenger_team_id) || null,
      challenged_team: teamsMap.get(c.challenged_team_id) || null,
      challenger_rank: ranksMap.get(c.challenger_team_id) || null,
      challenged_rank: ranksMap.get(c.challenged_team_id) || null,
    });

    setIncomingChallenges((incoming || []).map(mapChallenge));
    setOutgoingChallenges((outgoing || []).map(mapChallenge));
  };

  useEffect(() => {
    const init = async () => {
      const team = await fetchUserTeam();
      setUserTeam(team);

      if (team) {
        await fetchChallenges(team.id);
      }

      setIsLoading(false);
    };

    init();
  }, [user]);

  const handleRespond = async (challengeId: string, accept: boolean) => {
    setRespondingTo(challengeId);

    try {
      const { error } = await supabase
        .from("challenges")
        .update({
          status: accept ? "accepted" : "declined",
          responded_at: new Date().toISOString(),
        })
        .eq("id", challengeId);

      if (error) throw error;

      toast({
        title: accept ? "Challenge accepted!" : "Challenge declined",
        description: accept
          ? "The match has been scheduled. Good luck!"
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
              <Link to="/dashboard">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <Logo size="sm" />
          </div>

          {userTeam && (
            <Button asChild>
              <Link to="/leaderboard">
                <Swords className="w-4 h-4 mr-2" />
                Find Opponents
              </Link>
            </Button>
          )}
        </div>
      </header>

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
              <TabsList className="grid w-full grid-cols-2 mb-6">
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
                          <Link to="/leaderboard">Browse Leaderboard</Link>
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
                                        challenge.status === "accepted"
                                          ? "default"
                                          : challenge.status === "declined"
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
            </Tabs>
          )}
        </motion.div>
      </main>
    </div>
  );
}
