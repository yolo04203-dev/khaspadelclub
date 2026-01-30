import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, User, Camera, LogOut, Users, Trophy, Loader2, Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
}

interface UserTeam {
  id: string;
  name: string;
  rank: number | null;
  is_captain: boolean;
}

interface MatchHistory {
  id: string;
  opponent_name: string;
  result: "win" | "loss";
  score: string;
  date: string;
}

export default function ProfilePage() {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userTeam, setUserTeam] = useState<UserTeam | null>(null);
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLeavingTeam, setIsLeavingTeam] = useState(false);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("display_name, avatar_url")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError && profileError.code !== "PGRST116") {
          console.error("Error fetching profile:", profileError);
        }

        if (profileData) {
          setProfile(profileData);
          setDisplayName(profileData.display_name || "");
        } else {
          setDisplayName(user.user_metadata?.display_name || user.email?.split("@")[0] || "");
        }

        // Fetch team membership
        const { data: memberData } = await supabase
          .from("team_members")
          .select("team_id, is_captain")
          .eq("user_id", user.id)
          .maybeSingle();

        if (memberData) {
          const { data: teamData } = await supabase
            .from("teams")
            .select("id, name")
            .eq("id", memberData.team_id)
            .single();

          const { data: rankData } = await supabase
            .from("ladder_rankings")
            .select("rank")
            .eq("team_id", memberData.team_id)
            .maybeSingle();

          if (teamData) {
            setUserTeam({
              id: teamData.id,
              name: teamData.name,
              rank: rankData?.rank || null,
              is_captain: memberData.is_captain || false,
            });
          }

          // Fetch match history
          const { data: matches } = await supabase
            .from("matches")
            .select("id, challenger_team_id, challenged_team_id, challenger_score, challenged_score, winner_team_id, completed_at")
            .or(`challenger_team_id.eq.${memberData.team_id},challenged_team_id.eq.${memberData.team_id}`)
            .eq("status", "completed")
            .order("completed_at", { ascending: false })
            .limit(10);

          if (matches && matches.length > 0) {
            const teamIds = [...new Set(matches.flatMap(m => [m.challenger_team_id, m.challenged_team_id]))];
            const { data: teams } = await supabase
              .from("teams")
              .select("id, name")
              .in("id", teamIds);

            const teamsMap = new Map(teams?.map(t => [t.id, t.name]) || []);

            setMatchHistory(matches.map(m => {
              const isChallenger = m.challenger_team_id === memberData.team_id;
              const opponentId = isChallenger ? m.challenged_team_id : m.challenger_team_id;
              const myScore = isChallenger ? m.challenger_score : m.challenged_score;
              const theirScore = isChallenger ? m.challenged_score : m.challenger_score;
              
              return {
                id: m.id,
                opponent_name: teamsMap.get(opponentId) || "Unknown",
                result: m.winner_team_id === memberData.team_id ? "win" : "loss",
                score: `${myScore || 0} - ${theirScore || 0}`,
                date: m.completed_at ? new Date(m.completed_at).toLocaleDateString() : "N/A",
              };
            }));
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) fetchData();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          display_name: displayName,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your display name has been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLeaveTeam = async () => {
    if (!user || !userTeam) return;
    
    if (userTeam.is_captain) {
      toast({
        title: "Cannot leave team",
        description: "As team captain, you must transfer ownership or delete the team first.",
        variant: "destructive",
      });
      return;
    }

    setIsLeavingTeam(true);

    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("user_id", user.id)
        .eq("team_id", userTeam.id);

      if (error) throw error;

      toast({
        title: "Left team",
        description: `You have left ${userTeam.name}.`,
      });
      setUserTeam(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLeavingTeam(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
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

          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="w-4 h-4" />
          </Button>
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
            <h1 className="text-3xl font-bold text-foreground mb-2">Profile</h1>
            <p className="text-muted-foreground">Manage your account settings</p>
          </div>

          <div className="space-y-6">
            {/* Avatar Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Account Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl bg-accent/20 text-accent">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{displayName || "Player"}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                  />
                </div>

                <Button onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </CardContent>
            </Card>

            {/* Team Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Team
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userTeam ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{userTeam.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {userTeam.rank ? `Rank #${userTeam.rank}` : "Unranked"}
                          {userTeam.is_captain && " • Captain"}
                        </p>
                      </div>
                      <Button asChild variant="outline">
                        <Link to="/leaderboard">View Ladder</Link>
                      </Button>
                    </div>
                    {!userTeam.is_captain && (
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={handleLeaveTeam}
                        disabled={isLeavingTeam}
                      >
                        {isLeavingTeam ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : null}
                        Leave Team
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-4">You're not on a team yet</p>
                    <Button asChild>
                      <Link to="/teams/create">Create Team</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Match History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Match History
                </CardTitle>
                <CardDescription>Your recent matches</CardDescription>
              </CardHeader>
              <CardContent>
                {matchHistory.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No matches played yet</p>
                ) : (
                  <div className="space-y-2">
                    {matchHistory.map((match) => (
                      <div
                        key={match.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${match.result === "win" ? "bg-success" : "bg-destructive"}`} />
                          <div>
                            <p className="font-medium text-foreground">vs {match.opponent_name}</p>
                            <p className="text-xs text-muted-foreground">{match.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{match.score}</p>
                          <p className={`text-xs ${match.result === "win" ? "text-success" : "text-destructive"}`}>
                            {match.result === "win" ? "Won" : "Lost"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
