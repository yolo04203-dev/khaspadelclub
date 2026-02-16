import { useState, useEffect } from "react";
import { Check, X, Loader2, Clock, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { logger } from "@/lib/logger";

interface JoinRequest {
  id: string;
  team_id: string;
  team_name: string;
  ladder_category_id: string;
  category_name: string;
  status: string;
  message: string | null;
  player1_name: string | null;
  player2_name: string | null;
  created_at: string;
}

interface JoinRequestsManagementProps {
  ladderId: string;
  categoryIds: string[];
  onRequestHandled: () => void;
}

export function JoinRequestsManagement({
  ladderId,
  categoryIds,
  onRequestHandled,
}: JoinRequestsManagementProps) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const fetchRequests = async () => {
    if (categoryIds.length === 0) {
      setRequests([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("ladder_join_requests")
        .select(`
          id,
          team_id,
          ladder_category_id,
          status,
          message,
          created_at,
          team:teams (name),
          category:ladder_categories (name)
        `)
        .in("ladder_category_id", categoryIds)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (error) throw error;

      setRequests(
        (data || []).map((r) => ({
          id: r.id,
          team_id: r.team_id,
          team_name: (r.team as any)?.name || "Unknown Team",
          ladder_category_id: r.ladder_category_id,
          category_name: (r.category as any)?.name || "Unknown Category",
          status: r.status,
          message: r.message,
          player1_name: (r as any).player1_name || null,
          player2_name: (r as any).player2_name || null,
          created_at: r.created_at,
        }))
      );
    } catch (error) {
      logger.apiError("fetchJoinRequests", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [categoryIds]);

  const handleApprove = async (request: JoinRequest) => {
    setProcessingId(request.id);

    try {

      // Check if team is already in this specific category
      const { data: existingInCategory } = await supabase
        .from("ladder_rankings")
        .select("id")
        .eq("team_id", request.team_id)
        .eq("ladder_category_id", request.ladder_category_id)
        .maybeSingle();

      if (existingInCategory) {
        throw new Error("This team is already in this ladder category.");
      }

      // Get the current max rank in the category
      const { data: rankings } = await supabase
        .from("ladder_rankings")
        .select("rank")
        .eq("ladder_category_id", request.ladder_category_id)
        .order("rank", { ascending: false })
        .limit(1);

      const nextRank = rankings && rankings.length > 0 ? rankings[0].rank + 1 : 1;

      // Insert new ranking
      const { error: rankingError } = await supabase
        .from("ladder_rankings")
        .insert({
          team_id: request.team_id,
          ladder_category_id: request.ladder_category_id,
          rank: nextRank,
          points: 1000,
          wins: 0,
          losses: 0,
          streak: 0,
        });

      if (rankingError) {
        if (rankingError.code === "23505") {
          throw new Error("This team is already in this ladder category.");
        }
        throw rankingError;
      }

      // Update request status
      const { error: updateError } = await supabase
        .from("ladder_join_requests")
        .update({
          status: "approved",
          responded_at: new Date().toISOString(),
          responded_by: user?.id,
          admin_notes: adminNotes[request.id] || null,
        })
        .eq("id", request.id);

      if (updateError) throw updateError;

      toast({
        title: "Request approved!",
        description: `${request.team_name} has been added to ${request.category_name} at rank #${nextRank}.`,
      });

      fetchRequests();
      onRequestHandled();
    } catch (error: any) {
      toast({
        title: "Failed to approve request",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: JoinRequest) => {
    setProcessingId(request.id);

    try {
      const { error } = await supabase
        .from("ladder_join_requests")
        .update({
          status: "rejected",
          responded_at: new Date().toISOString(),
          responded_by: user?.id,
          admin_notes: adminNotes[request.id] || null,
        })
        .eq("id", request.id);

      if (error) throw error;

      toast({
        title: "Request rejected",
        description: `${request.team_name}'s request has been rejected.`,
      });

      fetchRequests();
      onRequestHandled();
    } catch (error: any) {
      toast({
        title: "Failed to reject request",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Join Requests
          {requests.length > 0 && (
            <Badge variant="secondary">{requests.length}</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Review and manage team requests to join ladder categories
        </CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No pending join requests
          </p>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request.id} className="border-dashed">
                <CardContent className="pt-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{request.team_name}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Badge variant="outline">{request.category_name}</Badge>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(request.created_at), "MMM d, h:mm a")}
                          </span>
                        </div>
                      </div>
                      <Badge variant="secondary">Pending</Badge>
                    </div>

                    {request.message && (
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <MessageSquare className="w-3 h-3" />
                          Message
                        </div>
                        <p className="text-sm">{request.message}</p>
                      </div>
                    )}

                    {request.player1_name && request.player2_name && (
                      <div className="bg-accent/50 rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">
                          Custom Players
                        </div>
                        <p className="text-sm font-medium">
                          {request.player1_name} &amp; {request.player2_name}
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Textarea
                        placeholder="Admin notes (optional)"
                        value={adminNotes[request.id] || ""}
                        onChange={(e) =>
                          setAdminNotes((prev) => ({
                            ...prev,
                            [request.id]: e.target.value,
                          }))
                        }
                        rows={2}
                        className="text-sm"
                      />
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(request)}
                        disabled={processingId === request.id}
                      >
                        {processingId === request.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <X className="w-4 h-4 mr-1" />
                            Reject
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(request)}
                        disabled={processingId === request.id}
                      >
                        {processingId === request.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Approve
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
