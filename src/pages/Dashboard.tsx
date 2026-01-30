import { Navigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { LogOut, User, Trophy, Swords, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  const { user, role, isLoading, signOut } = useAuth();

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

          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Rank</CardTitle>
                <Trophy className="h-4 w-4 text-rank-gold" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">#--</div>
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

            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Swords className="w-5 h-5 text-accent" />
                  Challenge
                </CardTitle>
                <CardDescription>Challenge another player or team</CardDescription>
              </CardHeader>
            </Card>

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
