import { useEffect, useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";

import { ArrowLeft, Play, Trophy, Users, CheckCircle, Shuffle, LayoutList, Clock, Target, Hash, Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

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

interface Team {
  id: string;
  team_name: string;
  player1_name: string;
  player2_name: string;
  total_points: number;
  matches_played: number;
  wins: number;
  losses: number;
}

interface TeamMatch {
  id: string;
  round_number: number;
  court_number: number;
  team1_id: string;
  team2_id: string;
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
  mode: string;
  started_at?: string | null;
  completed_at?: string | null;
  number_of_courts?: number;
}

interface PlayerStats {
  id: string;
  name: string;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
  wins: number;
  ties: number;
  losses: number;
}

export default function AmericanoSession() {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const { toast } = useToast();

  const [session, setSession] = useState<Session | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMatches, setTeamMatches] = useState<TeamMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<Record<string, { team1: string; team2: string }>>({});
  const [duration, setDuration] = useState("");
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);

  // Duration timer
  useEffect(() => {
    if (!session?.started_at) return;
    const update = () => {
      const start = new Date(session.started_at!).getTime();
      const end = session.completed_at ? new Date(session.completed_at).getTime() : Date.now();
      const diff = Math.max(0, end - start);
      const mins = Math.floor(diff / 60000);
      const hrs = Math.floor(mins / 60);
      setDuration(hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`);
    };
    update();
    if (!session.completed_at) {
      const interval = setInterval(update, 60000);
      return () => clearInterval(interval);
    }
  }, [session?.started_at, session?.completed_at]);

  useEffect(() => {
    if (id) fetchSessionData();
  }, [id]);

  // Realtime subscription for live standings updates
  useEffect(() => {
    if (!id || !session) return;

    const channels: ReturnType<typeof supabase.channel>[] = [];

    if (session.mode === "team") {
      const teamsChannel = supabase
        .channel(`americano-teams-${id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'americano_teams',
          filter: `session_id=eq.${id}`,
        }, () => {
          supabase.from("americano_teams").select("*").eq("session_id", id).order("total_points", { ascending: false })
            .then(({ data }) => { if (data) setTeams(data); });
        })
        .subscribe();
      channels.push(teamsChannel);

      const matchesChannel = supabase
        .channel(`americano-team-matches-${id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'americano_team_matches',
          filter: `session_id=eq.${id}`,
        }, () => {
          supabase.from("americano_team_matches").select("*").eq("session_id", id).order("round_number").order("court_number")
            .then(({ data }) => { if (data) setTeamMatches(data); });
        })
        .subscribe();
      channels.push(matchesChannel);
    } else {
      const playersChannel = supabase
        .channel(`americano-players-${id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'americano_players',
          filter: `session_id=eq.${id}`,
        }, () => {
          supabase.from("americano_players").select("*").eq("session_id", id).order("total_points", { ascending: false })
            .then(({ data }) => { if (data) setPlayers(data); });
        })
        .subscribe();
      channels.push(playersChannel);

      const roundsChannel = supabase
        .channel(`americano-rounds-${id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'americano_rounds',
          filter: `session_id=eq.${id}`,
        }, () => {
          supabase.from("americano_rounds").select("*").eq("session_id", id).order("round_number").order("court_number")
            .then(({ data }) => { if (data) setRounds(data); });
        })
        .subscribe();
      channels.push(roundsChannel);
    }

    const sessionChannel = supabase
      .channel(`americano-session-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'americano_sessions',
        filter: `id=eq.${id}`,
      }, (payload) => {
        setSession(payload.new as Session);
      })
      .subscribe();
    channels.push(sessionChannel);

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [id, session?.mode]);

  const fetchSessionData = async () => {
    try {
      const sessionRes = await supabase
        .from("americano_sessions")
        .select("*")
        .eq("id", id)
        .single();

      if (sessionRes.error) throw sessionRes.error;
      setSession(sessionRes.data);

      if (sessionRes.data.mode === "team") {
        const [teamsRes, matchesRes] = await Promise.all([
          supabase.from("americano_teams").select("*").eq("session_id", id).order("total_points", { ascending: false }),
          supabase.from("americano_team_matches").select("*").eq("session_id", id).order("round_number").order("court_number"),
        ]);
        setTeams(teamsRes.data || []);
        setTeamMatches(matchesRes.data || []);
      } else {
        const [playersRes, roundsRes] = await Promise.all([
          supabase.from("americano_players").select("*").eq("session_id", id).order("total_points", { ascending: false }),
          supabase.from("americano_rounds").select("*").eq("session_id", id).order("round_number").order("court_number"),
        ]);
        setPlayers(playersRes.data || []);
        setRounds(roundsRes.data || []);
      }
    } catch (error) {
      logger.apiError("fetchSession", error);
      toast({ title: "Error", description: "Failed to load session", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generateRoundRobinSchedule = (teamList: Team[]): Omit<TeamMatch, "id" | "completed_at">[] => {
    const matches: Omit<TeamMatch, "id" | "completed_at">[] = [];
    let matchNumber = 1;
    for (let i = 0; i < teamList.length; i++) {
      for (let j = i + 1; j < teamList.length; j++) {
        matches.push({
          round_number: matchNumber,
          court_number: 1,
          team1_id: teamList[i].id,
          team2_id: teamList[j].id,
          team1_score: null,
          team2_score: null,
        });
        matchNumber++;
      }
    }
    return matches;
  };

  const generateRound = (playerList: Player[], roundNumber: number): Omit<Round, "id" | "completed_at">[] => {
    const shuffled = [...playerList].sort(() => Math.random() - 0.5);
    const matches: Omit<Round, "id" | "completed_at">[] = [];
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
    if (!session) return;
    try {
      if (session.mode === "team") {
        if (teams.length < 2) return;
        const allMatches = generateRoundRobinSchedule(teams);
        const { error: matchesError } = await supabase
          .from("americano_team_matches")
          .insert(allMatches.map((m) => ({ ...m, session_id: session.id })));
        if (matchesError) throw matchesError;
        const { error: sessionError } = await supabase
          .from("americano_sessions")
          .update({ status: "in_progress", current_round: 1, started_at: new Date().toISOString() })
          .eq("id", session.id);
        if (sessionError) throw sessionError;
        toast({ title: "Session started!", description: `${allMatches.length} matches have been generated` });
      } else {
        if (players.length < 4) return;
        const allRoundMatches: Omit<Round, "id" | "completed_at">[] = [];
        for (let r = 1; r <= session.total_rounds; r++) {
          const roundMatches = generateRound(players, r);
          allRoundMatches.push(...roundMatches);
        }
        const { error: roundsError } = await supabase
          .from("americano_rounds")
          .insert(allRoundMatches.map((m) => ({ ...m, session_id: session.id })));
        if (roundsError) throw roundsError;
        const { error: sessionError } = await supabase
          .from("americano_sessions")
          .update({ status: "in_progress", current_round: 1, started_at: new Date().toISOString() })
          .eq("id", session.id);
        if (sessionError) throw sessionError;
        toast({ title: "Session started!", description: `All ${session.total_rounds} rounds generated — play in any order!` });
      }
      fetchSessionData();
    } catch (error) {
      logger.apiError("startSession", error);
      toast({ title: "Error", description: "Failed to start session", variant: "destructive" });
    }
  };

  const submitTeamScore = async (match: TeamMatch) => {
    const scoreData = scores[match.id];
    if (!scoreData) return;
    const team1Score = parseInt(scoreData.team1);
    const team2Score = parseInt(scoreData.team2);
    if (isNaN(team1Score) || isNaN(team2Score)) {
      toast({ title: "Invalid scores", description: "Please enter valid numbers", variant: "destructive" });
      return;
    }
    if (team1Score + team2Score !== session!.points_per_round) {
      toast({ title: "Invalid score total", description: `Scores must add up to ${session!.points_per_round}`, variant: "destructive" });
      return;
    }
    try {
      const { error: matchError } = await supabase
        .from("americano_team_matches")
        .update({ team1_score: team1Score, team2_score: team2Score, completed_at: new Date().toISOString() })
        .eq("id", match.id);
      if (matchError) throw matchError;
      const team1 = teams.find((t) => t.id === match.team1_id);
      const team2 = teams.find((t) => t.id === match.team2_id);
      if (team1) {
        await supabase.from("americano_teams").update({
          total_points: team1.total_points + team1Score,
          matches_played: team1.matches_played + 1,
          wins: team1.wins + (team1Score > team2Score ? 1 : 0),
          losses: team1.losses + (team1Score < team2Score ? 1 : 0),
        }).eq("id", team1.id);
      }
      if (team2) {
        await supabase.from("americano_teams").update({
          total_points: team2.total_points + team2Score,
          matches_played: team2.matches_played + 1,
          wins: team2.wins + (team2Score > team1Score ? 1 : 0),
          losses: team2.losses + (team2Score < team1Score ? 1 : 0),
        }).eq("id", team2.id);
      }
      const completedCount = teamMatches.filter((m) => m.completed_at || m.id === match.id).length;
      if (completedCount === teamMatches.length) {
        await supabase.from("americano_sessions").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", session!.id);
      }
      toast({ title: "Score saved!", description: "Team stats updated" });
      fetchSessionData();
    } catch (error) {
      logger.apiError("submitTeamScore", error);
      toast({ title: "Error", description: "Failed to save score", variant: "destructive" });
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
    if (team1Score + team2Score !== session!.points_per_round) {
      toast({ title: "Invalid score total", description: `Scores must add up to ${session!.points_per_round}`, variant: "destructive" });
      return;
    }
    try {
      const { error: roundError } = await supabase
        .from("americano_rounds")
        .update({ team1_score: team1Score, team2_score: team2Score, completed_at: new Date().toISOString() })
        .eq("id", round.id);
      if (roundError) throw roundError;
      const playerUpdates = [
        { id: round.team1_player1_id, points: team1Score },
        { id: round.team1_player2_id, points: team1Score },
        { id: round.team2_player1_id, points: team2Score },
        { id: round.team2_player2_id, points: team2Score },
      ];
      for (const update of playerUpdates) {
        const player = players.find((p) => p.id === update.id);
        if (player) {
          await supabase.from("americano_players").update({
            total_points: player.total_points + update.points,
            matches_played: player.matches_played + 1,
          }).eq("id", update.id);
        }
      }
      const allRoundsCompleted = rounds.every((r) => r.completed_at || r.id === round.id);
      if (allRoundsCompleted) {
        await supabase.from("americano_sessions").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", session!.id);
        toast({ title: "Session complete!", description: "Final standings are ready" });
      } else {
        toast({ title: "Score saved!", description: "Player points updated" });
      }
      fetchSessionData();
    } catch (error) {
      logger.apiError("submitScore", error);
      toast({ title: "Error", description: "Failed to save score", variant: "destructive" });
    }
  };

  const startEditingMatch = (matchId: string, oldTeam1Score: number | null, oldTeam2Score: number | null) => {
    setEditingMatchId(matchId);
    setScores({ ...scores, [matchId]: { team1: String(oldTeam1Score ?? ""), team2: String(oldTeam2Score ?? "") } });
  };

  const editTeamScore = async (match: TeamMatch) => {
    const scoreData = scores[match.id];
    if (!scoreData) return;
    const newT1 = parseInt(scoreData.team1);
    const newT2 = parseInt(scoreData.team2);
    if (isNaN(newT1) || isNaN(newT2)) {
      toast({ title: "Invalid scores", description: "Please enter valid numbers", variant: "destructive" });
      return;
    }
    if (newT1 + newT2 !== session!.points_per_round) {
      toast({ title: "Invalid score total", description: `Scores must add up to ${session!.points_per_round}`, variant: "destructive" });
      return;
    }
    try {
      const oldT1 = match.team1_score ?? 0;
      const oldT2 = match.team2_score ?? 0;
      // Update match record
      await supabase.from("americano_team_matches").update({ team1_score: newT1, team2_score: newT2 }).eq("id", match.id);
      // Reverse old stats and apply new for team1
      const team1 = teams.find((t) => t.id === match.team1_id);
      if (team1) {
        await supabase.from("americano_teams").update({
          total_points: team1.total_points - oldT1 + newT1,
          wins: team1.wins - (oldT1 > oldT2 ? 1 : 0) + (newT1 > newT2 ? 1 : 0),
          losses: team1.losses - (oldT1 < oldT2 ? 1 : 0) + (newT1 < newT2 ? 1 : 0),
        }).eq("id", team1.id);
      }
      // Reverse old stats and apply new for team2
      const team2 = teams.find((t) => t.id === match.team2_id);
      if (team2) {
        await supabase.from("americano_teams").update({
          total_points: team2.total_points - oldT2 + newT2,
          wins: team2.wins - (oldT2 > oldT1 ? 1 : 0) + (newT2 > newT1 ? 1 : 0),
          losses: team2.losses - (oldT2 < oldT1 ? 1 : 0) + (newT2 < newT1 ? 1 : 0),
        }).eq("id", team2.id);
      }
      setEditingMatchId(null);
      toast({ title: "Score updated!", description: "Team stats recalculated" });
      fetchSessionData();
    } catch (error) {
      logger.apiError("editTeamScore", error);
      toast({ title: "Error", description: "Failed to update score", variant: "destructive" });
    }
  };

  const editScore = async (round: Round) => {
    const scoreData = scores[round.id];
    if (!scoreData) return;
    const newT1 = parseInt(scoreData.team1);
    const newT2 = parseInt(scoreData.team2);
    if (isNaN(newT1) || isNaN(newT2)) {
      toast({ title: "Invalid scores", description: "Please enter valid numbers", variant: "destructive" });
      return;
    }
    if (newT1 + newT2 !== session!.points_per_round) {
      toast({ title: "Invalid score total", description: `Scores must add up to ${session!.points_per_round}`, variant: "destructive" });
      return;
    }
    try {
      const oldT1 = round.team1_score ?? 0;
      const oldT2 = round.team2_score ?? 0;
      // Update round record
      await supabase.from("americano_rounds").update({ team1_score: newT1, team2_score: newT2 }).eq("id", round.id);
      // Reverse old points and apply new for all 4 players
      const playerUpdates = [
        { id: round.team1_player1_id, oldPts: oldT1, newPts: newT1 },
        { id: round.team1_player2_id, oldPts: oldT1, newPts: newT1 },
        { id: round.team2_player1_id, oldPts: oldT2, newPts: newT2 },
        { id: round.team2_player2_id, oldPts: oldT2, newPts: newT2 },
      ];
      for (const upd of playerUpdates) {
        const player = players.find((p) => p.id === upd.id);
        if (player) {
          await supabase.from("americano_players").update({
            total_points: player.total_points - upd.oldPts + upd.newPts,
          }).eq("id", upd.id);
        }
      }
      setEditingMatchId(null);
      toast({ title: "Score updated!", description: "Player points recalculated" });
      fetchSessionData();
    } catch (error) {
      logger.apiError("editScore", error);
      toast({ title: "Error", description: "Failed to update score", variant: "destructive" });
    }
  };

  const advanceRound = async () => {
    if (!session) return;
    const currentRoundMatches = rounds.filter((r) => r.round_number === session.current_round);
    const allCompleted = currentRoundMatches.every((r) => r.completed_at);
    if (!allCompleted) {
      toast({ title: "Incomplete round", description: "All matches must be completed first", variant: "destructive" });
      return;
    }
    if (session.current_round >= session.total_rounds) {
      await supabase.from("americano_sessions").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", session.id);
      toast({ title: "Session complete!", description: "Final standings are ready" });
      fetchSessionData();
      return;
    }
    const nextRound = session.current_round + 1;
    const nextRoundMatches = generateRound(players, nextRound);
    await supabase.from("americano_rounds").insert(nextRoundMatches.map((m) => ({ ...m, session_id: session.id })));
    await supabase.from("americano_sessions").update({ current_round: nextRound }).eq("id", session.id);
    toast({ title: `Round ${nextRound} started!`, description: "New matches generated" });
    fetchSessionData();
  };

  const getPlayerName = (playerId: string) => players.find((p) => p.id === playerId)?.player_name || "Unknown";
  const getTeamName = (teamId: string) => teams.find((t) => t.id === teamId)?.team_name || "Unknown";

  const isOwner = user?.id === session?.created_by || role === "admin" || role === "super_admin";
  const isTeamMode = session?.mode === "team";

  // Compute enhanced individual player stats from rounds data
  const playerStats = useMemo<PlayerStats[]>(() => {
    if (isTeamMode || players.length === 0) return [];

    const statsMap: Record<string, PlayerStats> = {};
    players.forEach((p) => {
      statsMap[p.id] = {
        id: p.id,
        name: p.player_name,
        pointsFor: 0,
        pointsAgainst: 0,
        diff: 0,
        wins: 0,
        ties: 0,
        losses: 0,
      };
    });

    rounds.forEach((r) => {
      if (!r.completed_at || r.team1_score === null || r.team2_score === null) return;
      const t1 = r.team1_score;
      const t2 = r.team2_score;

      // Team 1 players
      [r.team1_player1_id, r.team1_player2_id].forEach((pid) => {
        if (statsMap[pid]) {
          statsMap[pid].pointsFor += t1;
          statsMap[pid].pointsAgainst += t2;
          if (t1 > t2) statsMap[pid].wins++;
          else if (t1 === t2) statsMap[pid].ties++;
          else statsMap[pid].losses++;
        }
      });

      // Team 2 players
      [r.team2_player1_id, r.team2_player2_id].forEach((pid) => {
        if (statsMap[pid]) {
          statsMap[pid].pointsFor += t2;
          statsMap[pid].pointsAgainst += t1;
          if (t2 > t1) statsMap[pid].wins++;
          else if (t2 === t1) statsMap[pid].ties++;
          else statsMap[pid].losses++;
        }
      });
    });

    const result = Object.values(statsMap);
    result.forEach((s) => (s.diff = s.pointsFor - s.pointsAgainst));
    return result.sort((a, b) => b.pointsFor - a.pointsFor || b.diff - a.diff);
  }, [players, rounds, isTeamMode]);

  // Progress stats
  const totalMatches = isTeamMode ? teamMatches.length : rounds.length;
  const completedMatches = isTeamMode
    ? teamMatches.filter((m) => m.completed_at).length
    : rounds.filter((r) => r.completed_at).length;
  const progressPercent = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;

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

  const roundNumbers = [...new Set(rounds.map((r) => r.round_number))].sort((a, b) => a - b);
  const allRoundsCompleted = rounds.length > 0 && rounds.every((r) => r.completed_at);
  const pendingTeamMatches = teamMatches.filter((m) => !m.completed_at);
  const completedTeamMatchesList = teamMatches.filter((m) => m.completed_at);

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

      <main className="container py-6 max-w-3xl mx-auto">
        <div className="hero-animate space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                {isTeamMode ? <Users className="w-6 h-6 text-primary" /> : <Shuffle className="w-6 h-6 text-primary" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">{session.name}</h1>
                  <Badge variant="outline">{isTeamMode ? "Team" : "Individual"}</Badge>
                </div>
                <Badge variant={session.status === "completed" ? "secondary" : session.status === "in_progress" ? "default" : "outline"} className="mt-1">
                  {session.status === "draft" ? "Not Started" : session.status === "in_progress" ? "In Progress" : "Completed"}
                </Badge>
              </div>
            </div>
            {isOwner && session.status === "draft" && (
              <Button onClick={startSession}>
                <Play className="w-4 h-4 mr-2" />
                Start
              </Button>
            )}
            {isOwner && session.status === "in_progress" && (isTeamMode ? completedMatches === totalMatches && totalMatches > 0 : allRoundsCompleted) && (
              <Button onClick={async () => {
                await supabase.from("americano_sessions").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", session.id);
                toast({ title: "Session complete!", description: "Final standings are ready" });
                fetchSessionData();
              }}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete
              </Button>
            )}
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{isTeamMode ? "Teams" : "Players"}</p>
                  <p className="text-lg font-bold text-foreground">{isTeamMode ? teams.length : players.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Hash className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Courts</p>
                  <p className="text-lg font-bold text-foreground">{session.number_of_courts || 1}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="text-lg font-bold text-foreground">{duration || "—"}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Target className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pts/Round</p>
                  <p className="text-lg font-bold text-foreground">{session.points_per_round}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Bar */}
          {totalMatches > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Match Progress</span>
                <span className="font-medium text-foreground">{completedMatches}/{totalMatches} ({progressPercent}%)</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="standings" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="standings" className="flex-1 gap-2">
                <Trophy className="w-4 h-4" />
                Standings
              </TabsTrigger>
              <TabsTrigger value="rounds" className="flex-1 gap-2">
                <LayoutList className="w-4 h-4" />
                Rounds
              </TabsTrigger>
            </TabsList>

            {/* Standings Tab */}
            <TabsContent value="standings">
              <Card>
                <CardContent className="p-0">
                  {isTeamMode ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10 text-center">#</TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead className="text-center w-12">W</TableHead>
                          <TableHead className="text-center w-12">L</TableHead>
                          <TableHead className="text-right w-14">Pts</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teams.map((team, idx) => (
                          <TableRow key={team.id} className={idx === 0 && team.total_points > 0 ? "bg-primary/5" : ""}>
                            <TableCell className="text-center">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-muted text-xs font-bold">
                                {idx + 1}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div>
                                <span className="font-medium">{team.team_name}</span>
                                <p className="text-xs text-muted-foreground">{team.player1_name} & {team.player2_name}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-emerald-500/10 text-emerald-600 text-xs font-semibold">{team.wins}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-destructive/10 text-destructive text-xs font-semibold">{team.losses}</span>
                            </TableCell>
                            <TableCell className="text-right font-bold">{team.total_points}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10 text-center">#</TableHead>
                            <TableHead>Player</TableHead>
                            <TableHead className="text-center w-12">P+</TableHead>
                            <TableHead className="text-center w-12">P-</TableHead>
                            <TableHead className="text-center w-14">+/-</TableHead>
                            <TableHead className="text-center w-10">W</TableHead>
                            <TableHead className="text-center w-10">T</TableHead>
                            <TableHead className="text-center w-10">L</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {playerStats.map((ps, idx) => (
                            <TableRow key={ps.id} className={idx === 0 && ps.pointsFor > 0 ? "bg-primary/5" : ""}>
                              <TableCell className="text-center">
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-muted text-xs font-bold">
                                  {idx + 1}
                                </span>
                              </TableCell>
                              <TableCell className="font-medium">{ps.name}</TableCell>
                              <TableCell className="text-center font-semibold">{ps.pointsFor}</TableCell>
                              <TableCell className="text-center text-muted-foreground">{ps.pointsAgainst}</TableCell>
                              <TableCell className="text-center">
                                <span className={`inline-flex items-center justify-center min-w-[2rem] px-1.5 py-0.5 rounded text-xs font-bold ${
                                  ps.diff > 0
                                    ? "bg-emerald-500/10 text-emerald-600"
                                    : ps.diff < 0
                                    ? "bg-destructive/10 text-destructive"
                                    : "bg-muted text-muted-foreground"
                                }`}>
                                  {ps.diff > 0 ? `+${ps.diff}` : ps.diff}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-emerald-500/10 text-emerald-600 text-xs font-semibold">{ps.wins}</span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-amber-500/10 text-amber-600 text-xs font-semibold">{ps.ties}</span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-destructive/10 text-destructive text-xs font-semibold">{ps.losses}</span>
                              </TableCell>
                            </TableRow>
                          ))}
                          {playerStats.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                No standings data yet
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Rounds Tab */}
            <TabsContent value="rounds">
              <Card>
                <CardContent className="p-4 space-y-4">
                  {session.status === "draft" ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Start the session to generate matches</p>
                    </div>
                  ) : isTeamMode ? (
                    <>
                      {pendingTeamMatches.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-muted-foreground">Pending Matches</h4>
                          {pendingTeamMatches.map((match) => (
                            <Card key={match.id}>
                              <CardContent className="py-4">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex-1">
                                    <p className="text-sm text-muted-foreground mb-1">Match {match.round_number}</p>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{getTeamName(match.team1_id)}</span>
                                      <span className="text-muted-foreground">vs</span>
                                      <span className="font-medium">{getTeamName(match.team2_id)}</span>
                                    </div>
                                  </div>
                                  {isOwner ? (
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <Input type="number" className="w-16" placeholder="0"
                                          value={scores[match.id]?.team1 || ""}
                                          onChange={(e) => setScores({ ...scores, [match.id]: { ...scores[match.id], team1: e.target.value } })}
                                        />
                                        <span className="text-muted-foreground">-</span>
                                        <Input type="number" className="w-16" placeholder="0"
                                          value={scores[match.id]?.team2 || ""}
                                          onChange={(e) => setScores({ ...scores, [match.id]: { ...scores[match.id], team2: e.target.value } })}
                                        />
                                        <Button size="sm" onClick={() => submitTeamScore(match)}>Save</Button>
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-1 text-right">Total must equal {session.points_per_round}</p>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">Pending</span>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                      {completedTeamMatchesList.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-muted-foreground">Completed Matches</h4>
                          {completedTeamMatchesList.map((match) => (
                            <Card key={match.id} className="bg-muted/50">
                              <CardContent className="py-4">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex-1">
                                    <p className="text-sm text-muted-foreground mb-1">Match {match.round_number}</p>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{getTeamName(match.team1_id)}</span>
                                      <span className="text-muted-foreground">vs</span>
                                      <span className="font-medium">{getTeamName(match.team2_id)}</span>
                                    </div>
                                  </div>
                                  {editingMatchId === match.id ? (
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <Input type="number" className="w-16" placeholder="0"
                                          value={scores[match.id]?.team1 || ""}
                                          onChange={(e) => setScores({ ...scores, [match.id]: { ...scores[match.id], team1: e.target.value } })}
                                        />
                                        <span className="text-muted-foreground">-</span>
                                        <Input type="number" className="w-16" placeholder="0"
                                          value={scores[match.id]?.team2 || ""}
                                          onChange={(e) => setScores({ ...scores, [match.id]: { ...scores[match.id], team2: e.target.value } })}
                                        />
                                        <Button size="sm" onClick={() => editTeamScore(match)}>Save</Button>
                                        <Button size="sm" variant="ghost" onClick={() => setEditingMatchId(null)}>Cancel</Button>
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-1 text-right">Total must equal {session.points_per_round}</p>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-lg">{match.team1_score}</span>
                                      <span className="text-muted-foreground">-</span>
                                      <span className="font-bold text-lg">{match.team2_score}</span>
                                      <CheckCircle className="w-5 h-5 text-emerald-500 ml-2" />
                                      {isOwner && (
                                        <Button size="icon" variant="ghost" className="h-7 w-7 ml-1" onClick={() => startEditingMatch(match.id, match.team1_score, match.team2_score)}>
                                          <Pencil className="w-3.5 h-3.5" />
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </>
                  ) : rounds.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No matches generated yet</p>
                  ) : (
                    <div className="space-y-6">
                      {roundNumbers.map((roundNum) => {
                        const roundMatches = rounds.filter((r) => r.round_number === roundNum);
                        const roundComplete = roundMatches.every((r) => r.completed_at);
                        return (
                          <div key={roundNum}>
                            <div className="flex items-center gap-2 mb-3">
                              <h4 className="text-sm font-semibold text-foreground">Round {roundNum}</h4>
                              {roundComplete && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                            </div>
                            <div className="space-y-3">
                              {roundMatches.map((round) => (
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
                                        editingMatchId === round.id ? (
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <Input type="number" className="w-16" placeholder="0"
                                                value={scores[round.id]?.team1 || ""}
                                                onChange={(e) => setScores({ ...scores, [round.id]: { ...scores[round.id], team1: e.target.value } })}
                                              />
                                              <span className="text-muted-foreground">-</span>
                                              <Input type="number" className="w-16" placeholder="0"
                                                value={scores[round.id]?.team2 || ""}
                                                onChange={(e) => setScores({ ...scores, [round.id]: { ...scores[round.id], team2: e.target.value } })}
                                              />
                                              <Button size="sm" onClick={() => editScore(round)}>Save</Button>
                                              <Button size="sm" variant="ghost" onClick={() => setEditingMatchId(null)}>Cancel</Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1 text-right">Total must equal {session.points_per_round}</p>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-2">
                                            <span className="font-bold text-lg">{round.team1_score}</span>
                                            <span className="text-muted-foreground">-</span>
                                            <span className="font-bold text-lg">{round.team2_score}</span>
                                            <CheckCircle className="w-5 h-5 text-emerald-500 ml-2" />
                                            {isOwner && (
                                              <Button size="icon" variant="ghost" className="h-7 w-7 ml-1" onClick={() => startEditingMatch(round.id, round.team1_score, round.team2_score)}>
                                                <Pencil className="w-3.5 h-3.5" />
                                              </Button>
                                            )}
                                          </div>
                                        )
                                      ) : isOwner ? (
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <Input type="number" className="w-16" placeholder="0"
                                              value={scores[round.id]?.team1 || ""}
                                              onChange={(e) => setScores({ ...scores, [round.id]: { ...scores[round.id], team1: e.target.value } })}
                                            />
                                            <span className="text-muted-foreground">-</span>
                                            <Input type="number" className="w-16" placeholder="0"
                                              value={scores[round.id]?.team2 || ""}
                                              onChange={(e) => setScores({ ...scores, [round.id]: { ...scores[round.id], team2: e.target.value } })}
                                            />
                                            <Button size="sm" onClick={() => submitScore(round)}>Save</Button>
                                          </div>
                                          <p className="text-xs text-muted-foreground mt-1 text-right">Total must equal {session.points_per_round}</p>
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground">Pending</span>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
