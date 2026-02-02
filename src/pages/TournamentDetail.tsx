import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Users, Play, XCircle, Crown, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { GroupStandings } from "@/components/tournament/GroupStandings";
import { GroupMatchList } from "@/components/tournament/GroupMatchList";
import { AdminGroupManagement } from "@/components/tournament/AdminGroupManagement";
import { KnockoutBracket } from "@/components/tournament/KnockoutBracket";
import { toast as sonnerToast } from "sonner";

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  format: "single_elimination" | "double_elimination" | "round_robin";
  status: "draft" | "registration" | "in_progress" | "completed" | "cancelled";
  max_teams: number;
  created_by: string;
  winner_team_id: string | null;
  number_of_groups: number | null;
}

interface TournamentGroup {
  id: string;
  name: string;
  display_order: number;
}

interface Participant {
  id: string;
  team_id: string;
  seed: number | null;
  is_eliminated: boolean;
  team_name?: string;
  group_id: string | null;
  group_wins: number;
  group_losses: number;
  group_points_for: number;
  group_points_against: number;
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
  group_id: string | null;
  stage: string;
}

interface UserTeam {
  id: string;
  name: string;
}

export default function TournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const { toast } = useToast();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [groups, setGroups] = useState<TournamentGroup[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [userTeam, setUserTeam] = useState<UserTeam | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const [tournamentRes, groupsRes, participantsRes, matchesRes] = await Promise.all([
        supabase.from("tournaments").select("*").eq("id", id).single(),
        supabase.from("tournament_groups").select("*").eq("tournament_id", id).order("display_order"),
        supabase.from("tournament_participants").select("*").eq("tournament_id", id),
        supabase.from("tournament_matches").select("*").eq("tournament_id", id).order("round_number").order("match_number"),
      ]);

      if (tournamentRes.error) throw tournamentRes.error;
      setTournament(tournamentRes.data);
      setGroups(groupsRes.data || []);
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
  }, [id]);

  const fetchUserTeam = useCallback(async () => {
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
  }, [user]);

  useEffect(() => {
    if (id) {
      fetchData();
      if (user) fetchUserTeam();
    }
  }, [id, user, fetchData, fetchUserTeam]);

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

  const kickTeam = async (participantId: string, teamName: string) => {
    if (!tournament) return;
    try {
      const { error } = await supabase
        .from("tournament_participants")
        .delete()
        .eq("id", participantId);
      if (error) throw error;
      sonnerToast.success(`${teamName} has been removed from the tournament`);
      fetchData();
    } catch (error: any) {
      sonnerToast.error("Failed to remove team");
    }
  };

  // Group management functions
  const createGroup = async (name: string) => {
    if (!tournament) return;
    const { error } = await supabase.from("tournament_groups").insert({
      tournament_id: tournament.id,
      name,
      display_order: groups.length,
    });
    if (error) {
      sonnerToast.error("Failed to create group");
    } else {
      sonnerToast.success("Group created");
      fetchData();
    }
  };

  const deleteGroup = async (groupId: string) => {
    // First unassign all teams from this group
    await supabase.from("tournament_participants")
      .update({ group_id: null })
      .eq("group_id", groupId);
    
    const { error } = await supabase.from("tournament_groups").delete().eq("id", groupId);
    if (error) {
      sonnerToast.error("Failed to delete group");
    } else {
      fetchData();
    }
  };

  const assignTeamToGroup = async (participantId: string, groupId: string | null) => {
    const { error } = await supabase.from("tournament_participants")
      .update({ group_id: groupId })
      .eq("id", participantId);
    if (error) {
      sonnerToast.error("Failed to assign team");
    } else {
      fetchData();
    }
  };

  const randomAssignTeams = async () => {
    const unassigned = participants.filter(p => !p.group_id);
    const shuffled = [...unassigned].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < shuffled.length; i++) {
      const groupIndex = i % groups.length;
      await supabase.from("tournament_participants")
        .update({ group_id: groups[groupIndex].id })
        .eq("id", shuffled[i].id);
    }
    sonnerToast.success("Teams randomly assigned");
    fetchData();
  };

  const generateGroupMatches = async () => {
    if (!tournament) return;
    
    // Check if group matches already exist
    const existingGroupMatches = matches.filter(m => m.stage === "group");
    if (existingGroupMatches.length > 0) {
      sonnerToast.error("Group matches already generated");
      return;
    }
    
    // Generate round-robin matches for each group
    const matchesToCreate: any[] = [];
    
    for (const group of groups) {
      const groupTeams = participants.filter(p => p.group_id === group.id);
      let matchNum = 1;
      
      // Round-robin: every team plays every other team once
      for (let i = 0; i < groupTeams.length; i++) {
        for (let j = i + 1; j < groupTeams.length; j++) {
          matchesToCreate.push({
            tournament_id: tournament.id,
            group_id: group.id,
            round_number: 1,
            match_number: matchNum++,
            team1_id: groupTeams[i].team_id,
            team2_id: groupTeams[j].team_id,
            stage: "group",
          });
        }
      }
    }

    const { error } = await supabase.from("tournament_matches").insert(matchesToCreate);
    if (error) {
      sonnerToast.error("Failed to generate matches");
    } else {
      await supabase.from("tournaments")
        .update({ status: "in_progress", started_at: new Date().toISOString() })
        .eq("id", tournament.id);
      sonnerToast.success(`Generated ${matchesToCreate.length} group matches!`);
      fetchData();
    }
  };

  const submitGroupMatchScore = async (matchId: string, team1Score: number, team2Score: number) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const winnerId = team1Score > team2Score ? match.team1_id : match.team2_id;
    const loserId = team1Score > team2Score ? match.team2_id : match.team1_id;

    await supabase.from("tournament_matches")
      .update({ team1_score: team1Score, team2_score: team2Score, winner_team_id: winnerId })
      .eq("id", matchId);

    // Update winner stats
    const winner = participants.find(p => p.team_id === winnerId);
    if (winner) {
      const winnerPoints = winnerId === match.team1_id ? team1Score : team2Score;
      const winnerAgainst = winnerId === match.team1_id ? team2Score : team1Score;
      await supabase.from("tournament_participants")
        .update({ 
          group_wins: winner.group_wins + 1,
          group_points_for: winner.group_points_for + winnerPoints,
          group_points_against: winner.group_points_against + winnerAgainst,
        })
        .eq("id", winner.id);
    }

    // Update loser stats
    const loser = participants.find(p => p.team_id === loserId);
    if (loser) {
      const loserPoints = loserId === match.team1_id ? team1Score : team2Score;
      const loserAgainst = loserId === match.team1_id ? team2Score : team1Score;
      await supabase.from("tournament_participants")
        .update({ 
          group_losses: loser.group_losses + 1,
          group_points_for: loser.group_points_for + loserPoints,
          group_points_against: loser.group_points_against + loserAgainst,
        })
        .eq("id", loser.id);
    }

    sonnerToast.success("Match result saved");
    fetchData();
  };

  const submitKnockoutScore = async (matchId: string, team1Score: number, team2Score: number) => {
    const match = matches.find(m => m.id === matchId);
    if (!match || !tournament) return;

    const winnerId = team1Score > team2Score ? match.team1_id : match.team2_id;

    await supabase.from("tournament_matches")
      .update({ team1_score: team1Score, team2_score: team2Score, winner_team_id: winnerId })
      .eq("id", matchId);

    // Advance winner to next round
    const knockoutMatches = matches.filter(m => m.stage === "knockout");
    const nextRoundMatches = knockoutMatches.filter(m => m.round_number === match.round_number + 1);
    
    if (nextRoundMatches.length > 0) {
      const nextMatchIndex = Math.floor((match.match_number - 1) / 2);
      const nextMatch = nextRoundMatches[nextMatchIndex];
      if (nextMatch) {
        const isTeam1 = match.match_number % 2 === 1;
        await supabase.from("tournament_matches")
          .update(isTeam1 ? { team1_id: winnerId } : { team2_id: winnerId })
          .eq("id", nextMatch.id);
      }
    } else {
      // Finals - crown winner
      await supabase.from("tournaments")
        .update({ status: "completed", winner_team_id: winnerId, completed_at: new Date().toISOString() })
        .eq("id", tournament.id);
    }

    sonnerToast.success("Match result saved");
    fetchData();
  };

  const startKnockoutStage = async () => {
    if (!tournament) return;

    // Get top 2 from each group
    const qualifiedTeams: { team_id: string; group_id: string; rank: number }[] = [];
    
    for (const group of groups) {
      const groupTeams = participants
        .filter(p => p.group_id === group.id)
        .sort((a, b) => {
          if (b.group_wins !== a.group_wins) return b.group_wins - a.group_wins;
          const diffA = a.group_points_for - a.group_points_against;
          const diffB = b.group_points_for - b.group_points_against;
          return diffB - diffA;
        })
        .slice(0, 2);

      groupTeams.forEach((team, idx) => {
        qualifiedTeams.push({ team_id: team.team_id, group_id: group.id, rank: idx + 1 });
      });
    }

    // Create knockout matches based on number of groups
    const knockoutMatches: any[] = [];
    
    if (groups.length === 2) {
      // 2 groups: Semi-finals with cross-matching
      const groupA = groups[0];
      const groupB = groups[1];
      const a1 = qualifiedTeams.find(t => t.group_id === groupA.id && t.rank === 1);
      const a2 = qualifiedTeams.find(t => t.group_id === groupA.id && t.rank === 2);
      const b1 = qualifiedTeams.find(t => t.group_id === groupB.id && t.rank === 1);
      const b2 = qualifiedTeams.find(t => t.group_id === groupB.id && t.rank === 2);

      // Semi 1: A1 vs B2
      knockoutMatches.push({
        tournament_id: tournament.id,
        round_number: 1,
        match_number: 1,
        team1_id: a1?.team_id || null,
        team2_id: b2?.team_id || null,
        stage: "knockout",
      });
      // Semi 2: B1 vs A2
      knockoutMatches.push({
        tournament_id: tournament.id,
        round_number: 1,
        match_number: 2,
        team1_id: b1?.team_id || null,
        team2_id: a2?.team_id || null,
        stage: "knockout",
      });
      // Finals
      knockoutMatches.push({
        tournament_id: tournament.id,
        round_number: 2,
        match_number: 1,
        team1_id: null,
        team2_id: null,
        stage: "knockout",
      });
    } else if (groups.length === 4) {
      // 4 groups: Quarter-finals
      const groupsSorted = [...groups].sort((a, b) => a.display_order - b.display_order);
      
      // QF1: A1 vs D2, QF2: B1 vs C2, QF3: C1 vs B2, QF4: D1 vs A2
      const crossMatch = [
        [0, 3], [1, 2], [2, 1], [3, 0]
      ];
      
      crossMatch.forEach(([g1Idx, g2Idx], matchIdx) => {
        const g1 = groupsSorted[g1Idx];
        const g2 = groupsSorted[g2Idx];
        const t1 = qualifiedTeams.find(t => t.group_id === g1.id && t.rank === 1);
        const t2 = qualifiedTeams.find(t => t.group_id === g2.id && t.rank === 2);
        
        knockoutMatches.push({
          tournament_id: tournament.id,
          round_number: 1,
          match_number: matchIdx + 1,
          team1_id: t1?.team_id || null,
          team2_id: t2?.team_id || null,
          stage: "knockout",
        });
      });
      
      // Semi-finals (empty, filled as QF completes)
      knockoutMatches.push({ tournament_id: tournament.id, round_number: 2, match_number: 1, team1_id: null, team2_id: null, stage: "knockout" });
      knockoutMatches.push({ tournament_id: tournament.id, round_number: 2, match_number: 2, team1_id: null, team2_id: null, stage: "knockout" });
      
      // Finals
      knockoutMatches.push({ tournament_id: tournament.id, round_number: 3, match_number: 1, team1_id: null, team2_id: null, stage: "knockout" });
    }

    const { error } = await supabase.from("tournament_matches").insert(knockoutMatches);
    if (error) {
      sonnerToast.error("Failed to start knockout stage");
    } else {
      sonnerToast.success("Knockout stage started!");
      fetchData();
    }
  };

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return "TBD";
    return participants.find((p) => p.team_id === teamId)?.team_name || "Unknown";
  };

  const isOwner = user?.id === tournament?.created_by;
  const isAdmin = role === "admin" || isOwner;
  const isRegistered = userTeam && participants.some((p) => p.team_id === userTeam.id);
  const canRegister = tournament?.status === "registration" && userTeam && !isRegistered && participants.length < (tournament?.max_teams || 0);
  
  const groupMatches = matches.filter(m => m.stage === "group");
  const knockoutMatches = matches.filter(m => m.stage === "knockout");
  const allGroupMatchesComplete = groupMatches.length > 0 && groupMatches.every(m => m.winner_team_id !== null);
  const canStartKnockout = allGroupMatchesComplete && knockoutMatches.length === 0;

  // Find user's group
  const userParticipant = userTeam ? participants.find(p => p.team_id === userTeam.id) : null;
  const userGroup = userParticipant?.group_id ? groups.find(g => g.id === userParticipant.group_id) : null;

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
                  {groups.length} groups • {participants.length} / {tournament.max_teams} teams
                </p>
              </div>
            </div>
            <Badge variant={tournament.status === "completed" ? "outline" : "default"}>
              {tournament.status.replace("_", " ")}
            </Badge>
          </div>

          {/* Registration Actions */}
          {tournament.status === "registration" && (
            <Card className="mb-6">
              <CardContent className="py-4 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="font-medium">Registration is open</p>
                  <p className="text-sm text-muted-foreground">{participants.length} teams registered</p>
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

          <Tabs defaultValue={isAdmin ? "manage" : "groups"} className="w-full">
            <TabsList className="mb-6">
              {isAdmin && <TabsTrigger value="manage"><Settings className="w-4 h-4 mr-2" />Manage</TabsTrigger>}
              <TabsTrigger value="groups">Groups</TabsTrigger>
              <TabsTrigger value="matches">Matches</TabsTrigger>
              <TabsTrigger value="knockout">Knockout</TabsTrigger>
              <TabsTrigger value="participants">Participants</TabsTrigger>
            </TabsList>

            {/* Admin Management Tab */}
            {isAdmin && (
              <TabsContent value="manage">
                <AdminGroupManagement
                  groups={groups}
                  teams={participants.map(p => ({
                    id: p.id,
                    team_id: p.team_id,
                    team_name: p.team_name || "Unknown",
                    group_id: p.group_id,
                  }))}
                  onCreateGroup={createGroup}
                  onDeleteGroup={deleteGroup}
                  onAssignTeam={assignTeamToGroup}
                  onRandomAssign={randomAssignTeams}
                  onGenerateGroupMatches={generateGroupMatches}
                  canStartKnockout={canStartKnockout}
                  onStartKnockout={startKnockoutStage}
                  onKickTeam={kickTeam}
                />
              </TabsContent>
            )}

            {/* Groups Tab */}
            <TabsContent value="groups">
              {groups.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Groups haven't been created yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {groups.map(group => {
                    const groupTeams = participants
                      .filter(p => p.group_id === group.id)
                      .map(p => ({
                        team_id: p.team_id,
                        team_name: p.team_name || "Unknown",
                        wins: p.group_wins,
                        losses: p.group_losses,
                        points_for: p.group_points_for,
                        points_against: p.group_points_against,
                      }));

                    return (
                      <GroupStandings
                        key={group.id}
                        groupName={group.name}
                        teams={groupTeams}
                        highlightTeamId={userTeam?.id}
                      />
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Matches Tab */}
            <TabsContent value="matches">
              {groups.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Matches will appear after groups are created</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {groups.map(group => {
                    const gMatches = groupMatches
                      .filter(m => m.group_id === group.id)
                      .map(m => ({
                        id: m.id,
                        team1_id: m.team1_id,
                        team2_id: m.team2_id,
                        team1_name: getTeamName(m.team1_id),
                        team2_name: getTeamName(m.team2_id),
                        team1_score: m.team1_score,
                        team2_score: m.team2_score,
                        winner_team_id: m.winner_team_id,
                      }));

                    return (
                      <GroupMatchList
                        key={group.id}
                        groupName={group.name}
                        matches={gMatches}
                        isAdmin={isAdmin}
                        onSubmitScore={submitGroupMatchScore}
                      />
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Knockout Tab */}
            <TabsContent value="knockout">
              <KnockoutBracket
                matches={knockoutMatches.map(m => ({
                  ...m,
                  team1_name: getTeamName(m.team1_id),
                  team2_name: getTeamName(m.team2_id),
                }))}
                isAdmin={isAdmin}
                onSubmitScore={submitKnockoutScore}
                winnerTeamId={tournament.winner_team_id}
                winnerTeamName={tournament.winner_team_id ? getTeamName(tournament.winner_team_id) : undefined}
              />
            </TabsContent>

            {/* Participants Tab */}
            <TabsContent value="participants">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    All Participants
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {participants.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No teams registered</p>
                  ) : (
                    <div className="space-y-2">
                      {participants.map((p, idx) => {
                        const groupName = groups.find(g => g.id === p.group_id)?.name;
                        return (
                          <div
                            key={p.id}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              p.is_eliminated ? "opacity-50 bg-muted/30" : ""
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-muted-foreground w-6">{idx + 1}.</span>
                              <span className={p.is_eliminated ? "line-through" : "font-medium"}>
                                {p.team_name}
                              </span>
                              {groupName && (
                                <Badge variant="outline" className="text-xs">{groupName}</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {p.is_eliminated && <XCircle className="w-4 h-4 text-destructive" />}
                              {tournament.winner_team_id === p.team_id && <Crown className="w-4 h-4 text-rank-gold" />}
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
        </motion.div>
      </main>
    </div>
  );
}
