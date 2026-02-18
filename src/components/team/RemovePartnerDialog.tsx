import { useState } from "react";
import { UserMinus, Loader2 } from "lucide-react";
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

export function RemovePartnerDialog({
  open,
  onOpenChange,
  teamId,
  partnerName,
  captainName,
  onRemoved,
}: RemovePartnerDialogProps) {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      // Find the non-captain member
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

      // Remove the partner from team_members
      const { error: deleteError } = await supabase
        .from("team_members")
        .delete()
        .eq("id", partnerMember.id);

      if (deleteError) throw deleteError;

      // Update team name back to captain-only format
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
          <AlertDialogDescription>
            Are you sure you want to remove <strong>{partnerName}</strong> from
            the team? They will no longer be part of your team and any future
            ladder matches will require a new partner.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRemove}
            disabled={isRemoving}
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
