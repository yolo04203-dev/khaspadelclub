import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Users, Play, XCircle, Crown, Settings, Clock, Banknote, Tag, Info, MapPin, Calendar, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { GroupStandings } from "@/components/tournament/GroupStandings";
import { GroupMatchList } from "@/components/tournament/GroupMatchList";
import { AdminGroupManagement } from "@/components/tournament/AdminGroupManagement";
import { KnockoutBracket } from "@/components/tournament/KnockoutBracket";
import { RegistrationDialog } from "@/components/tournament/RegistrationDialog";
import { PaymentManagement } from "@/components/tournament/PaymentManagement";
import { CategoryManagement, TournamentCategory } from "@/components/tournament/CategoryManagement";
import { logger } from "@/lib/logger";
import { toast as sonnerToast } from "sonner";
import { createDebouncedCallback } from "@/lib/realtimeDebounce";

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
  sets_per_match: number;
  entry_fee: number;
  entry_fee_currency: string;
  payment_instructions: string | null;
  venue: string | null;
  registration_deadline: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface TournamentGroup {
  id: string;
  name: string;
  display_order: number;
  category_id: string | null;
}

interface Participant {
  id: string;
  team_id: string;
  seed: number | null;
  is_eliminated: boolean;
  team_name?: string;
  group_id: string | null;
  category_id: string | null;
  group_wins: number;
  group_losses: number;
  group_points_for: number;
  group_points_against: number;
  waitlist_position: number | null;
  payment_status: string;
  payment_notes: string | null;
  custom_team_name: string | null;
  registered_at: string;
  player1_name: string | null;
  player2_name: string | null;
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
  category_id: string | null;
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
  const [categories, setCategories] = useState<TournamentCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [userTeam, setUserTeam] = useState<UserTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamMembersMap, setTeamMembersMap] = useState<Map<string, { player1: string; player2: string }>>(new Map());
  const [registrationDialogOpen, setRegistrationDialogOpen] = useState(false);
  const [userTeamMemberCount, setUserTeamMemberCount] = useState(0);
  const [paymentParticipants, setPaymentParticipants] = useState<Array<{
    id: string; team_id: string; team_name: string; registered_at: string;
    payment_status: string; payment_notes: string | null; custom_team_name: string | null;
    waitlist_position: number | null;
  }>>([]);

  const fetchPaymentData = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from("tournament_participants")
      .select("id, team_id, registered_at, payment_status, payment_notes, custom_team_name, waitlist_position")
      .eq("tournament_id", id);
    if (data) {
      const withNames = await Promise.all(data.map(async (p) => {
        const { data: team } = await supabase.from("teams").select("name").eq("id", p.team_id).single();
        return { ...p, team_name: team?.name || "Unknown", payment_status: p.payment_status || "pending" };
      }));
      setPaymentParticipants(withNames);
    }
  }, [id]);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const [tournamentRes, groupsRes, participantsRes, matchesRes, categoriesRes] = await Promise.all([
        supabase.from("tournaments").select("*").eq("id", id).single(),
        supabase.from("tournament_groups").select("*").eq("tournament_id", id).order("display_order"),
        supabase.from("tournament_participants_public").select("*").eq("tournament_id", id),
        supabase.from("tournament_matches").select("*").eq("tournament_id", id).order("round_number").order("match_number"),
        supabase.from("tournament_categories").select("*").eq("tournament_id", id).order("display_order"),
      ]);

      if (tournamentRes.error) throw tournamentRes.error;
      setTournament(tournamentRes.data);
      setGroups(groupsRes.data || []);
      setMatches(matchesRes.data || []);
      
      // Process categories with participant counts
      const cats = (categoriesRes.data || []).map(cat => ({
        ...cat,
        entry_fee: (cat as any).entry_fee ?? 0,
        participantCount: (participantsRes.data || []).filter(p => p.category_id === cat.id && p.waitlist_position === null).length,
      }));
      setCategories(cats);

      // Fetch team names and member profiles for participants
      const participantTeamIds = [...new Set((participantsRes.data || []).map(p => p.team_id).filter(Boolean) as string[])];
      
      // Batch fetch: team names + team members
      const [teamsResult, membersResult] = await Promise.all([
        participantTeamIds.length > 0 
          ? supabase.from("teams").select("id, name").in("id", participantTeamIds)
          : Promise.resolve({ data: [] }),
        participantTeamIds.length > 0
          ? supabase.from("team_members").select("team_id, user_id").in("team_id", participantTeamIds).order("joined_at")
          : Promise.resolve({ data: [] }),
      ]);

      const teamNameMap = new Map((teamsResult.data || []).map(t => [t.id, t.name]));
      
      // Fetch display names for all member user_ids
      const allUserIds = [...new Set((membersResult.data || []).map(m => m.user_id))];
      let profileMap = new Map<string, string>();
      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("public_profiles")
          .select("user_id, display_name")
          .in("user_id", allUserIds);
        profileMap = new Map((profiles || []).map(p => [p.user_id!, p.display_name || "Player"]));
      }

      // Build teamMembersMap
      const membersMap = new Map<string, { player1: string; player2: string }>();
      for (const teamId of participantTeamIds) {
        const members = (membersResult.data || []).filter(m => m.team_id === teamId);
        if (members.length >= 2) {
          membersMap.set(teamId, {
            player1: profileMap.get(members[0].user_id) || "Player",
            player2: profileMap.get(members[1].user_id) || "Player",
          });
        } else if (members.length === 1) {
          membersMap.set(teamId, {
            player1: profileMap.get(members[0].user_id) || "Player",
            player2: "",
          });
        }
      }
      setTeamMembersMap(membersMap);

      const participantsWithNames = (participantsRes.data || []).map((p) => {
        const teamName = teamNameMap.get(p.team_id!) || "Unknown";
        // For player names: prefer custom participant names, fall back to team member profiles
        let p1 = (p as any).player1_name || null;
        let p2 = (p as any).player2_name || null;
        if (!p1 && !p2 && p.team_id) {
          const members = membersMap.get(p.team_id!);
          if (members) {
            p1 = members.player1;
            p2 = members.player2;
          }
        }
        return { 
          ...p, 
          team_name: teamName,
          payment_status: (p as any).payment_status || "pending",
          payment_notes: null,
          custom_team_name: (p as any).custom_team_name || null,
          category_id: (p as any).category_id || null,
          player1_name: p1,
          player2_name: p2,
          registered_at: p.registered_at,
        };
      });
      setParticipants(participantsWithNames);
    } catch (error) {
      logger.apiError("fetchTournament", error);
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
      const [teamResult, countResult] = await Promise.all([
        supabase.from("teams").select("id, name").eq("id", member.team_id).single(),
        supabase.from("team_members").select("*", { count: "exact", head: true }).eq("team_id", member.team_id),
      ]);
      if (teamResult.data) setUserTeam(teamResult.data);
      const memberCount = countResult.count || 0;
      if (memberCount < 2 && teamResult.data?.name?.includes(" & ")) {
        setUserTeamMemberCount(2);
      } else {
        setUserTeamMemberCount(memberCount);
      }
    }
  }, [user]);

  useEffect(() => {
    if (id) {
      fetchData();
      if (user) {
        fetchUserTeam();
        fetchPaymentData();
      }
    }

    // Debounced refetch to prevent query stampedes from rapid realtime events
    const debouncedFetch = createDebouncedCallback(() => fetchData(), 500);

    // Subscribe to realtime changes — filtered by tournament_id
    const matchesChannel = supabase
      .channel(`tournament-${id}-matches`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_matches',
          filter: `tournament_id=eq.${id}`,
        },
        debouncedFetch
      )
      .subscribe();

    const participantsChannel = supabase
      .channel(`tournament-${id}-participants`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_participants',
          filter: `tournament_id=eq.${id}`,
        },
        debouncedFetch
      )
      .subscribe();

    const groupsChannel = supabase
      .channel(`tournament-${id}-groups`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_groups',
          filter: `tournament_id=eq.${id}`,
        },
        debouncedFetch
      )
      .subscribe();

    const tournamentChannel = supabase
      .channel(`tournament-${id}-tournament`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tournaments',
          filter: `id=eq.${id}`,
        },
        debouncedFetch
      )
      .subscribe();

    return () => {
      supabase.removeChannel(matchesChannel);
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(groupsChannel);
      supabase.removeChannel(tournamentChannel);
    };
  }, [id, user, fetchData, fetchUserTeam, fetchPaymentData]);

  const registerTeam = async (teamId: string | null, customTeamName: string | null, player1Name?: string, player2Name?: string, categoryId?: string) => {
    if (!tournament) return;
    
    // For custom team registration, we need to create a placeholder
    const actualTeamId = teamId || userTeam?.id;
    if (!actualTeamId && !customTeamName) return;
    
    try {
      // Count registered teams (not on waitlist) - optionally filtered by category
      const relevantParticipants = categoryId 
        ? participants.filter(p => p.category_id === categoryId)
        : participants;
      const registeredCount = relevantParticipants.filter(p => p.waitlist_position === null).length;
      
      // Get max teams limit - from category or tournament
      const category = categoryId ? categories.find(c => c.id === categoryId) : null;
      const maxTeams = category ? category.max_teams : tournament.max_teams;
      const isFull = registeredCount >= maxTeams;

      if (isFull) {
        // Add to waitlist
        const waitlistTeams = relevantParticipants.filter(p => p.waitlist_position !== null);
        const nextWaitlistPosition = waitlistTeams.length > 0 
          ? Math.max(...waitlistTeams.map(p => p.waitlist_position!)) + 1 
          : 1;

        const { error } = await supabase.from("tournament_participants").insert({
          tournament_id: tournament.id,
          team_id: actualTeamId!,
          waitlist_position: nextWaitlistPosition,
          custom_team_name: customTeamName,
          player1_name: player1Name || null,
          player2_name: player2Name || null,
          category_id: categoryId || null,
          payment_status: "pending",
        });
        if (error) throw error;
        
        const teamName = customTeamName || userTeam?.name;
        toast({ 
          title: "Added to Waiting List", 
          description: `${teamName} is #${nextWaitlistPosition} on the waiting list. You'll be added if a team withdraws.` 
        });
      } else {
        // Normal registration
        const { error } = await supabase.from("tournament_participants").insert({
          tournament_id: tournament.id,
          team_id: actualTeamId!,
          seed: registeredCount + 1,
          custom_team_name: customTeamName,
          player1_name: player1Name || null,
          player2_name: player2Name || null,
          category_id: categoryId || null,
          payment_status: "pending",
        });
        if (error) throw error;
        
        const teamName = customTeamName || userTeam?.name;
        const feeMessage = tournament.entry_fee > 0 
          ? ` Please pay ${tournament.entry_fee_currency} ${tournament.entry_fee.toLocaleString()} to confirm your slot.`
          : "";
        toast({ 
          title: "Registered!", 
          description: `${teamName} has joined the tournament.${feeMessage}` 
        });
      }
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const withdrawTeam = async () => {
    if (!userTeam || !tournament) return;
    const participant = participants.find((p) => p.team_id === userTeam.id);
    if (!participant) return;
    
    const wasOnWaitlist = participant.waitlist_position !== null;
    
    try {
      const { error } = await supabase.from("tournament_participants").delete().eq("id", participant.id);
      if (error) throw error;
      
      if (!wasOnWaitlist) {
        // Promote first waitlist team if a registered team withdrew
        await promoteFromWaitlist();
      } else {
        // Reorder waitlist positions
        await reorderWaitlist();
      }
      
      toast({ title: "Withdrawn", description: `${userTeam.name} has left the tournament` });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const promoteFromWaitlist = async () => {
    if (!tournament) return;
    
    // Get first team on waitlist
    const { data: waitlistTeam } = await supabase
      .from("tournament_participants")
      .select("id, team_id")
      .eq("tournament_id", tournament.id)
      .not("waitlist_position", "is", null)
      .order("waitlist_position", { ascending: true })
      .limit(1)
      .single();

    if (waitlistTeam) {
      // Get current registered count for seed
      const registeredCount = participants.filter(p => p.waitlist_position === null).length;
      
      // Promote to registered
      await supabase
        .from("tournament_participants")
        .update({ waitlist_position: null, seed: registeredCount })
        .eq("id", waitlistTeam.id);
      
      // Reorder remaining waitlist
      await reorderWaitlist();
      
      // Get team name for notification
      const { data: team } = await supabase.from("teams").select("name").eq("id", waitlistTeam.team_id).single();
      if (team) {
        sonnerToast.success(`${team.name} has been promoted from the waiting list!`);
      }
    }
  };

  const reorderWaitlist = async () => {
    if (!tournament) return;
    
    const { data: waitlistTeams } = await supabase
      .from("tournament_participants")
      .select("id")
      .eq("tournament_id", tournament.id)
      .not("waitlist_position", "is", null)
      .order("waitlist_position", { ascending: true });

    if (waitlistTeams) {
      for (let i = 0; i < waitlistTeams.length; i++) {
        await supabase
          .from("tournament_participants")
          .update({ waitlist_position: i + 1 })
          .eq("id", waitlistTeams[i].id);
      }
    }
  };

  const kickTeam = async (participantId: string, teamName: string) => {
    if (!tournament) return;
    
    const participant = participants.find(p => p.id === participantId);
    const wasOnWaitlist = participant?.waitlist_position !== null;
    
    try {
      const { error } = await supabase
        .from("tournament_participants")
        .delete()
        .eq("id", participantId);
      if (error) throw error;
      
      if (!wasOnWaitlist) {
        await promoteFromWaitlist();
      } else {
        await reorderWaitlist();
      }
      
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

  // Category management functions
  const createCategory = async (name: string, description: string, maxTeams: number, entryFee: number) => {
    if (!tournament) return;
    const { error } = await supabase.from("tournament_categories").insert({
      tournament_id: tournament.id,
      name,
      description: description || null,
      max_teams: maxTeams,
      entry_fee: entryFee,
      display_order: categories.length,
    });
    if (error) {
      sonnerToast.error("Failed to create category");
    } else {
      sonnerToast.success("Category created");
      fetchData();
    }
  };

  const updateCategory = async (id: string, name: string, description: string, maxTeams: number, entryFee: number) => {
    const { error } = await supabase.from("tournament_categories")
      .update({ name, description: description || null, max_teams: maxTeams, entry_fee: entryFee })
      .eq("id", id);
    if (error) {
      sonnerToast.error("Failed to update category");
    } else {
      sonnerToast.success("Category updated");
      fetchData();
    }
  };

  const deleteCategory = async (id: string) => {
    // Unassign participants from this category
    await supabase.from("tournament_participants")
      .update({ category_id: null })
      .eq("category_id", id);
    
    const { error } = await supabase.from("tournament_categories").delete().eq("id", id);
    if (error) {
      sonnerToast.error("Failed to delete category");
    } else {
      sonnerToast.success("Category deleted");
      fetchData();
    }
  };

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return "TBD";
    const participant = participants.find((p) => p.team_id === teamId);
    return participant?.custom_team_name || participant?.team_name || "Unknown";
  };

  const getTeamPlayers = (teamId: string | null): string => {
    if (!teamId) return "";
    const participant = participants.find((p) => p.team_id === teamId);
    if (participant?.player1_name && participant?.player2_name) {
      return `${participant.player1_name} & ${participant.player2_name}`;
    }
    return "";
  };

  const isOwner = user?.id === tournament?.created_by;
  const isAdmin = role === "admin" || role === "super_admin" || isOwner;
  
  // Filter participants by selected category
  const filteredParticipants = selectedCategoryId === "all" 
    ? participants 
    : participants.filter(p => p.category_id === selectedCategoryId);
  const filteredGroups = selectedCategoryId === "all"
    ? groups
    : groups.filter(g => g.category_id === selectedCategoryId);
  const filteredMatches = selectedCategoryId === "all"
    ? matches
    : matches.filter(m => m.category_id === selectedCategoryId);
    
  const registeredParticipants = filteredParticipants.filter(p => p.waitlist_position === null);
  const waitlistParticipants = filteredParticipants.filter(p => p.waitlist_position !== null).sort((a, b) => (a.waitlist_position || 0) - (b.waitlist_position || 0));
  const userParticipant = userTeam ? participants.find(p => p.team_id === userTeam.id) : null;
  const isRegistered = !!userParticipant;
  const isOnWaitlist = userParticipant?.waitlist_position !== null;
  const canRegister = tournament?.status === "registration" && !isRegistered;
  
  const groupMatches = filteredMatches.filter(m => m.stage === "group");
  const knockoutMatches = filteredMatches.filter(m => m.stage === "knockout");
  const allGroupMatchesComplete = groupMatches.length > 0 && groupMatches.every(m => m.winner_team_id !== null);
  const canStartKnockout = allGroupMatchesComplete && knockoutMatches.length === 0;

  // Find user's group
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
                  {groups.length} groups • {registeredParticipants.length} / {tournament.max_teams} teams
                  {waitlistParticipants.length > 0 && ` • ${waitlistParticipants.length} on waitlist`}
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
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">Registration is open</p>
                    {tournament.entry_fee > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <Banknote className="w-3 h-3 mr-1" />
                        PKR {tournament.entry_fee.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {registeredParticipants.length} teams registered
                    {registeredParticipants.length >= tournament.max_teams && " (Full)"}
                    {waitlistParticipants.length > 0 && `, ${waitlistParticipants.length} on waiting list`}
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  {canRegister && (
                    <Button onClick={() => setRegistrationDialogOpen(true)}>
                      <Users className="w-4 h-4 mr-2" />
                      {registeredParticipants.length >= tournament.max_teams 
                        ? "Join Waiting List" 
                        : "Register"}
                    </Button>
                  )}
                  {isRegistered && !isOnWaitlist && (
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={userParticipant?.payment_status === "paid" 
                          ? "bg-emerald-500/20 text-emerald-600" 
                          : "bg-warning/20 text-warning"
                        }
                      >
                        {userParticipant?.payment_status === "paid" ? "Paid" : "Payment Pending"}
                      </Badge>
                      <Button variant="outline" onClick={withdrawTeam}>
                        <XCircle className="w-4 h-4 mr-2" />
                        Withdraw
                      </Button>
                    </div>
                  )}
                  {isRegistered && isOnWaitlist && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-warning/20 text-warning-foreground">
                        Waitlist #{userParticipant?.waitlist_position}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={withdrawTeam}>
                        <XCircle className="w-4 h-4 mr-2" />
                        Leave Waitlist
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Registration Dialog */}
          <RegistrationDialog
            open={registrationDialogOpen}
            onOpenChange={setRegistrationDialogOpen}
            tournamentId={tournament.id}
            tournamentName={tournament.name}
            entryFee={tournament.entry_fee || 0}
            entryFeeCurrency={tournament.entry_fee_currency || "PKR"}
            paymentInstructions={tournament.payment_instructions}
            isFull={registeredParticipants.length >= tournament.max_teams}
            userTeam={userTeam}
            categories={categories.map(c => ({
              id: c.id,
              name: c.name,
              max_teams: c.max_teams,
              participantCount: c.participantCount ?? 0,
              entry_fee: c.entry_fee,
            }))}
            onRegister={registerTeam}
            teamMemberCount={userTeamMemberCount}
          />

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

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex items-center gap-3 mb-6">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filter by category:</span>
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Tabs defaultValue="info" className="w-full">
            <TabsList className="mb-6 flex overflow-x-auto h-auto flex-nowrap justify-start gap-1 p-1">
              <TabsTrigger value="info" className="text-xs sm:text-sm shrink-0"><Info className="w-4 h-4 mr-1 sm:mr-2" />Info</TabsTrigger>
              {isAdmin && <TabsTrigger value="manage" className="text-xs sm:text-sm shrink-0"><Settings className="w-4 h-4 mr-1 sm:mr-2" />Manage</TabsTrigger>}
              {isAdmin && <TabsTrigger value="categories" className="text-xs sm:text-sm shrink-0"><Tag className="w-4 h-4 mr-1 sm:mr-2" />Categories</TabsTrigger>}
              {isAdmin && (
                <TabsTrigger value="payments" className="text-xs sm:text-sm shrink-0"><Banknote className="w-4 h-4 mr-1 sm:mr-2" />Registrations</TabsTrigger>
              )}
              <TabsTrigger value="groups" className="text-xs sm:text-sm shrink-0">Groups</TabsTrigger>
              <TabsTrigger value="matches" className="text-xs sm:text-sm shrink-0">Matches</TabsTrigger>
              <TabsTrigger value="knockout" className="text-xs sm:text-sm shrink-0">Knockout</TabsTrigger>
              <TabsTrigger value="participants" className="text-xs sm:text-sm shrink-0">Participants</TabsTrigger>
            </TabsList>

            {/* Info Tab */}
            <TabsContent value="info">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    Tournament Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Description */}
                  {tournament.description && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <FileText className="w-4 h-4" />
                        Description
                      </div>
                      <p className="text-foreground">{tournament.description}</p>
                    </div>
                  )}

                  {/* Venue */}
                  {tournament.venue && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        Venue
                      </div>
                      <p className="text-foreground">{tournament.venue}</p>
                    </div>
                  )}

                  {/* Event Dates */}
                  {(tournament.start_date || tournament.end_date) && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        Event Dates
                      </div>
                      <p className="text-foreground">
                        {tournament.start_date && tournament.end_date ? (
                          <>
                            {new Date(tournament.start_date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                            {' — '}
                            {new Date(tournament.end_date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </>
                        ) : tournament.start_date ? (
                          new Date(tournament.start_date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        ) : (
                          `Ends ${new Date(tournament.end_date!).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}`
                        )}
                      </p>
                    </div>
                  )}

                  {/* Registration Deadline */}
                  {tournament.registration_deadline && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        Registration Deadline
                      </div>
                      <p className="text-foreground">
                        {new Date(tournament.registration_deadline).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  )}

                  {/* Entry Fee */}
                  {tournament.entry_fee > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Banknote className="w-4 h-4" />
                        Entry Fee
                      </div>
                      <p className="text-foreground font-semibold">
                        PKR {tournament.entry_fee.toLocaleString()}
                      </p>
                      {tournament.payment_instructions && (
                        <div className="p-3 rounded-lg bg-muted/50 border border-border mt-2">
                          <p className="text-sm font-medium mb-1">Payment Instructions:</p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{tournament.payment_instructions}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tournament Format */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Trophy className="w-4 h-4" />
                      Format
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{groups.length} Groups</Badge>
                      <Badge variant="outline">{tournament.max_teams} Max Teams</Badge>
                      <Badge variant="outline">Best of {tournament.sets_per_match} Sets</Badge>
                    </div>
                  </div>

                  {/* Categories */}
                  {categories.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Tag className="w-4 h-4" />
                        Categories
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {categories.map(cat => (
                          <Badge key={cat.id} variant="secondary">
                            {cat.name} ({cat.participantCount || 0}/{cat.max_teams})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Teams Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Users className="w-4 h-4" />
                      Participants
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{registeredParticipants.length} Registered</Badge>
                      {waitlistParticipants.length > 0 && (
                        <Badge variant="outline">{waitlistParticipants.length} on Waitlist</Badge>
                      )}
                    </div>
                  </div>

                  {/* No info available placeholder */}
                  {!tournament.description && !tournament.venue && !tournament.registration_deadline && tournament.entry_fee === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Info className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No additional information available for this tournament.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

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
                  setsPerMatch={tournament.sets_per_match}
                  onSetsPerMatchChange={async (sets) => {
                    const { error } = await supabase
                      .from("tournaments")
                      .update({ sets_per_match: sets })
                      .eq("id", tournament.id);
                    if (error) {
                      sonnerToast.error("Failed to update match format");
                    } else {
                      sonnerToast.success(`Match format set to best of ${sets}`);
                      fetchData();
                    }
                  }}
                />
              </TabsContent>
            )}

            {/* Categories Tab (Admin Only) */}
            {isAdmin && (
              <TabsContent value="categories">
                <CategoryManagement
                  categories={categories}
                  tournamentStatus={tournament.status}
                  entryFeeCurrency={tournament.entry_fee_currency}
                  onCreateCategory={createCategory}
                  onUpdateCategory={updateCategory}
                  onDeleteCategory={deleteCategory}
                />
              </TabsContent>
            )}

            {/* Registrations Tab (Admin Only) */}
            {isAdmin && (
              <TabsContent value="payments">
                <PaymentManagement
                  tournamentId={tournament.id}
                  entryFee={tournament.entry_fee || 0}
                  entryFeeCurrency={tournament.entry_fee_currency || "PKR"}
                  participants={paymentParticipants}
                  onRefresh={fetchPaymentData}
                />
              </TabsContent>
            )}

            {/* Groups Tab */}
            <TabsContent value="groups">
              {filteredGroups.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Groups haven't been created yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredGroups.map(group => {
                    const groupTeams = filteredParticipants
                      .filter(p => p.group_id === group.id)
                      .map(p => ({
                        team_id: p.team_id,
                        team_name: p.custom_team_name || p.team_name || "Unknown",
                        wins: p.group_wins,
                        losses: p.group_losses,
                        points_for: p.group_points_for,
                        points_against: p.group_points_against,
                        player1_name: p.player1_name || undefined,
                        player2_name: p.player2_name || undefined,
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
              {filteredGroups.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Matches will appear after groups are created</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {filteredGroups.map(group => {
                    const gMatches = groupMatches
                      .filter(m => m.group_id === group.id)
                      .map(m => ({
                        id: m.id,
                        team1_id: m.team1_id,
                        team2_id: m.team2_id,
                        team1_name: getTeamName(m.team1_id),
                        team2_name: getTeamName(m.team2_id),
                        team1_players: getTeamPlayers(m.team1_id),
                        team2_players: getTeamPlayers(m.team2_id),
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
                        setsPerMatch={tournament.sets_per_match}
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
                  team1_players: getTeamPlayers(m.team1_id),
                  team2_players: getTeamPlayers(m.team2_id),
                }))}
                isAdmin={isAdmin}
                onSubmitScore={submitKnockoutScore}
                winnerTeamId={tournament.winner_team_id}
                winnerTeamName={tournament.winner_team_id ? getTeamName(tournament.winner_team_id) : undefined}
              />
            </TabsContent>

            {/* Participants Tab */}
            <TabsContent value="participants">
              <div className="space-y-6">
                {/* Registered Teams */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Registered Teams ({registeredParticipants.length}/{tournament.max_teams})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {registeredParticipants.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No teams registered</p>
                    ) : (
                      <div className="space-y-2">
                        {registeredParticipants.map((p, idx) => {
                          const groupName = groups.find(g => g.id === p.group_id)?.name;
                          const categoryName = categories.find(c => c.id === p.category_id)?.name;
                          const displayName = p.custom_team_name || p.team_name;
                          return (
                            <div
                              key={p.id}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                p.is_eliminated ? "opacity-50 bg-muted/30" : ""
                              }`}
                            >
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-sm text-muted-foreground w-6">{idx + 1}.</span>
                                <span className={p.is_eliminated ? "line-through" : "font-medium"}>
                                  {displayName}
                                </span>
                                {categoryName && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Tag className="w-3 h-3 mr-1" />
                                    {categoryName}
                                  </Badge>
                                )}
                                {groupName && (
                                  <Badge variant="outline" className="text-xs">{groupName}</Badge>
                                )}
                                {p.player1_name && p.player2_name && (
                                  <span className="text-xs text-muted-foreground">
                                    ({p.player1_name} & {p.player2_name})
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {tournament.entry_fee > 0 && (
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${
                                      p.payment_status === "paid" 
                                        ? "bg-emerald-500/20 text-emerald-600" 
                                        : "bg-warning/20 text-warning"
                                    }`}
                                  >
                                    {p.payment_status === "paid" ? "Paid" : "Pending"}
                                  </Badge>
                                )}
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

                {/* Waiting List */}
                {waitlistParticipants.length > 0 && (
                  <Card className="border-warning/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-warning">
                        <Clock className="w-5 h-5" />
                        Waiting List ({waitlistParticipants.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {waitlistParticipants.map((p) => {
                          const categoryName = categories.find(c => c.id === p.category_id)?.name;
                          const displayName = p.custom_team_name || p.team_name;
                          return (
                            <div
                              key={p.id}
                              className="flex items-center justify-between p-3 rounded-lg border border-warning/20 bg-warning/5"
                            >
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="bg-warning/20 text-warning-foreground">
                                  #{p.waitlist_position}
                                </Badge>
                                <span className="font-medium">{displayName}</span>
                                {categoryName && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Tag className="w-3 h-3 mr-1" />
                                    {categoryName}
                                  </Badge>
                                )}
                              </div>
                              <span className="text-sm text-muted-foreground">
                                Will be added if a team withdraws
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
}
