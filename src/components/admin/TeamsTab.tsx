import { useState } from "react";
import { format, isFuture } from "date-fns";
import { MoreHorizontal, Trash2, Edit, ArrowUp, ArrowDown, Snowflake } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FreezeTeamDialog } from "./FreezeTeamDialog";

interface Team {
  id: string;
  name: string;
  rank: number | null;
  members_count: number;
  wins: number;
  losses: number;
  is_frozen?: boolean;
  frozen_until?: string | null;
  frozen_reason?: string | null;
}

interface TeamsTabProps {
  teams: Team[];
  onRefresh: () => void;
}

export function TeamsTab({ teams, onRefresh }: TeamsTabProps) {
  const { user } = useAuth();
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);
  const [teamToFreeze, setTeamToFreeze] = useState<Team | null>(null);
  const [editName, setEditName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUnfreezing, setIsUnfreezing] = useState<string | null>(null);

  const isTeamFrozen = (team: Team) => {
    return team.is_frozen && team.frozen_until && isFuture(new Date(team.frozen_until));
  };

  const handleUnfreeze = async (team: Team) => {
    setIsUnfreezing(team.id);

    try {
      const { error } = await supabase
        .from("teams")
        .update({
          is_frozen: false,
          frozen_until: null,
          frozen_reason: null,
          frozen_by: null,
          frozen_at: null,
        })
        .eq("id", team.id);

      if (error) throw error;

      // Send email notification
      try {
        await supabase.functions.invoke("send-team-freeze-notification", {
          body: {
            teamId: team.id,
            teamName: team.name,
            action: "unfreeze",
          },
        });
      } catch (emailError) {
        console.error("Failed to send unfreeze notification email:", emailError);
        // Don't fail the unfreeze operation if email fails
      }

      toast.success(`${team.name} has been unfrozen`);
      onRefresh();
    } catch (error) {
      console.error("Error unfreezing team:", error);
      toast.error("Failed to unfreeze team");
    } finally {
      setIsUnfreezing(null);
    }
  };
  const handleDelete = async () => {
    if (!teamToDelete) return;
    setIsDeleting(true);

    try {
      // Delete ladder rankings first
      await supabase.from("ladder_rankings").delete().eq("team_id", teamToDelete.id);
      
      // Delete team members
      await supabase.from("team_members").delete().eq("team_id", teamToDelete.id);
      
      // Delete the team
      const { error } = await supabase.from("teams").delete().eq("id", teamToDelete.id);

      if (error) throw error;

      toast.success("Team deleted successfully");
      onRefresh();
    } catch (error) {
      console.error("Error deleting team:", error);
      toast.error("Failed to delete team");
    } finally {
      setIsDeleting(false);
      setTeamToDelete(null);
    }
  };

  const handleEdit = async () => {
    if (!teamToEdit || !editName.trim()) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("teams")
        .update({ name: editName.trim() })
        .eq("id", teamToEdit.id);

      if (error) throw error;

      toast.success("Team updated successfully");
      onRefresh();
    } catch (error) {
      console.error("Error updating team:", error);
      toast.error("Failed to update team");
    } finally {
      setIsSaving(false);
      setTeamToEdit(null);
      setEditName("");
    }
  };

  const handleRankChange = async (team: Team, direction: "up" | "down") => {
    const currentRank = team.rank;
    if (!currentRank) return;

    const newRank = direction === "up" ? currentRank - 1 : currentRank + 1;
    if (newRank < 1) return;

    // Find team with the target rank
    const swapTeam = teams.find(t => t.rank === newRank);
    if (!swapTeam) return;

    try {
      // Swap ranks
      await supabase.from("ladder_rankings").update({ rank: newRank }).eq("team_id", team.id);
      await supabase.from("ladder_rankings").update({ rank: currentRank }).eq("team_id", swapTeam.id);

      toast.success("Ranks updated");
      onRefresh();
    } catch (error) {
      console.error("Error updating ranks:", error);
      toast.error("Failed to update ranks");
    }
  };

  return (
    <TooltipProvider>
      <>
        <Card>
          <CardHeader>
            <CardTitle>All Teams</CardTitle>
            <CardDescription>View and manage team rankings</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>W/L</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No teams found
                    </TableCell>
                  </TableRow>
                ) : (
                  teams.map((team) => {
                    const frozen = isTeamFrozen(team);
                    return (
                      <TableRow key={team.id}>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {team.rank ? `#${team.rank}` : "-"}
                            {team.rank && (
                              <div className="flex flex-col ml-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => handleRankChange(team, "up")}
                                  disabled={team.rank === 1}
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => handleRankChange(team, "down")}
                                  disabled={team.rank === teams.filter(t => t.rank).length}
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{team.name}</span>
                            {frozen && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Snowflake className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  {team.frozen_reason || "Team is frozen"}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {frozen ? (
                            <Badge variant="secondary">
                              Frozen until {format(new Date(team.frozen_until!), "MMM d")}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>{team.members_count}</TableCell>
                        <TableCell>
                          <span className="text-success">{team.wins}</span>
                          {" / "}
                          <span className="text-destructive">{team.losses}</span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setTeamToEdit(team);
                                  setEditName(team.name);
                                }}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Team
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {frozen ? (
                                <DropdownMenuItem
                                  onClick={() => handleUnfreeze(team)}
                                  disabled={isUnfreezing === team.id}
                                >
                                  <Snowflake className="w-4 h-4 mr-2" />
                                  {isUnfreezing === team.id ? "Unfreezing..." : "Unfreeze Team"}
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => setTeamToFreeze(team)}>
                                  <Snowflake className="w-4 h-4 mr-2" />
                                  Freeze Team
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setTeamToDelete(team)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Team
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      <AlertDialog open={!!teamToDelete} onOpenChange={() => setTeamToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{teamToDelete?.name}</strong>? 
              This will remove all team members and rankings. This action cannot be undone.
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

      <Dialog open={!!teamToEdit} onOpenChange={() => { setTeamToEdit(null); setEditName(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>Update team details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter team name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTeamToEdit(null); setEditName(""); }}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isSaving || !editName.trim()}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FreezeTeamDialog
        team={teamToFreeze}
        open={!!teamToFreeze}
        onOpenChange={() => setTeamToFreeze(null)}
        onSuccess={onRefresh}
        userId={user?.id || ""}
      />
      </>
    </TooltipProvider>
  );
}
