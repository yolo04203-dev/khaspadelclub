import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";

import { Plus, Trophy, Calendar, MapPin } from "lucide-react";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { FAB, FABContainer } from "@/components/ui/fab";
import { logger } from "@/lib/logger";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Tournament {
  id: string;
  name: string;
  format: "single_elimination" | "double_elimination" | "round_robin";
  status: "draft" | "registration" | "in_progress" | "completed" | "cancelled";
  max_teams: number;
  registration_deadline: string | null;
  entry_fee: number | null;
  created_at: string;
  start_date: string | null;
  end_date: string | null;
  venue: string | null;
  participant_count?: number;
}

type FilterTab = "all" | "ongoing" | "upcoming" | "completed";

const FILTERS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "ongoing", label: "Ongoing" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
];

function getStatusRibbon(status: Tournament["status"]) {
  switch (status) {
    case "in_progress":
      return { label: "Ongoing", color: "bg-blue-500" };
    case "registration":
    case "draft":
      return { label: "Upcoming", color: "bg-emerald-500" };
    case "completed":
      return { label: "Completed", color: "bg-muted-foreground" };
    case "cancelled":
      return { label: "Cancelled", color: "bg-destructive" };
    default:
      return { label: "Draft", color: "bg-muted-foreground" };
  }
}

function formatDateRange(start: string | null, end: string | null) {
  if (!start) return null;
  const s = format(new Date(start), "dd MMM");
  if (!end) return s;
  const e = format(new Date(end), "dd MMM");
  return `${s} - ${e}`;
}

export default function Tournaments() {
  const { user, role, isLoading: authLoading } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const [tournamentsResult, participantsResult] = await Promise.all([
        supabase
          .from("tournaments")
          .select("id, name, format, status, max_teams, registration_deadline, entry_fee, created_at, start_date, end_date, venue")
          .order("created_at", { ascending: false }),
        supabase
          .from("tournament_participants_public")
          .select("tournament_id"),
      ]);

      if (tournamentsResult.error) throw tournamentsResult.error;

      const countMap = new Map<string, number>();
      (participantsResult.data || []).forEach(p => {
        countMap.set(p.tournament_id!, (countMap.get(p.tournament_id!) || 0) + 1);
      });

      const tournamentsWithCounts = (tournamentsResult.data || []).map(t => ({
        ...t,
        participant_count: countMap.get(t.id) || 0,
      }));

      setTournaments(tournamentsWithCounts);
    } catch (error) {
      logger.apiError("fetchTournaments", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTournaments = useMemo(() => {
    if (activeFilter === "all") return tournaments;
    return tournaments.filter(t => {
      if (activeFilter === "ongoing") return t.status === "in_progress";
      if (activeFilter === "upcoming") return t.status === "registration" || t.status === "draft";
      if (activeFilter === "completed") return t.status === "completed";
      return true;
    });
  }, [tournaments, activeFilter]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader showBack />

      <PullToRefresh onRefresh={async () => { await fetchTournaments(); }} className="flex-1 overflow-auto">
        <main className="container py-4 sm:py-8 pb-safe-nav sm:pb-8">
          <div className="hero-animate">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-warning" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Tournaments</h1>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                    activeFilter === f.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Tournaments List */}
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-5 bg-muted rounded w-2/3 mb-3" />
                      <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredTournaments.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Trophy className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">No tournaments found</h3>
                  <p className="text-sm text-muted-foreground">
                    {activeFilter === "all"
                      ? "No tournaments have been created yet"
                      : `No ${activeFilter} tournaments`}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
                {filteredTournaments.map((tournament) => {
                  const ribbon = getStatusRibbon(tournament.status);
                  const dateRange = formatDateRange(tournament.start_date, tournament.end_date);

                  return (
                    <Link key={tournament.id} to={`/tournaments/${tournament.id}`}>
                      <Card className="relative overflow-hidden hover:border-primary/30 transition-colors cursor-pointer press-scale">
                        {/* Diagonal Ribbon */}
                        <div className="absolute top-0 right-0 w-28 h-28 overflow-hidden pointer-events-none">
                          <div
                            className={cn(
                              "absolute top-[14px] right-[-34px] w-[150px] text-center text-[10px] font-semibold text-white py-1 rotate-45",
                              ribbon.color
                            )}
                          >
                            {ribbon.label}
                          </div>
                        </div>

                        <CardContent className="p-4 pr-12">
                          <h3 className="font-bold text-foreground text-base truncate mb-1">
                            {tournament.name}
                          </h3>

                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{tournament.venue || "Venue TBD"}</span>
                          </div>

                          {dateRange && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Calendar className="w-3.5 h-3.5 shrink-0" />
                              <span>{dateRange}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </PullToRefresh>

      {/* Admin FAB */}
      <FABContainer show={role === "admin" || role === "super_admin"}>
        <FAB
          asChild
          icon={<Plus />}
          label="New Tournament"
          showLabel
          position="bottom-center"
        >
          <Link to="/tournaments/create" />
        </FAB>
      </FABContainer>
    </div>
  );
}
