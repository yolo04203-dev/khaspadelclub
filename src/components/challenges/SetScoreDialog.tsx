import { useState } from "react";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface SetScore {
  myGames: string;
  opponentGames: string;
}

interface SetScoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  myTeamName: string;
  opponentTeamName: string;
  onSubmit: (mySets: number[], opponentSets: number[], setsWonByMe: number, setsWonByOpponent: number) => Promise<void>;
  isSubmitting: boolean;
}

// Valid set scores: 6-0, 6-1, 6-2, 6-3, 6-4, 7-5, 7-6
// Or the reverse for losses
function isValidSetScore(myGames: number, opponentGames: number): { valid: boolean; error?: string } {
  // Must be non-negative integers
  if (myGames < 0 || opponentGames < 0) {
    return { valid: false, error: "Games must be positive" };
  }
  
  // Check for valid winning scores
  const hasWinner = (a: number, b: number) => {
    // Standard win: 6-X where X <= 4
    if (a === 6 && b <= 4) return true;
    // Win at 7-5
    if (a === 7 && b === 5) return true;
    // Tiebreak win: 7-6
    if (a === 7 && b === 6) return true;
    return false;
  };
  
  if (hasWinner(myGames, opponentGames) || hasWinner(opponentGames, myGames)) {
    return { valid: true };
  }
  
  return { 
    valid: false, 
    error: "Invalid set score. Valid: 6-0 to 6-4, 7-5, or 7-6" 
  };
}

function getSetWinner(myGames: number, opponentGames: number): "me" | "opponent" | null {
  if (myGames > opponentGames && (myGames === 6 || myGames === 7)) return "me";
  if (opponentGames > myGames && (opponentGames === 6 || opponentGames === 7)) return "opponent";
  return null;
}

export function SetScoreDialog({
  open,
  onOpenChange,
  myTeamName,
  opponentTeamName,
  onSubmit,
  isSubmitting,
}: SetScoreDialogProps) {
  const [sets, setSets] = useState<SetScore[]>([
    { myGames: "", opponentGames: "" },
    { myGames: "", opponentGames: "" },
    { myGames: "", opponentGames: "" },
  ]);
  const [error, setError] = useState<string | null>(null);

  const updateSet = (index: number, field: "myGames" | "opponentGames", value: string) => {
    // Only allow numbers 0-7
    if (value && !/^[0-7]$/.test(value)) return;
    
    const newSets = [...sets];
    newSets[index] = { ...newSets[index], [field]: value };
    setSets(newSets);
    setError(null);
  };

  const resetDialog = () => {
    setSets([
      { myGames: "", opponentGames: "" },
      { myGames: "", opponentGames: "" },
      { myGames: "", opponentGames: "" },
    ]);
    setError(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetDialog();
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async () => {
    setError(null);
    
    // Validate all sets are filled
    const filledSets = sets.filter(s => s.myGames !== "" && s.opponentGames !== "");
    
    if (filledSets.length < 2) {
      setError("Please enter scores for at least 2 sets");
      return;
    }

    // Convert and validate each set
    const mySets: number[] = [];
    const opponentSets: number[] = [];
    let setsWonByMe = 0;
    let setsWonByOpponent = 0;
    let matchDecided = false;

    for (let i = 0; i < 3; i++) {
      const set = sets[i];
      
      // If match is already decided, remaining sets should be empty
      if (matchDecided) {
        if (set.myGames !== "" || set.opponentGames !== "") {
          setError(`Set ${i + 1} should be empty - match was already decided`);
          return;
        }
        continue;
      }

      // Check if set is filled
      if (set.myGames === "" || set.opponentGames === "") {
        if (setsWonByMe < 2 && setsWonByOpponent < 2) {
          setError(`Set ${i + 1} is required - match not yet decided`);
          return;
        }
        continue;
      }

      const myGames = parseInt(set.myGames);
      const oppGames = parseInt(set.opponentGames);

      // Validate set score
      const validation = isValidSetScore(myGames, oppGames);
      if (!validation.valid) {
        setError(`Set ${i + 1}: ${validation.error}`);
        return;
      }

      mySets.push(myGames);
      opponentSets.push(oppGames);

      // Track set winners
      const winner = getSetWinner(myGames, oppGames);
      if (winner === "me") setsWonByMe++;
      if (winner === "opponent") setsWonByOpponent++;

      // Check if match is decided
      if (setsWonByMe === 2 || setsWonByOpponent === 2) {
        matchDecided = true;
      }
    }

    // Validate match has a winner
    if (setsWonByMe < 2 && setsWonByOpponent < 2) {
      setError("Match must have a winner (first to 2 sets)");
      return;
    }

    await onSubmit(mySets, opponentSets, setsWonByMe, setsWonByOpponent);
    resetDialog();
  };

  // Calculate current set standings for display
  const calculateStandings = () => {
    let me = 0;
    let opp = 0;
    sets.forEach((set) => {
      if (set.myGames !== "" && set.opponentGames !== "") {
        const myG = parseInt(set.myGames);
        const oppG = parseInt(set.opponentGames);
        const winner = getSetWinner(myG, oppG);
        if (winner === "me") me++;
        if (winner === "opponent") opp++;
      }
    });
    return { me, opp };
  };

  const standings = calculateStandings();
  const matchWinner = standings.me >= 2 ? "me" : standings.opp >= 2 ? "opponent" : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Match Result</DialogTitle>
          <DialogDescription>
            Enter the games won per set. Best of 3 sets (first to 2 wins).
          </DialogDescription>
        </DialogHeader>

        {/* Match Score Display */}
        <div className="flex items-center justify-center gap-6 py-4">
          <div className={cn(
            "text-center px-6 py-3 rounded-lg transition-colors flex-1 max-w-[120px]",
            matchWinner === "me" ? "bg-accent/20 text-accent" : "bg-muted"
          )}>
            <div className="text-3xl font-bold">{standings.me}</div>
            <div className="text-xs text-muted-foreground truncate">{myTeamName}</div>
          </div>
          <span className="text-muted-foreground font-medium text-lg">-</span>
          <div className={cn(
            "text-center px-6 py-3 rounded-lg transition-colors flex-1 max-w-[120px]",
            matchWinner === "opponent" ? "bg-accent/20 text-accent" : "bg-muted"
          )}>
            <div className="text-3xl font-bold">{standings.opp}</div>
            <div className="text-xs text-muted-foreground truncate">{opponentTeamName}</div>
          </div>
        </div>

        {/* Set Scores */}
        <div className="space-y-3">
          {sets.map((set, index) => {
            const isDisabled = matchWinner !== null && index > 0 && 
              (sets[index - 1].myGames === "" || sets[index - 1].opponentGames === "");
            const myGames = set.myGames !== "" ? parseInt(set.myGames) : null;
            const oppGames = set.opponentGames !== "" ? parseInt(set.opponentGames) : null;
            const setWinner = myGames !== null && oppGames !== null ? getSetWinner(myGames, oppGames) : null;
            
            return (
              <div key={index} className="flex items-center gap-3">
                <Label className="w-14 text-sm text-muted-foreground">Set {index + 1}</Label>
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={set.myGames}
                    onChange={(e) => updateSet(index, "myGames", e.target.value)}
                    placeholder="0"
                    disabled={isDisabled}
                    className={cn(
                      "w-16 h-12 text-center text-xl font-mono",
                      setWinner === "me" && "border-accent bg-accent/10"
                    )}
                  />
                  <span className="text-muted-foreground text-lg">-</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={set.opponentGames}
                    onChange={(e) => updateSet(index, "opponentGames", e.target.value)}
                    placeholder="0"
                    disabled={isDisabled}
                    className={cn(
                      "w-16 h-12 text-center text-xl font-mono",
                      setWinner === "opponent" && "border-accent bg-accent/10"
                    )}
                  />
                </div>
                {setWinner && (
                  <Check className="w-4 h-4 text-accent" />
                )}
              </div>
            );
          })}
        </div>

        {/* Validation hint */}
        <p className="text-xs text-muted-foreground">
          Valid set scores: 6-0, 6-1, 6-2, 6-3, 6-4, 7-5, 7-6 (tiebreak)
        </p>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button onClick={handleSubmit} disabled={isSubmitting || !matchWinner} className="w-full sm:w-auto">
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Submit Score
          </Button>
          <Button variant="outline" onClick={() => handleOpenChange(false)} className="w-full sm:w-auto">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
