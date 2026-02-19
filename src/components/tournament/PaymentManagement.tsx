import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Banknote, Check, X, FileText, Filter, ClipboardCheck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface Participant {
  id: string;
  team_id: string;
  team_name: string;
  registered_at: string;
  payment_status: string;
  payment_notes: string | null;
  custom_team_name: string | null;
  waitlist_position: number | null;
}

interface PaymentManagementProps {
  tournamentId: string;
  entryFee: number;
  entryFeeCurrency: string;
  participants: Participant[];
  onRefresh: () => void;
}

export function PaymentManagement({
  tournamentId,
  entryFee,
  entryFeeCurrency,
  participants,
  onRefresh,
}: PaymentManagementProps) {
  const hasEntryFee = entryFee > 0;
  const [filter, setFilter] = useState<"all" | "pending" | "paid" | "refunded">("all");
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [noteText, setNoteText] = useState("");
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const filteredParticipants = participants.filter((p) => {
    if (filter === "all") return true;
    return p.payment_status === filter;
  });

  const registeredParticipants = participants.filter(p => p.waitlist_position === null);
  const confirmedCount = registeredParticipants.filter((p) => p.payment_status === "paid").length;
  const pendingCount = registeredParticipants.filter((p) => p.payment_status === "pending").length;
  const totalCollected = confirmedCount * entryFee;

  const updatePaymentStatus = async (participantId: string, status: "pending" | "paid" | "refunded") => {
    setIsUpdating(participantId);
    try {
      const updateData: any = { payment_status: status };

      if (status === "paid") {
        const { data: { user } } = await supabase.auth.getUser();
        updateData.payment_confirmed_at = new Date().toISOString();
        updateData.payment_confirmed_by = user?.id;
      } else {
        updateData.payment_confirmed_at = null;
        updateData.payment_confirmed_by = null;
      }

      const { error } = await supabase
        .from("tournament_participants")
        .update(updateData)
        .eq("id", participantId);

      if (error) throw error;

      toast.success(hasEntryFee ? `Payment marked as ${status}` : (status === "paid" ? "Registration confirmed" : "Registration unconfirmed"));
      onRefresh();
    } catch (error: any) {
      toast.error("Failed to update status");
    } finally {
      setIsUpdating(null);
    }
  };

  const openNoteDialog = (participant: Participant) => {
    setSelectedParticipant(participant);
    setNoteText(participant.payment_notes || "");
    setNoteDialogOpen(true);
  };

  const saveNote = async () => {
    if (!selectedParticipant) return;
    try {
      const { error } = await supabase
        .from("tournament_participants")
        .update({ payment_notes: noteText.trim() || null })
        .eq("id", selectedParticipant.id);

      if (error) throw error;
      toast.success("Note saved");
      setNoteDialogOpen(false);
      onRefresh();
    } catch (error) {
      toast.error("Failed to save note");
    }
  };

  const formatCurrency = (amount: number) => `PKR ${amount.toLocaleString()}`;

  const getStatusBadge = (status: string) => {
    if (!hasEntryFee) {
      return status === "paid"
        ? <Badge className="bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30">Confirmed</Badge>
        : <Badge variant="secondary" className="bg-warning/20 text-warning">Unconfirmed</Badge>;
    }
    switch (status) {
      case "paid":
        return <Badge className="bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30">Paid</Badge>;
      case "refunded":
        return <Badge variant="outline" className="text-muted-foreground">Refunded</Badge>;
      default:
        return <Badge variant="secondary" className="bg-warning/20 text-warning">Pending</Badge>;
    }
  };

  const getDisplayName = (participant: Participant) => {
    return participant.custom_team_name || participant.team_name;
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className={`grid gap-4 ${hasEntryFee ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{registeredParticipants.length}</div>
            <p className="text-sm text-muted-foreground">Total Registered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-emerald-500">{confirmedCount}</div>
            <p className="text-sm text-muted-foreground">Confirmed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-warning">{pendingCount}</div>
            <p className="text-sm text-muted-foreground">{hasEntryFee ? "Pending Payment" : "Unconfirmed"}</p>
          </CardContent>
        </Card>
        {hasEntryFee && (
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-emerald-500">
                {formatCurrency(totalCollected)}
              </div>
              <p className="text-sm text-muted-foreground">Total Collected</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Registration / Payment Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {hasEntryFee ? <Banknote className="w-5 h-5" /> : <ClipboardCheck className="w-5 h-5" />}
                {hasEntryFee ? "Payment Tracking" : "Registration Management"}
              </CardTitle>
              {hasEntryFee && (
                <CardDescription>
                  Entry fee: {formatCurrency(entryFee)} per team
                </CardDescription>
              )}
            </div>
            {hasEntryFee && (
              <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
                <SelectTrigger className="w-32">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredParticipants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No participants found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Status</TableHead>
                  {hasEntryFee && <TableHead>Notes</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParticipants.map((participant) => (
                  <TableRow key={participant.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{getDisplayName(participant)}</span>
                        {participant.waitlist_position !== null && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Waitlist #{participant.waitlist_position}
                          </Badge>
                        )}
                        {participant.custom_team_name && (
                          <span className="text-xs text-muted-foreground block">
                            (Custom team)
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(participant.registered_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>{getStatusBadge(participant.payment_status)}</TableCell>
                    {hasEntryFee && (
                      <TableCell>
                        {participant.payment_notes ? (
                          <span className="text-sm text-muted-foreground truncate max-w-[150px] block">
                            {participant.payment_notes}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* No-fee mode: simple toggle */}
                        {!hasEntryFee && (
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={participant.payment_status === "paid"}
                              onCheckedChange={(checked) =>
                                updatePaymentStatus(participant.id, checked ? "paid" : "pending")
                              }
                              disabled={isUpdating === participant.id}
                            />
                            <span className="text-xs text-muted-foreground">
                              {participant.payment_status === "paid" ? "Confirmed" : "Unconfirmed"}
                            </span>
                          </div>
                        )}
                        {/* Fee mode: full payment actions */}
                        {hasEntryFee && (
                          <>
                            {participant.payment_status !== "paid" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-emerald-500 hover:text-emerald-600"
                                onClick={() => updatePaymentStatus(participant.id, "paid")}
                                disabled={isUpdating === participant.id}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Paid
                              </Button>
                            )}
                            {participant.payment_status === "paid" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updatePaymentStatus(participant.id, "refunded")}
                                disabled={isUpdating === participant.id}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Refund
                              </Button>
                            )}
                            {participant.payment_status !== "pending" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updatePaymentStatus(participant.id, "pending")}
                                disabled={isUpdating === participant.id}
                              >
                                Reset
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openNoteDialog(participant)}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Notes</DialogTitle>
            <DialogDescription>
              Add notes about {selectedParticipant?.custom_team_name || selectedParticipant?.team_name}'s payment
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="e.g., Cash payment received, Bank transfer ref #12345"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveNote}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
