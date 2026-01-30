import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Users, Play, CheckCircle, XCircle, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  format: "single_elimination" | "double_elimination" | "round_robin";
  status: "draft" | "registration" | "in_progress" | "completed" | "cancelled";
  max_teams: number;
  created_by: string;
  winner_team_id: string | null;
}

interface Participant {
  id: string;
  team_id: string;
  seed: number | null;
  is_eliminated: boolean;
  team_name?: string;
}

interface TournamentMatch {
  id: string;
  round_number: number;
  match_number: number;
  team1_id: string | null;
  team2_id: string | null;
  team1_score: number | null;
  team2_score: number | null;
  winner_team_id: string | null;
  is_losers_bracket: boolean;
}

interface UserTeam {
  id: string;
  name: string;
}

export default function TournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [userTeam, setUserTeam] = useState<UserTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<Record<string, { team1: string; team2: string }>>({});

  useEffect(() => {
    if (id) {
      fetchData();
      if (user) fetchUserTeam();
    }
  }, [id, user]);

  const fetchData = async () => {
    try {
      const [tournamentRes, participantsRes, matchesRes] = await Promise.all([
        supabase.from("tournaments").select("*").eq("id", id).single(),
        supabase.from("tournament_participants").select("*").eq("tournament_id", id),
        supabase.from("tournament_matches").select("*").eq("tournament_id", id).order("round_number").order("match_number"),
      ]);

      if (tournamentRes.error) throw tournamentRes.error;
      setTournament(tournamentRes.data);
      setMatches(matchesRes.data || []);

      // Fetch team names for participants
      const participantsWithNames = await Promise.all(
        (participantsRes.data || []).map(async (p) => {
          const { data: team } = await supabase.from("teams").select("name").eq("id", p.team_id).single();
          return { ...p, team_name: team?.name || "Unknown" };
        })
      );
      setParticipants(participantsWithNames);
    } catch (error) {
      console.error("Error fetching tournament:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTeam = async () => {
    if (!user) return;
    const { data: member } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", user.id)
      .eq("is_captain", true)
      .maybeSingle();

    if (member) {
      const { data: team } = await supabase.from("teams").select("id, name").eq("id", member.team_id).single();
      if (team) setUserTeam(team);
    }
  };

  const registerTeam = async () => {
    if (!userTeam || !tournament) return;

    try {
      const { error } = await supabase.from("tournament_participants").insert({
        tournament_id: tournament.id,
        team_id: userTeam.id,
        seed: participants.length + 1,
      });

      if (error) throw error;
      toast({ title: "Registered!", description: `${userTeam.name} has joined the tournament` });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const withdrawTeam = async () => {
    if (!userTeam || !tournament) return;
    const participant = participants.find((p) => p.team_id === userTeam.id);
    if (!participant) return;

    try {
      const { error } = await supabase.from("tournament_participants").delete().eq("id", participant.id);
      if (error) throw error;
      toast({ title: "Withdrawn", description: `${userTeam.name} has left the tournament` });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const generateBracket = async () => {
    if (!tournament || participants.length < 2) return;

    try {
      // Shuffle participants for seeding
      const shuffled = [...participants].sort(() => Math.random() - 0.5);
      const numTeams = shuffled.length;
      const numRounds = Math.ceil(Math.log2(numTeams));
      const matchesPerRound = Math.pow(2, numRounds - 1);

      const bracketMatches: Omit<TournamentMatch, "id">[] = [];

      // Generate first round
      for (let i = 0; i < matchesPerRound; i++) {
        const team1 = shuffled[i * 2];
        const team2 = shuffled[i * 2 + 1];
        
        bracketMatches.push({
          round_number: 1,
          match_number: i + 1,
          team1_id: team1?.team_id || null,
          team2_id: team2?.team_id || null,
          team1_score: null,
          team2_score: null,
          winner_team_id: null,
          is_losers_bracket: false,
        });
      }

      // Generate subsequent rounds (empty, filled as matches complete)
      let matchesInRound = matchesPerRound / 2;
      for (let round = 2; round <= numRounds; round++) {
        for (let i = 0; i < matchesInRound; i++) {
          bracketMatches.push({
            round_number: round,
            match_number: i + 1,
            team1_id: null,
            team2_id: null,
            team1_score: null,
            team2_score: null,
            winner_team_id: null,
            is_losers_bracket: false,
          });
        }
        matchesInRound /= 2;
      }

      const { error: matchError } = await supabase
        .from("tournament_matches")
        .insert(bracketMatches.map((m) => ({ ...m, tournament_id: tournament.id })));

      if (matchError) throw matchError;

      const { error: statusError } = await supabase
        .from("tournaments")
        .update({ status: "in_progress", started_at: new Date().toISOString() })
        .eq("id", tournament.id);

      if (statusError) throw statusError;

      toast({ title: "Tournament started!", description: "Bracket has been generated" });
      fetchData();
    } catch (error) {
      console.error("Error generating bracket:", error);
      toast({ title: "Error", description: "Failed to generate bracket", variant: "destructive" });
    }
  };

  const submitMatchResult = async (match: TournamentMatch) => {
    const scoreData = scores[match.id];
    if (!scoreData) return;

    const team1Score = parseInt(scoreData.team1);
    const team2Score = parseInt(scoreData.team2);

    if (isNaN(team1Score) || isNaN(team2Score) || team1Score === team2Score) {
      toast({ title: "Invalid scores", description: "Scores must be different numbers", variant: "destructive" });
      return;
    }

    const winnerId = team1Score > team2Score ? match.team1_id : match.team2_id;

    try {
      await supabase
        .from("tournament_matches")
        .update({ team1_score: team1Score, team2_score: team2Score, winner_team_id: winnerId })
        .eq("id", match.id);

      // Advance winner to next round
      const nextRoundMatches = matches.filter((m) => m.round_number === match.round_number + 1);
      if (nextRoundMatches.length > 0) {
        const nextMatchIndex = Math.floor((match.match_number - 1) / 2);
        const nextMatch = nextRoundMatches[nextMatchIndex];
        if (nextMatch) {
          const isTeam1 = match.match_number % 2 === 1;
          await supabase
            .from("tournament_matches")
            .update(isTeam1 ? { team1_id: winnerId } : { team2_id: winnerId })
            .eq("id", nextMatch.id);
        }
      } else {
        // Finals - crown winner
        await supabase
          .from("tournaments")
          .update({ status: "completed", winner_team_id: winnerId, completed_at: new Date().toISOString() })
          .eq("id", tournament!.id);
      }

      // Mark loser as eliminated
      const loserId = team1Score < team2Score ? match.team1_id : match.team2_id;
      await supabase
        .from("tournament_participants")
        .update({ is_eliminated: true, eliminated_at: new Date().toISOString() })
        .eq("tournament_id", tournament!.id)
        .eq("team_id", loserId);

      toast({ title: "Match result saved!" });
      fetchData();
    } catch (error) {
      console.error("Error submitting result:", error);
      toast({ title: "Error", description: "Failed to save result", variant: "destructive" });
    }
  };

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return "TBD";
    return participants.find((p) => p.team_id === teamId)?.team_name || "Unknown";
  };

  const isOwner = user?.id === tournament?.created_by;
  const isRegistered = userTeam && participants.some((p) => p.team_id === userTeam.id);
  const canRegister = tournament?.status === "registration" && userTeam && !isRegistered && participants.length < (tournament?.max_teams || 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Tournament not found</p>
      </div>
    );
  }

  const roundsGrouped = matches.reduce((acc, match) => {
    if (!acc[match.round_number]) acc[match.round_number] = [];
    acc[match.round_number].push(match);
    return acc;
  }, {} as Record<number, TournamentMatch[]>);

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

      <main className="container py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-warning" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{tournament.name}</h1>
                <p className="text-muted-foreground">
                  {tournament.format.replace("_", " ")} • {participants.length} / {tournament.max_teams} teams
                </p>
              </div>
            </div>
            <Badge variant={tournament.status === "completed" ? "outline" : "default"}>
              {tournament.status.replace("_", " ")}
            </Badge>
          </div>

          {/* Actions */}
          {tournament.status === "registration" && (
            <Card className="mb-6">
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">Registration is open</p>
                  <p className="text-sm text-muted-foreground">
                    {participants.length} teams registered
                  </p>
                </div>
                <div className="flex gap-2">
                  {canRegister && (
                    <Button onClick={registerTeam}>
                      <Users className="w-4 h-4 mr-2" />
                      Register {userTeam?.name}
                    </Button>
                  )}
                  {isRegistered && (
                    <Button variant="outline" onClick={withdrawTeam}>
                      <XCircle className="w-4 h-4 mr-2" />
                      Withdraw
                    </Button>
                  )}
                  {isOwner && participants.length >= 2 && (
                    <Button onClick={generateBracket}>
                      <Play className="w-4 h-4 mr-2" />
                      Start Tournament
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Winner Banner */}
          {tournament.status === "completed" && tournament.winner_team_id && (
            <Card className="mb-6 bg-gradient-to-r from-rank-gold/10 to-warning/10 border-rank-gold/30">
              <CardContent className="py-6 flex items-center justify-center gap-3">
                <Crown className="w-8 h-8 text-rank-gold" />
                <span className="text-2xl font-bold text-foreground">
                  {getTeamName(tournament.winner_team_id)} wins!
                </span>
              </CardContent>
            </Card>
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Participants */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Participants
                </CardTitle>
              </CardHeader>
              <CardContent>
                {participants.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No teams registered</p>
                ) : (
                  <div className="space-y-2">
                    {participants.map((p, idx) => (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between p-2 rounded ${
                          p.is_eliminated ? "opacity-50" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground w-6">{idx + 1}.</span>
                          <span className={p.is_eliminated ? "line-through" : ""}>{p.team_name}</span>
                        </div>
                        {p.is_eliminated && <XCircle className="w-4 h-4 text-destructive" />}
                        {tournament.winner_team_id === p.team_id && <Crown className="w-4 h-4 text-rank-gold" />}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bracket */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Bracket</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(roundsGrouped).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Bracket will appear when tournament starts</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(roundsGrouped).map(([roundNum, roundMatches]) => (
                      <div key={roundNum}>
                        <h4 className="font-semibold mb-3">
                          {parseInt(roundNum) === Object.keys(roundsGrouped).length ? "Finals" : `Round ${roundNum}`}
                        </h4>
                        <div className="space-y-3">
                          {roundMatches.map((match) => (
                            <Card key={match.id} className={match.winner_team_id ? "bg-muted/50" : ""}>
                              <CardContent className="py-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={match.winner_team_id === match.team1_id ? "font-bold text-success" : ""}>
                                        {getTeamName(match.team1_id)}
                                      </span>
                                      {match.team1_score !== null && (
                                        <span className="text-sm text-muted-foreground">({match.team1_score})</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={match.winner_team_id === match.team2_id ? "font-bold text-success" : ""}>
                                        {getTeamName(match.team2_id)}
                                      </span>
                                      {match.team2_score !== null && (
                                        <span className="text-sm text-muted-foreground">({match.team2_score})</span>
                                      )}
                                    </div>
                                  </div>

                                  {match.winner_team_id ? (
                                    <CheckCircle className="w-5 h-5 text-success" />
                                  ) : match.team1_id && match.team2_id && isOwner ? (
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="number"
                                        className="w-14"
                                        placeholder="0"
                                        value={scores[match.id]?.team1 || ""}
                                        onChange={(e) =>
                                          setScores({ ...scores, [match.id]: { ...scores[match.id], team1: e.target.value } })
                                        }
                                      />
                                      <span>-</span>
                                      <Input
                                        type="number"
                                        className="w-14"
                                        placeholder="0"
                                        value={scores[match.id]?.team2 || ""}
                                        onChange={(e) =>
                                          setScores({ ...scores, [match.id]: { ...scores[match.id], team2: e.target.value } })
                                        }
                                      />
                                      <Button size="sm" onClick={() => submitMatchResult(match)}>
                                        Save
                                      </Button>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">Pending</span>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
