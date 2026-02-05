import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Users, Filter, User, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Player {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  skill_level: string | null;
  bio: string | null;
  is_looking_for_team: boolean;
  team_id: string | null;
  team_name: string | null;
}

const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced", "Pro"];

export default function Players() {
  const { user } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState<string>("all");
  const [lookingForTeamFilter, setLookingForTeamFilter] = useState<string>("all");

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        // Fetch all profiles
        let query = supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url, skill_level, bio, is_looking_for_team")
          .neq("user_id", user?.id || "");

        if (searchQuery) {
          query = query.ilike("display_name", `%${searchQuery}%`);
        }

        if (skillFilter !== "all") {
          query = query.eq("skill_level", skillFilter);
        }

        if (lookingForTeamFilter === "yes") {
          query = query.eq("is_looking_for_team", true);
        } else if (lookingForTeamFilter === "no") {
          query = query.eq("is_looking_for_team", false);
        }

        const { data: profiles, error } = await query.order("display_name").limit(50);

        if (error) throw error;

        // Get team membership info
        const userIds = profiles?.map(p => p.user_id) || [];
        const { data: teamMembers } = await supabase
          .from("team_members")
          .select("user_id, team_id")
          .in("user_id", userIds);

        const teamIds = [...new Set(teamMembers?.map(m => m.team_id) || [])];
        const { data: teams } = await supabase
          .from("teams")
          .select("id, name")
          .in("id", teamIds);

        const teamMemberMap = new Map(teamMembers?.map(m => [m.user_id, m.team_id]) || []);
        const teamsMap = new Map(teams?.map(t => [t.id, t.name]) || []);

        setPlayers(
          (profiles || []).map(p => {
            const teamId = teamMemberMap.get(p.user_id) || null;
            return {
              ...p,
              team_id: teamId,
              team_name: teamId ? teamsMap.get(teamId) || null : null,
            };
          })
        );
      } catch (error) {
        console.error("Error fetching players:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchPlayers, 300);
    return () => clearTimeout(debounce);
  }, [user?.id, searchQuery, skillFilter, lookingForTeamFilter]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader showBack />

      <main className="container py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">Find Players</h1>
            <p className="text-muted-foreground">
              Discover other players and build your team
            </p>
          </div>

          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Filters:</span>
              </div>
              
              <Select value={skillFilter} onValueChange={setSkillFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Skill Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Skill Levels</SelectItem>
                  {SKILL_LEVELS.map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={lookingForTeamFilter} onValueChange={setLookingForTeamFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Looking for Team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Players</SelectItem>
                  <SelectItem value="yes">Looking for Team</SelectItem>
                  <SelectItem value="no">Has Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Players List */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : players.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No players found
                </h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filters
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {players.map((player) => (
                <motion.div
                  key={player.user_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-14 h-14 border">
                          <AvatarImage src={player.avatar_url || undefined} />
                          <AvatarFallback className="text-lg bg-accent/20 text-accent">
                            {(player.display_name || "?").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground">
                              {player.display_name || "Unknown Player"}
                            </h3>
                            {player.skill_level && (
                              <Badge variant="secondary" className="text-xs">
                                {player.skill_level}
                              </Badge>
                            )}
                            {player.is_looking_for_team && (
                              <Badge className="text-xs bg-accent text-accent-foreground">
                                Looking for team
                              </Badge>
                            )}
                          </div>

                          {player.team_name && (
                            <p className="text-sm text-muted-foreground mt-0.5">
                              Team: {player.team_name}
                            </p>
                          )}

                          {player.bio && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {player.bio}
                            </p>
                          )}
                        </div>

                        <Button asChild variant="outline" size="sm">
                          <Link to={`/players/${player.user_id}`}>
                            <User className="w-4 h-4 mr-2" />
                            View
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
