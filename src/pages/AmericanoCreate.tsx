import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Trash2, Shuffle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";

export default function AmericanoCreate() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [sessionName, setSessionName] = useState("");
  const [pointsPerRound, setPointsPerRound] = useState(21);
  const [totalRounds, setTotalRounds] = useState(4);
  const [players, setPlayers] = useState<string[]>(["", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addPlayer = () => {
    setPlayers([...players, ""]);
  };

  const removePlayer = (index: number) => {
    if (players.length > 4) {
      setPlayers(players.filter((_, i) => i !== index));
    }
  };

  const updatePlayer = (index: number, name: string) => {
    const updated = [...players];
    updated[index] = name;
    setPlayers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validPlayers = players.filter((p) => p.trim() !== "");
    
    if (validPlayers.length < 4) {
      toast({
        title: "Not enough players",
        description: "You need at least 4 players for Americano mode",
        variant: "destructive",
      });
      return;
    }

    if (validPlayers.length % 4 !== 0) {
      toast({
        title: "Invalid player count",
        description: "Player count must be divisible by 4 for proper pairing",
        variant: "destructive",
      });
      return;
    }

    if (!sessionName.trim()) {
      toast({
        title: "Missing name",
        description: "Please enter a session name",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create session
      const { data: session, error: sessionError } = await supabase
        .from("americano_sessions")
        .insert({
          name: sessionName.trim(),
          created_by: user!.id,
          points_per_round: pointsPerRound,
          total_rounds: totalRounds,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Add players
      const playerInserts = validPlayers.map((name) => ({
        session_id: session.id,
        player_name: name.trim(),
      }));

      const { error: playersError } = await supabase
        .from("americano_players")
        .insert(playerInserts);

      if (playersError) throw playersError;

      toast({
        title: "Session created!",
        description: "Your Americano session is ready to start",
      });

      navigate(`/americano/${session.id}`);
    } catch (error) {
      console.error("Error creating session:", error);
      toast({
        title: "Error",
        description: "Failed to create session. Please try again.",
        variant: "destructive",
      });
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
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container flex items-center h-16">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/americano">
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
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
              <Shuffle className="w-6 h-6 text-success" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Create Americano Session</h1>
              <p className="text-muted-foreground">Set up a new rotating partners session</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Session Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Session Settings</CardTitle>
                <CardDescription>Configure your Americano session</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Session Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Friday Night Americano"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="points">Points per Round</Label>
                    <Input
                      id="points"
                      type="number"
                      min={11}
                      max={32}
                      value={pointsPerRound}
                      onChange={(e) => setPointsPerRound(parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rounds">Total Rounds</Label>
                    <Input
                      id="rounds"
                      type="number"
                      min={1}
                      max={10}
                      value={totalRounds}
                      onChange={(e) => setTotalRounds(parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Players */}
            <Card>
              <CardHeader>
                <CardTitle>Players</CardTitle>
                <CardDescription>
                  Add 4, 8, 12, or 16 players (must be divisible by 4)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {players.map((player, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-6 text-sm text-muted-foreground">{index + 1}.</span>
                    <Input
                      placeholder={`Player ${index + 1} name`}
                      value={player}
                      onChange={(e) => updatePlayer(index, e.target.value)}
                    />
                    {players.length > 4 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePlayer(index)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addPlayer}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Player
                </Button>

                <p className="text-sm text-muted-foreground text-center">
                  {players.filter((p) => p.trim()).length} players entered
                </p>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Shuffle className="w-4 h-4 mr-2" />
              )}
              Create Session
            </Button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
