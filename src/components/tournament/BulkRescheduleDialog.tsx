import { useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, ArrowUp, ArrowDown } from "lucide-react";

interface BulkRescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (shiftMinutes: number) => Promise<void>;
  matchCount: number;
}

export function BulkRescheduleDialog({
  open,
  onOpenChange,
  onConfirm,
  matchCount,
}: BulkRescheduleDialogProps) {
  const [minutes, setMinutes] = useState("30");
  const [direction, setDirection] = useState<"later" | "earlier">("later");
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    const mins = parseInt(minutes);
    if (isNaN(mins) || mins <= 0) return;

    setSubmitting(true);
    try {
      const shiftMinutes = direction === "later" ? mins : -mins;
      await onConfirm(shiftMinutes);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Shift All Match Times
          </DialogTitle>
          <DialogDescription>
            Move all {matchCount} scheduled matches forward or backward in time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Direction</Label>
            <Select value={direction} onValueChange={(v) => setDirection(v as "later" | "earlier")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="later">
                  <span className="flex items-center gap-1"><ArrowDown className="w-3 h-3" /> Later (delay)</span>
                </SelectItem>
                <SelectItem value="earlier">
                  <span className="flex items-center gap-1"><ArrowUp className="w-3 h-3" /> Earlier (advance)</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bulk-minutes">Minutes to shift</Label>
            <Input
              id="bulk-minutes"
              type="number"
              min={1}
              max={1440}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="30"
            />
            <p className="text-xs text-muted-foreground">
              Common: 15, 30, 60, 120 minutes
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting || !minutes || parseInt(minutes) <= 0}
          >
            {submitting ? "Shifting..." : `Shift ${matchCount} matches`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
