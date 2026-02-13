import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Shuffle, Users, Trophy, Play, CheckCircle } from "lucide-react";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AmericanoSession {
  id: string;
  name: string;
  status: "draft" | "in_progress" | "completed" | "cancelled";
  total_rounds: number;
  current_round: number;
  created_at: string;
  mode: string;
  player_count?: number;
  team_count?: number;
}

export default function Americano() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<AmericanoSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const { data: sessionsData, error } = await supabase
        .from("americano_sessions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const sessionIds = (sessionsData || []).map(s => s.id);

      // Bulk fetch counts instead of N+1
      const [playersResult, teamsResult] = await Promise.all([
        sessionIds.length > 0
          ? supabase.from("americano_players").select("session_id").in("session_id", sessionIds)
          : Promise.resolve({ data: [] as any[] }),
        sessionIds.length > 0
          ? supabase.from("americano_teams").select("session_id").in("session_id", sessionIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const playerCounts = new Map<string, number>();
      (playersResult.data || []).forEach(p => {
        playerCounts.set(p.session_id, (playerCounts.get(p.session_id) || 0) + 1);
      });
      const teamCounts = new Map<string, number>();
      (teamsResult.data || []).forEach(t => {
        teamCounts.set(t.session_id, (teamCounts.get(t.session_id) || 0) + 1);
      });

      const sessionsWithCounts = (sessionsData || []).map(session => ({
        ...session,
        player_count: session.mode !== "team" ? (playerCounts.get(session.id) || 0) : undefined,
        team_count: session.mode === "team" ? (teamCounts.get(session.id) || 0) : undefined,
      }));

      setSessions(sessionsWithCounts);
    } catch (error) {
      logger.apiError("fetchAmericanoSessions", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: AmericanoSession["status"]) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      draft: { variant: "secondary", label: "Draft" },
      in_progress: { variant: "default", label: "In Progress" },
      completed: { variant: "outline", label: "Completed" },
      cancelled: { variant: "destructive", label: "Cancelled" },
    };
    const { variant, label } = variants[status] || variants.draft;
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getModeBadge = (mode: string) => {
    if (mode === "team") {
      return (
        <Badge variant="outline" className="gap-1">
          <Users className="w-3 h-3" />
          Team
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <Shuffle className="w-3 h-3" />
        Individual
      </Badge>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader 
        showBack 
        actions={
          user && (
            <Button asChild>
              <Link to="/americano/create">
                <Plus className="w-4 h-4 mr-2" />
                New Session
              </Link>
            </Button>
          )
        }
      />

      <PullToRefresh onRefresh={async () => { await fetchSessions(); }} className="flex-1 overflow-auto">
        <main className="container py-8 pb-safe-nav sm:pb-8">
          <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <Shuffle className="w-6 h-6 text-success" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Americano Mode</h1>
                <p className="text-muted-foreground">Individual rotating or fixed team competitions</p>
              </div>
            </div>
          </div>

          {/* How it works cards */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <Card className="bg-gradient-to-r from-success/5 to-success/10 border-success/20">
              <CardContent className="py-6">
                <div className="flex items-center gap-2 mb-3">
                  <Shuffle className="w-5 h-5 text-success" />
                  <h3 className="font-semibold text-foreground">Individual Mode</h3>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 mt-0.5 text-success" />
                    <span>Players rotate partners each round</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Play className="w-4 h-4 mt-0.5 text-success" />
                    <span>Points accumulate individually</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Trophy className="w-4 h-4 mt-0.5 text-success" />
                    <span>Highest total points wins</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="py-6">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Team Mode</h3>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 mt-0.5 text-primary" />
                    <span>Fixed teams of 2 players</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Play className="w-4 h-4 mt-0.5 text-primary" />
                    <span>Round-robin: every team vs every team</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Trophy className="w-4 h-4 mt-0.5 text-primary" />
                    <span>Team with most points wins</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sessions List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Sessions</h2>
            </div>

            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="h-5 bg-muted rounded w-2/3" />
                        <div className="h-5 bg-muted rounded w-16" />
                      </div>
                      <div className="h-4 bg-muted rounded w-1/2 mt-2" />
                    </CardHeader>
                    <CardContent>
                      <div className="h-4 bg-muted rounded w-3/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Shuffle className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">No sessions yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first Americano session to get started
                  </p>
                  {user && (
                    <Button asChild>
                      <Link to="/americano/create">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Session
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sessions.map((session) => (
                  <Link key={session.id} to={`/americano/${session.id}`}>
                    <Card className="hover:border-success/50 transition-colors cursor-pointer h-full">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg">{session.name}</CardTitle>
                          <div className="flex flex-col gap-1 items-end">
                            {getStatusBadge(session.status)}
                            {getModeBadge(session.mode)}
                          </div>
                        </div>
                        <CardDescription>
                          {session.mode === "team"
                            ? `${session.team_count} teams • ${session.total_rounds} matches`
                            : `${session.player_count} players • ${session.total_rounds} rounds`}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {session.mode === "team"
                              ? `${session.current_round} of ${session.total_rounds} matches`
                              : `Round ${session.current_round} of ${session.total_rounds}`}
                          </span>
                          {session.status === "completed" && <CheckCircle className="w-4 h-4 text-success" />}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
          </motion.div>
        </main>
      </PullToRefresh>
    </div>
  );
}
