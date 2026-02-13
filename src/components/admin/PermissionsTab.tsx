import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

const PERMISSIONS = [
  { key: "create_tournament", label: "Create Tournaments" },
  { key: "create_ladder", label: "Create Ladders" },
  { key: "create_americano", label: "Create Americano" },
  { key: "manage_matches", label: "Manage Matches" },
] as const;

type PermissionKey = (typeof PERMISSIONS)[number]["key"];

interface Player {
  id: string;
  display_name: string | null;
  email: string;
  team_name: string | null;
  role: string;
}

interface PermissionsTabProps {
  players: Player[];
}

export function PermissionsTab({ players }: PermissionsTabProps) {
  const [userPermissions, setUserPermissions] = useState<Record<string, Set<string>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("user_permissions")
        .select("user_id, permission");

      if (error) throw error;

      const map: Record<string, Set<string>> = {};
      data?.forEach((row) => {
        if (!map[row.user_id]) map[row.user_id] = new Set();
        map[row.user_id].add(row.permission);
      });
      setUserPermissions(map);
    } catch (error) {
      logger.apiError("fetchPermissions", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const togglePermission = async (userId: string, permission: PermissionKey) => {
    const key = `${userId}-${permission}`;
    setTogglingKey(key);

    try {
      const hasIt = userPermissions[userId]?.has(permission);

      if (hasIt) {
        const { error } = await supabase
          .from("user_permissions")
          .delete()
          .eq("user_id", userId)
          .eq("permission", permission);
        if (error) throw error;

        setUserPermissions((prev) => {
          const next = { ...prev };
          next[userId] = new Set(next[userId]);
          next[userId].delete(permission);
          return next;
        });
        toast.success("Permission revoked");
      } else {
        const { error } = await supabase
          .from("user_permissions")
          .insert({ user_id: userId, permission });
        if (error) throw error;

        setUserPermissions((prev) => {
          const next = { ...prev };
          if (!next[userId]) next[userId] = new Set();
          else next[userId] = new Set(next[userId]);
          next[userId].add(permission);
          return next;
        });
        toast.success("Permission granted");
      }
    } catch (error) {
      logger.apiError("togglePermission", error);
      toast.error("Failed to update permission");
    } finally {
      setTogglingKey(null);
    }
  };

  // Filter out super_admin users — they implicitly have all permissions
  const eligiblePlayers = players.filter((p) => p.role !== "super_admin");

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Permissions</CardTitle>
        <CardDescription>
          Grant or revoke specific permissions for users. Super admins have all permissions by default.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead>Role</TableHead>
              {PERMISSIONS.map((p) => (
                <TableHead key={p.key} className="text-center text-xs">
                  {p.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {eligiblePlayers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2 + PERMISSIONS.length} className="text-center text-muted-foreground py-8">
                  No players found
                </TableCell>
              </TableRow>
            ) : (
              eligiblePlayers.map((player) => (
                <TableRow key={player.id}>
                  <TableCell className="font-medium">
                    {player.display_name || "Unknown"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={player.role === "admin" ? "default" : "secondary"}>
                      {player.role}
                    </Badge>
                  </TableCell>
                  {PERMISSIONS.map((perm) => {
                    const key = `${player.id}-${perm.key}`;
                    const checked = userPermissions[player.id]?.has(perm.key) ?? false;
                    return (
                      <TableCell key={perm.key} className="text-center">
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={checked}
                            disabled={togglingKey === key}
                            onCheckedChange={() => togglePermission(player.id, perm.key)}
                          />
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
