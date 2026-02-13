import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ScheduleMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  opponentName: string;
  currentScheduledAt?: string | null;
  currentVenue?: string | null;
  onScheduled: () => void;
}

export function ScheduleMatchDialog({
  open,
  onOpenChange,
  matchId,
  opponentName,
  currentScheduledAt,
  currentVenue,
  onScheduled,
}: ScheduleMatchDialogProps) {
  const [date, setDate] = useState<Date | undefined>(
    currentScheduledAt ? new Date(currentScheduledAt) : undefined
  );
  const [hour, setHour] = useState(
    currentScheduledAt ? format(new Date(currentScheduledAt), "hh") : "06"
  );
  const [minute, setMinute] = useState(
    currentScheduledAt ? format(new Date(currentScheduledAt), "mm") : "00"
  );
  const [period, setPeriod] = useState<"AM" | "PM">(
    currentScheduledAt ? (format(new Date(currentScheduledAt), "a").toUpperCase() as "AM" | "PM") : "PM"
  );
  const [venue, setVenue] = useState(currentVenue || "");
  const [isSaving, setIsSaving] = useState(false);

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const minutes = ["00", "15", "30", "45"];

  const handleSave = async () => {
    if (!date) {
      toast({
        title: "Please select a date",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Combine date and time
      const hourNum = parseInt(hour);
      const hour24 = period === "PM" ? (hourNum === 12 ? 12 : hourNum + 12) : (hourNum === 12 ? 0 : hourNum);
      
      const scheduledAt = new Date(date);
      scheduledAt.setHours(hour24, parseInt(minute), 0, 0);

      const { error } = await supabase
        .from("matches")
        .update({
          scheduled_at: scheduledAt.toISOString(),
          venue: venue || null,
        })
        .eq("id", matchId);

      if (error) throw error;

      toast({
        title: "Match scheduled!",
        description: `${format(scheduledAt, "MMM d 'at' h:mm a")}${venue ? ` @ ${venue}` : ""}`,
      });

      onScheduled();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Schedule Your Match</DialogTitle>
          <DialogDescription>
            Set when and where you'll play vs {opponentName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 sm:space-y-4 sm:py-4">
          {/* Date Picker */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Picker */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time
            </Label>
            <div className="flex gap-2">
              <Select value={hour} onValueChange={setHour}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hours.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="flex items-center text-muted-foreground">:</span>
              <Select value={minute} onValueChange={setMinute}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {minutes.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={period} onValueChange={(v) => setPeriod(v as "AM" | "PM")}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AM">AM</SelectItem>
                  <SelectItem value="PM">PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Venue Input */}
          <div className="space-y-2">
            <Label htmlFor="venue" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Venue / Location
            </Label>
            <Input
              id="venue"
              placeholder="e.g., Club Courts, Court 3"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Schedule"
            )}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
