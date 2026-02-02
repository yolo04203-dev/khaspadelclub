import { useState } from "react";
import { MoreHorizontal, Trash2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Match {
  id: string;
  challenger_name: string;
  challenged_name: string;
  status: string;
  challenger_score: number | null;
  challenged_score: number | null;
  created_at: string;
}

interface MatchesTabProps {
  matches: Match[];
  onRefresh: () => void;
}

export function MatchesTab({ matches, onRefresh }: MatchesTabProps) {
  const [matchToCancel, setMatchToCancel] = useState<Match | null>(null);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default">Completed</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "scheduled":
        return <Badge className="bg-warning text-warning-foreground">Scheduled</Badge>;
      case "in_progress":
        return <Badge className="bg-success text-success-foreground">In Progress</Badge>;
      case "cancelled":
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Recent Matches</CardTitle>
          <CardDescription>View and manage match history</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Challenger</TableHead>
                <TableHead>Challenged</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No matches found
                  </TableCell>
                </TableRow>
              ) : (
                matches.map((match) => (
                  <TableRow key={match.id}>
                    <TableCell>{match.created_at}</TableCell>
                    <TableCell className="font-medium">{match.challenger_name}</TableCell>
                    <TableCell>{match.challenged_name}</TableCell>
                    <TableCell>
                      {match.challenger_score !== null && match.challenged_score !== null
                        ? `${match.challenger_score} - ${match.challenged_score}`
                        : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(match.status)}</TableCell>
                    <TableCell>
                      {match.status !== "completed" && match.status !== "cancelled" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setMatchToCancel(match)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Cancel Match
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
            <AlertDialogAction 
              onClick={handleCancelMatch} 
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? "Processing..." : "Cancel Match"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
