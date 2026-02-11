import { useState } from "react";
import { MoreHorizontal, Trash2, Edit, Calendar, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { AdminEditScoreDialog } from "./AdminEditScoreDialog";
import { AdminScheduleDialog } from "./AdminScheduleDialog";

interface Match {
  id: string;
  challenger_name: string;
  challenged_name: string;
  challenger_team_id: string;
  challenged_team_id: string;
  status: string;
  challenger_score: number | null;
  challenged_score: number | null;
  created_at: string;
  scheduled_at: string | null;
  venue: string | null;
  score_disputed: boolean;
  dispute_reason: string | null;
}

interface MatchesTabProps {
  matches: Match[];
  onRefresh: () => void;
}

export function MatchesTab({ matches, onRefresh }: MatchesTabProps) {
  const [matchToCancel, setMatchToCancel] = useState<Match | null>(null);
  const [matchToEditScore, setMatchToEditScore] = useState<Match | null>(null);
  const [matchToSchedule, setMatchToSchedule] = useState<Match | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCancelMatch = async () => {
    if (!matchToCancel) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("matches")
        .update({ status: "cancelled" })
        .eq("id", matchToCancel.id);
      if (error) throw error;
      toast.success("Match cancelled");
      onRefresh();
    } catch (error) {
      console.error("Error cancelling match:", error);
      toast.error("Failed to cancel match");
    } finally {
      setIsProcessing(false);
      setMatchToCancel(null);
    }
  };

  const handleStatusChange = async (match: Match, newStatus: string) => {
    try {
      const updates: Record<string, any> = { status: newStatus };
      if (newStatus === "completed") {
        updates.completed_at = new Date().toISOString();
      }
      const { error } = await supabase.from("matches").update(updates).eq("id", match.id);
      if (error) throw error;
      toast.success(`Status changed to ${newStatus}`);
      onRefresh();
    } catch (error) {
      console.error("Error changing status:", error);
      toast.error("Failed to change status");
    }
  };

  const handleResolveDispute = async (match: Match) => {
    try {
      const { error } = await supabase.from("matches")
        .update({ score_disputed: false, dispute_reason: null })
        .eq("id", match.id);
      if (error) throw error;
      toast.success("Dispute resolved");
      onRefresh();
    } catch (error) {
      toast.error("Failed to resolve dispute");
    }
  };

  const getStatusBadge = (status: string, disputed?: boolean) => {
    if (disputed) return <Badge variant="destructive">Disputed</Badge>;
    switch (status) {
      case "completed": return <Badge variant="default">Completed</Badge>;
      case "pending": return <Badge variant="secondary">Pending</Badge>;
      case "scheduled": return <Badge className="bg-warning text-warning-foreground">Scheduled</Badge>;
      case "in_progress": return <Badge className="bg-success text-success-foreground">In Progress</Badge>;
      case "cancelled": return <Badge variant="outline">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Recent Matches</CardTitle>
          <CardDescription>View and manage match history with full admin controls</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Challenger</TableHead>
                <TableHead>Challenged</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No matches found
                  </TableCell>
                </TableRow>
              ) : (
                matches.map((match) => (
                  <TableRow key={match.id} className={match.score_disputed ? "bg-destructive/5" : ""}>
                    <TableCell>
                      <div>
                        <div>{match.created_at}</div>
                        {match.scheduled_at && (
                          <div className="text-xs text-muted-foreground">
                            Sched: {new Date(match.scheduled_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{match.challenger_name}</TableCell>
                    <TableCell>{match.challenged_name}</TableCell>
                    <TableCell>
                      {match.challenger_score !== null && match.challenged_score !== null
                        ? `${match.challenger_score} - ${match.challenged_score}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{match.venue || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getStatusBadge(match.status, match.score_disputed)}
                        {match.score_disputed && (
                          <AlertTriangle className="w-3 h-3 text-destructive" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => setMatchToEditScore(match)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Score
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setMatchToSchedule(match)}>
                            <Calendar className="w-4 h-4 mr-2" />
                            Edit Schedule/Venue
                          </DropdownMenuItem>
                          {match.score_disputed && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => {
                                setMatchToEditScore(match);
                              }}>
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                Resolve Dispute (Edit Score)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleResolveDispute(match)}>
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                Clear Dispute Flag
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <div className="px-2 py-1.5">
                            <p className="text-xs text-muted-foreground mb-1">Change Status</p>
                            <Select value={match.status} onValueChange={(val) => handleStatusChange(match, val)}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="scheduled">Scheduled</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {match.status !== "cancelled" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setMatchToCancel(match)} className="text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Cancel Match
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cancel Match Dialog */}
      <AlertDialog open={!!matchToCancel} onOpenChange={() => setMatchToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Match</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the match between{" "}
              <strong>{matchToCancel?.challenger_name}</strong> and{" "}
              <strong>{matchToCancel?.challenged_name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelMatch} disabled={isProcessing} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isProcessing ? "Processing..." : "Cancel Match"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Admin Edit Score Dialog */}
      {matchToEditScore && (
        <AdminEditScoreDialog
          open={!!matchToEditScore}
          onOpenChange={(open) => { if (!open) setMatchToEditScore(null); }}
          matchId={matchToEditScore.id}
          challengerName={matchToEditScore.challenger_name}
          challengedName={matchToEditScore.challenged_name}
          challengerTeamId={matchToEditScore.challenger_team_id}
          challengedTeamId={matchToEditScore.challenged_team_id}
          onSaved={onRefresh}
        />
      )}

      {/* Admin Schedule Dialog */}
      {matchToSchedule && (
        <AdminScheduleDialog
          open={!!matchToSchedule}
          onOpenChange={(open) => { if (!open) setMatchToSchedule(null); }}
          matchId={matchToSchedule.id}
          challengerName={matchToSchedule.challenger_name}
          challengedName={matchToSchedule.challenged_name}
          currentScheduledAt={matchToSchedule.scheduled_at}
          currentVenue={matchToSchedule.venue}
          onSaved={onRefresh}
        />
      )}
    </>
  );
}
