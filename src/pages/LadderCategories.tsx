import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Users, Settings, UserPlus, Banknote, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { JoinLadderDialog } from "@/components/ladder/JoinLadderDialog";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { logger } from "@/lib/logger";
import { ChevronRight } from "lucide-react";

interface LadderCategoryInfo {
  id: string;
  name: string;
  description: string | null;
  challenge_range: number;
  entry_fee: number | null;
  entry_fee_currency: string | null;
  teamCount: number;
}

interface Ladder {
  id: string;
  name: string;
  description: string | null;
  status: string;
}

export default function LadderCategories() {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const [ladder, setLadder] = useState<Ladder | null>(null);
  const [categories, setCategories] = useState<LadderCategoryInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const [userTeamName, setUserTeamName] = useState<string | null>(null);
  const [userTeamMemberCount, setUserTeamMemberCount] = useState(0);
  const [pendingJoinRequests, setPendingJoinRequests] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    if (!id) return;

    try {
      // Fetch ladder info + categories in parallel
      const [ladderResult, categoriesResult] = await Promise.all([
        supabase.from("ladders").select("id, name, description, status").eq("id", id).single(),
        supabase.from("ladder_categories").select("id, name, description, challenge_range, entry_fee, entry_fee_currency").eq("ladder_id", id).order("display_order", { ascending: true }),
      ]);

      if (ladderResult.error) throw ladderResult.error;
      if (categoriesResult.error) throw categoriesResult.error;

      setLadder(ladderResult.data);

      const cats = categoriesResult.data || [];
      
      // Fetch team counts per category
      let catInfos: LadderCategoryInfo[] = [];
      if (cats.length > 0) {
        const categoryIds = cats.map(c => c.id);
        const { data: rankings } = await supabase
          .from("ladder_rankings")
          .select("ladder_category_id")
          .in("ladder_category_id", categoryIds);

        const countMap = new Map<string, number>();
        (rankings || []).forEach(r => {
          const catId = r.ladder_category_id;
          if (catId) countMap.set(catId, (countMap.get(catId) || 0) + 1);
        });

        catInfos = cats.map(c => ({
          ...c,
          teamCount: countMap.get(c.id) || 0,
        }));
      }

      setCategories(catInfos);

      // Fetch user team info for join dialog
      if (user) {
        const { data: membership } = await supabase
          .from("team_members")
          .select("team_id, team:teams(id, name)")
          .eq("user_id", user.id)
          .maybeSingle();

        const teamId = (membership as any)?.team_id || null;
        setUserTeamId(teamId);
        setUserTeamName(((membership as any)?.team as any)?.name || null);

        if (teamId && cats.length > 0) {
          const categoryIds = cats.map(c => c.id);
          const [memberCountResult, joinRequestsResult, rankedResult] = await Promise.all([
            supabase.from("team_members").select("*", { count: "exact", head: true }).eq("team_id", teamId),
            supabase.from("ladder_join_requests").select("ladder_category_id").eq("team_id", teamId).eq("status", "pending").in("ladder_category_id", categoryIds),
            supabase.from("ladder_rankings").select("ladder_category_id").eq("team_id", teamId).in("ladder_category_id", categoryIds),
          ]);

          setUserTeamMemberCount(memberCountResult.count || 0);
          const pendingIds = joinRequestsResult.data?.map(r => r.ladder_category_id) || [];
          const rankedIds = rankedResult.data?.map(r => r.ladder_category_id).filter(Boolean) || [];
          setPendingJoinRequests(new Set([...pendingIds, ...rankedIds]));
        }
      }
    } catch (error) {
      logger.apiError("fetchLadderCategories", error);
    } finally {
      setIsLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const isAdmin = role === "admin" || role === "super_admin";

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background">
        <header className="border-b border-border bg-card sticky top-0 z-40 safe-top">
          <div className="container flex items-center h-16">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/ladders"><ArrowLeft className="w-4 h-4" /></Link>
            </Button>
            <Logo size="sm" showImage={false} className="ml-4" />
          </div>
        </header>
        <main className="container py-6 sm:py-8">
          <div className="mb-6 text-center">
            <div className="h-10 w-48 bg-muted rounded mx-auto mb-2 animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded mx-auto animate-pulse" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!ladder) {
    return (
      <div className="min-h-dvh bg-background">
        <header className="border-b border-border bg-card safe-top">
          <div className="container flex items-center h-16">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/ladders"><ArrowLeft className="w-4 h-4" /></Link>
            </Button>
            <Logo size="sm" showImage={false} className="ml-4" />
          </div>
        </header>
        <main className="container py-8">
          <Card className="text-center py-12">
            <CardContent>
              <h2 className="text-xl font-semibold">Ladder not found</h2>
              <p className="text-muted-foreground mt-2">The ladder you're looking for doesn't exist.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-40 safe-top">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/ladders"><ArrowLeft className="w-4 h-4" /></Link>
            </Button>
            <Logo size="sm" showImage={false} />
          </div>
          <div className="flex items-center gap-2">
            {user && userTeamId && categories.length > 0 && (
              <JoinLadderDialog
                categories={categories}
                teamId={userTeamId}
                teamName={userTeamName || "Your Team"}
                existingRequests={pendingJoinRequests}
                onRequestSubmitted={fetchData}
                teamMemberCount={userTeamMemberCount}
              />
            )}
            {isAdmin && (
              <Button variant="outline" size="icon" className="sm:w-auto sm:px-4" asChild>
                <Link to={`/ladders/${id}/manage`}>
                  <Settings className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Manage</span>
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <PullToRefresh onRefresh={handleRefresh} className="min-h-[calc(100dvh-4rem)]">
        <main className="container py-6 sm:py-8 pb-safe-nav sm:pb-8">
          <div className="animate-fade-in">
            <div className="mb-6 sm:mb-8 text-center">
              <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2">{ladder.name}</h1>
              <p className="text-sm sm:text-base text-muted-foreground">{ladder.description || "Compete and climb the rankings"}</p>
            </div>

            {categories.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No categories yet</h3>
                  <p className="text-muted-foreground">
                    {isAdmin ? "Add categories to this ladder to get started." : "This ladder has no categories configured yet."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {categories.map(cat => (
                  <Link key={cat.id} to={`/ladders/${id}/category/${cat.id}`}>
                    <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30 active:scale-[0.99] mb-3">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 space-y-2">
                            <h3 className="text-lg font-semibold text-foreground">{cat.name}</h3>
                            {cat.description && (
                              <p className="text-sm text-muted-foreground">{cat.description}</p>
                            )}
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Users className="w-3.5 h-3.5" />
                                <span>{cat.teamCount} Teams</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Shield className="w-3.5 h-3.5" />
                                <span>Range: {cat.challenge_range}</span>
                              </div>
                              {(cat.entry_fee ?? 0) > 0 && (
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <Banknote className="w-3.5 h-3.5" />
                                  <span>{cat.entry_fee_currency || "PKR"} {cat.entry_fee?.toLocaleString()}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      </PullToRefresh>
    </div>
  );
}
