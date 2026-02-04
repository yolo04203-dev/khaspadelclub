import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { MoreHorizontal, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { toast } from "sonner";

const PAGE_SIZE = 20;

interface AdminChallenge {
  id: string;
  created_at: string;
  status: string;
  responded_at: string | null;
  expires_at: string;
  challenger_name: string;
  challenged_name: string;
}

export function ChallengesTab() {
  const [challenges, setChallenges] = useState<AdminChallenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [challengeToCancel, setChallengeToCancel] = useState<AdminChallenge | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchChallenges = useCallback(async () => {
    setIsLoading(true);
    try {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: challengesData, error, count } = await supabase
        .from("challenges")
        .select(`
          id,
          created_at,
          status,
          responded_at,
          expires_at,
          challenger_team_id,
          challenged_team_id
        `, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;

      setTotalCount(count || 0);

      // Get team names
      const teamIds = [
        ...(challengesData?.map(c => c.challenger_team_id) || []),
        ...(challengesData?.map(c => c.challenged_team_id) || []),
      ].filter(Boolean);

      const { data: teams } = await supabase
        .from("teams")
        .select("id, name")
        .in("id", teamIds);

      const teamsMap = new Map(teams?.map(t => [t.id, t.name]) || []);

      const mapped: AdminChallenge[] = (challengesData || []).map(c => ({
        id: c.id,
        created_at: c.created_at,
        status: c.status,
        responded_at: c.responded_at,
        expires_at: c.expires_at,
        challenger_name: teamsMap.get(c.challenger_team_id) || "Unknown",
        challenged_name: teamsMap.get(c.challenged_team_id) || "Unknown",
      }));

      setChallenges(mapped);
    } catch (error) {
      console.error("Error fetching challenges:", error);
      toast.error("Failed to load challenges");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const handleCancel = async () => {
    if (!challengeToCancel) return;
    setIsCancelling(true);

    try {
      const { error } = await supabase
        .from("challenges")
        .update({ status: "cancelled" })
        .eq("id", challengeToCancel.id);

      if (error) throw error;

      toast.success("Challenge cancelled");
      fetchChallenges();
    } catch (error) {
      console.error("Error cancelling challenge:", error);
      toast.error("Failed to cancel challenge");
    } finally {
      setIsCancelling(false);
      setChallengeToCancel(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "accepted":
        return <Badge className="bg-success text-success-foreground">Accepted</Badge>;
      case "declined":
        return <Badge variant="destructive">Declined</Badge>;
      case "expired":
        return <Badge variant="outline">Expired</Badge>;
      case "cancelled":
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDateTime = (dateStr: string) => {
    return format(new Date(dateStr), "MMM d, yyyy 'at' h:mm a");
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push("ellipsis");
      }
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push("ellipsis");
      }
      
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    
    return pages;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading challenges...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Challenge History</CardTitle>
          <CardDescription>View all challenges with full timestamps</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Challenger</TableHead>
                <TableHead>Challenged</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Responded At</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {challenges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No challenges found
                  </TableCell>
                </TableRow>
              ) : (
                challenges.map((challenge) => (
                  <TableRow key={challenge.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(challenge.created_at)}
                    </TableCell>
                    <TableCell className="font-medium">{challenge.challenger_name}</TableCell>
                    <TableCell className="font-medium">{challenge.challenged_name}</TableCell>
                    <TableCell>{getStatusBadge(challenge.status)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {challenge.responded_at 
                        ? formatDateTime(challenge.responded_at) 
                        : <span className="text-muted-foreground">—</span>
                      }
                    </TableCell>
                    <TableCell>
                      {challenge.status === "pending" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setChallengeToCancel(challenge)}
                              className="text-destructive"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Cancel Challenge
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

          {/* Pagination Controls */}
          {totalCount > 0 && (
            <div className="flex flex-col items-center gap-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, totalCount)}-
                {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} challenges
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {getPageNumbers().map((page, index) => (
                    <PaginationItem key={index}>
                      {page === "ellipsis" ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!challengeToCancel} onOpenChange={() => setChallengeToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Challenge</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the challenge from{" "}
              <strong>{challengeToCancel?.challenger_name}</strong> to{" "}
              <strong>{challengeToCancel?.challenged_name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancel} 
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? "Cancelling..." : "Yes, Cancel Challenge"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
