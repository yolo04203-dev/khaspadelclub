import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { LogOut, User, Trophy, Swords, Settings, Users, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface UserTeam {
  id: string;
  name: string;
  rank: number | null;
}

export default function Dashboard() {
  const { user, role, isLoading, signOut } = useAuth();
  const [userTeam, setUserTeam] = useState<UserTeam | null>(null);
  const [teamLoading, setTeamLoading] = useState(true);

  useEffect(() => {
    const fetchUserTeam = async () => {
      if (!user) {
        setTeamLoading(false);
        return;
      }

      try {
        // Get team membership
        const { data: memberData, error: memberError } = await supabase
          .from("team_members")
          .select("team_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (memberError) throw memberError;

        if (memberData?.team_id) {
          // Get team details
          const { data: teamData, error: teamError } = await supabase
            .from("teams")
            .select("id, name")
            .eq("id", memberData.team_id)
            .single();

          if (teamError) throw teamError;

          // Get team rank
          const { data: rankData } = await supabase
            .from("ladder_rankings")
            .select("rank")
            .eq("team_id", memberData.team_id)
            .maybeSingle();

          setUserTeam({
            id: teamData.id,
            name: teamData.name,
            rank: rankData?.rank || null,
          });
        }
      } catch (error) {
        console.error("Error fetching user team:", error);
      } finally {
        setTeamLoading(false);
      }
    };

    fetchUserTeam();
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container flex items-center justify-between h-16">
          <Link to="/">
            <Logo size="sm" />
          </Link>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">
                {user.user_metadata?.display_name || user.email?.split("@")[0]}
              </p>
              <p className="text-xs text-muted-foreground capitalize">{role || "Player"}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">
              Welcome, {user.user_metadata?.display_name || user.email?.split("@")[0]}!
            </h1>
            <p className="text-muted-foreground mt-2">
              {role === "admin"
                ? "Manage your academy from the admin dashboard"
                : "View your rankings and challenge other players"}
            </p>
          </div>

          {/* Team Status Card */}
          {!teamLoading && (
            <div className="mb-8">
              {userTeam ? (
                <Card className="bg-gradient-to-r from-accent/10 to-primary/10 border-accent/30">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                          <Users className="w-6 h-6 text-accent" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{userTeam.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {userTeam.rank ? `Rank #${userTeam.rank}` : "Unranked"}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" asChild>
                        <Link to="/leaderboard">View Ladder</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed border-2 border-accent/50 bg-accent/5">
                  <CardContent className="py-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                          <Plus className="w-6 h-6 text-accent" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">No team yet</p>
                          <p className="text-sm text-muted-foreground">
                            Create a team to join the ladder rankings
                          </p>
                        </div>
                      </div>
                      <Button asChild>
                        <Link to="/teams/create">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Team
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Rank</CardTitle>
                <Trophy className="h-4 w-4 text-rank-gold" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {userTeam?.rank ? `#${userTeam.rank}` : "#--"}
                </div>
                <p className="text-xs text-muted-foreground">Ladder position</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Matches Played</CardTitle>
                <Swords className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">Total matches</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--%</div>
                <p className="text-xs text-muted-foreground">Victory percentage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Challenges</CardTitle>
                <Swords className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">Awaiting response</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link to="/leaderboard">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-accent" />
                    Leaderboard
                  </CardTitle>
                  <CardDescription>View current rankings and ladder positions</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/challenges">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Swords className="w-5 h-5 text-accent" />
                    Challenges
                  </CardTitle>
                  <CardDescription>View and manage your ladder challenges</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-accent" />
                  Profile
                </CardTitle>
                <CardDescription>Update your profile and settings</CardDescription>
              </CardHeader>
            </Card>

            {role === "admin" && (
              <Card className="hover:border-primary/50 transition-colors cursor-pointer border-accent/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-accent" />
                    Admin Panel
                  </CardTitle>
                  <CardDescription>Manage players, matches, and academy settings</CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
