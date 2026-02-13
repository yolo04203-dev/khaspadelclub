import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Trash2, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermission } from "@/hooks/usePermission";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

interface CategoryInput {
  id: string;
  name: string;
  description: string;
  challenge_range: number;
}

export default function LadderCreate() {
  const { user, role } = useAuth();
  const { hasPermission, isLoading: permLoading } = usePermission("create_ladder");
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxTeams, setMaxTeams] = useState(16);
  const [categories, setCategories] = useState<CategoryInput[]>([
    { id: crypto.randomUUID(), name: "Category A", description: "Top tier players", challenge_range: 5 },
    { id: crypto.randomUUID(), name: "Category B", description: "Intermediate players", challenge_range: 5 },
  ]);

  const addCategory = () => {
    setCategories([
      ...categories,
      {
        id: crypto.randomUUID(),
        name: `Category ${String.fromCharCode(65 + categories.length)}`,
        description: "",
        challenge_range: 5,
      },
    ]);
  };

  const removeCategory = (id: string) => {
    if (categories.length <= 1) {
      toast({
        title: "Cannot remove",
        description: "A ladder must have at least one category.",
        variant: "destructive",
      });
      return;
    }
    setCategories(categories.filter((c) => c.id !== id));
  };

  const updateCategory = (id: string, field: keyof CategoryInput, value: string | number) => {
    setCategories(
      categories.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a ladder name.",
        variant: "destructive",
      });
      return;
    }

    if (categories.some((c) => !c.name.trim())) {
      toast({
        title: "Category names required",
        description: "All categories must have a name.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create ladder
      const { data: ladder, error: ladderError } = await supabase
        .from("ladders")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          created_by: user?.id,
          status: "active",
          max_teams: maxTeams,
        })
        .select()
        .single();

      if (ladderError) throw ladderError;

      // Create categories
      const categoryInserts = categories.map((cat, index) => ({
        ladder_id: ladder.id,
        name: cat.name.trim(),
        description: cat.description.trim() || null,
        display_order: index,
        challenge_range: cat.challenge_range,
      }));

      const { error: categoriesError } = await supabase
        .from("ladder_categories")
        .insert(categoryInserts);

      if (categoriesError) throw categoriesError;

      toast({
        title: "Ladder created!",
        description: `${name} has been created with ${categories.length} categories.`,
      });

      navigate(`/ladders/${ladder.id}`);
    } catch (error: any) {
      toast({
        title: "Error creating ladder",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (permLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="container flex items-center h-16">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/ladders">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <Logo size="sm" className="ml-4" />
          </div>
        </header>
        <main className="container py-8">
          <Card className="text-center py-12">
            <CardContent>
              <h2 className="text-xl font-semibold">Access Denied</h2>
              <p className="text-muted-foreground mt-2">You don't have permission to create ladders.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container flex items-center h-16">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/ladders">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <Logo size="sm" className="ml-4" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Create Ladder</h1>
            <p className="text-muted-foreground mt-2">
              Set up a new ladder competition with skill-based categories
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Enter the ladder name and description</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Ladder Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Spring 2025 Ladder"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxTeams">Maximum Teams</Label>
                  <Input
                    id="maxTeams"
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
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe this ladder competition..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Categories */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Categories</CardTitle>
                    <CardDescription>
                      Define skill-based divisions (e.g., Category A for top players)
                    </CardDescription>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addCategory}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Category
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {categories.map((category, index) => (
                  <Card key={category.id} className="border-dashed">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded bg-muted text-muted-foreground">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <div className="flex-1 space-y-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Category Name *</Label>
                              <Input
                                placeholder="e.g., Category A"
                                value={category.name}
                                onChange={(e) =>
                                  updateCategory(category.id, "name", e.target.value)
                                }
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Challenge Range</Label>
                              <Input
                                type="number"
                                min={1}
                                max={20}
                                value={category.challenge_range}
                                onChange={(e) =>
                                  updateCategory(
                                    category.id,
                                    "challenge_range",
                                    parseInt(e.target.value) || 5
                                  )
                                }
                              />
                              <p className="text-xs text-muted-foreground">
                                Teams can challenge up to {category.challenge_range} positions above
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                              placeholder="e.g., Top tier players"
                              value={category.description}
                              onChange={(e) =>
                                updateCategory(category.id, "description", e.target.value)
                              }
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCategory(category.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" asChild>
                <Link to="/ladders">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Ladder"}
              </Button>
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
