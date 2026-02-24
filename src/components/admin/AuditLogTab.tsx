import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Search, RefreshCw, Eye, History } from "lucide-react";
import { logger } from "@/lib/logger";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditEntry {
  id: string;
  admin_user_id: string;
  admin_name: string;
  action: string;
  team_id: string | null;
  team_name: string | null;
  ladder_category_id: string | null;
  category_name: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
}

export function AuditLogTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  const fetchAuditLog = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: logs, error } = await supabase
        .from("ladder_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      if (!logs || logs.length === 0) {
        setEntries([]);
        return;
      }

      // Gather unique IDs for batch lookups
      const adminIds = [...new Set(logs.map(l => l.admin_user_id))];
      const teamIds = [...new Set(logs.map(l => l.team_id).filter(Boolean))] as string[];
      const catIds = [...new Set(logs.map(l => l.ladder_category_id).filter(Boolean))] as string[];

      const [profilesRes, teamsRes, catsRes] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name").in("user_id", adminIds),
        teamIds.length > 0
          ? supabase.from("teams").select("id, name").in("id", teamIds)
          : Promise.resolve({ data: [] }),
        catIds.length > 0
          ? supabase.from("ladder_categories").select("id, name").in("id", catIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profileMap = new Map<string, string>(profilesRes.data?.map(p => [p.user_id, p.display_name || "Unknown"] as [string, string]) || []);
      const teamMap = new Map<string, string>(teamsRes.data?.map(t => [t.id, t.name] as [string, string]) || []);
      const catMap = new Map<string, string>(catsRes.data?.map(c => [c.id, c.name] as [string, string]) || []);

      setEntries(logs.map(l => ({
        id: l.id,
        admin_user_id: l.admin_user_id,
        admin_name: profileMap.get(l.admin_user_id) || "Unknown Admin",
        action: l.action,
        team_id: l.team_id,
        team_name: l.team_id ? teamMap.get(l.team_id) || "Deleted Team" : null,
        ladder_category_id: l.ladder_category_id,
        category_name: l.ladder_category_id ? catMap.get(l.ladder_category_id) || "Deleted Category" : null,
        old_values: l.old_values as Record<string, unknown> | null,
        new_values: l.new_values as Record<string, unknown> | null,
        notes: l.notes,
        created_at: l.created_at,
      })));
    } catch (error) {
      logger.apiError("fetchAuditLog", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditLog();
  }, [fetchAuditLog]);

  const filtered = entries.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.admin_name.toLowerCase().includes(q) ||
      e.action.toLowerCase().includes(q) ||
      e.team_name?.toLowerCase().includes(q) ||
      e.notes?.toLowerCase().includes(q)
    );
  });

  const getActionBadge = (action: string) => {
    if (action.includes("rank")) return <Badge variant="outline" className="border-primary text-primary">Rank</Badge>;
    if (action.includes("stat") || action.includes("edit")) return <Badge variant="secondary">Stats</Badge>;
    return <Badge variant="outline">{action}</Badge>;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
      " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  const renderDiff = (old_values: Record<string, unknown> | null, new_values: Record<string, unknown> | null) => {
    if (!old_values && !new_values) return <span className="text-muted-foreground text-xs">No data</span>;
    const allKeys = [...new Set([...Object.keys(old_values || {}), ...Object.keys(new_values || {})])];
    return (
      <div className="space-y-1 text-sm">
        {allKeys.map(key => {
          const oldVal = old_values?.[key];
          const newVal = new_values?.[key];
          const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);
          return (
            <div key={key} className={changed ? "text-foreground" : "text-muted-foreground"}>
              <span className="font-medium capitalize">{key.replace(/_/g, " ")}:</span>{" "}
              {changed ? (
                <>
                  <span className="line-through text-destructive/70">{String(oldVal ?? "—")}</span>
                  {" → "}
                  <span className="text-primary font-semibold">{String(newVal ?? "—")}</span>
                </>
              ) : (
                <span>{String(oldVal ?? "—")}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Ladder Audit Log
            </CardTitle>
            <CardDescription>Review all manual ranking and stats edits</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAuditLog} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by admin, action, team, or notes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[70px]">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No audit entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs whitespace-nowrap">{formatDate(entry.created_at)}</TableCell>
                      <TableCell className="font-medium text-sm">{entry.admin_name}</TableCell>
                      <TableCell>{getActionBadge(entry.action)}</TableCell>
                      <TableCell className="text-sm">{entry.team_name || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {entry.notes || "—"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedEntry(entry)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {!isLoading && filtered.length > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              Showing {filtered.length} of {entries.length} entries
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Audit Entry Details</DialogTitle>
            <DialogDescription>
              {selectedEntry && formatDate(selectedEntry.created_at)}
            </DialogDescription>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Admin:</span>
                  <p className="font-medium">{selectedEntry.admin_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Action:</span>
                  <p>{getActionBadge(selectedEntry.action)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Team:</span>
                  <p className="font-medium">{selectedEntry.team_name || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Category:</span>
                  <p className="font-medium">{selectedEntry.category_name || "—"}</p>
                </div>
              </div>

              {selectedEntry.notes && (
                <div>
                  <span className="text-muted-foreground text-sm">Notes:</span>
                  <p className="text-sm bg-muted/50 rounded-md p-2 mt-1">{selectedEntry.notes}</p>
                </div>
              )}

              <div>
                <span className="text-muted-foreground text-sm">Changes:</span>
                <div className="bg-muted/50 rounded-md p-3 mt-1">
                  {renderDiff(selectedEntry.old_values, selectedEntry.new_values)}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
