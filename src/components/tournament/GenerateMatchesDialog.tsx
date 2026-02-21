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
import { Clock, MapPin } from "lucide-react";

export interface SchedulingConfig {
  startTime: Date;
  durationMinutes: number;
  numberOfCourts: number;
  roundFormats?: Record<string, number>; // roundLabel -> sets_per_match
}

interface GenerateMatchesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (config: SchedulingConfig) => void;
  title: string;
  description?: string;
  roundLabels?: string[];
}

export function GenerateMatchesDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  roundLabels,
}: GenerateMatchesDialogProps) {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const defaultDateTime = now.toISOString().slice(0, 16);

  const [startTime, setStartTime] = useState(defaultDateTime);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [numberOfCourts, setNumberOfCourts] = useState(1);
  const [roundFormats, setRoundFormats] = useState<Record<string, number>>(() => {
    if (!roundLabels) return {};
    const defaults: Record<string, number> = {};
    roundLabels.forEach(label => { defaults[label] = 1; });
    return defaults;
  });

  const handleConfirm = () => {
    const date = new Date(startTime);
    if (isNaN(date.getTime())) return;
    onConfirm({ startTime: date, durationMinutes, numberOfCourts, roundFormats: roundLabels ? roundFormats : undefined });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="start-time">Start Date & Time</Label>
            <Input
              id="start-time"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration per Match (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min={10}
              max={180}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 30)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="courts" className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Number of Courts
            </Label>
            <Input
              id="courts"
              type="number"
              min={1}
              max={20}
              value={numberOfCourts}
              onChange={(e) => setNumberOfCourts(parseInt(e.target.value) || 1)}
            />
          </div>

          {roundLabels && roundLabels.length > 0 && (
            <div className="space-y-3 pt-2 border-t">
              <Label className="text-sm font-medium">Match Format per Round</Label>
              {roundLabels.map((label) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <span className="text-sm">{label}</span>
                  <Select
                    value={String(roundFormats[label] ?? 1)}
                    onValueChange={(val) =>
                      setRoundFormats(prev => ({ ...prev, [label]: Number(val) }))
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Single Set</SelectItem>
                      <SelectItem value="3">Best of 3 Sets</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Generate</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
