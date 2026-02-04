import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
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
import { Label } from "@/components/ui/label";
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
  existingRequests: Set<string>; // category IDs with pending requests
  onRequestSubmitted: () => void;
}

export function JoinLadderDialog({
  categories,
  teamId,
  teamName,
  existingRequests,
  onRequestSubmitted,
}: JoinLadderDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [message, setMessage] = useState("");
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

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("ladder_join_requests").insert({
        team_id: teamId,
        ladder_category_id: selectedCategory,
        message: message.trim() || null,
      });

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
        <Button variant="default">
          <UserPlus className="w-4 h-4 mr-2" />
          Join Ladder
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request to Join Ladder</DialogTitle>
          <DialogDescription>
            Submit a request to join a category with your team "{teamName}". An
            admin will review and approve your request.
          </DialogDescription>
        </DialogHeader>

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

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
