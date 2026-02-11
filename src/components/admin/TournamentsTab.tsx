import { useState } from "react";
import { Link } from "react-router-dom";
import { MoreHorizontal, Trash2, ExternalLink, Plus } from "lucide-react";
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

interface Tournament {
  id: string;
  name: string;
  format: string;
  status: string;
  max_teams: number;
  participants_count: number;
  created_at: string;
}

interface TournamentsTabProps {
  tournaments: Tournament[];
  onRefresh: () => void;
}

export function TournamentsTab({ tournaments, onRefresh }: TournamentsTabProps) {
  const [tournamentToDelete, setTournamentToDelete] = useState<Tournament | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!tournamentToDelete) return;
    setIsDeleting(true);

    try {
      // Delete tournament matches first
      await supabase.from("tournament_matches").delete().eq("tournament_id", tournamentToDelete.id);
      
      // Delete participants
      await supabase.from("tournament_participants").delete().eq("tournament_id", tournamentToDelete.id);
      
      // Delete the tournament
      const { error } = await supabase.from("tournaments").delete().eq("id", tournamentToDelete.id);

      if (error) throw error;

      toast.success("Tournament deleted successfully");
      onRefresh();
    } catch (error) {
      console.error("Error deleting tournament:", error);
      toast.error("Failed to delete tournament");
    } finally {
      setIsDeleting(false);
      setTournamentToDelete(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in_progress":
        return <Badge className="bg-success text-success-foreground">In Progress</Badge>;
      case "registration":
        return <Badge className="bg-warning text-warning-foreground">Registration</Badge>;
      case "completed":
        return <Badge variant="default">Completed</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "cancelled":
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatType = (format: string) => {
    return format.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Tournaments</CardTitle>
            <CardDescription>Manage bracket competitions</CardDescription>
          </div>
          <Button asChild>
            <Link to="/tournaments/create">
              <Plus className="w-4 h-4 mr-2" />
              Create Tournament
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Participants</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tournaments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No tournaments found
                  </TableCell>
                </TableRow>
              ) : (
                tournaments.map((tournament) => (
                  <TableRow key={tournament.id}>
                    <TableCell className="font-medium">{tournament.name}</TableCell>
                    <TableCell>{formatType(tournament.format)}</TableCell>
                    <TableCell>
                      {tournament.participants_count}/{tournament.max_teams}
                    </TableCell>
                    <TableCell>{getStatusBadge(tournament.status)}</TableCell>
                    <TableCell>{tournament.created_at}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/tournaments/${tournament.id}`}>
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Manage Tournament
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setTournamentToDelete(tournament)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Tournament
                          </DropdownMenuItem>
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

      <AlertDialog open={!!tournamentToDelete} onOpenChange={() => setTournamentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tournament</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{tournamentToDelete?.name}</strong>? 
              This will remove all matches and participants. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
