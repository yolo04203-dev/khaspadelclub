import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Users, Trophy, Swords, Settings, Search, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

export default function Admin() {
  const { user, role, isLoading: authLoading } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchAdminData = async () => {
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
          .select("id, name");

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
      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (role === "admin") fetchAdminData();
    else setIsLoading(false);
  }, [role]);

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
          <Badge variant="default" className="bg-accent text-accent-foreground">
            Admin
          </Badge>
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
            <h1 className="text-3xl font-bold text-foreground mb-2">Admin Panel</h1>
            <p className="text-muted-foreground">Manage players, teams, and matches</p>
          </div>

          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Players</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{players.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teams.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Matches</CardTitle>
                <Swords className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{matches.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search players or teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="players" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="players">
                <Users className="w-4 h-4 mr-2" />
                Players
              </TabsTrigger>
              <TabsTrigger value="teams">
                <Trophy className="w-4 h-4 mr-2" />
                Teams
              </TabsTrigger>
              <TabsTrigger value="matches">
                <Swords className="w-4 h-4 mr-2" />
                Matches
              </TabsTrigger>
            </TabsList>

            <TabsContent value="players">
              <Card>
                <CardHeader>
                  <CardTitle>All Players</CardTitle>
                  <CardDescription>View and manage all registered players</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead>Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPlayers.map(player => (
                        <TableRow key={player.id}>
                          <TableCell className="font-medium">
                            {player.display_name || "Unknown"}
                          </TableCell>
                          <TableCell>
                            {player.team_name || <span className="text-muted-foreground">No team</span>}
                          </TableCell>
                          <TableCell>
                            <Badge variant={player.role === "admin" ? "default" : "secondary"}>
                              {player.role}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="teams">
              <Card>
                <CardHeader>
                  <CardTitle>All Teams</CardTitle>
                  <CardDescription>View team rankings and stats</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>W/L</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTeams.map(team => (
                        <TableRow key={team.id}>
                          <TableCell>
                            {team.rank ? `#${team.rank}` : "-"}
                          </TableCell>
                          <TableCell className="font-medium">{team.name}</TableCell>
                          <TableCell>{team.members_count}</TableCell>
                          <TableCell>
                            <span className="text-success">{team.wins}</span>
                            {" / "}
                            <span className="text-destructive">{team.losses}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="matches">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Matches</CardTitle>
                  <CardDescription>View match history and results</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Challenger</TableHead>
                        <TableHead>Challenged</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matches.map(match => (
                        <TableRow key={match.id}>
                          <TableCell>{match.created_at}</TableCell>
                          <TableCell className="font-medium">{match.challenger_name}</TableCell>
                          <TableCell>{match.challenged_name}</TableCell>
                          <TableCell>
                            {match.challenger_score !== null && match.challenged_score !== null
                              ? `${match.challenger_score} - ${match.challenged_score}`
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                match.status === "completed" ? "default" :
                                match.status === "pending" ? "secondary" :
                                "outline"
                              }
                            >
                              {match.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
}
