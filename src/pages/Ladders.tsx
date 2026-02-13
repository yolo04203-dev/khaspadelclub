import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, Plus, Users, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAsyncData } from "@/hooks/useAsyncData";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { safeArray } from "@/lib/safeData";
import { logger } from "@/lib/logger";

interface LadderCategory {
  id: string;
  name: string;
}

interface Ladder {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  categories: LadderCategory[];
  teamCount: number;
}

async function fetchLaddersData(): Promise<Ladder[]> {
  // Fetch ladders with only needed columns
  const [laddersResult, categoriesResult, rankingsResult] = await Promise.all([
    supabase
      .from("ladders")
      .select("id, name, description, status, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("ladder_categories")
      .select("id, name, ladder_id")
      .order("display_order", { ascending: true }),
    supabase
      .from("ladder_rankings")
      .select("ladder_category_id")
      .not("ladder_category_id", "is", null),
  ]);

  if (laddersResult.error) {
    logger.error("Error fetching ladders", laddersResult.error);
    throw new Error("Failed to load ladders. Please try again.");
  }

  if (categoriesResult.error) {
    logger.error("Error fetching categories", categoriesResult.error);
    throw new Error("Failed to load ladder categories.");
  }

  // Build ladder objects with categories and team counts
  const laddersWithCategories: Ladder[] = safeArray(laddersResult.data).map((ladder) => {
    const categories = safeArray(categoriesResult.data).filter(
      (cat) => cat.ladder_id === ladder.id
    );
    const categoryIds = categories.map((c) => c.id);
    const teamCount = safeArray(rankingsResult.data).filter((r) =>
      categoryIds.includes(r.ladder_category_id)
    ).length;

    return {
      ...ladder,
      categories,
      teamCount,
    };
  });

  return laddersWithCategories;
}

function LaddersContent() {
  const { role } = useAuth();
  const { data: ladders, isLoading, error, retry, isRefreshing } = useAsyncData(
    fetchLaddersData,
    [],
    { retryCount: 3, timeout: 15000 }
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success/20 text-success";
      case "draft":
        return "bg-muted text-muted-foreground";
      case "archived":
        return "bg-destructive/20 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        showBack
        actions={
          role === "admin" && (
            <Button asChild>
              <Link to="/ladders/create">
                <Plus className="w-4 h-4 mr-2" />
                Create Ladder
              </Link>
            </Button>
          )
        }
      />

      <main className="container py-8 pb-safe-nav sm:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Page Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-foreground mb-2">Ladders</h1>
            <p className="text-muted-foreground">
              Compete in skill-based divisions and climb the rankings
            </p>
          </div>

          {/* Error State */}
          {error && (
            <ErrorState
              error={error}
              onRetry={retry}
              isRetrying={isRefreshing}
              title="Couldn't load ladders"
            />
          )}

          {/* Loading State */}
          {isLoading && !error && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-16 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && ladders && ladders.length === 0 && (
            <EmptyState
              icon={Trophy}
              title="No ladders yet"
              description={
                role === "admin"
                  ? "Create your first ladder to get started!"
                  : "Check back later for upcoming ladder competitions."
              }
              action={
                role === "admin"
                  ? { label: "Create Ladder", href: "/ladders/create" }
                  : undefined
              }
            />
          )}

          {/* Ladders Grid */}
          {!isLoading && !error && ladders && ladders.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {ladders.map((ladder) => (
                <Link key={ladder.id} to={`/ladders/${ladder.id}`}>
                  <Card className="hover:border-primary/50 transition-all cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-accent" />
                            {ladder.name}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {ladder.description || "No description"}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(ladder.status)}>
                          {ladder.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Layers className="w-4 h-4" />
                          <span>
                            {ladder.categories.length} categor
                            {ladder.categories.length === 1 ? "y" : "ies"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{ladder.teamCount} teams</span>
                        </div>
                      </div>
                      {ladder.categories.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {ladder.categories.map((cat) => (
                            <Badge key={cat.id} variant="secondary">
                              {cat.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}

export default function Ladders() {
  return (
    <RouteErrorBoundary routeName="Ladders">
      <LaddersContent />
    </RouteErrorBoundary>
  );
}
