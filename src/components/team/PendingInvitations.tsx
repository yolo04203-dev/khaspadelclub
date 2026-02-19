import { useState, useEffect } from "react";
import { Loader2, Check, X, Clock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { logger } from "@/lib/logger";

interface Invitation {
  id: string;
  team_id: string;
  team_name: string;
  team_avatar: string | null;
  inviter_name: string | null;
  message: string | null;
  created_at: string;
  expires_at: string;
}

interface PendingInvitationsProps {
  onAccepted: () => void;
}

export function PendingInvitations({ onAccepted }: PendingInvitationsProps) {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  const fetchInvitations = async () => {
    if (!user) return;

    try {
      const { data: invites, error } = await supabase
        .from("team_invitations")
        .select("id, team_id, message, created_at, expires_at, invited_by")
        .eq("invited_user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!invites || invites.length === 0) {
        setInvitations([]);
        return;
      }

      // Get team details
      const teamIds = invites.map(i => i.team_id);
      const { data: teams } = await supabase
        .from("teams")
        .select("id, name, avatar_url")
        .in("id", teamIds);

      // Get inviter profiles
      const inviterIds = invites.map(i => i.invited_by);
      const { data: profiles } = await supabase
        .from("public_profiles")
        .select("user_id, display_name")
        .in("user_id", inviterIds);

      const teamsMap = new Map(teams?.map(t => [t.id, t]) || []);
      const profilesMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);

      setInvitations(
        invites.map(inv => ({
          id: inv.id,
          team_id: inv.team_id,
          team_name: teamsMap.get(inv.team_id)?.name || "Unknown Team",
          team_avatar: teamsMap.get(inv.team_id)?.avatar_url || null,
          inviter_name: profilesMap.get(inv.invited_by) || null,
          message: inv.message,
          created_at: inv.created_at,
          expires_at: inv.expires_at,
        }))
      );
    } catch (error) {
      logger.apiError("fetchInvitations", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, [user]);

  const handleRespond = async (invitationId: string, accept: boolean) => {
    setRespondingTo(invitationId);

    try {
      const invitation = invitations.find(i => i.id === invitationId);
      if (!invitation || !user) return;

      if (accept) {
        // Check if user is already on a team
        const { data: existingMember } = await supabase
          .from("team_members")
          .select("id, team_id, is_captain")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingMember) {
          // Count team members to check if solo team
          const { data: teammates } = await supabase
            .from("team_members")
            .select("id")
            .eq("team_id", existingMember.team_id);

          const memberCount = teammates?.length ?? 0;

          if (memberCount > 1) {
            toast({
              title: "Already on a team",
              description: "You must leave your current team before joining another.",
              variant: "destructive",
            });
            return;
          }

          // Solo team — auto-remove and delete the empty team
          const oldTeamId = existingMember.team_id;

          // Remove self from old team (use team_id + user_id for RLS compatibility)
          await supabase
            .from("team_members")
            .delete()
            .eq("team_id", oldTeamId)
            .eq("user_id", user.id);

          // Delete the now-empty team
          await supabase
            .from("teams")
            .delete()
            .eq("id", oldTeamId);
        }

        // Add user to team
        const { error: memberError } = await supabase
          .from("team_members")
          .insert({
            team_id: invitation.team_id,
            user_id: user.id,
            is_captain: false,
          });

        if (memberError) throw memberError;

        // Update invitation status
        const { error: updateError } = await supabase
          .from("team_invitations")
          .update({
            status: "accepted",
            responded_at: new Date().toISOString(),
          })
          .eq("id", invitationId);

        if (updateError) throw updateError;

        // Auto-name the team from both players' display names
        await supabase.rpc("auto_name_team", { _team_id: invitation.team_id });

        toast({
          title: "Team joined!",
          description: `You are now a member of ${invitation.team_name}.`,
        });

        onAccepted();
      } else {
        // Decline invitation
        const { error } = await supabase
          .from("team_invitations")
          .update({
            status: "declined",
            responded_at: new Date().toISOString(),
          })
          .eq("id", invitationId);

        if (error) throw error;

        toast({
          title: "Invitation declined",
          description: "The invitation has been declined.",
        });
      }

      // Refresh invitations
      fetchInvitations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRespondingTo(null);
    }
  };

  if (isLoading || invitations.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5" />
          Team Invitations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
          >
            <Avatar className="w-10 h-10">
              <AvatarImage src={invitation.team_avatar || undefined} />
              <AvatarFallback className="bg-accent/20 text-accent">
                {invitation.team_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">
                {invitation.team_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {invitation.inviter_name && `Invited by ${invitation.inviter_name} • `}
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                </span>
              </p>
              {invitation.message && (
                <p className="text-sm text-muted-foreground mt-1 italic">
                  "{invitation.message}"
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRespond(invitation.id, false)}
                disabled={respondingTo === invitation.id}
              >
                <X className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => handleRespond(invitation.id, true)}
                disabled={respondingTo === invitation.id}
              >
                {respondingTo === invitation.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
