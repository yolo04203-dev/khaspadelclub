import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Trophy, Users, Calendar, Crown, Banknote } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Tournament {
  id: string;
  name: string;
  format: "single_elimination" | "double_elimination" | "round_robin";
  status: "draft" | "registration" | "in_progress" | "completed" | "cancelled";
  max_teams: number;
  registration_deadline: string | null;
  entry_fee: number | null;
  created_at: string;
  participant_count?: number;
}

export default function Tournaments() {
  const { user, role, isLoading: authLoading } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      // Parallel fetch: tournaments + all participant counts in 2 queries (not N+1)
      const [tournamentsResult, participantsResult] = await Promise.all([
        supabase
          .from("tournaments")
          .select("id, name, format, status, max_teams, registration_deadline, entry_fee, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("tournament_participants")
          .select("tournament_id"),
      ]);

      if (tournamentsResult.error) throw tournamentsResult.error;

      // Count participants per tournament client-side
      const countMap = new Map<string, number>();
      (participantsResult.data || []).forEach(p => {
        countMap.set(p.tournament_id, (countMap.get(p.tournament_id) || 0) + 1);
      });

      const tournamentsWithCounts = (tournamentsResult.data || []).map(t => ({
        ...t,
        participant_count: countMap.get(t.id) || 0,
      }));

      setTournaments(tournamentsWithCounts);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: Tournament["status"]) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      draft: { variant: "secondary", label: "Draft" },
      registration: { variant: "default", label: "Registration Open" },
      in_progress: { variant: "default", label: "In Progress" },
      completed: { variant: "outline", label: "Completed" },
      cancelled: { variant: "destructive", label: "Cancelled" },
    };
    const { variant, label } = variants[status] || variants.draft;
    return <Badge variant={variant}>{label}</Badge>;
  };

  const formatLabel = (format: Tournament["format"]) => {
    const labels: Record<string, string> = {
      single_elimination: "Single Elimination",
      double_elimination: "Double Elimination",
      round_robin: "Round Robin",
    };
    return labels[format] || format;
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
          role === "admin" && (
            <Button asChild>
              <Link to="/tournaments/create">
                <Plus className="w-4 h-4 mr-2" />
                New Tournament
              </Link>
            </Button>
          )
        }
      />

      <main className="container py-8 pb-safe-nav sm:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-warning" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Tournaments</h1>
                <p className="text-muted-foreground">Bracket-based competitions</p>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <Card className="mb-8 bg-gradient-to-r from-warning/5 to-warning/10 border-warning/20">
            <CardContent className="py-6">
              <h3 className="font-semibold text-foreground mb-3">Tournament Formats</h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Crown className="w-4 h-4 mt-0.5 text-warning" />
                  <span><strong>Single Elimination:</strong> One loss and you're out</span>
                </div>
                <div className="flex items-start gap-2">
                  <Trophy className="w-4 h-4 mt-0.5 text-warning" />
                  <span><strong>Double Elimination:</strong> Two losses to be eliminated</span>
                </div>
                <div className="flex items-start gap-2">
                  <Users className="w-4 h-4 mt-0.5 text-warning" />
                  <span><strong>Round Robin:</strong> Everyone plays everyone</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tournaments List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">All Tournaments</h2>

            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="animate-pulse h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="h-5 bg-muted rounded w-2/3" />
                        <div className="h-5 bg-muted rounded w-20" />
                      </div>
                      <div className="h-4 bg-muted rounded w-1/3 mt-2" />
                    </CardHeader>
                    <CardContent>
                      <div className="h-4 bg-muted rounded w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : tournaments.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Trophy className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">No tournaments yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first tournament to get started
                  </p>
                  {role === "admin" && (
                    <Button asChild>
                      <Link to="/tournaments/create">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Tournament
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {tournaments.map((tournament) => (
                  <Link key={tournament.id} to={`/tournaments/${tournament.id}`}>
                    <Card className="hover:border-warning/50 transition-colors cursor-pointer h-full">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg">{tournament.name}</CardTitle>
                          {getStatusBadge(tournament.status)}
                        </div>
                        <CardDescription>
                          {formatLabel(tournament.format)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span>{tournament.participant_count} / {tournament.max_teams}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {(tournament.entry_fee ?? 0) > 0 && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Banknote className="w-4 h-4" />
                                <span>PKR {tournament.entry_fee!.toLocaleString()}</span>
                              </div>
                            )}
                            {tournament.registration_deadline && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                <span>{new Date(tournament.registration_deadline).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
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
    </div>
  );
}
