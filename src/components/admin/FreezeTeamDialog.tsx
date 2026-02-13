import { useState } from "react";
import { addDays, addWeeks, format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logger } from "@/lib/logger";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FreezeTeamDialogProps {
  team: { id: string; name: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  userId: string;
}

const DURATION_OPTIONS = [
  { value: "1d", label: "1 day" },
  { value: "3d", label: "3 days" },
  { value: "1w", label: "1 week" },
  { value: "2w", label: "2 weeks" },
  { value: "custom", label: "Custom date" },
];

export function FreezeTeamDialog({ 
  team, 
  open, 
  onOpenChange, 
  onSuccess,
  userId 
}: FreezeTeamDialogProps) {
  const [duration, setDuration] = useState("1w");
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [reason, setReason] = useState("");
  const [isFreezing, setIsFreezing] = useState(false);

  const calculateFreezeUntil = (): Date => {
    const now = new Date();
    switch (duration) {
      case "1d":
        return addDays(now, 1);
      case "3d":
        return addDays(now, 3);
      case "1w":
        return addWeeks(now, 1);
      case "2w":
        return addWeeks(now, 2);
      case "custom":
        return customDate || addWeeks(now, 1);
      default:
        return addWeeks(now, 1);
    }
  };

  const handleFreeze = async () => {
    if (!team) return;
    setIsFreezing(true);

    try {
      const freezeUntil = calculateFreezeUntil();
      
      const { error } = await supabase
        .from("teams")
        .update({
          is_frozen: true,
          frozen_until: freezeUntil.toISOString(),
          frozen_reason: reason.trim() || null,
          frozen_by: userId,
          frozen_at: new Date().toISOString(),
        })
        .eq("id", team.id);

      if (error) throw error;

      // Send email notification
      try {
        await supabase.functions.invoke("send-team-freeze-notification", {
          body: {
            teamId: team.id,
            teamName: team.name,
            action: "freeze",
            frozenUntil: freezeUntil.toISOString(),
            reason: reason.trim() || undefined,
          },
        });
      } catch (emailError) {
        logger.apiError("sendFreezeNotification", emailError);
        // Don't fail the freeze operation if email fails
      }

      toast.success(`${team.name} frozen until ${format(freezeUntil, "PPP")}`);
      onSuccess();
      onOpenChange(false);
      setDuration("1w");
      setReason("");
      setCustomDate(undefined);
    } catch (error) {
      logger.apiError("freezeTeam", error);
      toast.error("Failed to freeze team");
    } finally {
      setIsFreezing(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setDuration("1w");
    setReason("");
    setCustomDate(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Freeze Team</DialogTitle>
          <DialogDescription>
            Freeze <strong>{team?.name}</strong> to prevent other teams from challenging them.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {duration === "custom" && (
            <div className="space-y-2">
              <Label>Freeze until</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !customDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customDate ? format(customDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customDate}
                    onSelect={setCustomDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Travelling, Injury"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleFreeze} 
            disabled={isFreezing || (duration === "custom" && !customDate)}
          >
            {isFreezing ? "Freezing..." : "Freeze Team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
