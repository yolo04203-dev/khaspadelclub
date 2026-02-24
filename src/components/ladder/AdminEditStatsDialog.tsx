import { useState } from "react";
import { Pencil, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

interface TeamRanking {
  id: string;
  rank: number;
  points: number;
  wins: number;
  losses: number;
  streak: number;
  team: {
    id: string;
    name: string;
  } | null;
}

interface AdminEditStatsDialogProps {
  ranking: TeamRanking;
  categoryId: string;
  onSaved: () => void;
}

export function AdminEditStatsDialog({ ranking, categoryId, onSaved }: AdminEditStatsDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [points, setPoints] = useState(ranking.points);
  const [wins, setWins] = useState(ranking.wins);
  const [losses, setLosses] = useState(ranking.losses);
  const [streak, setStreak] = useState(ranking.streak);
  const [notes, setNotes] = useState("");

  // Reset form when opening
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setPoints(ranking.points);
      setWins(ranking.wins);
      setLosses(ranking.losses);
      setStreak(ranking.streak);
      setNotes("");
    }
    setOpen(isOpen);
  };

  const handleSave = async () => {
    if (!user) return;

    // Validation
    if (points < 0 || wins < 0 || losses < 0) {
      toast({ title: "Invalid values", description: "Points, wins, and losses cannot be negative.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const oldValues = {
        points: ranking.points,
        wins: ranking.wins,
        losses: ranking.losses,
        streak: ranking.streak,
      };
      const newValues = { points, wins, losses, streak };

      // Update ranking
      const { error: updateError } = await supabase
        .from("ladder_rankings")
        .update(newValues)
        .eq("id", ranking.id);

      if (updateError) throw updateError;

      // Log audit entry
      const { error: auditError } = await supabase
        .from("ladder_audit_log")
        .insert({
          admin_user_id: user.id,
          action: "edit_stats",
          team_id: ranking.team?.id || null,
          ladder_category_id: categoryId,
          old_values: oldValues,
          new_values: newValues,
          notes: notes.trim() || null,
        });

      if (auditError) logger.apiError("auditLog", auditError);

      toast({ title: "Stats updated", description: `${ranking.team?.name || "Team"} stats have been updated.` });
      setOpen(false);
      onSaved();
    } catch (error: any) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Team Record</DialogTitle>
          <DialogDescription>
            Manually adjust stats for <span className="font-medium text-foreground">{ranking.team?.name || "Unknown Team"}</span>.
            Changes are logged for audit purposes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>Points</Label>
            <Input
              type="number"
              min={0}
              value={points}
              onChange={(e) => setPoints(Math.max(0, parseInt(e.target.value) || 0))}
            />
          </div>
          <div className="space-y-2">
            <Label>Streak</Label>
            <Input
              type="number"
              value={streak}
              onChange={(e) => setStreak(parseInt(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">Positive = win streak, negative = loss streak</p>
          </div>
          <div className="space-y-2">
            <Label>Wins</Label>
            <Input
              type="number"
              min={0}
              value={wins}
              onChange={(e) => setWins(Math.max(0, parseInt(e.target.value) || 0))}
            />
          </div>
          <div className="space-y-2">
            <Label>Losses</Label>
            <Input
              type="number"
              min={0}
              value={losses}
              onChange={(e) => setLosses(Math.max(0, parseInt(e.target.value) || 0))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Admin Notes (required for audit)</Label>
          <Textarea
            placeholder="Reason for this correction..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !notes.trim()}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
