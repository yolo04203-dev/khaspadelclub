import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Users, Filter, User, Loader2, Clock } from "lucide-react";
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
  preferred_play_times: string[] | null;
  team_id: string | null;
  team_name: string | null;
  team_is_recruiting: boolean;
  team_recruitment_message: string | null;
}

const PAGE_SIZE = 30;
const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced", "Pro"];

export default function Players() {
  const { user } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState<string>("all");
  const [lookingForTeamFilter, setLookingForTeamFilter] = useState<string>("all");
  const [recruitingFilter, setRecruitingFilter] = useState<string>("all");

  const fetchPlayers = useCallback(async (offset: number, append: boolean) => {
    try {
      let query = supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, skill_level, bio, is_looking_for_team, preferred_play_times")
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

      const { data: profiles, error } = await query
        .order("display_name")
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;

      const userIds = profiles?.map(p => p.user_id) || [];
      if (userIds.length === 0) {
        if (!append) setPlayers([]);
        setHasMore(false);
        return;
      }

      const [{ data: teamMembers }, { data: teamsRaw }] = await Promise.all([
        supabase.from("team_members").select("user_id, team_id").in("user_id", userIds),
        supabase.from("teams").select("id, name, is_recruiting, recruitment_message"),
      ]);

      const teamMemberMap = new Map(teamMembers?.map(m => [m.user_id, m.team_id]) || []);
      const teamIds = [...new Set(teamMembers?.map(m => m.team_id) || [])];
      const relevantTeams = (teamsRaw || []).filter(t => teamIds.includes(t.id));
      const teamsMap = new Map(relevantTeams.map(t => [t.id, { name: t.name, is_recruiting: t.is_recruiting, recruitment_message: t.recruitment_message }]));

      let playersData = (profiles || []).map(p => {
        const teamId = teamMemberMap.get(p.user_id) || null;
        const teamInfo = teamId ? teamsMap.get(teamId) : null;
        return {
          ...p,
          preferred_play_times: p.preferred_play_times || null,
          team_id: teamId,
          team_name: teamInfo?.name || null,
          team_is_recruiting: teamInfo?.is_recruiting || false,
          team_recruitment_message: teamInfo?.recruitment_message || null,
        };
      });

      if (recruitingFilter === "yes") {
        playersData = playersData.filter(p => p.team_is_recruiting);
      }

      setHasMore((profiles?.length || 0) >= PAGE_SIZE);
      setPlayers(prev => append ? [...prev, ...playersData] : playersData);
    } catch (error) {
      console.error("Error fetching players:", error);
    }
  }, [user?.id, searchQuery, skillFilter, lookingForTeamFilter, recruitingFilter]);

  // Reset and fetch on filter change
  useEffect(() => {
    setIsLoading(true);
    setHasMore(true);
    const debounce = setTimeout(async () => {
      await fetchPlayers(0, false);
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchPlayers]);

  const loadMore = async () => {
    setIsLoadingMore(true);
    await fetchPlayers(players.length, true);
    setIsLoadingMore(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader showBack />

      <main className="container py-8 max-w-4xl pb-safe-nav sm:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
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

              <Select value={recruitingFilter} onValueChange={setRecruitingFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Team Recruiting" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="yes">Teams Recruiting</SelectItem>
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
                            <div className="mt-0.5">
                              <p className="text-sm text-muted-foreground">
                                Team: {player.team_name}
                                {player.team_is_recruiting && (
                                  <Badge variant="outline" className="ml-2 text-xs border-accent text-accent">
                                    Recruiting
                                  </Badge>
                                )}
                              </p>
                              {player.team_is_recruiting && player.team_recruitment_message && (
                                <p className="text-xs text-muted-foreground italic mt-1">
                                  "{player.team_recruitment_message}"
                                </p>
                              )}
                            </div>
                          )}

                          {player.bio && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {player.bio}
                            </p>
                          )}

                          {player.preferred_play_times && player.preferred_play_times.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                              {player.preferred_play_times.map((time) => (
                                <Badge key={time} variant="outline" className="text-xs">
                                  {time}
                                </Badge>
                              ))}
                            </div>
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

              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Loading...</>
                    ) : (
                      "Load More"
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
