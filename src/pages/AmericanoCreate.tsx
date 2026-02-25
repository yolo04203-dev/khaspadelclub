import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Trash2, Shuffle, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermission } from "@/hooks/usePermission";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { logger } from "@/lib/logger";

interface Team {
  teamName: string;
  player1: string;
  player2: string;
}

export default function AmericanoCreate() {
  const { user, isLoading: authLoading } = useAuth();
  const { hasPermission, isLoading: permLoading } = usePermission("create_americano");
  const navigate = useNavigate();
  const { toast } = useToast();

  const [mode, setMode] = useState<"individual" | "team">("individual");
  const [sessionName, setSessionName] = useState("");
  const [pointsPerRound, setPointsPerRound] = useState(21);
  const [totalRounds, setTotalRounds] = useState(4);
  const [players, setPlayers] = useState<string[]>(["", "", "", ""]);
  const [teams, setTeams] = useState<Team[]>([
    { teamName: "", player1: "", player2: "" },
    { teamName: "", player1: "", player2: "" },
  ]);
  const [numberOfCourts, setNumberOfCourts] = useState(1);
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

  const addTeam = () => {
    setTeams([...teams, { teamName: "", player1: "", player2: "" }]);
  };

  const removeTeam = (index: number) => {
    if (teams.length > 2) {
      setTeams(teams.filter((_, i) => i !== index));
    }
  };

  const updateTeam = (index: number, field: keyof Team, value: string) => {
    const updated = [...teams];
    updated[index] = { ...updated[index], [field]: value };
    setTeams(updated);
  };

  // Calculate total matches for team mode (round-robin)
  const calculateTotalMatches = (teamCount: number) => {
    return (teamCount * (teamCount - 1)) / 2;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sessionName.trim()) {
      toast({
        title: "Missing name",
        description: "Please enter a session name",
        variant: "destructive",
      });
      return;
    }

    if (mode === "individual") {
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

      setIsSubmitting(true);

      try {
        const { data: session, error: sessionError } = await supabase
          .from("americano_sessions")
          .insert({
            name: sessionName.trim(),
            created_by: user!.id,
            points_per_round: pointsPerRound,
            total_rounds: totalRounds,
            mode: "individual",
            number_of_courts: numberOfCourts,
          })
          .select()
          .single();

        if (sessionError) throw sessionError;

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
        logger.apiError("createAmericanoSession", error);
        toast({
          title: "Error",
          description: "Failed to create session. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Team mode
      const validTeams = teams.filter(
        (t) => t.teamName.trim() && t.player1.trim() && t.player2.trim()
      );

      if (validTeams.length < 2) {
        toast({
          title: "Not enough teams",
          description: "You need at least 2 complete teams for Team Americano",
          variant: "destructive",
        });
        return;
      }

      setIsSubmitting(true);

      try {
        // Calculate total rounds based on round-robin matches
        const totalMatches = calculateTotalMatches(validTeams.length);

        const { data: session, error: sessionError } = await supabase
          .from("americano_sessions")
          .insert({
            name: sessionName.trim(),
            created_by: user!.id,
            points_per_round: pointsPerRound,
            total_rounds: totalMatches,
            mode: "team",
            number_of_courts: numberOfCourts,
          })
          .select()
          .single();

        if (sessionError) throw sessionError;

        // Insert teams
        const teamInserts = validTeams.map((team) => ({
          session_id: session.id,
          team_name: team.teamName.trim(),
          player1_name: team.player1.trim(),
          player2_name: team.player2.trim(),
        }));

        const { error: teamsError } = await supabase
          .from("americano_teams")
          .insert(teamInserts);

        if (teamsError) throw teamsError;

        toast({
          title: "Session created!",
          description: `Team Americano session with ${validTeams.length} teams is ready`,
        });

        navigate(`/americano/${session.id}`);
      } catch (error) {
        logger.apiError("createTeamAmericanoSession", error);
        toast({
          title: "Error",
          description: "Failed to create session. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (authLoading || permLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!hasPermission) {
    return (
      <div className="min-h-screen bg-background">
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
        <main className="container py-8">
          <Card className="text-center py-12">
            <CardContent>
              <h2 className="text-xl font-semibold">Access Denied</h2>
              <p className="text-muted-foreground mt-2">You don't have permission to create Americano sessions.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const validTeamCount = teams.filter(
    (t) => t.teamName.trim() && t.player1.trim() && t.player2.trim()
  ).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40 safe-top">
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
              <p className="text-muted-foreground">Set up a new Americano session</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mode Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Session Mode</CardTitle>
                <CardDescription>Choose how players will be grouped</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={mode}
                  onValueChange={(value) => setMode(value as "individual" | "team")}
                  className="grid grid-cols-2 gap-4"
                >
                  <div>
                    <RadioGroupItem
                      value="individual"
                      id="individual"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="individual"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <Shuffle className="mb-3 h-6 w-6" />
                      <span className="font-medium">Individual</span>
                      <span className="text-xs text-muted-foreground text-center mt-1">
                        Rotating partners
                      </span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="team" id="team" className="peer sr-only" />
                    <Label
                      htmlFor="team"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <Users className="mb-3 h-6 w-6" />
                      <span className="font-medium">Team</span>
                      <span className="text-xs text-muted-foreground text-center mt-1">
                        Fixed teams
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

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

                <div className="space-y-2">
                  <Label htmlFor="courts">Number of Courts</Label>
                  <Input
                    id="courts"
                    type="number"
                    min={1}
                    max={10}
                    value={numberOfCourts}
                    onChange={(e) => setNumberOfCourts(parseInt(e.target.value) || 1)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="points">Points per Match</Label>
                    <Input
                      id="points"
                      type="number"
                      min={11}
                      max={32}
                      value={pointsPerRound}
                      onChange={(e) => setPointsPerRound(parseInt(e.target.value))}
                    />
                  </div>
                  {mode === "individual" && (
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
                  )}
                  {mode === "team" && (
                    <div className="space-y-2">
                      <Label>Total Matches</Label>
                      <div className="h-10 flex items-center px-3 rounded-md border border-input bg-muted text-muted-foreground">
                        {calculateTotalMatches(validTeamCount)} matches
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Individual Players */}
            {mode === "individual" && (
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
            )}

            {/* Teams */}
            {mode === "team" && (
              <Card>
                <CardHeader>
                  <CardTitle>Teams</CardTitle>
                  <CardDescription>
                    Add teams with 2 players each. Every team plays every other team.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {teams.map((team, index) => (
                    <Card key={index} className="bg-muted/50">
                      <CardContent className="pt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Team {index + 1}</Label>
                          {teams.length > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTeam(index)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                        <Input
                          placeholder="Team name"
                          value={team.teamName}
                          onChange={(e) => updateTeam(index, "teamName", e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Player 1"
                            value={team.player1}
                            onChange={(e) => updateTeam(index, "player1", e.target.value)}
                          />
                          <Input
                            placeholder="Player 2"
                            value={team.player2}
                            onChange={(e) => updateTeam(index, "player2", e.target.value)}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addTeam}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Team
                  </Button>

                  <p className="text-sm text-muted-foreground text-center">
                    {validTeamCount} teams entered • {calculateTotalMatches(validTeamCount)} total matches
                  </p>
                </CardContent>
              </Card>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2" />
              ) : mode === "individual" ? (
                <Shuffle className="w-4 h-4 mr-2" />
              ) : (
                <Users className="w-4 h-4 mr-2" />
              )}
              Create Session
            </Button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
