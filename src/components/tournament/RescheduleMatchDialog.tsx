import { useState, useEffect } from "react";
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
import { Calendar, MapPin } from "lucide-react";

interface RescheduleMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (scheduledAt: string | null, courtNumber: number | null) => Promise<void>;
  currentScheduledAt?: string | null;
  currentCourtNumber?: number | null;
  team1Name?: string;
  team2Name?: string;
}

export function RescheduleMatchDialog({
  open,
  onOpenChange,
  onConfirm,
  currentScheduledAt,
  currentCourtNumber,
  team1Name,
  team2Name,
}: RescheduleMatchDialogProps) {
  const [scheduledAt, setScheduledAt] = useState("");
  const [courtNumber, setCourtNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (currentScheduledAt) {
        const d = new Date(currentScheduledAt);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        setScheduledAt(d.toISOString().slice(0, 16));
      } else {
        setScheduledAt("");
      }
      setCourtNumber(currentCourtNumber ? String(currentCourtNumber) : "");
    }
  }, [open, currentScheduledAt, currentCourtNumber]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const newScheduledAt = scheduledAt ? new Date(scheduledAt).toISOString() : null;
      const newCourtNumber = courtNumber ? parseInt(courtNumber) : null;
      await onConfirm(newScheduledAt, newCourtNumber);
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
            <Calendar className="w-5 h-5" />
            Reschedule Match
          </DialogTitle>
          {team1Name && team2Name && (
            <DialogDescription>
              {team1Name} vs {team2Name}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="reschedule-time">Date & Time</Label>
            <Input
              id="reschedule-time"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reschedule-court" className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Court Number
            </Label>
            <Input
              id="reschedule-court"
              type="number"
              min={1}
              max={20}
              placeholder="Court number"
              value={courtNumber}
              onChange={(e) => setCourtNumber(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
