import { useState } from "react";
import { MoreHorizontal, UserCog } from "lucide-react";
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

interface Player {
  id: string;
  display_name: string | null;
  email: string;
  team_name: string | null;
  role: string;
}

interface PlayersTabProps {
  players: Player[];
  onRefresh: () => void;
  currentUserRole?: string | null;
}

const PAGE_SIZE = 50;

export function PlayersTab({ players, onRefresh, currentUserRole }: PlayersTabProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [actionType, setActionType] = useState<"promote" | "demote" | null>(null);
  const [page, setPage] = useState(0);

  const displayedPlayers = players.slice(0, (page + 1) * PAGE_SIZE);
  const hasMore = displayedPlayers.length < players.length;

  const handleRoleChange = async () => {
    if (!selectedPlayer || !actionType) return;

    try {
      const newRole = actionType === "promote" ? "admin" : "player";
      
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", selectedPlayer.id);

      if (error) throw error;

      toast.success(`User ${actionType === "promote" ? "promoted to admin" : "demoted to player"}`);
      onRefresh();
    } catch (error) {
      logger.apiError("changeRole", error);
      toast.error("Failed to change user role");
    } finally {
      setSelectedPlayer(null);
      setActionType(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>All Players</CardTitle>
          <CardDescription>
            Showing {displayedPlayers.length} of {players.length} players
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedPlayers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No players found
                  </TableCell>
                </TableRow>
              ) : (
                displayedPlayers.map((player) => (
                  <TableRow key={player.id}>
                    <TableCell className="font-medium">
                      {player.display_name || "Unknown"}
                    </TableCell>
                    <TableCell>
                      {player.team_name || <span className="text-muted-foreground">No team</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={player.role === "admin" ? "default" : "secondary"}>
                        {player.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {currentUserRole === "super_admin" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {player.role === "player" ? (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedPlayer(player);
                                  setActionType("promote");
                                }}
                              >
                                <UserCog className="w-4 h-4 mr-2" />
                                Promote to Admin
                              </DropdownMenuItem>
                            ) : player.role === "admin" ? (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedPlayer(player);
                                  setActionType("demote");
                                }}
                              >
                                <UserCog className="w-4 h-4 mr-2" />
                                Demote to Player
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={() => setPage(p => p + 1)}>
                Load More ({players.length - displayedPlayers.length} remaining)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!selectedPlayer && !!actionType} onOpenChange={() => { setSelectedPlayer(null); setActionType(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "promote" ? "Promote to Admin" : "Demote to Player"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {actionType === "promote" ? "promote" : "demote"}{" "}
              <strong>{selectedPlayer?.display_name}</strong>? 
              {actionType === "promote" 
                ? " They will gain full admin access."
                : " They will lose admin privileges."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRoleChange}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
