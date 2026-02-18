import { useState, useEffect } from "react";
import { UserMinus, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface RemovePartnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  partnerName: string;
  captainName: string;
  onRemoved: () => void;
}

interface ActiveData {
  ladderRankings: { categoryName: string; rank: number }[];
  pendingChallenges: number;
  acceptedChallenges: number;
}

export function RemovePartnerDialog({
  open,
  onOpenChange,
  teamId,
  partnerName,
  captainName,
  onRemoved,
}: RemovePartnerDialogProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeData, setActiveData] = useState<ActiveData | null>(null);

  useEffect(() => {
    if (!open) {
      setActiveData(null);
      return;
    }

    const fetchActiveData = async () => {
      setIsLoading(true);
      try {
        const [{ data: rankings }, { count: pendingCount }, { count: acceptedCount }] = await Promise.all([
          supabase
            .from("ladder_rankings")
            .select("rank, ladder_category_id, ladder_categories(name)")
            .eq("team_id", teamId),
          supabase
            .from("challenges")
            .select("*", { count: "exact", head: true })
            .or(`challenger_team_id.eq.${teamId},challenged_team_id.eq.${teamId}`)
            .eq("status", "pending"),
          supabase
            .from("challenges")
            .select("*", { count: "exact", head: true })
            .or(`challenger_team_id.eq.${teamId},challenged_team_id.eq.${teamId}`)
            .eq("status", "accepted"),
        ]);

        setActiveData({
          ladderRankings: (rankings || []).map((r: any) => ({
            categoryName: r.ladder_categories?.name || "Unknown",
            rank: r.rank,
          })),
          pendingChallenges: pendingCount || 0,
          acceptedChallenges: acceptedCount || 0,
        });
      } catch (error) {
        logger.apiError("fetchActiveData", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveData();
  }, [open, teamId]);

  const hasWarnings = activeData && (
    activeData.ladderRankings.length > 0 ||
    activeData.pendingChallenges > 0 ||
    activeData.acceptedChallenges > 0
  );

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      const { data: members, error: fetchError } = await supabase
        .from("team_members")
        .select("id, user_id, is_captain")
        .eq("team_id", teamId);

      if (fetchError) throw fetchError;

      const partnerMember = members?.find((m) => !m.is_captain);
      if (!partnerMember) {
        toast({
          title: "No partner found",
          description: "There is no partner to remove from this team.",
          variant: "destructive",
        });
        return;
      }

      const { error: deleteError } = await supabase
        .from("team_members")
        .delete()
        .eq("id", partnerMember.id);

      if (deleteError) throw deleteError;

      const newName = `${captainName}'s Team`;
      await supabase
        .from("teams")
        .update({ name: newName })
        .eq("id", teamId);

      toast({
        title: "Partner removed",
        description: `${partnerName} has been removed from the team.`,
      });

      onOpenChange(false);
      onRemoved();
    } catch (error: any) {
      logger.apiError("removePartner", error);
      toast({
        title: "Failed to remove partner",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <UserMinus className="w-5 h-5 text-destructive" />
            Remove Partner
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Are you sure you want to remove <strong>{partnerName}</strong> from
                the team?
              </p>

              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking active competitions...
                </div>
              )}

              {hasWarnings && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                  <div className="flex items-center gap-2 font-medium text-destructive text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    Warning: Active competitions detected
                  </div>
                  <ul className="text-sm space-y-1 ml-6 list-disc text-foreground">
                    {activeData!.ladderRankings.map((r, i) => (
                      <li key={i}>
                        Ranked #{r.rank} in <strong>{r.categoryName}</strong>
                      </li>
                    ))}
                    {activeData!.pendingChallenges > 0 && (
                      <li>{activeData!.pendingChallenges} pending challenge(s)</li>
                    )}
                    {activeData!.acceptedChallenges > 0 && (
                      <li>{activeData!.acceptedChallenges} accepted challenge(s) in progress</li>
                    )}
                  </ul>
                  <p className="text-sm text-muted-foreground">
                    Removing the partner will affect your team's eligibility for these competitions.
                  </p>
                </div>
              )}

              {!isLoading && !hasWarnings && activeData && (
                <p className="text-sm text-muted-foreground">
                  No active competitions found for this team.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRemove}
            disabled={isRemoving || isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isRemoving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Removing...
              </>
            ) : (
              "Remove Partner"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}