import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, Plus, Users, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

export default function Ladders() {
  const { user, role } = useAuth();
  const [ladders, setLadders] = useState<Ladder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLadders = async () => {
      try {
        // Fetch all ladders
        const { data: laddersData, error: laddersError } = await supabase
          .from("ladders")
          .select("*")
          .order("created_at", { ascending: false });

        if (laddersError) throw laddersError;

        // Fetch categories for each ladder
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("ladder_categories")
          .select("*")
          .order("display_order", { ascending: true });

        if (categoriesError) throw categoriesError;

        // Fetch team counts per category
        const { data: rankingsData } = await supabase
          .from("ladder_rankings")
          .select("ladder_category_id")
          .not("ladder_category_id", "is", null);

        // Build ladder objects with categories and team counts
        const laddersWithCategories: Ladder[] = (laddersData || []).map((ladder) => {
          const categories = (categoriesData || []).filter(
            (cat) => cat.ladder_id === ladder.id
          );
          const categoryIds = categories.map((c) => c.id);
          const teamCount = (rankingsData || []).filter(
            (r) => categoryIds.includes(r.ladder_category_id)
          ).length;

          return {
            ...ladder,
            categories,
            teamCount,
          };
        });

        setLadders(laddersWithCategories);
      } catch (error) {
        console.error("Error fetching ladders:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLadders();
  }, []);

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

      {/* Main Content */}
      <main className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Page Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Ladders
            </h1>
            <p className="text-muted-foreground">
              Compete in skill-based divisions and climb the rankings
            </p>
          </div>

          {/* Ladders Grid */}
          {isLoading ? (
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
          ) : ladders.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No ladders yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  {role === "admin"
                    ? "Create your first ladder to get started!"
                    : "Check back later for upcoming ladder competitions."}
                </p>
                {role === "admin" && (
                  <Button asChild>
                    <Link to="/ladders/create">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Ladder
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
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
                            {ladder.categories.length} categor{ladder.categories.length === 1 ? "y" : "ies"}
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
