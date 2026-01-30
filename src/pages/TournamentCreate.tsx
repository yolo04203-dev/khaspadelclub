import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

type TournamentFormat = "single_elimination" | "double_elimination" | "round_robin";

export default function TournamentCreate() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<TournamentFormat>("single_elimination");
  const [maxTeams, setMaxTeams] = useState(8);
  const [deadline, setDeadline] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({ title: "Missing name", description: "Please enter a tournament name", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from("tournaments")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          format,
          max_teams: maxTeams,
          registration_deadline: deadline || null,
          created_by: user!.id,
          status: "registration",
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Tournament created!", description: "Teams can now register" });
      navigate(`/tournaments/${data.id}`);
    } catch (error) {
      console.error("Error creating tournament:", error);
      toast({ title: "Error", description: "Failed to create tournament", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container flex items-center h-16">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/tournaments">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <Logo size="sm" className="ml-4" />
        </div>
      </header>

      <main className="container py-8 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-warning" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Create Tournament</h1>
              <p className="text-muted-foreground">Set up a new bracket competition</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tournament Details</CardTitle>
                <CardDescription>Basic information about your tournament</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tournament Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Spring Championship 2024"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your tournament..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxTeams">Max Teams</Label>
                    <Input
                      id="maxTeams"
                      type="number"
                      min={4}
                      max={64}
                      value={maxTeams}
                      onChange={(e) => setMaxTeams(parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deadline">Registration Deadline</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Format</CardTitle>
                <CardDescription>Choose how teams compete</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={format} onValueChange={(v) => setFormat(v as TournamentFormat)}>
                  <div className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="single_elimination" id="single" />
                    <div className="flex-1">
                      <Label htmlFor="single" className="font-medium cursor-pointer">
                        Single Elimination
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Lose once and you're out. Fast-paced, high stakes.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="double_elimination" id="double" />
                    <div className="flex-1">
                      <Label htmlFor="double" className="font-medium cursor-pointer">
                        Double Elimination
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Two losses to be eliminated. Includes losers bracket.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="round_robin" id="robin" />
                    <div className="flex-1">
                      <Label htmlFor="robin" className="font-medium cursor-pointer">
                        Round Robin
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Everyone plays everyone. Most wins determines the champion.
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Trophy className="w-4 h-4 mr-2" />
              )}
              Create Tournament
            </Button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
