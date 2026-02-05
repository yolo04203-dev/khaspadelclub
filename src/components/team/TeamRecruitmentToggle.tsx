import { useState } from "react";
import { Loader2, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface TeamRecruitmentToggleProps {
  teamId: string;
  initialIsRecruiting: boolean;
  initialRecruitmentMessage: string | null;
  onUpdated?: () => void;
}

export function TeamRecruitmentToggle({
  teamId,
  initialIsRecruiting,
  initialRecruitmentMessage,
  onUpdated,
}: TeamRecruitmentToggleProps) {
  const [isRecruiting, setIsRecruiting] = useState(initialIsRecruiting);
  const [recruitmentMessage, setRecruitmentMessage] = useState(initialRecruitmentMessage || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(initialIsRecruiting);

  const handleToggle = async (checked: boolean) => {
    setIsRecruiting(checked);
    setIsOpen(checked);
    
    if (!checked) {
      // If turning off, save immediately
      await saveRecruitment(checked, "");
    }
  };

  const saveRecruitment = async (recruiting: boolean, message: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("teams")
        .update({
          is_recruiting: recruiting,
          recruitment_message: recruiting ? message || null : null,
        })
        .eq("id", teamId);

      if (error) throw error;

      toast({
        title: recruiting ? "Recruitment enabled" : "Recruitment disabled",
        description: recruiting 
          ? "Other players can now see you're looking for a partner."
          : "Your team is no longer listed as recruiting.",
      });
      onUpdated?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      // Revert on error
      setIsRecruiting(!recruiting);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveMessage = async () => {
    await saveRecruitment(true, recruitmentMessage);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="recruiting" className="flex items-center gap-2">
            <Megaphone className="w-4 h-4" />
            Looking for a partner
          </Label>
          <p className="text-xs text-muted-foreground">
            Show in player directory that you're recruiting
          </p>
        </div>
        <Switch
          id="recruiting"
          checked={isRecruiting}
          onCheckedChange={handleToggle}
          disabled={isSaving}
        />
      </div>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="recruitmentMessage">Recruitment message</Label>
            <Textarea
              id="recruitmentMessage"
              placeholder="What are you looking for in a partner? (skill level, availability, etc.)"
              value={recruitmentMessage}
              onChange={(e) => setRecruitmentMessage(e.target.value.slice(0, 200))}
              rows={2}
            />
            <p className="text-xs text-muted-foreground text-right">
              {recruitmentMessage.length}/200
            </p>
          </div>
          <Button 
            size="sm" 
            onClick={handleSaveMessage}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Save Message
          </Button>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
