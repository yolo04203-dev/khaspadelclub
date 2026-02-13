import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MoreHorizontal, Trash2, ExternalLink, Loader2 } from "lucide-react";
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
import { logger } from "@/lib/logger";
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

interface AmericanoSession {
  id: string;
  name: string;
  status: string;
  mode: string;
  player_count: number;
  created_at: string;
}

export function AmericanoTab() {
  const [sessions, setSessions] = useState<AmericanoSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionToDelete, setSessionToDelete] = useState<AmericanoSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSessions = async () => {
    try {
      const [sessionsRes, playersRes, teamsRes] = await Promise.all([
        supabase.from("americano_sessions").select("id, name, status, mode, created_at").order("created_at", { ascending: false }),
        supabase.from("americano_players").select("id, session_id"),
        supabase.from("americano_teams").select("id, session_id"),
      ]);

      const playerCounts = new Map<string, number>();
      playersRes.data?.forEach(p => {
        playerCounts.set(p.session_id, (playerCounts.get(p.session_id) || 0) + 1);
      });
      const teamCounts = new Map<string, number>();
      teamsRes.data?.forEach(t => {
        teamCounts.set(t.session_id, (teamCounts.get(t.session_id) || 0) + 1);
      });

      const mapped: AmericanoSession[] = (sessionsRes.data || []).map(s => ({
        id: s.id,
        name: s.name,
        status: s.status,
        mode: s.mode,
        player_count: s.mode === "team" ? (teamCounts.get(s.id) || 0) : (playerCounts.get(s.id) || 0),
        created_at: new Date(s.created_at).toLocaleDateString(),
      }));
      setSessions(mapped);
    } catch (err) {
      logger.apiError("fetchAmericanoSessions", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSessions(); }, []);

  const handleDelete = async () => {
    if (!sessionToDelete) return;
    setIsDeleting(true);
    try {
      // Delete related data first
      await Promise.all([
        supabase.from("americano_rounds").delete().eq("session_id", sessionToDelete.id),
        supabase.from("americano_team_matches").delete().eq("session_id", sessionToDelete.id),
      ]);
      await Promise.all([
        supabase.from("americano_players").delete().eq("session_id", sessionToDelete.id),
        supabase.from("americano_teams").delete().eq("session_id", sessionToDelete.id),
      ]);
      const { error } = await supabase.from("americano_sessions").delete().eq("id", sessionToDelete.id);
      if (error) throw error;
      toast.success("Session deleted");
      fetchSessions();
    } catch (err) {
      logger.apiError("deleteAmericanoSession", err);
      toast.error("Failed to delete session");
    } finally {
      setIsDeleting(false);
      setSessionToDelete(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in_progress": return <Badge className="bg-success text-success-foreground">In Progress</Badge>;
      case "completed": return <Badge variant="default">Completed</Badge>;
      case "draft": return <Badge variant="secondary">Draft</Badge>;
      case "cancelled": return <Badge variant="outline">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Americano Sessions</CardTitle>
          <CardDescription>Manage all americano sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Players/Teams</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No americano sessions found
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">{session.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{session.mode === "team" ? "Team" : "Individual"}</Badge>
                    </TableCell>
                    <TableCell>{session.player_count}</TableCell>
                    <TableCell>{getStatusBadge(session.status)}</TableCell>
                    <TableCell>{session.created_at}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/americano/${session.id}`}>
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Manage Session
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setSessionToDelete(session)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Session
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

      <AlertDialog open={!!sessionToDelete} onOpenChange={() => setSessionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{sessionToDelete?.name}</strong>? This removes all matches and player data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
