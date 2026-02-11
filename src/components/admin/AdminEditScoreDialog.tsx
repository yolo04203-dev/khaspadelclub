import { useState } from "react";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SetScore {
  myGames: string;
  opponentGames: string;
}

interface AdminEditScoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  challengerName: string;
  challengedName: string;
  challengerTeamId: string;
  challengedTeamId: string;
  onSaved: () => void;
}

function isValidSetScore(a: number, b: number): boolean {
  const hasWinner = (x: number, y: number) => {
    if (x === 6 && y <= 4) return true;
    if (x === 7 && y === 5) return true;
    if (x === 7 && y === 6) return true;
    return false;
  };
  return hasWinner(a, b) || hasWinner(b, a);
}

function getSetWinner(a: number, b: number): "challenger" | "challenged" | null {
  if (a > b && (a === 6 || a === 7)) return "challenger";
  if (b > a && (b === 6 || b === 7)) return "challenged";
  return null;
}

export function AdminEditScoreDialog({
  open,
  onOpenChange,
  matchId,
  challengerName,
  challengedName,
  challengerTeamId,
  challengedTeamId,
  onSaved,
}: AdminEditScoreDialogProps) {
  const [sets, setSets] = useState<SetScore[]>([
    { myGames: "", opponentGames: "" },
    { myGames: "", opponentGames: "" },
    { myGames: "", opponentGames: "" },
  ]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateSet = (index: number, field: "myGames" | "opponentGames", value: string) => {
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
    setNotes("");
    setError(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) resetDialog();
    onOpenChange(newOpen);
  };

  const calculateStandings = () => {
    let challenger = 0;
    let challenged = 0;
    sets.forEach((set) => {
      if (set.myGames !== "" && set.opponentGames !== "") {
        const a = parseInt(set.myGames);
        const b = parseInt(set.opponentGames);
        const winner = getSetWinner(a, b);
        if (winner === "challenger") challenger++;
        if (winner === "challenged") challenged++;
      }
    });
    return { challenger, challenged };
  };

  const handleSubmit = async () => {
    setError(null);
    const filledSets = sets.filter(s => s.myGames !== "" && s.opponentGames !== "");
    if (filledSets.length < 2) {
      setError("Please enter scores for at least 2 sets");
      return;
    }

    const challengerSets: number[] = [];
    const challengedSets: number[] = [];
    let setsWonChallenger = 0;
    let setsWonChallenged = 0;
    let matchDecided = false;

    for (let i = 0; i < 3; i++) {
      const set = sets[i];
      if (matchDecided) {
        if (set.myGames !== "" || set.opponentGames !== "") {
          setError(`Set ${i + 1} should be empty - match was already decided`);
          return;
        }
        continue;
      }
      if (set.myGames === "" || set.opponentGames === "") {
        if (setsWonChallenger < 2 && setsWonChallenged < 2) {
          setError(`Set ${i + 1} is required - match not yet decided`);
          return;
        }
        continue;
      }
      const a = parseInt(set.myGames);
      const b = parseInt(set.opponentGames);
      if (!isValidSetScore(a, b)) {
        setError(`Set ${i + 1}: Invalid score. Valid: 6-0 to 6-4, 7-5, or 7-6`);
        return;
      }
      challengerSets.push(a);
      challengedSets.push(b);
      const winner = getSetWinner(a, b);
      if (winner === "challenger") setsWonChallenger++;
      if (winner === "challenged") setsWonChallenged++;
      if (setsWonChallenger === 2 || setsWonChallenged === 2) matchDecided = true;
    }

    if (setsWonChallenger < 2 && setsWonChallenged < 2) {
      setError("Match must have a winner (first to 2 sets)");
      return;
    }

    setIsSubmitting(true);
    try {
      const winnerId = setsWonChallenger >= 2 ? challengerTeamId : challengedTeamId;
      const { error: dbError } = await supabase
        .from("matches")
        .update({
          challenger_sets: challengerSets,
          challenged_sets: challengedSets,
          sets_won_challenger: setsWonChallenger,
          sets_won_challenged: setsWonChallenged,
          challenger_score: setsWonChallenger,
          challenged_score: setsWonChallenged,
          winner_team_id: winnerId,
          status: "completed",
          completed_at: new Date().toISOString(),
          score_disputed: false,
          notes: notes || null,
        })
        .eq("id", matchId);

      if (dbError) throw dbError;
      toast.success("Score updated by admin");
      onSaved();
      handleOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update score");
    } finally {
      setIsSubmitting(false);
    }
  };

  const standings = calculateStandings();
  const matchWinner = standings.challenger >= 2 ? "challenger" : standings.challenged >= 2 ? "challenged" : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Admin: Edit Match Score</DialogTitle>
          <DialogDescription>
            Override or set match score. Best of 3 sets.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-4 py-2">
          <div className={cn("text-center px-4 py-2 rounded-lg transition-colors", matchWinner === "challenger" ? "bg-accent/20 text-accent" : "bg-muted")}>
            <div className="text-2xl font-bold">{standings.challenger}</div>
            <div className="text-xs text-muted-foreground truncate max-w-[80px]">{challengerName}</div>
          </div>
          <span className="text-muted-foreground font-medium">-</span>
          <div className={cn("text-center px-4 py-2 rounded-lg transition-colors", matchWinner === "challenged" ? "bg-accent/20 text-accent" : "bg-muted")}>
            <div className="text-2xl font-bold">{standings.challenged}</div>
            <div className="text-xs text-muted-foreground truncate max-w-[80px]">{challengedName}</div>
          </div>
        </div>

        <div className="space-y-3">
          {sets.map((set, index) => {
            const a = set.myGames !== "" ? parseInt(set.myGames) : null;
            const b = set.opponentGames !== "" ? parseInt(set.opponentGames) : null;
            const setWinner = a !== null && b !== null ? getSetWinner(a, b) : null;
            return (
              <div key={index} className="flex items-center gap-3">
                <Label className="w-14 text-sm text-muted-foreground">Set {index + 1}</Label>
                <div className="flex items-center gap-2 flex-1">
                  <Input type="text" inputMode="numeric" maxLength={1} value={set.myGames} onChange={(e) => updateSet(index, "myGames", e.target.value)} placeholder="0" className={cn("w-14 text-center text-lg font-mono", setWinner === "challenger" && "border-accent bg-accent/10")} />
                  <span className="text-muted-foreground">-</span>
                  <Input type="text" inputMode="numeric" maxLength={1} value={set.opponentGames} onChange={(e) => updateSet(index, "opponentGames", e.target.value)} placeholder="0" className={cn("w-14 text-center text-lg font-mono", setWinner === "challenged" && "border-accent bg-accent/10")} />
                </div>
                {setWinner && <Check className="w-4 h-4 text-accent" />}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">Valid: 6-0, 6-1, 6-2, 6-3, 6-4, 7-5, 7-6</p>

        <div className="space-y-2">
          <Label htmlFor="admin-notes">Admin Notes (optional)</Label>
          <Textarea id="admin-notes" placeholder="Reason for score override..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !matchWinner}>
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            Save Score
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
