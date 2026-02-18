import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Users, PenLine, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { InvitePartnerDialog } from "@/components/team/InvitePartnerDialog";

const manualNameSchema = z.object({
  partnerName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name is too long"),
});

type ManualNameData = z.infer<typeof manualNameSchema>;

interface AddPartnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
  captainName: string;
  onComplete?: () => void;
}

export function AddPartnerDialog({
  open,
  onOpenChange,
  teamId,
  teamName,
  captainName,
  onComplete,
}: AddPartnerDialogProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"choose" | "manual" | "invite">("choose");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ManualNameData>({
    resolver: zodResolver(manualNameSchema),
    defaultValues: { partnerName: "" },
  });

  const handleManualSubmit = async (data: ManualNameData) => {
    setIsSubmitting(true);
    try {
      const newName = `${captainName} & ${data.partnerName.trim()}`;
      const { error } = await supabase
        .from("teams")
        .update({ name: newName })
        .eq("id", teamId);

      if (error) throw error;

      toast({
        title: "Team name set!",
        description: `Your team is now "${newName}"`,
      });
      onOpenChange(false);
      if (onComplete) {
        onComplete();
      } else {
        navigate("/ladders");
      }
    } catch (error: any) {
      logger.apiError("updateTeamName", error);
      toast({
        title: "Failed to update team name",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    if (onComplete) {
      onComplete();
    } else {
      navigate("/dashboard");
    }
  };

  const handleClose = (openState: boolean) => {
    if (!openState) {
      setMode("choose");
      form.reset();
    }
    onOpenChange(openState);
  };

  if (mode === "invite") {
    return (
      <InvitePartnerDialog
        open={open}
        onOpenChange={(openState) => {
          if (!openState) {
            setMode("choose");
            if (onComplete) {
              onComplete();
            } else {
              navigate("/ladders");
            }
          }
          onOpenChange(openState);
        }}
        teamId={teamId}
        teamName={teamName}
        onInviteSent={() => {
          if (onComplete) {
            onComplete();
          } else {
            navigate("/ladders");
          }
        }}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Your Partner</DialogTitle>
          <DialogDescription>
            How would you like to add your partner to the team?
          </DialogDescription>
        </DialogHeader>

        {mode === "choose" && (
          <div className="space-y-3">
            <button
              onClick={() => setMode("invite")}
              className="w-full flex items-start gap-3 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/5 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Invite a registered player</p>
                <p className="text-sm text-muted-foreground">
                  Search and send an invitation to a player on the platform
                </p>
              </div>
            </button>

            <button
              onClick={() => setMode("manual")}
              className="w-full flex items-start gap-3 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/5 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <PenLine className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-medium text-foreground">Enter partner name manually</p>
                <p className="text-sm text-muted-foreground">
                  Just type their name — team will be named "{captainName} & Partner"
                </p>
              </div>
            </button>

            <div className="pt-2">
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={handleSkip}
              >
                I'll do this later
              </Button>
            </div>
          </div>
        )}

        {mode === "manual" && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleManualSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="partnerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Partner's Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your partner's name"
                        autoComplete="off"
                        autoFocus
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <p className="text-sm text-muted-foreground">
                Team will be named: <strong>{captainName} & {form.watch("partnerName") || "..."}</strong>
              </p>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setMode("choose")}
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Set Team Name"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
