import { useState, useEffect, useCallback } from "react";
import { Check, X, Loader2, Clock, MessageSquare, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  ladder_name: string;
  status: string;
  message: string | null;
  player1_name: string | null;
  player2_name: string | null;
  created_at: string;
}

interface JoinRequestsTabProps {
  onPendingCountChange?: (count: number) => void;
}

export function JoinRequestsTab({ onPendingCountChange }: JoinRequestsTabProps) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const fetchRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("ladder_join_requests")
        .select(`
          id,
          team_id,
          ladder_category_id,
          status,
          message,
          player1_name,
          player2_name,
          created_at,
          team:teams (name),
          category:ladder_categories (name, ladder:ladders (name))
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (error) throw error;

      const mapped: JoinRequest[] = (data || []).map((r: any) => ({
        id: r.id,
        team_id: r.team_id,
        ladder_category_id: r.ladder_category_id,
        status: r.status,
        message: r.message,
        player1_name: r.player1_name,
        player2_name: r.player2_name,
        created_at: r.created_at,
        team_name: r.team?.name || "Unknown Team",
        category_name: r.category?.name || "Unknown Category",
        ladder_name: r.category?.ladder?.name || "Unknown Ladder",
      }));

      setRequests(mapped);
      onPendingCountChange?.(mapped.length);
    } catch (error) {
      logger.apiError("fetchAllJoinRequests", error);
    } finally {
      setIsLoading(false);
    }
  }, [onPendingCountChange]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (request: JoinRequest) => {
    setProcessingId(request.id);
    try {
      // Check if team is already in this category
      const { data: existing } = await supabase
        .from("ladder_rankings")
        .select("id")
        .eq("team_id", request.team_id)
        .eq("ladder_category_id", request.ladder_category_id)
        .maybeSingle();

      if (existing) {
        throw new Error("This team is already in this ladder category.");
      }

      // Get max rank
      const { data: rankings } = await supabase
        .from("ladder_rankings")
        .select("rank")
        .eq("ladder_category_id", request.ladder_category_id)
        .order("rank", { ascending: false })
        .limit(1);

      const nextRank = rankings && rankings.length > 0 ? rankings[0].rank + 1 : 1;

      // Insert ranking
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
        description: `${request.team_name} added to ${request.category_name} (${request.ladder_name}) at rank #${nextRank}.`,
      });

      fetchRequests();
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground font-medium">No pending join requests</p>
          <p className="text-sm text-muted-foreground mt-1">
            When teams request to join a ladder, they'll appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group by ladder
  const grouped = requests.reduce<Record<string, JoinRequest[]>>((acc, r) => {
    if (!acc[r.ladder_name]) acc[r.ladder_name] = [];
    acc[r.ladder_name].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([ladderName, reqs]) => (
        <div key={ladderName}>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            {ladderName}
            <Badge variant="secondary">{reqs.length}</Badge>
          </h3>
          <div className="space-y-3">
            {reqs.map((request) => (
              <Card key={request.id} className="border-dashed">
                <CardContent className="pt-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{request.team_name}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 flex-wrap">
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
                        <div className="text-xs text-muted-foreground mb-1">Custom Players</div>
                        <p className="text-sm font-medium">
                          {request.player1_name} &amp; {request.player2_name}
                        </p>
                      </div>
                    )}

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
        </div>
      ))}
    </div>
  );
}
