import { useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Trophy, Swords, Search, Loader2, Layers, LayoutGrid, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminStats } from "@/components/admin/AdminStats";
import { PlayersTab } from "@/components/admin/PlayersTab";
import { TeamsTab } from "@/components/admin/TeamsTab";
import { MatchesTab } from "@/components/admin/MatchesTab";
import { LaddersTab } from "@/components/admin/LaddersTab";
import { TournamentsTab } from "@/components/admin/TournamentsTab";
import { ChallengesTab } from "@/components/admin/ChallengesTab";

interface Player {
  id: string;
  display_name: string | null;
  email: string;
  team_name: string | null;
  role: string;
}

interface Team {
  id: string;
  name: string;
  rank: number | null;
  members_count: number;
  wins: number;
  losses: number;
  is_frozen?: boolean;
  frozen_until?: string | null;
  frozen_reason?: string | null;
}

interface Match {
  id: string;
  challenger_name: string;
  challenged_name: string;
  status: string;
  challenger_score: number | null;
  challenged_score: number | null;
  created_at: string;
}

interface Ladder {
  id: string;
  name: string;
  description: string | null;
  status: string;
  categories_count: number;
  teams_count: number;
  created_at: string;
}

interface Tournament {
  id: string;
  name: string;
  format: string;
  status: string;
  max_teams: number;
  participants_count: number;
  created_at: string;
}

export default function Admin() {
  const { user, role, isLoading: authLoading } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [ladders, setLadders] = useState<Ladder[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAdminData = useCallback(async () => {
    if (role !== "admin") return;

    try {
      // Fetch profiles with team info
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name");

      const { data: members } = await supabase
        .from("team_members")
        .select("user_id, team_id");

      const { data: teamsData } = await supabase
        .from("teams")
        .select("id, name, is_frozen, frozen_until, frozen_reason");

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      const teamsMap = new Map(teamsData?.map(t => [t.id, t.name]) || []);
      const membersMap = new Map(members?.map(m => [m.user_id, m.team_id]) || []);
      const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      const playersData: Player[] = (profiles || []).map(p => ({
        id: p.user_id,
        display_name: p.display_name,
        email: "",
        team_name: membersMap.has(p.user_id) ? teamsMap.get(membersMap.get(p.user_id)!) || null : null,
        role: rolesMap.get(p.user_id) || "player",
      }));

      setPlayers(playersData);

      // Fetch teams with rankings
      const { data: rankings } = await supabase
        .from("ladder_rankings")
        .select("team_id, rank, wins, losses")
        .order("rank");

      const teamMemberCounts = new Map<string, number>();
      members?.forEach(m => {
        teamMemberCounts.set(m.team_id, (teamMemberCounts.get(m.team_id) || 0) + 1);
      });

      const teamsWithRank: Team[] = (teamsData || []).map(t => {
        const ranking = rankings?.find(r => r.team_id === t.id);
        return {
          id: t.id,
          name: t.name,
          rank: ranking?.rank || null,
          members_count: teamMemberCounts.get(t.id) || 0,
          wins: ranking?.wins || 0,
          losses: ranking?.losses || 0,
          is_frozen: t.is_frozen ?? false,
          frozen_until: t.frozen_until,
          frozen_reason: t.frozen_reason,
        };
      }).sort((a, b) => (a.rank || 999) - (b.rank || 999));

      setTeams(teamsWithRank);

      // Fetch recent matches
      const { data: matchesData } = await supabase
        .from("matches")
        .select("id, challenger_team_id, challenged_team_id, status, challenger_score, challenged_score, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (matchesData) {
        const matchesMapped: Match[] = matchesData.map(m => ({
          id: m.id,
          challenger_name: teamsMap.get(m.challenger_team_id) || "Unknown",
          challenged_name: teamsMap.get(m.challenged_team_id) || "Unknown",
          status: m.status,
          challenger_score: m.challenger_score,
          challenged_score: m.challenged_score,
          created_at: new Date(m.created_at).toLocaleDateString(),
        }));
        setMatches(matchesMapped);
      }

      // Fetch ladders
      const { data: laddersData } = await supabase
        .from("ladders")
        .select("id, name, description, status, created_at")
        .order("created_at", { ascending: false });

      const { data: categoriesData } = await supabase
        .from("ladder_categories")
        .select("id, ladder_id");

      const { data: ladderRankings } = await supabase
        .from("ladder_rankings")
        .select("id, ladder_category_id");

      if (laddersData) {
        const laddersMapped: Ladder[] = laddersData.map(l => {
          const categories = categoriesData?.filter(c => c.ladder_id === l.id) || [];
          const categoryIds = categories.map(c => c.id);
          const teamsInLadder = ladderRankings?.filter(r => categoryIds.includes(r.ladder_category_id || "")) || [];
          
          return {
            id: l.id,
            name: l.name,
            description: l.description,
            status: l.status,
            categories_count: categories.length,
            teams_count: teamsInLadder.length,
            created_at: new Date(l.created_at).toLocaleDateString(),
          };
        });
        setLadders(laddersMapped);
      }

      // Fetch tournaments
      const { data: tournamentsData } = await supabase
        .from("tournaments")
        .select("id, name, format, status, max_teams, created_at")
        .order("created_at", { ascending: false });

      const { data: participantsData } = await supabase
        .from("tournament_participants")
        .select("id, tournament_id");

      if (tournamentsData) {
        const tournamentsMapped: Tournament[] = tournamentsData.map(t => ({
          id: t.id,
          name: t.name,
          format: t.format,
          status: t.status,
          max_teams: t.max_teams,
          participants_count: participantsData?.filter(p => p.tournament_id === t.id).length || 0,
          created_at: new Date(t.created_at).toLocaleDateString(),
        }));
        setTournaments(tournamentsMapped);
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [role]);

  useEffect(() => {
    if (role === "admin") fetchAdminData();
    else setIsLoading(false);
  }, [role, fetchAdminData]);

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

  if (role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  const filteredPlayers = players.filter(p => 
    p.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.team_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTeams = teams.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLadders = ladders.filter(l =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTournaments = tournaments.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />

      <main className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Admin Portal</h1>
            <p className="text-muted-foreground">Manage players, teams, ladders, and tournaments</p>
          </div>

          <AdminStats 
            playersCount={players.length}
            teamsCount={teams.length}
            matchesCount={matches.length}
            laddersCount={ladders.length}
          />

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search players, teams, ladders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="players" className="w-full">
            <TabsList className="grid w-full grid-cols-6 mb-6">
              <TabsTrigger value="players">
                <Users className="w-4 h-4 mr-2 hidden sm:inline" />
                Players
              </TabsTrigger>
              <TabsTrigger value="teams">
                <Trophy className="w-4 h-4 mr-2 hidden sm:inline" />
                Teams
              </TabsTrigger>
              <TabsTrigger value="challenges">
                <Zap className="w-4 h-4 mr-2 hidden sm:inline" />
                Challenges
              </TabsTrigger>
              <TabsTrigger value="matches">
                <Swords className="w-4 h-4 mr-2 hidden sm:inline" />
                Matches
              </TabsTrigger>
              <TabsTrigger value="ladders">
                <Layers className="w-4 h-4 mr-2 hidden sm:inline" />
                Ladders
              </TabsTrigger>
              <TabsTrigger value="tournaments">
                <LayoutGrid className="w-4 h-4 mr-2 hidden sm:inline" />
                Tournaments
              </TabsTrigger>
            </TabsList>

            <TabsContent value="players">
              <PlayersTab players={filteredPlayers} onRefresh={fetchAdminData} />
            </TabsContent>

            <TabsContent value="teams">
              <TeamsTab teams={filteredTeams} onRefresh={fetchAdminData} />
            </TabsContent>

            <TabsContent value="challenges">
              <ChallengesTab />
            </TabsContent>

            <TabsContent value="matches">
              <MatchesTab matches={matches} onRefresh={fetchAdminData} />
            </TabsContent>

            <TabsContent value="ladders">
              <LaddersTab ladders={filteredLadders} onRefresh={fetchAdminData} />
            </TabsContent>

            <TabsContent value="tournaments">
              <TournamentsTab tournaments={filteredTournaments} onRefresh={fetchAdminData} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
}
