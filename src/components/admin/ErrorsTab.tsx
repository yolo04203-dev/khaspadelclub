import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle, ChevronDown, Smartphone, Monitor, AlertTriangle, XCircle, Loader2, Wifi } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface ClientError {
  id: string;
  user_id: string | null;
  message: string;
  stack: string | null;
  page_url: string | null;
  user_agent: string | null;
  device_info: Record<string, unknown> | null;
  severity: string;
  resolved: boolean;
  created_at: string;
}

interface ErrorsTabProps {
  onUnresolvedCountChange?: (count: number) => void;
}

export function ErrorsTab({ onUnresolvedCountChange }: ErrorsTabProps) {
  const [errors, setErrors] = useState<ClientError[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [resolvedFilter, setResolvedFilter] = useState<string>("unresolved");
  const [timeFilter, setTimeFilter] = useState<string>("day");
  const [profilesMap, setProfilesMap] = useState<Map<string, string>>(new Map());

  const getTimeFilterDate = () => {
    const now = new Date();
    switch (timeFilter) {
      case "hour": return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      case "day": return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case "week": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      default: return new Date(0).toISOString();
    }
  };

  const fetchErrors = async () => {
    try {
      let query = (supabase.from("client_errors" as any).select("*") as any)
        .gte("created_at", getTimeFilterDate())
        .order("created_at", { ascending: false })
        .limit(200);

      if (severityFilter !== "all") {
        query = query.eq("severity", severityFilter);
      }
      if (resolvedFilter === "unresolved") {
        query = query.eq("resolved", false);
      } else if (resolvedFilter === "resolved") {
        query = query.eq("resolved", true);
      }

      const { data, error } = await query;
      if (error) throw error;

      const errorsData = (data || []) as ClientError[];
      setErrors(errorsData);

      // Fetch profiles for user_ids
      const userIds = [...new Set(errorsData.map(e => e.user_id).filter(Boolean))] as string[];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", userIds);
        if (profiles) {
          const map = new Map<string, string>();
          profiles.forEach(p => map.set(p.user_id, p.display_name || "Unknown"));
          setProfilesMap(map);
        }
      }
    } catch (error) {
      logger.apiError("fetchClientErrors", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchErrors();
  }, [severityFilter, resolvedFilter, timeFilter]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("client-errors-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "client_errors" },
        () => fetchErrors()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [severityFilter, resolvedFilter, timeFilter]);

  // Report unresolved count
  const unresolvedCount = useMemo(() => errors.filter(e => !e.resolved).length, [errors]);
  useEffect(() => {
    onUnresolvedCountChange?.(unresolvedCount);
  }, [unresolvedCount, onUnresolvedCountChange]);

  const handleResolve = async (errorId: string) => {
    try {
      const { error } = await (supabase.from("client_errors" as any) as any)
        .update({ resolved: true })
        .eq("id", errorId);
      if (error) throw error;
      setErrors(prev => prev.map(e => e.id === errorId ? { ...e, resolved: true } : e));
      toast.success("Error marked as resolved");
    } catch (error) {
      toast.error("Failed to resolve error");
    }
  };

  const isMobile = (deviceInfo: Record<string, unknown> | null) => {
    if (!deviceInfo) return false;
    const platform = String(deviceInfo.platform || "");
    return platform === "ios" || platform === "android" || !!deviceInfo.is_native;
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="warn">Warning</SelectItem>
          </SelectContent>
        </Select>

        <Select value={resolvedFilter} onValueChange={setResolvedFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unresolved">Unresolved</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>

        <Select value={timeFilter} onValueChange={setTimeFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hour">Last hour</SelectItem>
            <SelectItem value="day">Last 24h</SelectItem>
            <SelectItem value="week">Last week</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {errors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
            No errors found for the selected filters.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {errors.map((err) => (
            <Collapsible key={err.id}>
              <Card className={err.resolved ? "opacity-60" : ""}>
                <CollapsibleTrigger asChild>
                  <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-3">
                      {/* Device icon */}
                      <div className="mt-0.5">
                        {isMobile(err.device_info) ? (
                          <Smartphone className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Monitor className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>

                      {/* Error info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={err.severity === "error" ? "destructive" : "secondary"} className="text-[10px]">
                            {err.severity === "error" ? (
                              <XCircle className="w-3 h-3 mr-1" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 mr-1" />
                            )}
                            {err.severity}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{formatTime(err.created_at)}</span>
                          {err.resolved && (
                            <Badge variant="outline" className="text-[10px] text-green-600">resolved</Badge>
                          )}
                        </div>
                        <p className="text-sm font-mono text-foreground truncate">{err.message}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {err.user_id && (
                            <span>{profilesMap.get(err.user_id) || "Unknown user"}</span>
                          )}
                          {err.page_url && (
                            <span className="truncate max-w-[200px]">{new URL(err.page_url).pathname}</span>
                          )}
                          {err.device_info?.platform && (
                            <span>{String(err.device_info.platform)}</span>
                          )}
                        </div>
                      </div>

                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                    {/* Device details */}
                    {err.device_info && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        {err.device_info.platform && (
                          <div>
                            <span className="text-muted-foreground">Platform:</span>{" "}
                            <span className="font-medium">{String(err.device_info.platform)}</span>
                          </div>
                        )}
                        {err.device_info.os_version && (
                          <div>
                            <span className="text-muted-foreground">OS:</span>{" "}
                            <span className="font-medium">{String(err.device_info.os_version)}</span>
                          </div>
                        )}
                        {err.device_info.network_type && (
                          <div className="flex items-center gap-1">
                            <Wifi className="w-3 h-3 text-muted-foreground" />
                            <span className="font-medium">{String(err.device_info.network_type)}</span>
                          </div>
                        )}
                        {err.device_info.screen_size && (
                          <div>
                            <span className="text-muted-foreground">Screen:</span>{" "}
                            <span className="font-medium">{String(err.device_info.screen_size)}</span>
                          </div>
                        )}
                        {err.device_info.is_native !== undefined && (
                          <div>
                            <span className="text-muted-foreground">Native:</span>{" "}
                            <span className="font-medium">{err.device_info.is_native ? "Yes" : "No"}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Stack trace */}
                    {err.stack && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Stack Trace:</p>
                        <pre className="text-[11px] font-mono bg-muted/50 rounded-md p-3 overflow-x-auto max-h-48 whitespace-pre-wrap break-all">
                          {err.stack}
                        </pre>
                      </div>
                    )}

                    {/* Full URL */}
                    {err.page_url && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">URL:</span>{" "}
                        <span className="font-mono break-all">{err.page_url}</span>
                      </div>
                    )}

                    {/* Resolve button */}
                    {!err.resolved && (
                      <Button size="sm" variant="outline" onClick={() => handleResolve(err.id)}>
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                        Mark Resolved
                      </Button>
                    )}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
}
