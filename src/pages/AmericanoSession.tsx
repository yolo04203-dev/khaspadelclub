import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Trophy, Users, CheckCircle, Shuffle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Player {
  id: string;
  player_name: string;
  total_points: number;
  matches_played: number;
}

interface Round {
  id: string;
  round_number: number;
  court_number: number;
  team1_player1_id: string;
  team1_player2_id: string;
  team2_player1_id: string;
  team2_player2_id: string;
  team1_score: number | null;
  team2_score: number | null;
  completed_at: string | null;
}

interface Session {
  id: string;
  name: string;
  status: "draft" | "in_progress" | "completed" | "cancelled";
  points_per_round: number;
  total_rounds: number;
  current_round: number;
  created_by: string;
}

export default function AmericanoSession() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [session, setSession] = useState<Session | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<Record<string, { team1: string; team2: string }>>({});

  useEffect(() => {
    if (id) fetchSessionData();
  }, [id]);

  const fetchSessionData = async () => {
    try {
      const [sessionRes, playersRes, roundsRes] = await Promise.all([
        supabase.from("americano_sessions").select("*").eq("id", id).single(),
        supabase.from("americano_players").select("*").eq("session_id", id).order("total_points", { ascending: false }),
        supabase.from("americano_rounds").select("*").eq("session_id", id).order("round_number").order("court_number"),
      ]);

      if (sessionRes.error) throw sessionRes.error;
      setSession(sessionRes.data);
      setPlayers(playersRes.data || []);
      setRounds(roundsRes.data || []);
    } catch (error) {
      console.error("Error fetching session:", error);
      toast({ title: "Error", description: "Failed to load session", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generateRound = (playerList: Player[], roundNumber: number): Omit<Round, "id" | "completed_at">[] => {
    // Shuffle players for randomization
    const shuffled = [...playerList].sort(() => Math.random() - 0.5);
    const matches: Omit<Round, "id" | "completed_at">[] = [];
    
    // Create matches - 4 players per match (2v2)
    for (let i = 0; i < shuffled.length; i += 4) {
      matches.push({
        round_number: roundNumber,
        court_number: Math.floor(i / 4) + 1,
        team1_player1_id: shuffled[i].id,
        team1_player2_id: shuffled[i + 1].id,
        team2_player1_id: shuffled[i + 2].id,
        team2_player2_id: shuffled[i + 3].id,
        team1_score: null,
        team2_score: null,
      });
    }
    
    return matches;
  };

  const startSession = async () => {
    if (!session || players.length < 4) return;

    try {
      // Generate first round
      const firstRoundMatches = generateRound(players, 1);
      
      const { error: roundsError } = await supabase
        .from("americano_rounds")
        .insert(firstRoundMatches.map(m => ({ ...m, session_id: session.id })));

      if (roundsError) throw roundsError;

      const { error: sessionError } = await supabase
        .from("americano_sessions")
        .update({ status: "in_progress", current_round: 1, started_at: new Date().toISOString() })
        .eq("id", session.id);

      if (sessionError) throw sessionError;

      toast({ title: "Session started!", description: "Round 1 matches have been generated" });
      fetchSessionData();
    } catch (error) {
      console.error("Error starting session:", error);
      toast({ title: "Error", description: "Failed to start session", variant: "destructive" });
    }
  };

  const submitScore = async (round: Round) => {
    const scoreData = scores[round.id];
    if (!scoreData) return;

    const team1Score = parseInt(scoreData.team1);
    const team2Score = parseInt(scoreData.team2);

    if (isNaN(team1Score) || isNaN(team2Score)) {
      toast({ title: "Invalid scores", description: "Please enter valid numbers", variant: "destructive" });
      return;
    }

    try {
      // Update round score
      const { error: roundError } = await supabase
        .from("americano_rounds")
        .update({ team1_score: team1Score, team2_score: team2Score, completed_at: new Date().toISOString() })
        .eq("id", round.id);

      if (roundError) throw roundError;

      // Update player points
      const playerUpdates = [
        { id: round.team1_player1_id, points: team1Score },
        { id: round.team1_player2_id, points: team1Score },
        { id: round.team2_player1_id, points: team2Score },
        { id: round.team2_player2_id, points: team2Score },
      ];

      for (const update of playerUpdates) {
        const player = players.find(p => p.id === update.id);
        if (player) {
          await supabase
            .from("americano_players")
            .update({ 
              total_points: player.total_points + update.points,
              matches_played: player.matches_played + 1 
            })
            .eq("id", update.id);
        }
      }

      toast({ title: "Score saved!", description: "Player points updated" });
      fetchSessionData();
    } catch (error) {
      console.error("Error submitting score:", error);
      toast({ title: "Error", description: "Failed to save score", variant: "destructive" });
    }
  };

  const advanceRound = async () => {
    if (!session) return;

    const currentRoundMatches = rounds.filter(r => r.round_number === session.current_round);
    const allCompleted = currentRoundMatches.every(r => r.completed_at);

    if (!allCompleted) {
      toast({ title: "Incomplete round", description: "All matches must be completed first", variant: "destructive" });
      return;
    }

    if (session.current_round >= session.total_rounds) {
      // Complete session
      await supabase
        .from("americano_sessions")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", session.id);
      
      toast({ title: "Session complete!", description: "Final standings are ready" });
      fetchSessionData();
      return;
    }

    // Generate next round
    const nextRound = session.current_round + 1;
    const nextRoundMatches = generateRound(players, nextRound);

    await supabase
      .from("americano_rounds")
      .insert(nextRoundMatches.map(m => ({ ...m, session_id: session.id })));

    await supabase
      .from("americano_sessions")
      .update({ current_round: nextRound })
      .eq("id", session.id);

    toast({ title: `Round ${nextRound} started!`, description: "New matches generated" });
    fetchSessionData();
  };

  const getPlayerName = (playerId: string) => players.find(p => p.id === playerId)?.player_name || "Unknown";

  const isOwner = user?.id === session?.created_by;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Session not found</p>
      </div>
    );
  }

  const currentRoundMatches = rounds.filter(r => r.round_number === session.current_round);
  const allCurrentCompleted = currentRoundMatches.every(r => r.completed_at);

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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <Shuffle className="w-6 h-6 text-success" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{session.name}</h1>
                <p className="text-muted-foreground">
                  Round {session.current_round} of {session.total_rounds}
                </p>
              </div>
            </div>
            <Badge variant={session.status === "completed" ? "outline" : "default"}>
              {session.status === "draft" ? "Not Started" : session.status === "in_progress" ? "In Progress" : "Completed"}
            </Badge>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Leaderboard */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-rank-gold" />
                  Standings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead className="text-right">Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {players.map((player, idx) => (
                      <TableRow key={player.id}>
                        <TableCell className="font-medium">{idx + 1}</TableCell>
                        <TableCell>{player.player_name}</TableCell>
                        <TableCell className="text-right font-semibold">{player.total_points}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Matches */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Round {session.current_round} Matches</CardTitle>
                  {isOwner && session.status === "draft" && (
                    <Button onClick={startSession}>
                      <Play className="w-4 h-4 mr-2" />
                      Start Session
                    </Button>
                  )}
                  {isOwner && session.status === "in_progress" && allCurrentCompleted && (
                    <Button onClick={advanceRound}>
                      {session.current_round >= session.total_rounds ? "Complete Session" : "Next Round"}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {session.status === "draft" ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Start the session to generate matches</p>
                  </div>
                ) : currentRoundMatches.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No matches for this round</p>
                ) : (
                  currentRoundMatches.map((round) => (
                    <Card key={round.id} className={round.completed_at ? "bg-muted/50" : ""}>
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground mb-1">Court {round.court_number}</p>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {getPlayerName(round.team1_player1_id)} & {getPlayerName(round.team1_player2_id)}
                              </span>
                              <span className="text-muted-foreground">vs</span>
                              <span className="font-medium">
                                {getPlayerName(round.team2_player1_id)} & {getPlayerName(round.team2_player2_id)}
                              </span>
                            </div>
                          </div>

                          {round.completed_at ? (
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-lg">{round.team1_score}</span>
                              <span className="text-muted-foreground">-</span>
                              <span className="font-bold text-lg">{round.team2_score}</span>
                              <CheckCircle className="w-5 h-5 text-success ml-2" />
                            </div>
                          ) : isOwner ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                className="w-16"
                                placeholder="0"
                                value={scores[round.id]?.team1 || ""}
                                onChange={(e) => setScores({ ...scores, [round.id]: { ...scores[round.id], team1: e.target.value } })}
                              />
                              <span className="text-muted-foreground">-</span>
                              <Input
                                type="number"
                                className="w-16"
                                placeholder="0"
                                value={scores[round.id]?.team2 || ""}
                                onChange={(e) => setScores({ ...scores, [round.id]: { ...scores[round.id], team2: e.target.value } })}
                              />
                              <Button size="sm" onClick={() => submitScore(round)}>Save</Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Pending</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
