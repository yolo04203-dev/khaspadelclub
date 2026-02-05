import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Users, DollarSign, Tag } from "lucide-react";

interface UserTeam {
  id: string;
  name: string;
}

interface TournamentCategory {
  id: string;
  name: string;
  max_teams: number;
  participantCount: number;
  entry_fee?: number;
}

interface RegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: string;
  tournamentName: string;
  entryFee: number;
  entryFeeCurrency: string;
  paymentInstructions?: string | null;
  isFull: boolean;
  userTeam: UserTeam | null;
  categories?: TournamentCategory[];
  onRegister: (teamId: string | null, customTeamName: string | null, player1Name?: string, player2Name?: string, categoryId?: string) => Promise<void>;
}

export function RegistrationDialog({
  open,
  onOpenChange,
  tournamentName,
  entryFee,
  entryFeeCurrency,
  paymentInstructions,
  isFull,
  userTeam,
  categories = [],
  onRegister,
}: RegistrationDialogProps) {
  const [registrationType, setRegistrationType] = useState<"existing" | "custom">(
    userTeam ? "existing" : "custom"
  );
  const [customTeamName, setCustomTeamName] = useState("");
  const [player1Name, setPlayer1Name] = useState("");
  const [player2Name, setPlayer2Name] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setRegistrationType(userTeam ? "existing" : "custom");
      setCustomTeamName("");
      setPlayer1Name("");
      setPlayer2Name("");
      // Auto-select first category if only one exists
      if (categories.length === 1) {
        setSelectedCategoryId(categories[0].id);
      } else {
        setSelectedCategoryId("");
      }
    }
  }, [open, userTeam, categories]);

  const isCustomFormValid = 
    customTeamName.trim() !== "" && 
    player1Name.trim() !== "" && 
    player2Name.trim() !== "";

  const isCategoryRequired = categories.length > 0;
  const isCategoryValid = !isCategoryRequired || selectedCategoryId !== "";

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const isCategoryFull = selectedCategory 
    ? selectedCategory.participantCount >= selectedCategory.max_teams 
    : isFull;

  // Determine which fee to display - category-specific or tournament default
  const displayedFee = selectedCategory && (selectedCategory.entry_fee ?? 0) > 0
    ? selectedCategory.entry_fee!
    : entryFee;

  const handleSubmit = async () => {
    if (registrationType === "custom" && !isCustomFormValid) {
      return;
    }
    if (!isCategoryValid) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (registrationType === "existing" && userTeam) {
        await onRegister(userTeam.id, null, undefined, undefined, selectedCategoryId || undefined);
      } else {
        await onRegister(null, customTeamName.trim(), player1Name.trim(), player2Name.trim(), selectedCategoryId || undefined);
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
          {/* Category Selection */}
          {categories.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Select Category
              </Label>
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem 
                      key={category.id} 
                      value={category.id}
                      disabled={category.participantCount >= category.max_teams}
                    >
                      {category.name} ({category.participantCount}/{category.max_teams})
                      {category.participantCount >= category.max_teams && " - Full"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
                  <div className="text-sm text-muted-foreground">Enter team name and player names</div>
                </Label>
              </div>
            </RadioGroup>

            {registrationType === "custom" && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="teamName">Team Name</Label>
                  <Input
                    id="teamName"
                    placeholder="Enter team name"
                    value={customTeamName}
                    onChange={(e) => setCustomTeamName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="player1">Player 1 Name</Label>
                  <Input
                    id="player1"
                    placeholder="Enter first player's name"
                    value={player1Name}
                    onChange={(e) => setPlayer1Name(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="player2">Player 2 Name</Label>
                  <Input
                    id="player2"
                    placeholder="Enter second player's name"
                    value={player2Name}
                    onChange={(e) => setPlayer2Name(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Entry Fee Information */}
          {displayedFee > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-warning">
                <DollarSign className="w-5 h-5" />
                <span className="font-semibold">Entry Fee Required</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(displayedFee, entryFeeCurrency)}
              </div>
              {selectedCategory && (selectedCategory.entry_fee ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Fee specific to {selectedCategory.name} category
                </p>
              )}
              {paymentInstructions ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Payment Instructions:</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {paymentInstructions}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Your slot will be confirmed once payment is verified by the organizer.
                  Please contact the tournament admin for payment details.
                </p>
              )}
            </div>
          )}

          {/* Waitlist Warning */}
          {isCategoryFull && (
            <div className="rounded-lg border border-muted bg-muted/30 p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-foreground">
                  {selectedCategory ? `${selectedCategory.name} is full` : "Tournament is full"}
                </p>
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
            disabled={isSubmitting || (registrationType === "custom" && !isCustomFormValid) || !isCategoryValid}
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2" />
            ) : null}
            {isCategoryFull ? "Join Waiting List" : "Register"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}