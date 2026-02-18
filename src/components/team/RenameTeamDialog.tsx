import { useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const nameSchema = z
  .string()
  .trim()
  .min(2, "Team name must be at least 2 characters")
  .max(50, "Team name must be less than 50 characters");

interface RenameTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  currentName: string;
  onRenamed: (newName: string) => void;
}

export function RenameTeamDialog({
  open,
  onOpenChange,
  teamId,
  currentName,
  onRenamed,
}: RenameTeamDialogProps) {
  const [name, setName] = useState(currentName);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const result = nameSchema.safeParse(name);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("teams")
        .update({ name: result.data })
        .eq("id", teamId);

      if (updateError) throw updateError;

      toast({
        title: "Team renamed",
        description: `Your team is now called "${result.data}".`,
      });

      onRenamed(result.data);
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Failed to rename team",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            Rename Team
          </DialogTitle>
          <DialogDescription>
            Choose a new name for your team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="team-name">Team Name</Label>
          <Input
            id="team-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            placeholder="Enter new team name"
            maxLength={50}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || name.trim() === currentName}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
