import { useState } from "react";
import { Link } from "react-router-dom";
import { MoreHorizontal, Trash2, Edit, Settings, Plus, ExternalLink } from "lucide-react";
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

interface Ladder {
  id: string;
  name: string;
  description: string | null;
  status: string;
  categories_count: number;
  teams_count: number;
  created_at: string;
}

interface LaddersTabProps {
  ladders: Ladder[];
  onRefresh: () => void;
}

export function LaddersTab({ ladders, onRefresh }: LaddersTabProps) {
  const [ladderToDelete, setLadderToDelete] = useState<Ladder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!ladderToDelete) return;
    setIsDeleting(true);

    try {
      // Delete ladder categories first
      await supabase.from("ladder_categories").delete().eq("ladder_id", ladderToDelete.id);
      
      // Delete the ladder
      const { error } = await supabase.from("ladders").delete().eq("id", ladderToDelete.id);

      if (error) throw error;

      toast.success("Ladder deleted successfully");
      onRefresh();
    } catch (error) {
      console.error("Error deleting ladder:", error);
      toast.error("Failed to delete ladder");
    } finally {
      setIsDeleting(false);
      setLadderToDelete(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-success text-success-foreground">Active</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "archived":
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Ladders</CardTitle>
            <CardDescription>Manage ladder competitions</CardDescription>
          </div>
          <Button asChild>
            <Link to="/ladders/create">
              <Plus className="w-4 h-4 mr-2" />
              Create Ladder
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Categories</TableHead>
                <TableHead>Teams</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ladders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No ladders found
                  </TableCell>
                </TableRow>
              ) : (
                ladders.map((ladder) => (
                  <TableRow key={ladder.id}>
                    <TableCell className="font-medium">{ladder.name}</TableCell>
                    <TableCell>{ladder.categories_count}</TableCell>
                    <TableCell>{ladder.teams_count}</TableCell>
                    <TableCell>{getStatusBadge(ladder.status)}</TableCell>
                    <TableCell>{ladder.created_at}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/ladders/${ladder.id}`}>
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View Ladder
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/ladders/${ladder.id}/manage`}>
                              <Settings className="w-4 h-4 mr-2" />
                              Manage
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setLadderToDelete(ladder)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Ladder
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

      <AlertDialog open={!!ladderToDelete} onOpenChange={() => setLadderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ladder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{ladderToDelete?.name}</strong>? 
              This will remove all categories and rankings. This action cannot be undone.
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
