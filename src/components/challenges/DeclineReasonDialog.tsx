import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface DeclineReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengerName: string;
  onConfirm: (reason: string) => void;
  isLoading: boolean;
}

const DECLINE_REASONS = [
  { value: "scheduling_conflict", label: "Scheduling conflict" },
  { value: "already_have_match", label: "Already have a pending match" },
  { value: "not_ready", label: "Not ready to compete right now" },
  { value: "other", label: "Other reason" },
];

export function DeclineReasonDialog({
  open,
  onOpenChange,
  challengerName,
  onConfirm,
  isLoading,
}: DeclineReasonDialogProps) {
  const [selectedReason, setSelectedReason] = useState("scheduling_conflict");
  const [customReason, setCustomReason] = useState("");

  const handleConfirm = () => {
    const reason = selectedReason === "other" 
      ? customReason.trim() || "Other reason"
      : DECLINE_REASONS.find(r => r.value === selectedReason)?.label || selectedReason;
    onConfirm(reason);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Decline Challenge</DialogTitle>
          <DialogDescription>
            Let {challengerName} know why you're declining their challenge.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
            {DECLINE_REASONS.map((reason) => (
              <div key={reason.value} className="flex items-center space-x-2">
                <RadioGroupItem value={reason.value} id={reason.value} />
                <Label htmlFor={reason.value}>{reason.label}</Label>
              </div>
            ))}
          </RadioGroup>

          {selectedReason === "other" && (
            <div className="space-y-2">
              <Label htmlFor="customReason">Please specify</Label>
              <Textarea
                id="customReason"
                placeholder="Enter your reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={2}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Declining...
              </>
            ) : (
              "Decline Challenge"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
