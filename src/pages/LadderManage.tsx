import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";

import { ArrowLeft, Plus, Trash2, Users, Save, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { JoinRequestsManagement } from "@/components/ladder/JoinRequestsManagement";
import { logger } from "@/lib/logger";

interface LadderCategory {
  id: string;
  name: string;
  description: string | null;
  challenge_range: number;
  display_order: number;
  entry_fee: number | null;
  entry_fee_currency: string | null;
}

interface TeamInCategory {
  ranking_id: string;
  team_id: string;
  team_name: string;
  rank: number;
}

interface AvailableTeam {
  id: string;
  name: string;
}

export default function LadderManage() {
  const { id } = useParams<{ id: string }>();
  const { role } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");
  const [maxTeams, setMaxTeams] = useState(16);
  const [categories, setCategories] = useState<LadderCategory[]>([]);
  const [teamsByCategory, setTeamsByCategory] = useState<Record<string, TeamInCategory[]>>({});
  const [availableTeams, setAvailableTeams] = useState<AvailableTeam[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        // Fetch ladder
        const { data: ladder, error: ladderError } = await supabase
          .from("ladders")
          .select("*")
          .eq("id", id)
          .single();

        if (ladderError) throw ladderError;

        setName(ladder.name);
        setDescription(ladder.description || "");
        setStatus(ladder.status);
        setMaxTeams(ladder.max_teams || 16);

        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("ladder_categories")
          .select("*")
          .eq("ladder_id", id)
          .order("display_order", { ascending: true });

        if (categoriesError) throw categoriesError;
        setCategories(categoriesData || []);

        // Fetch teams in each category
        const categoryIds = (categoriesData || []).map((c) => c.id);
        if (categoryIds.length > 0) {
          const { data: rankingsData } = await supabase
            .from("ladder_rankings")
            .select(`
              id,
              rank,
              ladder_category_id,
              team:teams (id, name)
            `)
            .in("ladder_category_id", categoryIds)
            .order("rank", { ascending: true });

          const grouped: Record<string, TeamInCategory[]> = {};
          (rankingsData || []).forEach((r) => {
            const catId = r.ladder_category_id!;
            if (!grouped[catId]) grouped[catId] = [];
            grouped[catId].push({
              ranking_id: r.id,
              team_id: (r.team as any).id,
              team_name: (r.team as any).name,
              rank: r.rank,
            });
          });
          setTeamsByCategory(grouped);
        }

        // Fetch all teams not in any category of this ladder
        // Also fetch member counts to filter out incomplete teams
        const { data: allTeams } = await supabase.from("teams").select("id, name");
        const { data: teamMembers } = await supabase
          .from("team_members")
          .select("team_id");
        const { data: assignedRankings } = await supabase
          .from("ladder_rankings")
          .select("team_id")
          .in("ladder_category_id", categoryIds);

        // Count members per team
        const memberCounts: Record<string, number> = {};
        (teamMembers || []).forEach((m) => {
          memberCounts[m.team_id] = (memberCounts[m.team_id] || 0) + 1;
        });

        const assignedTeamIds = new Set((assignedRankings || []).map((r) => r.team_id));
        // Only show teams that have 2 members OR use "Player1 & Player2" name format
        const available = (allTeams || []).filter((t) => {
          if (assignedTeamIds.has(t.id)) return false;
          const hasFullRoster = (memberCounts[t.id] || 0) >= 2;
          const hasManualPartner = t.name.includes("&");
          return hasFullRoster || hasManualPartner;
        });
        setAvailableTeams(available);
      } catch (error) {
        logger.apiError("fetchLadder", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, refreshKey]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("ladders")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          status,
          max_teams: maxTeams,
        })
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Ladder updated!", description: "Changes saved successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCategory = async () => {
    try {
      const newName = `Category ${String.fromCharCode(65 + categories.length)}`;
      const { data, error } = await supabase
        .from("ladder_categories")
        .insert({
          ladder_id: id,
          name: newName,
          display_order: categories.length,
          challenge_range: 5,
        })
        .select()
        .single();

      if (error) throw error;
      setCategories([...categories, data]);
      toast({ title: "Category added!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from("ladder_categories")
        .delete()
        .eq("id", categoryId);

      if (error) throw error;

      setCategories(categories.filter((c) => c.id !== categoryId));
      const newTeams = { ...teamsByCategory };
      delete newTeams[categoryId];
      setTeamsByCategory(newTeams);
      toast({ title: "Category deleted!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleAddTeamToCategory = async () => {
    if (!selectedCategory || !selectedTeam) return;

    try {
      const teamsInCategory = teamsByCategory[selectedCategory] || [];
      const nextRank = teamsInCategory.length > 0 
        ? Math.max(...teamsInCategory.map((t) => t.rank)) + 1 
        : 1;

      const { data, error } = await supabase
        .from("ladder_rankings")
        .insert({
          team_id: selectedTeam,
          ladder_category_id: selectedCategory,
          rank: nextRank,
        })
        .select(`
          id,
          rank,
          team:teams (id, name)
        `)
        .single();

      if (error) throw error;

      const newTeam: TeamInCategory = {
        ranking_id: data.id,
        team_id: (data.team as any).id,
        team_name: (data.team as any).name,
        rank: data.rank,
      };

      setTeamsByCategory({
        ...teamsByCategory,
        [selectedCategory]: [...(teamsByCategory[selectedCategory] || []), newTeam],
      });

      setAvailableTeams(availableTeams.filter((t) => t.id !== selectedTeam));
      setSelectedTeam("");
      toast({ title: "Team added to category!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleRemoveTeamFromCategory = async (categoryId: string, rankingId: string, teamId: string, teamName: string) => {
    try {
      // Delete the ranking record entirely (not just set category to null)
      // This allows the team to request to join again
      const { error } = await supabase
        .from("ladder_rankings")
        .delete()
        .eq("id", rankingId);

      if (error) throw error;

      setTeamsByCategory({
        ...teamsByCategory,
        [categoryId]: (teamsByCategory[categoryId] || []).filter((t) => t.ranking_id !== rankingId),
      });

      setAvailableTeams([...availableTeams, { id: teamId, name: teamName }]);
      toast({ title: "Team removed from category!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (role !== "admin" && role !== "super_admin") {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="container flex items-center h-16">
            <Button variant="ghost" size="icon" asChild>
              <Link to={`/ladders/${id}`}>
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <Logo size="sm" showImage={false} className="ml-4" />
          </div>
        </header>
        <main className="container py-8">
          <Card className="text-center py-12">
            <CardContent>
              <h2 className="text-xl font-semibold">Access Denied</h2>
              <p className="text-muted-foreground mt-2">Only administrators can manage ladders.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-40 safe-top">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to={`/ladders/${id}`}>
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <Logo size="sm" showImage={false} />
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </header>

      <main className="container py-8 max-w-4xl">
        <div className="hero-animate">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Manage Ladder</h1>
            <p className="text-muted-foreground mt-2">
              Edit ladder settings and manage categories
            </p>
          </div>

          <div className="space-y-8">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Maximum Teams</Label>
                    <Input
                      type="number"
                      min={2}
                      max={100}
                      value={maxTeams}
                      onChange={(e) => setMaxTeams(parseInt(e.target.value) || 16)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum number of teams allowed across all categories
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Join Requests Management */}
            {categories.length > 0 && (
              <JoinRequestsManagement
                ladderId={id!}
                categoryIds={categories.map((c) => c.id)}
                onRequestHandled={() => {
                  // Refresh data when a request is handled
                  setRefreshKey(k => k + 1);
                }}
              />
            )}

            {/* Categories */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Categories</CardTitle>
                  <Button variant="outline" size="sm" onClick={handleAddCategory}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Category
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {categories.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No categories yet. Add one to get started.
                  </p>
                ) : (
                  categories.map((category) => (
                    <Card key={category.id} className="border-dashed">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{category.name}</CardTitle>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCategory(category.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <CardDescription>
                          Challenge range: {category.challenge_range} positions
                          {(category.entry_fee ?? 0) > 0 && (
                            <span className="ml-2">• Entry fee: {category.entry_fee_currency ?? "PKR"} {(category.entry_fee ?? 0).toLocaleString()}</span>
                          )}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-3 sm:grid-cols-3 mb-4">
                          <div className="space-y-1">
                            <Label className="text-xs">Category Name</Label>
                            <Input
                              value={category.name}
                              onChange={(e) => {
                                setCategories(categories.map(c => c.id === category.id ? { ...c, name: e.target.value } : c));
                              }}
                              onBlur={() => {
                                supabase.from("ladder_categories").update({ name: category.name }).eq("id", category.id).then();
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Challenge Range</Label>
                            <Input
                              type="number"
                              min={1}
                              value={category.challenge_range}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 5;
                                setCategories(categories.map(c => c.id === category.id ? { ...c, challenge_range: val } : c));
                              }}
                              onBlur={() => {
                                supabase.from("ladder_categories").update({ challenge_range: category.challenge_range }).eq("id", category.id).then();
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Entry Fee ({category.entry_fee_currency ?? "PKR"})</Label>
                            <Input
                              type="number"
                              min={0}
                              step={100}
                              value={category.entry_fee ?? 0}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setCategories(categories.map(c => c.id === category.id ? { ...c, entry_fee: val } : c));
                              }}
                              onBlur={() => {
                                supabase.from("ladder_categories").update({ entry_fee: category.entry_fee ?? 0 }).eq("id", category.id).then();
                              }}
                            />
                            <p className="text-xs text-muted-foreground">0 = free</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Teams in this category:</Label>
                          {(teamsByCategory[category.id] || []).length === 0 ? (
                            <p className="text-sm text-muted-foreground">No teams yet</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {(teamsByCategory[category.id] || []).map((team) => (
                                <Badge
                                  key={team.ranking_id}
                                  variant="secondary"
                                  className="flex items-center gap-1"
                                >
                                  #{team.rank} {team.team_name}
                                  <button
                                    onClick={() =>
                                      handleRemoveTeamFromCategory(
                                        category.id,
                                        team.ranking_id,
                                        team.team_id,
                                        team.team_name
                                      )
                                    }
                                    className="ml-1 hover:text-destructive"
                                  >
                                    ×
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Add Team to Category */}
            {categories.length > 0 && availableTeams.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Add Team to Category</CardTitle>
                  <CardDescription>
                    Assign teams to a category to include them in the ladder
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Category</Label>
                      <Select value={selectedCategory || ""} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label>Team</Label>
                      <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select team" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTeams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handleAddTeamToCategory}
                      disabled={!selectedCategory || !selectedTeam}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
