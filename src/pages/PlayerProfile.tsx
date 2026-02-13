import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Users, Trophy, Calendar, Loader2, UserPlus, Swords } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InvitePartnerDialog } from "@/components/team/InvitePartnerDialog";
import { PlayerStatsSection } from "@/components/stats/PlayerStatsSection";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { logger } from "@/lib/logger";

interface PlayerData {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  skill_level: string | null;
  bio: string | null;
  is_looking_for_team: boolean;
  created_at: string;
}

interface TeamInfo {
  id: string;
  name: string;
  rank: number | null;
}

interface MatchHistory {
  id: string;
  opponent_name: string;
  result: "win" | "loss";
  score: string;
  date: string;
}

export default function PlayerProfile() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [matches, setMatches] = useState<MatchHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userTeam, setUserTeam] = useState<{ id: string; name: string; is_captain: boolean } | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  useEffect(() => {
    const fetchPlayer = async () => {
      if (!id) return;

      try {
        // Fetch player profile
        const { data: profile, error: profileError } = await supabase
          .from("public_profiles" as any)
          .select("user_id, display_name, avatar_url, skill_level, bio, is_looking_for_team, created_at")
          .eq("user_id", id)
          .single() as { data: PlayerData | null; error: any };

        if (profileError) throw profileError;
        setPlayer(profile);

        // Fetch team membership
        const { data: memberData } = await supabase
          .from("team_members")
          .select("team_id")
          .eq("user_id", id)
          .maybeSingle();

        if (memberData) {
          const { data: teamData } = await supabase
            .from("teams")
            .select("id, name")
            .eq("id", memberData.team_id)
            .single();

          if (teamData) {
            const { data: rankData } = await supabase
              .from("ladder_rankings")
              .select("rank")
              .eq("team_id", teamData.id)
              .maybeSingle();

            setTeam({
              id: teamData.id,
              name: teamData.name,
              rank: rankData?.rank || null,
            });

            // Fetch match history
            const { data: matchesData } = await supabase
              .from("matches")
              .select("id, challenger_team_id, challenged_team_id, challenger_score, challenged_score, winner_team_id, completed_at")
              .or(`challenger_team_id.eq.${teamData.id},challenged_team_id.eq.${teamData.id}`)
              .eq("status", "completed")
              .order("completed_at", { ascending: false })
              .limit(5);

            if (matchesData && matchesData.length > 0) {
              const teamIds = [...new Set(matchesData.flatMap(m => [m.challenger_team_id, m.challenged_team_id]))];
              const { data: teams } = await supabase
                .from("teams")
                .select("id, name")
                .in("id", teamIds);

              const teamsMap = new Map(teams?.map(t => [t.id, t.name]) || []);

              setMatches(matchesData.map(m => {
                const isChallenger = m.challenger_team_id === teamData.id;
                const opponentId = isChallenger ? m.challenged_team_id : m.challenger_team_id;
                const myScore = isChallenger ? m.challenger_score : m.challenged_score;
                const theirScore = isChallenger ? m.challenged_score : m.challenger_score;

                return {
                  id: m.id,
                  opponent_name: teamsMap.get(opponentId) || "Unknown",
                  result: m.winner_team_id === teamData.id ? "win" : "loss",
                  score: `${myScore || 0} - ${theirScore || 0}`,
                  date: m.completed_at ? format(new Date(m.completed_at), "MMM d, yyyy") : "N/A",
                };
              }));
            }
          }
        }

        // Check if current user is a team captain
        if (user) {
          const { data: userMemberData } = await supabase
            .from("team_members")
            .select("team_id, is_captain")
            .eq("user_id", user.id)
            .maybeSingle();

          if (userMemberData?.is_captain) {
            const { data: userTeamData } = await supabase
              .from("teams")
              .select("id, name")
              .eq("id", userMemberData.team_id)
              .single();

            if (userTeamData) {
              setUserTeam({
                id: userTeamData.id,
                name: userTeamData.name,
                is_captain: true,
              });
            }
          }
        }
      } catch (error) {
        logger.apiError("fetchPlayer", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlayer();
  }, [id, user]);

  const canInvite = userTeam?.is_captain && !team && player?.user_id !== user?.id;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader showBack />
        <main className="container py-8">
          <Card className="text-center py-12">
            <CardContent>
              <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Player not found</h3>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader showBack />

      <main className="container py-8 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Profile Header */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <Avatar className="w-24 h-24 border-2">
                  <AvatarImage src={player.avatar_url || undefined} />
                  <AvatarFallback className="text-3xl bg-accent/20 text-accent">
                    {(player.display_name || "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 text-center sm:text-left">
                  <h1 className="text-2xl font-bold text-foreground mb-2">
                    {player.display_name || "Unknown Player"}
                  </h1>
                  
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start mb-3">
                    {player.skill_level && (
                      <Badge variant="secondary">{player.skill_level}</Badge>
                    )}
                    {player.is_looking_for_team && (
                      <Badge className="bg-accent text-accent-foreground">
                        Looking for team
                      </Badge>
                    )}
                  </div>

                  {player.bio && (
                    <p className="text-muted-foreground">{player.bio}</p>
                  )}

                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1 justify-center sm:justify-start">
                    <Calendar className="w-3 h-3" />
                    Member since {format(new Date(player.created_at), "MMMM yyyy")}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6 justify-center sm:justify-start">
                {canInvite && (
                  <Button onClick={() => setInviteDialogOpen(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite to Team
                  </Button>
                )}
                {team && (
                  <Button asChild variant="outline">
                    <Link to="/find-opponents">
                      <Swords className="w-4 h-4 mr-2" />
                      Challenge Team
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Unified Stats */}
          <PlayerStatsSection userId={player.user_id} />

          {/* Team Info */}
          {team ? (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Team
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{team.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {team.rank ? `Rank #${team.rank}` : "Unranked"}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/ladders">View Ladder</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Team
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">No team yet</p>
              </CardContent>
            </Card>
          )}

          {/* Recent Matches */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Recent Matches
              </CardTitle>
              <CardDescription>Last 5 matches played</CardDescription>
            </CardHeader>
            <CardContent>
              {matches.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No matches played yet
                </p>
              ) : (
                <div className="space-y-2">
                  {matches.map((match) => (
                    <div
                      key={match.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          match.result === "win" ? "bg-success" : "bg-destructive"
                        }`} />
                        <div>
                          <p className="font-medium text-foreground">vs {match.opponent_name}</p>
                          <p className="text-xs text-muted-foreground">{match.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{match.score}</p>
                        <p className={`text-xs ${
                          match.result === "win" ? "text-success" : "text-destructive"
                        }`}>
                          {match.result === "win" ? "Won" : "Lost"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Invite Dialog */}
      {userTeam && (
        <InvitePartnerDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          teamId={userTeam.id}
          teamName={userTeam.name}
          onInviteSent={() => {
            toast({
              title: "Invitation sent!",
              description: `${player.display_name} has been invited to join your team.`,
            });
          }}
        />
      )}
    </div>
  );
}
