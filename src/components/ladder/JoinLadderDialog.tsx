import { useState } from "react";
import { AlertCircle, Loader2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";

interface Category {
  id: string;
  name: string;
  description: string | null;
}

interface JoinLadderDialogProps {
  categories: Category[];
  teamId: string;
  teamName: string;
  existingRequests: Set<string>; // category IDs with pending requests or already ranked
  onRequestSubmitted: () => void;
  teamMemberCount?: number;
}

export function JoinLadderDialog({
  categories,
  teamId,
  teamName,
  existingRequests,
  onRequestSubmitted,
  teamMemberCount = 2,
}: JoinLadderDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [message, setMessage] = useState("");
  const [joinType, setJoinType] = useState<"existing" | "custom">("existing");
  const [player1Name, setPlayer1Name] = useState("");
  const [player2Name, setPlayer2Name] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableCategories = categories.filter(
    (cat) => !existingRequests.has(cat.id)
  );

  const handleSubmit = async () => {
    if (!selectedCategory) {
      toast({
        title: "Select a category",
        description: "Please choose which category you want to join.",
        variant: "destructive",
      });
      return;
    }

    if (joinType === "custom" && (!player1Name.trim() || !player2Name.trim())) {
      toast({
        title: "Enter player names",
        description: "Please provide both Player 1 and Player 2 names.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("ladder_join_requests").insert({
        team_id: teamId,
        ladder_category_id: selectedCategory,
        message: message.trim() || null,
        player1_name: joinType === "custom" ? player1Name.trim() : null,
        player2_name: joinType === "custom" ? player2Name.trim() : null,
      } as any);

      if (error) {
        if (error.code === "23505") {
          throw new Error("You already have a pending request for this category.");
        }
        throw error;
      }

      const categoryName = categories.find((c) => c.id === selectedCategory)?.name;
      
      toast({
        title: "Request submitted!",
        description: `Your request to join ${categoryName} has been sent. An admin will review it shortly.`,
      });

      setOpen(false);
      setSelectedCategory("");
      setMessage("");
      setJoinType("existing");
      setPlayer1Name("");
      setPlayer2Name("");
      onRequestSubmitted();
    } catch (error: any) {
      toast({
        title: "Failed to submit request",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (availableCategories.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="icon" className="sm:w-auto sm:px-4">
          <UserPlus className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Join Ladder</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request to Join Ladder</DialogTitle>
          <DialogDescription>
            Submit a request to join a category. An admin will review and approve your request.
          </DialogDescription>
        </DialogHeader>

        {teamMemberCount < 2 ? (
          <div className="py-4">
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-warning mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground">Team incomplete</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your team needs 2 players before joining a ladder. Invite a partner from the Find Players page.
                </p>
              </div>
            </div>
          </div>
        ) : (
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                    {cat.description && (
                      <span className="text-muted-foreground ml-2">
                        - {cat.description}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Join as</Label>
            <RadioGroup
              value={joinType}
              onValueChange={(val) => setJoinType(val as "existing" | "custom")}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="existing" id="join-existing" />
                <Label htmlFor="join-existing" className="font-normal cursor-pointer">
                  Join with existing team "{teamName}"
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="join-custom" />
                <Label htmlFor="join-custom" className="font-normal cursor-pointer">
                  Join with different players
                </Label>
              </div>
            </RadioGroup>
          </div>

          {joinType === "custom" && (
            <div className="space-y-3 pl-6 border-l-2 border-muted">
              <div className="space-y-2">
                <Label htmlFor="player1">Player 1 name</Label>
                <Input
                  id="player1"
                  placeholder="Enter player 1 name"
                  value={player1Name}
                  onChange={(e) => setPlayer1Name(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="player2">Player 2 name</Label>
                <Input
                  id="player2"
                  placeholder="Enter player 2 name"
                  value={player2Name}
                  onChange={(e) => setPlayer2Name(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a message for the admin..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {teamMemberCount < 2 ? "Close" : "Cancel"}
          </Button>
          {teamMemberCount >= 2 && (
            <Button onClick={handleSubmit} disabled={isSubmitting || !selectedCategory}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
