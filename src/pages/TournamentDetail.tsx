import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Users, Play, XCircle, Crown, Settings, Clock, Banknote, Tag, Info, MapPin, Calendar, FileText, ChevronLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { GroupStandings } from "@/components/tournament/GroupStandings";
import { GroupMatchList } from "@/components/tournament/GroupMatchList";
import { KnockoutBracket } from "@/components/tournament/KnockoutBracket";
import { RegistrationDialog } from "@/components/tournament/RegistrationDialog";
import { TournamentCategoryCard } from "@/components/tournament/TournamentCategoryCard";
import type { TournamentCategory } from "@/components/tournament/CategoryManagement";
import type { SchedulingConfig } from "@/components/tournament/GenerateMatchesDialog";
import { formatMatchDateTime } from "@/components/tournament/matchDateFormat";

// Lazy-load admin-only components
const AdminGroupManagement = lazy(() => import("@/components/tournament/AdminGroupManagement").then(m => ({ default: m.AdminGroupManagement })));
const PaymentManagement = lazy(() => import("@/components/tournament/PaymentManagement").then(m => ({ default: m.PaymentManagement })));
const CategoryManagement = lazy(() => import("@/components/tournament/CategoryManagement").then(m => ({ default: m.CategoryManagement })));
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
  scheduled_at: string | null;
  court_number: number | null;
  duration_minutes: number | null;
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
  // null = Level 1 (category cards), UUID = Level 2 (category detail)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
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
      
      const [teamsResult, membersResult] = await Promise.all([
        participantTeamIds.length > 0 
          ? supabase.from("teams").select("id, name").in("id", participantTeamIds)
          : Promise.resolve({ data: [] }),
        participantTeamIds.length > 0
          ? supabase.from("team_members").select("team_id, user_id").in("team_id", participantTeamIds).order("joined_at")
          : Promise.resolve({ data: [] }),
      ]);

      const teamNameMap = new Map((teamsResult.data || []).map(t => [t.id, t.name]));
      
      const allUserIds = [...new Set((membersResult.data || []).map(m => m.user_id))];
      let profileMap = new Map<string, string>();
      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("public_profiles")
          .select("user_id, display_name")
          .in("user_id", allUserIds);
        profileMap = new Map((profiles || []).map(p => [p.user_id!, p.display_name || "Player"]));
      }

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

    const debouncedFetch = createDebouncedCallback(() => fetchData(), 500);

    const matchesChannel = supabase
      .channel(`tournament-${id}-matches`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_matches', filter: `tournament_id=eq.${id}` }, debouncedFetch)
      .subscribe();

    const participantsChannel = supabase
      .channel(`tournament-${id}-participants`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_participants', filter: `tournament_id=eq.${id}` }, debouncedFetch)
      .subscribe();

    const groupsChannel = supabase
      .channel(`tournament-${id}-groups`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_groups', filter: `tournament_id=eq.${id}` }, debouncedFetch)
      .subscribe();

    const tournamentChannel = supabase
      .channel(`tournament-${id}-tournament`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tournaments', filter: `id=eq.${id}` }, debouncedFetch)
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
    
    const actualTeamId = teamId || userTeam?.id;
    if (!actualTeamId && !customTeamName) return;
    
    try {
      const relevantParticipants = categoryId 
        ? participants.filter(p => p.category_id === categoryId)
        : participants;
      const registeredCount = relevantParticipants.filter(p => p.waitlist_position === null).length;
      
      const category = categoryId ? categories.find(c => c.id === categoryId) : null;
      const maxTeams = category ? category.max_teams : tournament.max_teams;
      const isFull = registeredCount >= maxTeams;

      if (isFull) {
        const waitlistTeams = relevantParticipants.filter(p => p.waitlist_position !== null);
        const nextWaitlistPosition = waitlistTeams.length > 0 
          ? Math.max(...waitlistTeams.map(p => p.waitlist_position!)) + 1 
          : 1;

        const { error } = await supabase.from("tournament_participants").insert({
          tournament_id: tournament.id, team_id: actualTeamId!, waitlist_position: nextWaitlistPosition,
          custom_team_name: customTeamName, player1_name: player1Name || null, player2_name: player2Name || null,
          category_id: categoryId || null, payment_status: "pending",
        });
        if (error) throw error;
        
        const teamName = customTeamName || userTeam?.name;
        toast({ title: "Added to Waiting List", description: `${teamName} is #${nextWaitlistPosition} on the waiting list.` });
      } else {
        const { error } = await supabase.from("tournament_participants").insert({
          tournament_id: tournament.id, team_id: actualTeamId!, seed: registeredCount + 1,
          custom_team_name: customTeamName, player1_name: player1Name || null, player2_name: player2Name || null,
          category_id: categoryId || null, payment_status: "pending",
        });
        if (error) throw error;
        
        const teamName = customTeamName || userTeam?.name;
        const feeMessage = tournament.entry_fee > 0 
          ? ` Please pay ${tournament.entry_fee_currency} ${tournament.entry_fee.toLocaleString()} to confirm your slot.`
          : "";
        toast({ title: "Registered!", description: `${teamName} has joined the tournament.${feeMessage}` });
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
        await promoteFromWaitlist();
      } else {
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
    
    const { data: waitlistTeam } = await supabase
      .from("tournament_participants")
      .select("id, team_id")
      .eq("tournament_id", tournament.id)
      .not("waitlist_position", "is", null)
      .order("waitlist_position", { ascending: true })
      .limit(1)
      .single();

    if (waitlistTeam) {
      const registeredCount = participants.filter(p => p.waitlist_position === null).length;
      
      await supabase
        .from("tournament_participants")
        .update({ waitlist_position: null, seed: registeredCount })
        .eq("id", waitlistTeam.id);
      
      await reorderWaitlist();
      
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
      const { error } = await supabase.from("tournament_participants").delete().eq("id", participantId);
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

  // Helper to get the effective selectedCategoryId for admin operations (uses "all" when null for backward compat)
  const adminCategoryId = selectedCategoryId || "all";

  const createGroup = async (name: string) => {
    if (!tournament) return;
    const categoryId = categories.length > 0 && selectedCategoryId ? selectedCategoryId : null;
    const { error } = await supabase.from("tournament_groups").insert({
      tournament_id: tournament.id, name, display_order: groups.length, category_id: categoryId,
    });
    if (error) { sonnerToast.error("Failed to create group"); } 
    else { sonnerToast.success("Group created"); fetchData(); }
  };

  const deleteGroup = async (groupId: string) => {
    await supabase.from("tournament_participants").update({ group_id: null }).eq("group_id", groupId);
    const { error } = await supabase.from("tournament_groups").delete().eq("id", groupId);
    if (error) { sonnerToast.error("Failed to delete group"); } 
    else { fetchData(); }
  };

  const assignTeamToGroup = async (participantId: string, groupId: string | null) => {
    const { error } = await supabase.from("tournament_participants").update({ group_id: groupId }).eq("id", participantId);
    if (error) { sonnerToast.error("Failed to assign team"); } 
    else { fetchData(); }
  };

  const randomAssignTeams = async () => {
    const categoryId = categories.length > 0 && selectedCategoryId ? selectedCategoryId : null;
    const relevantParticipants = categoryId
      ? participants.filter(p => p.category_id === categoryId && !p.group_id)
      : participants.filter(p => !p.group_id);
    const relevantGroups = categoryId
      ? groups.filter(g => g.category_id === categoryId)
      : groups;
    
    const shuffled = [...relevantParticipants].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < shuffled.length; i++) {
      const groupIndex = i % relevantGroups.length;
      await supabase.from("tournament_participants").update({ group_id: relevantGroups[groupIndex].id }).eq("id", shuffled[i].id);
    }
    sonnerToast.success("Teams randomly assigned");
    fetchData();
  };

  const generateGroupMatches = async (config: SchedulingConfig) => {
    if (!tournament) return;
    
    const categoryId = categories.length > 0 && selectedCategoryId ? selectedCategoryId : null;
    const relevantGroups = categoryId ? groups.filter(g => g.category_id === categoryId) : groups;
    
    const relevantGroupIds = relevantGroups.map(g => g.id);
    const existingGroupMatches = matches.filter(m => m.stage === "group" && m.group_id && relevantGroupIds.includes(m.group_id));
    if (existingGroupMatches.length > 0) { sonnerToast.error("Group matches already generated"); return; }
    
    const matchesToCreate: any[] = [];
    let matchIndex = 0;
    
    for (const group of relevantGroups) {
      const groupTeams = participants.filter(p => p.group_id === group.id);
      let matchNum = 1;
      
      for (let i = 0; i < groupTeams.length; i++) {
        for (let j = i + 1; j < groupTeams.length; j++) {
          const courtNumber = (matchIndex % config.numberOfCourts) + 1;
          const timeSlot = Math.floor(matchIndex / config.numberOfCourts);
          const scheduledAt = new Date(config.startTime.getTime() + timeSlot * config.durationMinutes * 60000);

          matchesToCreate.push({
            tournament_id: tournament.id, group_id: group.id, category_id: categoryId,
            round_number: 1, match_number: matchNum++,
            team1_id: groupTeams[i].team_id, team2_id: groupTeams[j].team_id, stage: "group",
            court_number: courtNumber, duration_minutes: config.durationMinutes,
            scheduled_at: scheduledAt.toISOString(),
          });
          matchIndex++;
        }
      }
    }

    const { error } = await supabase.from("tournament_matches").insert(matchesToCreate);
    if (error) {
      sonnerToast.error("Failed to generate matches");
    } else {
      await supabase.from("tournaments").update({ status: "in_progress", started_at: new Date().toISOString() }).eq("id", tournament.id);
      sonnerToast.success(`Generated ${matchesToCreate.length} group matches!`);
      fetchData();
    }
  };

  const submitGroupMatchScore = async (matchId: string, team1Score: number, team2Score: number) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const winnerId = team1Score > team2Score ? match.team1_id : match.team2_id;
    const loserId = team1Score > team2Score ? match.team2_id : match.team1_id;

    await supabase.from("tournament_matches").update({ team1_score: team1Score, team2_score: team2Score, winner_team_id: winnerId }).eq("id", matchId);

    const winner = participants.find(p => p.team_id === winnerId);
    if (winner) {
      const winnerPoints = winnerId === match.team1_id ? team1Score : team2Score;
      const winnerAgainst = winnerId === match.team1_id ? team2Score : team1Score;
      await supabase.from("tournament_participants").update({ 
        group_wins: winner.group_wins + 1, group_points_for: winner.group_points_for + winnerPoints,
        group_points_against: winner.group_points_against + winnerAgainst,
      }).eq("id", winner.id);
    }

    const loser = participants.find(p => p.team_id === loserId);
    if (loser) {
      const loserPoints = loserId === match.team1_id ? team1Score : team2Score;
      const loserAgainst = loserId === match.team1_id ? team2Score : team1Score;
      await supabase.from("tournament_participants").update({ 
        group_losses: loser.group_losses + 1, group_points_for: loser.group_points_for + loserPoints,
        group_points_against: loser.group_points_against + loserAgainst,
      }).eq("id", loser.id);
    }

    sonnerToast.success("Match result saved");
    fetchData();
  };

  const submitKnockoutScore = async (matchId: string, team1Score: number, team2Score: number) => {
    const match = matches.find(m => m.id === matchId);
    if (!match || !tournament) return;

    const winnerId = team1Score > team2Score ? match.team1_id : match.team2_id;

    await supabase.from("tournament_matches").update({ team1_score: team1Score, team2_score: team2Score, winner_team_id: winnerId }).eq("id", matchId);

    const knockoutMatches = matches.filter(m => m.stage === "knockout");
    const nextRoundMatches = knockoutMatches.filter(m => m.round_number === match.round_number + 1);
    
    if (nextRoundMatches.length > 0) {
      const nextMatchIndex = Math.floor((match.match_number - 1) / 2);
      const nextMatch = nextRoundMatches[nextMatchIndex];
      if (nextMatch) {
        const isTeam1 = match.match_number % 2 === 1;
        await supabase.from("tournament_matches").update(isTeam1 ? { team1_id: winnerId } : { team2_id: winnerId }).eq("id", nextMatch.id);
      }
    } else {
      await supabase.from("tournaments").update({ status: "completed", winner_team_id: winnerId, completed_at: new Date().toISOString() }).eq("id", tournament.id);
    }

    sonnerToast.success("Match result saved");
    fetchData();
  };

  const rescheduleMatch = async (matchId: string, scheduledAt: string | null, courtNumber: number | null) => {
    const { error } = await supabase
      .from("tournament_matches")
      .update({ scheduled_at: scheduledAt, court_number: courtNumber })
      .eq("id", matchId);
    if (error) {
      sonnerToast.error("Failed to reschedule match");
    } else {
      sonnerToast.success("Match rescheduled");
      fetchData();
    }
  };

  const startKnockoutStage = async (config: SchedulingConfig) => {
    if (!tournament) return;

    const categoryId = categories.length > 0 && selectedCategoryId ? selectedCategoryId : null;
    const relevantGroups = categoryId ? groups.filter(g => g.category_id === categoryId) : groups;

    const qualifiedTeams: { team_id: string; group_id: string; rank: number }[] = [];
    
    for (const group of relevantGroups) {
      const groupTeams = participants
        .filter(p => p.group_id === group.id)
        .sort((a, b) => {
          if (b.group_wins !== a.group_wins) return b.group_wins - a.group_wins;
          return (b.group_points_for - b.group_points_against) - (a.group_points_for - a.group_points_against);
        })
        .slice(0, 2);

      groupTeams.forEach((team, idx) => {
        qualifiedTeams.push({ team_id: team.team_id, group_id: group.id, rank: idx + 1 });
      });
    }

    const knockoutMatches: any[] = [];
    
    if (relevantGroups.length === 2) {
      const groupA = relevantGroups[0];
      const groupB = relevantGroups[1];
      const a1 = qualifiedTeams.find(t => t.group_id === groupA.id && t.rank === 1);
      const a2 = qualifiedTeams.find(t => t.group_id === groupA.id && t.rank === 2);
      const b1 = qualifiedTeams.find(t => t.group_id === groupB.id && t.rank === 1);
      const b2 = qualifiedTeams.find(t => t.group_id === groupB.id && t.rank === 2);

      knockoutMatches.push({ tournament_id: tournament.id, round_number: 1, match_number: 1, team1_id: a1?.team_id || null, team2_id: b2?.team_id || null, stage: "knockout", category_id: categoryId });
      knockoutMatches.push({ tournament_id: tournament.id, round_number: 1, match_number: 2, team1_id: b1?.team_id || null, team2_id: a2?.team_id || null, stage: "knockout", category_id: categoryId });
      knockoutMatches.push({ tournament_id: tournament.id, round_number: 2, match_number: 1, team1_id: null, team2_id: null, stage: "knockout", category_id: categoryId });
    } else if (relevantGroups.length === 4) {
      const groupsSorted = [...relevantGroups].sort((a, b) => a.display_order - b.display_order);
      const crossMatch = [[0, 3], [1, 2], [2, 1], [3, 0]];
      
      crossMatch.forEach(([g1Idx, g2Idx], matchIdx) => {
        const g1 = groupsSorted[g1Idx];
        const g2 = groupsSorted[g2Idx];
        const t1 = qualifiedTeams.find(t => t.group_id === g1.id && t.rank === 1);
        const t2 = qualifiedTeams.find(t => t.group_id === g2.id && t.rank === 2);
        knockoutMatches.push({ tournament_id: tournament.id, round_number: 1, match_number: matchIdx + 1, team1_id: t1?.team_id || null, team2_id: t2?.team_id || null, stage: "knockout", category_id: categoryId });
      });
      
      knockoutMatches.push({ tournament_id: tournament.id, round_number: 2, match_number: 1, team1_id: null, team2_id: null, stage: "knockout", category_id: categoryId });
      knockoutMatches.push({ tournament_id: tournament.id, round_number: 2, match_number: 2, team1_id: null, team2_id: null, stage: "knockout", category_id: categoryId });
      knockoutMatches.push({ tournament_id: tournament.id, round_number: 3, match_number: 1, team1_id: null, team2_id: null, stage: "knockout", category_id: categoryId });
    }

    // Apply scheduling config to knockout matches
    knockoutMatches.forEach((match, i) => {
      const courtNumber = (i % config.numberOfCourts) + 1;
      const timeSlot = Math.floor(i / config.numberOfCourts);
      const scheduledAt = new Date(config.startTime.getTime() + timeSlot * config.durationMinutes * 60000);
      match.court_number = courtNumber;
      match.duration_minutes = config.durationMinutes;
      match.scheduled_at = scheduledAt.toISOString();
    });

    const { error } = await supabase.from("tournament_matches").insert(knockoutMatches);
    if (error) { sonnerToast.error("Failed to start knockout stage"); } 
    else { sonnerToast.success("Knockout stage started!"); fetchData(); }
  };

  const createCategory = async (name: string, description: string, maxTeams: number, entryFee: number) => {
    if (!tournament) return;
    const { error } = await supabase.from("tournament_categories").insert({
      tournament_id: tournament.id, name, description: description || null, max_teams: maxTeams, entry_fee: entryFee, display_order: categories.length,
    });
    if (error) { sonnerToast.error("Failed to create category"); } 
    else { sonnerToast.success("Category created"); fetchData(); }
  };

  const updateCategory = async (id: string, name: string, description: string, maxTeams: number, entryFee: number) => {
    const { error } = await supabase.from("tournament_categories").update({ name, description: description || null, max_teams: maxTeams, entry_fee: entryFee }).eq("id", id);
    if (error) { sonnerToast.error("Failed to update category"); } 
    else { sonnerToast.success("Category updated"); fetchData(); }
  };

  const deleteCategory = async (id: string) => {
    await supabase.from("tournament_participants").update({ category_id: null }).eq("category_id", id);
    const { error } = await supabase.from("tournament_categories").delete().eq("id", id);
    if (error) { sonnerToast.error("Failed to delete category"); } 
    else { sonnerToast.success("Category deleted"); fetchData(); }
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
  
  const hasCategories = categories.length > 0;
  const isLevel2 = hasCategories && selectedCategoryId !== null;
  
  // Filter participants/groups/matches by selected category for Level 2
  const filteredParticipants = selectedCategoryId 
    ? participants.filter(p => p.category_id === selectedCategoryId)
    : participants;
  const filteredGroups = selectedCategoryId
    ? groups.filter(g => g.category_id === selectedCategoryId)
    : groups;
  const filteredMatches = selectedCategoryId
    ? matches.filter(m => m.category_id === selectedCategoryId)
    : matches;
    
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

  const userGroup = userParticipant?.group_id ? groups.find(g => g.id === userParticipant.group_id) : null;

  // Helper: get round label for knockout
  const getRoundLabel = (roundNumber: number, maxRound: number) => {
    const fromEnd = maxRound - roundNumber;
    if (fromEnd === 0) return "Final";
    if (fromEnd === 1) return "Semi Final";
    if (fromEnd === 2) return "Quarter Final";
    return `Round ${roundNumber}`;
  };

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

  // ========== RENDER ==========

  const renderRegistrationActions = () => {
    if (tournament.status !== "registration") return null;
    const allRegistered = participants.filter(p => p.waitlist_position === null);
    const allWaitlist = participants.filter(p => p.waitlist_position !== null);
    return (
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
              {allRegistered.length} teams registered
              {allRegistered.length >= tournament.max_teams && " (Full)"}
              {allWaitlist.length > 0 && `, ${allWaitlist.length} on waiting list`}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            {canRegister && (
              <Button onClick={() => setRegistrationDialogOpen(true)}>
                <Users className="w-4 h-4 mr-2" />
                {allRegistered.length >= tournament.max_teams ? "Join Waiting List" : "Register"}
              </Button>
            )}
            {isRegistered && !isOnWaitlist && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={userParticipant?.payment_status === "paid" ? "bg-emerald-500/20 text-emerald-600" : "bg-warning/20 text-warning"}>
                  {userParticipant?.payment_status === "paid" ? "Paid" : "Payment Pending"}
                </Badge>
                <Button variant="outline" onClick={withdrawTeam}>
                  <XCircle className="w-4 h-4 mr-2" />Withdraw
                </Button>
              </div>
            )}
            {isRegistered && isOnWaitlist && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-warning/20 text-warning-foreground">Waitlist #{userParticipant?.waitlist_position}</Badge>
                <Button variant="outline" size="sm" onClick={withdrawTeam}>
                  <XCircle className="w-4 h-4 mr-2" />Leave Waitlist
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // ===== Level 2: Category Detail View with Standings/Matches/Info =====
  const renderCategoryDetail = () => {
    const selectedCategory = categories.find(c => c.id === selectedCategoryId);
    if (!selectedCategory) return null;

    return (
      <div>
        <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => setSelectedCategoryId(null)}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Categories
        </Button>

        <h2 className="text-xl font-bold mb-4">{selectedCategory.name}</h2>

        <Tabs defaultValue="standings" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="standings">Standings</TabsTrigger>
            <TabsTrigger value="matches">Matches</TabsTrigger>
            <TabsTrigger value="info">Info</TabsTrigger>
          </TabsList>

          {/* Standings Tab */}
          <TabsContent value="standings">
            {filteredGroups.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Groups haven't been created yet</p>
                </CardContent>
              </Card>
            ) : (
              <Accordion type="multiple" defaultValue={filteredGroups.map(g => g.id)} className="space-y-3">
                {filteredGroups.map(group => {
                  const groupTeams = filteredParticipants
                    .filter(p => p.group_id === group.id)
                    .map(p => ({
                      team_id: p.team_id,
                      team_name: p.custom_team_name || p.team_name || "Unknown",
                      wins: p.group_wins, losses: p.group_losses,
                      points_for: p.group_points_for, points_against: p.group_points_against,
                      player1_name: p.player1_name || undefined, player2_name: p.player2_name || undefined,
                    }));

                  return (
                    <AccordionItem key={group.id} value={group.id} className="border rounded-lg">
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <span className="font-semibold">{group.name}</span>
                      </AccordionTrigger>
                      <AccordionContent className="px-0 pb-0">
                        <GroupStandings groupName={group.name} teams={groupTeams} highlightTeamId={userTeam?.id} />
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </TabsContent>

          {/* Matches Tab (Merged: Knockout + Group Matches) */}
          <TabsContent value="matches">
            {filteredGroups.length === 0 && knockoutMatches.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No matches yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Knockout rounds (reverse order: Final first) */}
                {knockoutMatches.length > 0 && (() => {
                  const roundsGrouped = knockoutMatches.reduce((acc, match) => {
                    if (!acc[match.round_number]) acc[match.round_number] = [];
                    acc[match.round_number].push(match);
                    return acc;
                  }, {} as Record<number, TournamentMatch[]>);

                  const maxRound = Math.max(...Object.keys(roundsGrouped).map(Number));
                  const roundNumbers = Object.keys(roundsGrouped).map(Number).sort((a, b) => b - a);

                  return (
                    <Accordion type="multiple" defaultValue={roundNumbers.map(r => `knockout-${r}`)} className="space-y-3">
                      {roundNumbers.map(roundNum => (
                        <AccordionItem key={`knockout-${roundNum}`} value={`knockout-${roundNum}`} className="border rounded-lg">
                          <AccordionTrigger className="px-4 hover:no-underline">
                            <div className="flex items-center gap-2">
                              <Trophy className="w-4 h-4 text-warning" />
                              <span className="font-semibold">{getRoundLabel(roundNum, maxRound)}</span>
                              <Badge variant="outline" className="text-xs ml-2">
                                {roundsGrouped[roundNum].filter(m => m.winner_team_id).length}/{roundsGrouped[roundNum].length}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <div className="grid gap-3 md:grid-cols-2">
                              {roundsGrouped[roundNum].map(match => (
                                <Card key={match.id} className={match.winner_team_id ? "bg-muted/50" : ""}>
                                  <CardContent className="py-3">
                                    <div className="space-y-2">
                                      {(match.court_number || match.scheduled_at) && (
                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                          {match.court_number && <><MapPin className="w-3 h-3" />Court {match.court_number}</>}
                                          {match.court_number && match.scheduled_at && <span>—</span>}
                                          {match.scheduled_at && formatMatchDateTime(match.scheduled_at)}
                                        </div>
                                      )}
                                      <div className="flex items-center justify-between">
                                        <div className={`flex-1 ${match.winner_team_id === match.team1_id ? "font-bold text-success" : ""}`}>
                                          {getTeamName(match.team1_id)}
                                        </div>
                                        {match.team1_score !== null && <span className="font-mono font-semibold">{match.team1_score}</span>}
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <div className={`flex-1 ${match.winner_team_id === match.team2_id ? "font-bold text-success" : ""}`}>
                                          {getTeamName(match.team2_id)}
                                        </div>
                                        {match.team2_score !== null && <span className="font-mono font-semibold">{match.team2_score}</span>}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  );
                })()}

                {/* Group matches */}
                {filteredGroups.length > 0 && groupMatches.length > 0 && (
                  <Accordion type="multiple" defaultValue={filteredGroups.map(g => `group-match-${g.id}`)} className="space-y-3">
                    {filteredGroups.map(group => {
                      const gMatches = groupMatches
                        .filter(m => m.group_id === group.id)
                        .map(m => ({
                          id: m.id, team1_id: m.team1_id, team2_id: m.team2_id,
                          team1_name: getTeamName(m.team1_id), team2_name: getTeamName(m.team2_id),
                          team1_players: getTeamPlayers(m.team1_id), team2_players: getTeamPlayers(m.team2_id),
                          team1_score: m.team1_score, team2_score: m.team2_score, winner_team_id: m.winner_team_id,
                          scheduled_at: m.scheduled_at, court_number: m.court_number,
                        }));

                      if (gMatches.length === 0) return null;

                      return (
                        <AccordionItem key={`group-match-${group.id}`} value={`group-match-${group.id}`} className="border rounded-lg">
                          <AccordionTrigger className="px-4 hover:no-underline">
                            <span className="font-semibold">{group.name} Matches</span>
                          </AccordionTrigger>
                          <AccordionContent className="px-0 pb-0">
                            <GroupMatchList
                              groupName={group.name}
                              matches={gMatches}
                              isAdmin={isAdmin}
                              onSubmitScore={submitGroupMatchScore}
                              onReschedule={isAdmin ? rescheduleMatch : undefined}
                              setsPerMatch={tournament.sets_per_match}
                            />
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}
              </div>
            )}
          </TabsContent>

          {/* Info Tab */}
          <TabsContent value="info">
            <Card>
              <CardContent className="p-4 space-y-4">
                {tournament.description && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><FileText className="w-4 h-4" />Description</div>
                    <p className="text-foreground">{tournament.description}</p>
                  </div>
                )}
                {tournament.venue && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><MapPin className="w-4 h-4" />Venue</div>
                    <p className="text-foreground">{tournament.venue}</p>
                  </div>
                )}
                {(tournament.start_date || tournament.end_date) && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Calendar className="w-4 h-4" />Event Dates</div>
                    <p className="text-foreground">
                      {tournament.start_date && tournament.end_date ? (
                        <>{new Date(tournament.start_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} — {new Date(tournament.end_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</>
                      ) : tournament.start_date ? (
                        new Date(tournament.start_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                      ) : `Ends ${new Date(tournament.end_date!).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
                    </p>
                  </div>
                )}
                {(selectedCategory.entry_fee || tournament.entry_fee > 0) && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Banknote className="w-4 h-4" />Entry Fee</div>
                    <p className="text-foreground font-semibold">
                      PKR {(selectedCategory.entry_fee || tournament.entry_fee).toLocaleString()}
                    </p>
                    {tournament.payment_instructions && (
                      <div className="p-3 rounded-lg bg-muted/50 border border-border mt-2">
                        <p className="text-sm font-medium mb-1">Payment Instructions:</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{tournament.payment_instructions}</p>
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Users className="w-4 h-4" />Category Details</div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{registeredParticipants.length}/{selectedCategory.max_teams} Teams</Badge>
                    <Badge variant="outline">Best of {tournament.sets_per_match} Sets</Badge>
                    <Badge variant="outline">{filteredGroups.length} Groups</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  // ===== Level 1: Category Cards View =====
  const renderCategoryCards = () => {
    return (
      <div className="space-y-3">
        {categories.map(cat => {
          const catParticipants = participants.filter(p => p.category_id === cat.id && p.waitlist_position === null);
          // Find winner for this category (if tournament completed, find the knockout final winner)
          const catKnockoutMatches = matches.filter(m => m.stage === "knockout" && m.category_id === cat.id);
          const maxRound = catKnockoutMatches.length > 0 ? Math.max(...catKnockoutMatches.map(m => m.round_number)) : 0;
          const finalMatch = catKnockoutMatches.find(m => m.round_number === maxRound && m.winner_team_id);
          const winnerName = finalMatch?.winner_team_id ? getTeamName(finalMatch.winner_team_id) : null;

          return (
            <TournamentCategoryCard
              key={cat.id}
              name={cat.name}
              venue={tournament.venue}
              teamsJoined={catParticipants.length}
              maxTeams={cat.max_teams}
              entryFee={cat.entry_fee || tournament.entry_fee}
              currency={tournament.entry_fee_currency || "PKR"}
              winnerName={winnerName}
              onClick={() => setSelectedCategoryId(cat.id)}
            />
          );
        })}
      </div>
    );
  };

  // ===== Admin Tabs (shown at both levels) =====
  const renderAdminTabs = () => {
    if (!isAdmin) return null;

    return (
      <Tabs defaultValue="manage" className="w-full mb-6">
        <TabsList className="mb-4 flex overflow-x-auto h-auto flex-nowrap justify-start gap-1 p-1">
          <TabsTrigger value="manage" className="text-xs sm:text-sm shrink-0"><Settings className="w-4 h-4 mr-1 sm:mr-2" />Manage</TabsTrigger>
          <TabsTrigger value="categories" className="text-xs sm:text-sm shrink-0"><Tag className="w-4 h-4 mr-1 sm:mr-2" />Categories</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs sm:text-sm shrink-0"><Banknote className="w-4 h-4 mr-1 sm:mr-2" />Registrations</TabsTrigger>
        </TabsList>

        <TabsContent value="manage">
          {!selectedCategoryId ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium mb-2">Select a category first</p>
                <p className="text-sm">Click on a category card above to manage groups for that category.</p>
              </CardContent>
            </Card>
          ) : (
            <Suspense fallback={<Skeleton className="h-48 w-full" />}>
            <AdminGroupManagement
              groups={filteredGroups}
              teams={filteredParticipants.filter(p => p.waitlist_position === null).map(p => ({
                id: p.id, team_id: p.team_id,
                team_name: p.custom_team_name || p.team_name || "Unknown",
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
                const { error } = await supabase.from("tournaments").update({ sets_per_match: sets }).eq("id", tournament.id);
                if (error) { sonnerToast.error("Failed to update match format"); } 
                else { sonnerToast.success(`Match format set to best of ${sets}`); fetchData(); }
              }}
              categoryName={categories.find(c => c.id === selectedCategoryId)?.name}
            />
            </Suspense>
          )}
        </TabsContent>

        <TabsContent value="categories">
          <Suspense fallback={<Skeleton className="h-48 w-full" />}>
          <CategoryManagement
            categories={categories}
            tournamentStatus={tournament.status}
            entryFeeCurrency={tournament.entry_fee_currency}
            onCreateCategory={createCategory}
            onUpdateCategory={updateCategory}
            onDeleteCategory={deleteCategory}
          />
          </Suspense>
        </TabsContent>

        <TabsContent value="payments">
          <Suspense fallback={<Skeleton className="h-48 w-full" />}>
          <PaymentManagement
            tournamentId={tournament.id}
            entryFee={tournament.entry_fee || 0}
            entryFeeCurrency={tournament.entry_fee_currency || "PKR"}
            participants={paymentParticipants}
            onRefresh={fetchPaymentData}
          />
          </Suspense>
        </TabsContent>
      </Tabs>
    );
  };

  // ===== Fallback: No Categories (legacy flat tab layout) =====
  const renderFlatLayout = () => {
    return (
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="mb-6 flex overflow-x-auto h-auto flex-nowrap justify-start gap-1 p-1">
          <TabsTrigger value="info" className="text-xs sm:text-sm shrink-0"><Info className="w-4 h-4 mr-1 sm:mr-2" />Info</TabsTrigger>
          {isAdmin && <TabsTrigger value="manage" className="text-xs sm:text-sm shrink-0"><Settings className="w-4 h-4 mr-1 sm:mr-2" />Manage</TabsTrigger>}
          {isAdmin && <TabsTrigger value="categories" className="text-xs sm:text-sm shrink-0"><Tag className="w-4 h-4 mr-1 sm:mr-2" />Categories</TabsTrigger>}
          {isAdmin && <TabsTrigger value="payments" className="text-xs sm:text-sm shrink-0"><Banknote className="w-4 h-4 mr-1 sm:mr-2" />Registrations</TabsTrigger>}
          <TabsTrigger value="groups" className="text-xs sm:text-sm shrink-0">Groups</TabsTrigger>
          <TabsTrigger value="matches" className="text-xs sm:text-sm shrink-0">Matches</TabsTrigger>
          <TabsTrigger value="knockout" className="text-xs sm:text-sm shrink-0">Knockout</TabsTrigger>
          <TabsTrigger value="participants" className="text-xs sm:text-sm shrink-0">Participants</TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Info className="w-5 h-5" />Tournament Information</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {tournament.description && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><FileText className="w-4 h-4" />Description</div>
                  <p className="text-foreground">{tournament.description}</p>
                </div>
              )}
              {tournament.venue && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><MapPin className="w-4 h-4" />Venue</div>
                  <p className="text-foreground">{tournament.venue}</p>
                </div>
              )}
              {(tournament.start_date || tournament.end_date) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Calendar className="w-4 h-4" />Event Dates</div>
                  <p className="text-foreground">
                    {tournament.start_date && tournament.end_date ? (
                      <>{new Date(tournament.start_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} — {new Date(tournament.end_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</>
                    ) : tournament.start_date ? (
                      new Date(tournament.start_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                    ) : `Ends ${new Date(tournament.end_date!).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
                  </p>
                </div>
              )}
              {tournament.registration_deadline && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Clock className="w-4 h-4" />Registration Deadline</div>
                  <p className="text-foreground">{new Date(tournament.registration_deadline).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              )}
              {tournament.entry_fee > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Banknote className="w-4 h-4" />Entry Fee</div>
                  <p className="text-foreground font-semibold">PKR {tournament.entry_fee.toLocaleString()}</p>
                  {tournament.payment_instructions && (
                    <div className="p-3 rounded-lg bg-muted/50 border border-border mt-2">
                      <p className="text-sm font-medium mb-1">Payment Instructions:</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{tournament.payment_instructions}</p>
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Trophy className="w-4 h-4" />Format</div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{groups.length} Groups</Badge>
                  <Badge variant="outline">{tournament.max_teams} Max Teams</Badge>
                  <Badge variant="outline">Best of {tournament.sets_per_match} Sets</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Users className="w-4 h-4" />Participants</div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{registeredParticipants.length} Registered</Badge>
                  {waitlistParticipants.length > 0 && <Badge variant="outline">{waitlistParticipants.length} on Waitlist</Badge>}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="manage">
            <Suspense fallback={<Skeleton className="h-48 w-full" />}>
            <AdminGroupManagement
              groups={filteredGroups}
              teams={filteredParticipants.filter(p => p.waitlist_position === null).map(p => ({
                id: p.id, team_id: p.team_id, team_name: p.custom_team_name || p.team_name || "Unknown", group_id: p.group_id,
              }))}
              onCreateGroup={createGroup} onDeleteGroup={deleteGroup} onAssignTeam={assignTeamToGroup}
              onRandomAssign={randomAssignTeams} onGenerateGroupMatches={generateGroupMatches}
              canStartKnockout={canStartKnockout} onStartKnockout={startKnockoutStage} onKickTeam={kickTeam}
              setsPerMatch={tournament.sets_per_match}
              onSetsPerMatchChange={async (sets) => {
                const { error } = await supabase.from("tournaments").update({ sets_per_match: sets }).eq("id", tournament.id);
                if (error) { sonnerToast.error("Failed to update match format"); } 
                else { sonnerToast.success(`Match format set to best of ${sets}`); fetchData(); }
              }}
            />
            </Suspense>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="categories">
            <Suspense fallback={<Skeleton className="h-48 w-full" />}>
            <CategoryManagement categories={categories} tournamentStatus={tournament.status} entryFeeCurrency={tournament.entry_fee_currency}
              onCreateCategory={createCategory} onUpdateCategory={updateCategory} onDeleteCategory={deleteCategory} />
            </Suspense>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="payments">
            <Suspense fallback={<Skeleton className="h-48 w-full" />}>
            <PaymentManagement tournamentId={tournament.id} entryFee={tournament.entry_fee || 0} entryFeeCurrency={tournament.entry_fee_currency || "PKR"}
              participants={paymentParticipants} onRefresh={fetchPaymentData} />
            </Suspense>
          </TabsContent>
        )}

        <TabsContent value="groups">
          {filteredGroups.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground"><Users className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>Groups haven't been created yet</p></CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredGroups.map(group => {
                const groupTeams = filteredParticipants.filter(p => p.group_id === group.id).map(p => ({
                  team_id: p.team_id, team_name: p.custom_team_name || p.team_name || "Unknown",
                  wins: p.group_wins, losses: p.group_losses, points_for: p.group_points_for, points_against: p.group_points_against,
                  player1_name: p.player1_name || undefined, player2_name: p.player2_name || undefined,
                }));
                return <GroupStandings key={group.id} groupName={group.name} teams={groupTeams} highlightTeamId={userTeam?.id} />;
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="matches">
          {filteredGroups.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground"><Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>Matches will appear after groups are created</p></CardContent></Card>
          ) : (
            <div className="space-y-6">
              {filteredGroups.map(group => {
                const gMatches = groupMatches.filter(m => m.group_id === group.id).map(m => ({
                  id: m.id, team1_id: m.team1_id, team2_id: m.team2_id,
                  team1_name: getTeamName(m.team1_id), team2_name: getTeamName(m.team2_id),
                  team1_players: getTeamPlayers(m.team1_id), team2_players: getTeamPlayers(m.team2_id),
                  team1_score: m.team1_score, team2_score: m.team2_score, winner_team_id: m.winner_team_id,
                  scheduled_at: m.scheduled_at, court_number: m.court_number,
                }));
                return <GroupMatchList key={group.id} groupName={group.name} matches={gMatches} isAdmin={isAdmin} onSubmitScore={submitGroupMatchScore} onReschedule={isAdmin ? rescheduleMatch : undefined} setsPerMatch={tournament.sets_per_match} />;
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="knockout">
          <KnockoutBracket
            matches={knockoutMatches.map(m => ({ ...m, team1_name: getTeamName(m.team1_id), team2_name: getTeamName(m.team2_id), team1_players: getTeamPlayers(m.team1_id), team2_players: getTeamPlayers(m.team2_id) }))}
            isAdmin={isAdmin} onSubmitScore={submitKnockoutScore} onReschedule={isAdmin ? rescheduleMatch : undefined}
            winnerTeamId={tournament.winner_team_id}
            winnerTeamName={tournament.winner_team_id ? getTeamName(tournament.winner_team_id) : undefined}
          />
        </TabsContent>

        <TabsContent value="participants">
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />Registered Teams ({registeredParticipants.length}/{tournament.max_teams})</CardTitle></CardHeader>
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
                        <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg border ${p.is_eliminated ? "opacity-50 bg-muted/30" : ""}`}>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-sm text-muted-foreground w-6">{idx + 1}.</span>
                            <span className={p.is_eliminated ? "line-through" : "font-medium"}>{displayName}</span>
                            {categoryName && <Badge variant="secondary" className="text-xs"><Tag className="w-3 h-3 mr-1" />{categoryName}</Badge>}
                            {groupName && <Badge variant="outline" className="text-xs">{groupName}</Badge>}
                            {p.player1_name && p.player2_name && <span className="text-xs text-muted-foreground">({p.player1_name} & {p.player2_name})</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            {tournament.entry_fee > 0 && (
                              <Badge variant="outline" className={`text-xs ${p.payment_status === "paid" ? "bg-emerald-500/20 text-emerald-600" : "bg-warning/20 text-warning"}`}>
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
            {waitlistParticipants.length > 0 && (
              <Card className="border-warning/30">
                <CardHeader><CardTitle className="flex items-center gap-2 text-warning"><Clock className="w-5 h-5" />Waiting List ({waitlistParticipants.length})</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {waitlistParticipants.map((p) => {
                      const categoryName = categories.find(c => c.id === p.category_id)?.name;
                      const displayName = p.custom_team_name || p.team_name;
                      return (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-warning/20 bg-warning/5">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="bg-warning/20 text-warning-foreground">#{p.waitlist_position}</Badge>
                            <span className="font-medium">{displayName}</span>
                            {categoryName && <Badge variant="secondary" className="text-xs"><Tag className="w-3 h-3 mr-1" />{categoryName}</Badge>}
                          </div>
                          <span className="text-sm text-muted-foreground">Will be added if a team withdraws</span>
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
    );
  };

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
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-warning" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{tournament.name}</h1>
                <p className="text-muted-foreground">
                  {hasCategories ? `${categories.length} categories` : `${groups.length} groups`} • {participants.filter(p => p.waitlist_position === null).length} teams
                </p>
              </div>
            </div>
            <Badge variant={tournament.status === "completed" ? "outline" : "default"}>
              {tournament.status.replace("_", " ")}
            </Badge>
          </div>

          {renderRegistrationActions()}

          <RegistrationDialog
            open={registrationDialogOpen}
            onOpenChange={setRegistrationDialogOpen}
            tournamentId={tournament.id}
            tournamentName={tournament.name}
            entryFee={tournament.entry_fee || 0}
            entryFeeCurrency={tournament.entry_fee_currency || "PKR"}
            paymentInstructions={tournament.payment_instructions}
            isFull={participants.filter(p => p.waitlist_position === null).length >= tournament.max_teams}
            userTeam={userTeam}
            categories={categories.map(c => ({
              id: c.id, name: c.name, max_teams: c.max_teams, participantCount: c.participantCount ?? 0, entry_fee: c.entry_fee,
            }))}
            onRegister={registerTeam}
            teamMemberCount={userTeamMemberCount}
          />

          {/* Winner Banner */}
          {tournament.status === "completed" && tournament.winner_team_id && (
            <Card className="mb-6 bg-gradient-to-r from-rank-gold/10 to-warning/10 border-rank-gold/30">
              <CardContent className="py-6 flex items-center justify-center gap-3">
                <Crown className="w-8 h-8 text-rank-gold" />
                <span className="text-2xl font-bold text-foreground">{getTeamName(tournament.winner_team_id)} wins!</span>
              </CardContent>
            </Card>
          )}

          {/* Main Content */}
          {hasCategories ? (
            <div>
              {/* Admin tabs shown above for both levels */}
              {renderAdminTabs()}

              {/* Level 1: Category Cards or Level 2: Category Detail */}
              {isLevel2 ? renderCategoryDetail() : renderCategoryCards()}
            </div>
          ) : (
            renderFlatLayout()
          )}
        </motion.div>
      </main>
    </div>
  );
}
