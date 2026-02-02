import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, DollarSign } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [numberOfGroups, setNumberOfGroups] = useState(2);
  const [deadline, setDeadline] = useState("");
  const [entryFee, setEntryFee] = useState<number>(0);
  const [entryFeeCurrency, setEntryFeeCurrency] = useState("PKR");
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
          number_of_groups: numberOfGroups,
          registration_deadline: deadline || null,
          entry_fee: entryFee,
          entry_fee_currency: entryFeeCurrency,
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
                    <Label htmlFor="numberOfGroups">Number of Groups</Label>
                    <Input
                      id="numberOfGroups"
                      type="number"
                      min={2}
                      max={8}
                      value={numberOfGroups}
                      onChange={(e) => setNumberOfGroups(parseInt(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Top 2 from each group qualify for knockout
                    </p>
                  </div>
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
              </CardContent>
            </Card>

            {/* Entry Fee Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Entry Fee
                </CardTitle>
                <CardDescription>Set the entry fee for participating teams</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="entryFee">Amount</Label>
                    <Input
                      id="entryFee"
                      type="number"
                      min={0}
                      step={100}
                      value={entryFee}
                      onChange={(e) => setEntryFee(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={entryFeeCurrency} onValueChange={setEntryFeeCurrency}>
                      <SelectTrigger id="currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PKR">PKR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="AED">AED</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {entryFee > 0 && (
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="text-sm text-muted-foreground">
                      Teams will be asked to pay <span className="font-semibold text-foreground">{entryFeeCurrency} {entryFee.toLocaleString()}</span> to confirm their registration.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tournament Format</CardTitle>
                <CardDescription>Padel tournament with group stage + knockout</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <h4 className="font-medium mb-2">How it works:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Teams are divided into {numberOfGroups} groups</li>
                    <li>Round-robin matches within each group</li>
                    <li>Top 2 teams from each group qualify for knockout</li>
                    <li>Cross-group semi-finals (1st A vs 2nd B, 1st B vs 2nd A)</li>
                    <li>Winners advance to the finals</li>
                  </ul>
                </div>
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
