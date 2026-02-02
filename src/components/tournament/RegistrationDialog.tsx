import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Users, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface UserTeam {
  id: string;
  name: string;
}

interface RegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: string;
  tournamentName: string;
  entryFee: number;
  entryFeeCurrency: string;
  isFull: boolean;
  userTeam: UserTeam | null;
  onRegister: (teamId: string | null, customTeamName: string | null) => Promise<void>;
}

export function RegistrationDialog({
  open,
  onOpenChange,
  tournamentName,
  entryFee,
  entryFeeCurrency,
  isFull,
  userTeam,
  onRegister,
}: RegistrationDialogProps) {
  const [registrationType, setRegistrationType] = useState<"existing" | "custom">(
    userTeam ? "existing" : "custom"
  );
  const [customTeamName, setCustomTeamName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setRegistrationType(userTeam ? "existing" : "custom");
      setCustomTeamName("");
    }
  }, [open, userTeam]);

  const handleSubmit = async () => {
    if (registrationType === "custom" && !customTeamName.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (registrationType === "existing" && userTeam) {
        await onRegister(userTeam.id, null);
      } else {
        await onRegister(null, customTeamName.trim());
      }
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return `${currency} ${amount.toLocaleString()}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Register for Tournament
          </DialogTitle>
          <DialogDescription>
            {tournamentName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Team Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Team Selection</Label>
            <RadioGroup
              value={registrationType}
              onValueChange={(value) => setRegistrationType(value as "existing" | "custom")}
              className="space-y-3"
            >
              {userTeam && (
                <div className="flex items-center space-x-3 rounded-lg border p-3">
                  <RadioGroupItem value="existing" id="existing" />
                  <Label htmlFor="existing" className="flex-1 cursor-pointer">
                    <div className="font-medium">Use my team</div>
                    <div className="text-sm text-muted-foreground">{userTeam.name}</div>
                  </Label>
                </div>
              )}
              <div className="flex items-center space-x-3 rounded-lg border p-3">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="flex-1 cursor-pointer">
                  <div className="font-medium">Register a new team</div>
                  <div className="text-sm text-muted-foreground">Enter a custom team name</div>
                </Label>
              </div>
            </RadioGroup>

            {registrationType === "custom" && (
              <div className="pt-2">
                <Input
                  placeholder="Enter team name"
                  value={customTeamName}
                  onChange={(e) => setCustomTeamName(e.target.value)}
                  className="w-full"
                />
              </div>
            )}
          </div>

          {/* Entry Fee Information */}
          {entryFee > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-warning">
                <DollarSign className="w-5 h-5" />
                <span className="font-semibold">Entry Fee Required</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(entryFee, entryFeeCurrency)}
              </div>
              <p className="text-sm text-muted-foreground">
                Your slot will be confirmed once payment is verified by the organizer.
                Please contact the tournament admin for payment details.
              </p>
            </div>
          )}

          {/* Waitlist Warning */}
          {isFull && (
            <div className="rounded-lg border border-muted bg-muted/30 p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Tournament is full</p>
                <p className="text-sm text-muted-foreground">
                  You will be added to the waiting list. If a team withdraws, you'll be promoted automatically.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || (registrationType === "custom" && !customTeamName.trim())}
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2" />
            ) : null}
            {isFull ? "Join Waiting List" : "Register"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
